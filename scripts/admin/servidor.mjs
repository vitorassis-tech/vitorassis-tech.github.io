/**
 * SERVIDOR DO PAINEL ADMINISTRATIVO (uso local)
 * ------------------------------------------------------------------
 * - Escuta somente em 127.0.0.1: não fica acessível pela rede.
 * - Toda chamada à API exige o token da sessão (gerado a cada início) e um
 *   cabeçalho Host local: outros sites abertos no navegador não conseguem
 *   ler nem alterar o conteúdo (proteção contra CSRF e DNS rebinding).
 * - Toda gravação é validada com o mesmo esquema usado no build do site.
 * - Antes de gravar, a versão anterior vai para o histórico (.admin/historico).
 * - Exclusões vão para a lixeira (.admin/lixeira) e podem ser restauradas.
 * - Edições simultâneas são detectadas pela versão do arquivo (conflito 409).
 *
 * Sem dependências: só módulos nativos do Node.
 */
import http from 'node:http';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COLECOES,
  colecao,
  idDoItem,
  normalizarItem,
  referenciasPara,
  rotaExisteFn,
  slugificar,
  tituloDoItem,
  validarItem,
  validarTudo,
} from '../../src/lib/esquema.mjs';

const PROJETO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PASTA_UI = join(PROJETO, 'admin');
const ARQUIVO_ESQUEMA = join(PROJETO, 'src', 'lib', 'esquema.mjs');

const LIMITE_JSON = 1024 * 1024; // 1 MB
const LIMITE_IMAGEM = 2 * 1024 * 1024; // 2 MB (arquivo decodificado)
const LIMITE_CORPO_IMAGEM = Math.ceil((LIMITE_IMAGEM * 4) / 3) + 64 * 1024;
const PASTAS_IMAGEM = new Set(['projetos', 'instituicoes']);
const TIPOS_IMAGEM = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg' };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

export class ErroHttp extends Error {
  constructor(status, mensagem, extra = {}) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
  }
}

const versaoDe = (texto) => createHash('sha256').update(texto).digest('hex').slice(0, 16);
const carimbo = () => new Date().toISOString().replace(/[:.]/g, '-');

/**
 * Cria o servidor do painel.
 * @param {{raiz?: string, porta?: number, token?: string, urlSite?: string, maxHistorico?: number}} opcoes
 */
export function criarServidor(opcoes = {}) {
  const raiz = resolve(opcoes.raiz ?? PROJETO);
  const token = opcoes.token ?? randomBytes(24).toString('hex');
  const urlSite = opcoes.urlSite ?? 'http://localhost:4321';
  const maxHistorico = opcoes.maxHistorico ?? 100;
  let porta = opcoes.porta ?? 4330;

  const pastaConteudo = join(raiz, 'src', 'content');
  const pastaPublica = join(raiz, 'public');
  const pastaHistorico = join(raiz, '.admin', 'historico');
  const pastaLixeira = join(raiz, '.admin', 'lixeira');

  /* ---------------- Acesso ao conteúdo ---------------- */

  async function carregarTudo() {
    const conteudo = {};
    const versoes = {};
    for (const d of COLECOES) {
      const texto = await readFile(join(pastaConteudo, d.arquivo), 'utf8');
      conteudo[d.id] = JSON.parse(texto);
      versoes[d.id] = versaoDe(texto);
    }
    return { conteudo, versoes };
  }

  const arquivoExiste = (caminhoPublico) => {
    const alvo = normalize(join(pastaPublica, caminhoPublico));
    return alvo.startsWith(pastaPublica + sep) && existsSync(alvo);
  };

  async function gravarAtomico(caminho, texto) {
    await mkdir(dirname(caminho), { recursive: true });
    const temporario = `${caminho}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(temporario, texto, 'utf8');
    await rename(temporario, caminho);
  }

  async function guardarNoHistorico(colecaoId, dadosAnteriores, acao) {
    const pasta = join(pastaHistorico, colecaoId);
    await mkdir(pasta, { recursive: true });
    const registro = { colecao: colecaoId, salvoEm: new Date().toISOString(), acao, dados: dadosAnteriores };
    await gravarAtomico(join(pasta, `${carimbo()}-${randomBytes(3).toString('hex')}.json`), JSON.stringify(registro, null, 2));
    const arquivos = (await readdir(pasta)).filter((a) => a.endsWith('.json')).sort();
    for (const velho of arquivos.slice(0, Math.max(0, arquivos.length - maxHistorico))) await unlink(join(pasta, velho));
  }

  // Fila: uma alteração por vez, para nunca intercalar gravações.
  let fila = Promise.resolve();
  const emFila = (tarefa) => {
    const resultado = fila.then(tarefa, tarefa);
    fila = resultado.catch(() => {});
    return resultado;
  };

  /**
   * Fluxo padrão de alteração: confere versão → aplica → valida tudo → histórico → grava.
   * @param {string} colecaoId
   * @param {string} versaoEsperada
   * @param {(dados:any, conteudo:any) => {dados:any, acao:string, resposta?:object, errosItem?:any[]}} aplicar
   */
  function alterar(colecaoId, versaoEsperada, aplicar) {
    return emFila(async () => {
      const { conteudo, versoes } = await carregarTudo();
      // '*' = operação interna sem formulário aberto (ex.: restaurar da lixeira)
      if (versaoEsperada !== '*' && (!versaoEsperada || versaoEsperada !== versoes[colecaoId])) {
        throw new ErroHttp(409, 'Este conteúdo foi alterado em outro lugar (outra aba ou edição manual). Recarregue para ver a versão atual.', {
          codigo: 'conflito',
        });
      }
      const anterior = conteudo[colecaoId];
      const r = aplicar(structuredClone(anterior), conteudo);
      const novoConteudo = { ...conteudo, [colecaoId]: r.dados };
      const errosItem = r.errosItem ?? [];
      const errosGerais = validarTudo(novoConteudo, { arquivoExiste });
      if (errosItem.length || errosGerais.length) {
        throw new ErroHttp(422, 'Corrija os campos indicados para salvar.', { erros: [...errosItem, ...(errosItem.length ? [] : errosGerais)] });
      }
      if (r.antesDeGravar) await r.antesDeGravar();
      await guardarNoHistorico(colecaoId, anterior, r.acao);
      const texto = JSON.stringify(r.dados, null, 2) + '\n';
      await gravarAtomico(join(pastaConteudo, colecao(colecaoId).arquivo), texto);
      return { versao: versaoDe(texto), ...(r.resposta ?? {}) };
    });
  }

  function exigirColecao(id, tipo) {
    const d = colecao(id);
    if (!d) throw new ErroHttp(404, 'Coleção não encontrada.');
    if (tipo && d.tipo !== tipo) throw new ErroHttp(400, 'Operação não disponível para esta coleção.');
    return d;
  }

  function ctxValidacao(conteudo, idOriginal) {
    return { conteudo, idOriginal, arquivoExiste, rotaExiste: rotaExisteFn(conteudo, arquivoExiste) };
  }

  /** Gera um identificador único a partir do título (para coleções com chave "id"). */
  function gerarId(d, item, lista) {
    const base = slugificar(item[d.campoTitulo]) || d.id.slice(0, -1);
    let id = base;
    for (let n = 2; lista.some((i) => i[d.chave] === id); n++) id = `${base}-${n}`;
    return id;
  }

  /* ---------------- Operações ---------------- */

  const api = {
    async conteudo() {
      return carregarTudo();
    },

    async validar(colecaoId, { item, idOriginal }) {
      const d = exigirColecao(colecaoId);
      const { conteudo } = await carregarTudo();
      const normal = normalizarItem(colecaoId, item);
      if (d.tipo === 'lista' && d.chave === 'id' && !normal.id) normal.id = gerarId(d, normal, conteudo[colecaoId]);
      return { erros: validarItem(colecaoId, normal, ctxValidacao(conteudo, idOriginal)) };
    },

    criar(colecaoId, { item, versao }) {
      const d = exigirColecao(colecaoId, 'lista');
      return alterar(colecaoId, versao, (lista, conteudo) => {
        const novo = normalizarItem(colecaoId, item);
        if (d.chave === 'id' && !novo.id) novo.id = gerarId(d, novo, lista);
        const errosItem = validarItem(colecaoId, novo, ctxValidacao(conteudo));
        lista.push(novo);
        return { dados: lista, errosItem, acao: `Criação de “${tituloDoItem(d, novo)}”`, resposta: { item: novo } };
      });
    },

    atualizar(colecaoId, id, { item, versao }) {
      const d = exigirColecao(colecaoId, 'lista');
      return alterar(colecaoId, versao, (lista, conteudo) => {
        const i = lista.findIndex((x) => x[d.chave] === id);
        if (i < 0) throw new ErroHttp(404, `Este ${d.singular} não existe mais. Ele pode ter sido excluído em outra aba.`);
        const novo = normalizarItem(colecaoId, item);
        if (d.chave === 'id') novo.id = id; // identificador interno não muda
        const errosItem = validarItem(colecaoId, novo, ctxValidacao(conteudo, id));
        if (novo[d.chave] !== id) {
          const refs = referenciasPara(colecaoId, id, conteudo);
          if (refs.length) {
            errosItem.push({
              caminho: d.chave,
              mensagem: `O endereço não pode mudar: ele é usado em ${refs.map((r) => `${r.titulo} (${r.onde})`).join('; ')}.`,
            });
          }
        }
        lista[i] = novo;
        return { dados: lista, errosItem, acao: `Edição de “${tituloDoItem(d, novo)}”`, resposta: { item: novo } };
      });
    },

    atualizarUnico(colecaoId, { dados, versao }) {
      const d = exigirColecao(colecaoId, 'unico');
      return alterar(colecaoId, versao, (_atual, conteudo) => {
        const novo = normalizarItem(colecaoId, dados);
        const errosItem = validarItem(colecaoId, novo, ctxValidacao(conteudo));
        return { dados: novo, errosItem, acao: `Edição de ${d.rotulo}`, resposta: { item: novo } };
      });
    },

    ordenar(colecaoId, { ids, versao }) {
      const d = exigirColecao(colecaoId, 'lista');
      if (!d.ordenavel) throw new ErroHttp(400, 'Esta coleção é ordenada automaticamente.');
      return alterar(colecaoId, versao, (lista) => {
        const atuais = lista.map((x) => x[d.chave]);
        if (!Array.isArray(ids) || ids.length !== atuais.length || [...ids].sort().join() !== [...atuais].sort().join()) {
          throw new ErroHttp(409, 'A lista mudou desde que foi carregada. Recarregue e tente de novo.', { codigo: 'conflito' });
        }
        const porId = new Map(lista.map((x) => [x[d.chave], x]));
        return { dados: ids.map((id) => porId.get(id)), acao: `Nova ordem de ${d.rotulo}` };
      });
    },

    async referencias(colecaoId, id) {
      const d = exigirColecao(colecaoId, 'lista');
      const { conteudo } = await carregarTudo();
      const item = conteudo[colecaoId].find((x) => x[d.chave] === id);
      if (!item) throw new ErroHttp(404, `Este ${d.singular} não existe mais.`);
      const imagens = [];
      for (const c of d.secoes.flatMap((s) => s.campos)) if (c.tipo === 'imagem' && item[c.nome]?.arquivo) imagens.push(item[c.nome].arquivo);
      return {
        titulo: tituloDoItem(d, item),
        url: d.url(item),
        referencias: referenciasPara(colecaoId, id, conteudo),
        imagens,
      };
    },

    excluir(colecaoId, id, { versao, confirmacao }) {
      const d = exigirColecao(colecaoId, 'lista');
      if (confirmacao !== id) throw new ErroHttp(400, `Para confirmar, digite exatamente: ${id}`, { codigo: 'confirmacao' });
      return alterar(colecaoId, versao, (lista, conteudo) => {
        const i = lista.findIndex((x) => x[d.chave] === id);
        if (i < 0) throw new ErroHttp(404, `Este ${d.singular} não existe mais.`);
        const refs = referenciasPara(colecaoId, id, conteudo);
        if (refs.length) {
          throw new ErroHttp(409, 'Não é possível excluir: este item é usado em outras partes do site.', { codigo: 'referenciado', referencias: refs });
        }
        const [removido] = lista.splice(i, 1);
        const entrada = `${carimbo()}--${colecaoId}--${id}.json`;
        const registro = { colecao: colecaoId, chave: id, posicao: i, excluidoEm: new Date().toISOString(), item: removido };
        return {
          dados: lista,
          acao: `Exclusão de “${tituloDoItem(d, removido)}” (enviado para a lixeira)`,
          // A cópia na lixeira é gravada ANTES de o item sair da coleção
          antesDeGravar: () => gravarAtomico(join(pastaLixeira, entrada), JSON.stringify(registro, null, 2)),
          resposta: { lixeira: entrada },
        };
      });
    },

    async listarLixeira() {
      if (!existsSync(pastaLixeira)) return { itens: [] };
      const itens = [];
      for (const arquivo of (await readdir(pastaLixeira)).filter((a) => a.endsWith('.json')).sort().reverse()) {
        const r = JSON.parse(await readFile(join(pastaLixeira, arquivo), 'utf8'));
        const d = colecao(r.colecao);
        itens.push({ entrada: arquivo, colecao: r.colecao, rotuloColecao: d?.rotulo, chave: r.chave, titulo: d ? tituloDoItem(d, r.item) : r.chave, excluidoEm: r.excluidoEm });
      }
      return { itens };
    },

    async lerEntradaLixeira(entrada) {
      if (!/^[\w-]+--[a-z]+--[a-z0-9-]+\.json$/.test(entrada)) throw new ErroHttp(400, 'Entrada inválida.');
      const caminho = join(pastaLixeira, entrada);
      if (!existsSync(caminho)) throw new ErroHttp(404, 'Este item não está mais na lixeira.');
      return { caminho, registro: JSON.parse(await readFile(caminho, 'utf8')) };
    },

    async restaurarDaLixeira(entrada) {
      const { caminho, registro } = await api.lerEntradaLixeira(entrada);
      const d = exigirColecao(registro.colecao, 'lista');
      const r = await alterar(registro.colecao, '*', (lista, conteudo) => {
        if (lista.some((x) => x[d.chave] === registro.chave)) {
          throw new ErroHttp(409, `Já existe ${d.singular} com o identificador “${registro.chave}”. Renomeie ou exclua o atual antes de restaurar.`);
        }
        const errosItem = validarItem(registro.colecao, registro.item, ctxValidacao(conteudo));
        lista.splice(Math.min(registro.posicao ?? lista.length, lista.length), 0, registro.item);
        return { dados: lista, errosItem, acao: `Restauração de “${tituloDoItem(d, registro.item)}” da lixeira` };
      });
      await unlink(caminho);
      return { ...r, colecao: registro.colecao, chave: registro.chave };
    },

    async excluirDefinitivo(entrada, { confirmacao }) {
      const { caminho, registro } = await api.lerEntradaLixeira(entrada);
      if (confirmacao !== registro.chave) throw new ErroHttp(400, `Para confirmar, digite exatamente: ${registro.chave}`, { codigo: 'confirmacao' });
      await unlink(caminho);
      return { ok: true };
    },

    async listarHistorico(colecaoId) {
      const ids = colecaoId ? [exigirColecao(colecaoId).id] : COLECOES.map((c) => c.id);
      const itens = [];
      for (const id of ids) {
        const pasta = join(pastaHistorico, id);
        if (!existsSync(pasta)) continue;
        for (const arquivo of (await readdir(pasta)).filter((a) => a.endsWith('.json'))) {
          const r = JSON.parse(await readFile(join(pasta, arquivo), 'utf8'));
          itens.push({ entrada: `${id}/${arquivo}`, colecao: id, rotuloColecao: colecao(id).rotulo, salvoEm: r.salvoEm, acao: r.acao });
        }
      }
      itens.sort((a, b) => b.salvoEm.localeCompare(a.salvoEm));
      return { itens };
    },

    async restaurarHistorico(entrada, { versao }) {
      const m = /^([a-z]+)\/([\w-]+\.json)$/.exec(entrada ?? '');
      if (!m) throw new ErroHttp(400, 'Versão inválida.');
      const d = exigirColecao(m[1]);
      const caminho = join(pastaHistorico, m[1], m[2]);
      if (!existsSync(caminho)) throw new ErroHttp(404, 'Esta versão não existe mais no histórico.');
      const registro = JSON.parse(await readFile(caminho, 'utf8'));
      return alterar(d.id, versao, () => ({
        dados: registro.dados,
        acao: `Restauração da versão de ${new Date(registro.salvoEm).toLocaleString('pt-BR')}`,
      }));
    },

    async enviarImagem({ pasta, nome, tipo, base64 }) {
      if (!PASTAS_IMAGEM.has(pasta)) throw new ErroHttp(400, 'Pasta de imagem inválida.');
      const ext = TIPOS_IMAGEM[tipo];
      if (!ext) throw new ErroHttp(415, 'Formato não aceito. Use PNG, JPG, WebP ou SVG.');
      if (typeof base64 !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(base64)) throw new ErroHttp(400, 'Arquivo corrompido.');
      const bytes = Buffer.from(base64, 'base64');
      if (bytes.length === 0) throw new ErroHttp(400, 'Arquivo vazio.');
      if (bytes.length > LIMITE_IMAGEM) throw new ErroHttp(413, 'Arquivo maior que 2 MB. Reduza a imagem e tente de novo.');
      verificarConteudoImagem(bytes, tipo);
      const base = slugificar(String(nome ?? '').replace(/\.[^.]+$/, '')).slice(0, 40) || 'imagem';
      const arquivo = `${base}-${createHash('sha256').update(bytes).digest('hex').slice(0, 8)}${ext}`;
      const destino = join(pastaPublica, 'img', pasta, arquivo);
      await mkdir(dirname(destino), { recursive: true });
      if (!existsSync(destino)) await writeFile(destino, bytes);
      return { arquivo: `/img/${pasta}/${arquivo}` };
    },
  };

  /* ---------------- HTTP ---------------- */

  const hostsPermitidos = () => new Set([`127.0.0.1:${porta}`, `localhost:${porta}`]);
  const origensPermitidas = () => new Set([`http://127.0.0.1:${porta}`, `http://localhost:${porta}`]);

  const cabecalhosSeguranca = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-store',
  };

  function responderJson(res, status, corpo) {
    res.writeHead(status, { ...cabecalhosSeguranca, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(corpo));
  }

  function lerCorpo(req, limite) {
    return new Promise((ok, falha) => {
      const tipo = req.headers['content-type'] ?? '';
      if (!tipo.startsWith('application/json')) return falha(new ErroHttp(415, 'Envie os dados em JSON.'));
      const partes = [];
      let total = 0;
      req.on('data', (p) => {
        total += p.length;
        // Acima do limite: descarta o restante para conseguir responder com uma mensagem clara
        if (total <= limite) partes.push(p);
        else if (total > limite * 10) req.destroy();
      });
      req.on('end', () => {
        if (total > limite) return falha(new ErroHttp(413, 'Arquivo ou dados grandes demais. Imagens: até 2 MB.'));
        try {
          ok(total ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {});
        } catch {
          falha(new ErroHttp(400, 'JSON inválido.'));
        }
      });
      req.on('error', falha);
    });
  }

  function tokenValido(recebido) {
    if (typeof recebido !== 'string' || recebido.length !== token.length) return false;
    return timingSafeEqual(Buffer.from(recebido), Buffer.from(token));
  }

  async function servirArquivo(res, caminho, base, extra = {}) {
    const alvo = normalize(caminho);
    if (!alvo.startsWith(base + sep) || !existsSync(alvo)) return responderJson(res, 404, { ok: false, mensagem: 'Não encontrado.' });
    const tipo = MIME[extname(alvo).toLowerCase()];
    if (!tipo) return responderJson(res, 404, { ok: false, mensagem: 'Não encontrado.' });
    res.writeHead(200, { ...cabecalhosSeguranca, 'Content-Type': tipo, ...extra });
    res.end(await readFile(alvo));
  }

  async function servirPainel(res) {
    const html = (await readFile(join(PASTA_UI, 'index.html'), 'utf8')).replace('__TOKEN__', token).replace('__URL_SITE__', urlSite);
    res.writeHead(200, {
      ...cabecalhosSeguranca,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'",
    });
    res.end(html);
  }

  const rotas = [
    ['GET', /^\/api\/conteudo$/, () => api.conteudo()],
    ['GET', /^\/api\/sessao$/, () => ({ ok: true, urlSite })],
    ['POST', /^\/api\/validar\/([a-z]+)$/, (m, corpo) => api.validar(m[1], corpo)],
    ['POST', /^\/api\/colecoes\/([a-z]+)\/itens$/, (m, corpo) => api.criar(m[1], corpo)],
    ['PUT', /^\/api\/colecoes\/([a-z]+)\/itens\/([a-z0-9-]+)$/, (m, corpo) => api.atualizar(m[1], m[2], corpo)],
    ['PUT', /^\/api\/colecoes\/([a-z]+)$/, (m, corpo) => api.atualizarUnico(m[1], corpo)],
    ['POST', /^\/api\/colecoes\/([a-z]+)\/ordem$/, (m, corpo) => api.ordenar(m[1], corpo)],
    ['GET', /^\/api\/colecoes\/([a-z]+)\/itens\/([a-z0-9-]+)\/referencias$/, (m) => api.referencias(m[1], m[2])],
    ['POST', /^\/api\/colecoes\/([a-z]+)\/itens\/([a-z0-9-]+)\/excluir$/, (m, corpo) => api.excluir(m[1], m[2], corpo)],
    ['GET', /^\/api\/lixeira$/, () => api.listarLixeira()],
    ['POST', /^\/api\/lixeira\/([\w.-]+)\/restaurar$/, (m) => api.restaurarDaLixeira(m[1])],
    ['POST', /^\/api\/lixeira\/([\w.-]+)\/excluir-definitivo$/, (m, corpo) => api.excluirDefinitivo(m[1], corpo)],
    ['GET', /^\/api\/historico$/, (_m, _c, url) => api.listarHistorico(url.searchParams.get('colecao') || undefined)],
    ['POST', /^\/api\/historico\/restaurar$/, (_m, corpo) => api.restaurarHistorico(corpo.entrada, corpo)],
    ['POST', /^\/api\/imagens$/, (_m, corpo) => api.enviarImagem(corpo)],
  ];

  const servidor = http.createServer(async (req, res) => {
    try {
      // 1. Só aceita acesso pelo endereço local (bloqueia DNS rebinding)
      if (!hostsPermitidos().has(req.headers.host ?? '')) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Acesso permitido somente pelo endereço local do painel.');
      }
      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
      const caminho = decodeURIComponent(url.pathname);

      if (caminho.startsWith('/api/')) {
        // 2. Origem e token da sessão (bloqueia outros sites abertos no navegador)
        const origem = req.headers.origin;
        if (origem && !origensPermitidas().has(origem)) throw new ErroHttp(403, 'Origem não permitida.');
        if (!tokenValido(req.headers['x-admin-token'])) throw new ErroHttp(401, 'Sessão do painel inválida. Recarregue a página.');

        const rota = rotas.find(([metodo, re]) => metodo === req.method && re.test(caminho));
        if (!rota) throw new ErroHttp(404, 'Operação não encontrada.');
        const m = rota[1].exec(caminho);
        const corpo = req.method === 'GET' ? {} : await lerCorpo(req, caminho === '/api/imagens' ? LIMITE_CORPO_IMAGEM : LIMITE_JSON);
        const resultado = await rota[2](m, corpo, url);
        return responderJson(res, 200, { ok: true, ...resultado });
      }

      if (req.method !== 'GET') throw new ErroHttp(405, 'Método não permitido.');
      if (caminho === '/' || caminho === '/index.html') return await servirPainel(res);
      if (caminho === '/esquema.mjs') return await servirArquivo(res, ARQUIVO_ESQUEMA, dirname(ARQUIVO_ESQUEMA));
      if (caminho.startsWith('/midia/img/')) {
        return await servirArquivo(res, join(pastaPublica, caminho.slice('/midia'.length)), join(pastaPublica, 'img'), {
          'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        });
      }
      if (caminho.startsWith('/fontes/')) {
        const nome = caminho.slice('/fontes/'.length);
        const mapa = {
          'fraunces.woff2': join(PROJETO, 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2'),
          'plex-400.woff2': join(PROJETO, 'node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2'),
          'plex-500.woff2': join(PROJETO, 'node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2'),
          'plex-600.woff2': join(PROJETO, 'node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2'),
        };
        if (!mapa[nome]) throw new ErroHttp(404, 'Não encontrado.');
        return await servirArquivo(res, mapa[nome], join(PROJETO, 'node_modules'), { 'Cache-Control': 'max-age=86400' });
      }
      return await servirArquivo(res, join(PASTA_UI, caminho), PASTA_UI);
    } catch (erro) {
      if (erro instanceof ErroHttp) return responderJson(res, erro.status, { ok: false, mensagem: erro.message, ...erro.extra });
      console.error('[painel] erro inesperado:', erro);
      return responderJson(res, 500, { ok: false, mensagem: 'Erro inesperado no servidor do painel. Nada foi gravado. Veja o terminal para detalhes.' });
    }
  });

  return {
    servidor,
    token,
    api,
    iniciar: () =>
      new Promise((ok, falha) => {
        servidor.once('error', falha);
        servidor.listen(porta, '127.0.0.1', () => {
          porta = servidor.address().port;
          ok({ porta, url: `http://127.0.0.1:${porta}/` });
        });
      }),
    parar: () => new Promise((ok) => servidor.close(() => ok())),
    get porta() {
      return porta;
    },
  };
}

/**
 * Confere se os bytes correspondem ao tipo declarado e, para SVG,
 * recusa qualquer conteúdo ativo (scripts, eventos, links externos).
 */
export function verificarConteudoImagem(bytes, tipo) {
  const inicio = bytes.subarray(0, 16);
  const ok = {
    'image/png': () => inicio.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/jpeg': () => inicio[0] === 0xff && inicio[1] === 0xd8 && inicio[2] === 0xff,
    'image/webp': () => inicio.subarray(0, 4).toString('latin1') === 'RIFF' && inicio.subarray(8, 12).toString('latin1') === 'WEBP',
    'image/svg+xml': () => {
      const texto = bytes.toString('utf8');
      if (!/^﻿?\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(texto)) return false;
      const perigoso =
        /<script|<foreignObject|<iframe|<embed|<object|<!ENTITY|javascript:|\son[a-z]+\s*=|(?:xlink:)?href\s*=\s*["']\s*(?!#)/i;
      if (perigoso.test(texto)) throw new ErroHttp(422, 'Este SVG tem conteúdo ativo ou links externos e não pode ser usado. Exporte novamente como SVG simples ou use PNG.');
      return true;
    },
  }[tipo];
  if (!ok || !ok()) throw new ErroHttp(415, 'O arquivo não corresponde ao formato informado. Use PNG, JPG, WebP ou SVG.');
}
