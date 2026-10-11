/**
 * Testes da API do painel administrativo.
 * Cada teste usa uma CÓPIA temporária do conteúdo: o conteúdo real nunca é alterado.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { criarServidor } from '../../scripts/admin/servidor.mjs';

const PROJETO = process.cwd();
let raiz: string;
let painel: { iniciar: () => Promise<{ porta: number }>; parar: () => Promise<void>; token: string };
let base: string;

beforeEach(async () => {
  raiz = mkdtempSync(join(tmpdir(), 'painel-api-'));
  cpSync(join(PROJETO, 'src', 'content'), join(raiz, 'src', 'content'), { recursive: true });
  cpSync(join(PROJETO, 'public'), join(raiz, 'public'), { recursive: true });
  painel = criarServidor({ raiz, porta: 0 });
  const { porta } = await painel.iniciar();
  base = `http://127.0.0.1:${porta}`;
});

afterEach(async () => {
  await painel.parar();
  rmSync(raiz, { recursive: true, force: true });
});

async function api(metodo: string, caminho: string, corpo?: unknown, extras: Record<string, string> = {}) {
  const r = await fetch(base + caminho, {
    method: metodo,
    headers: { 'X-Admin-Token': painel.token, ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...extras },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, json: await r.json() };
}

const lerJson = (arquivo: string) => JSON.parse(readFileSync(join(raiz, 'src', 'content', arquivo), 'utf8'));
const versoes = async () => (await api('GET', '/api/conteudo')).json.versoes as Record<string, string>;

const projetoNovo = () => ({
  titulo: 'Projeto de teste',
  slug: 'projeto-de-teste',
  subtitulo: 'Subtítulo de teste',
  resumo: 'Resumo de teste com tamanho suficiente.',
  natureza: 'academico',
  periodo: '2026',
  categorias: ['python'],
  tecnologias: ['Python'],
  contexto: 'Contexto de teste do projeto.',
  problema: 'Problema de teste do projeto.',
  objetivo: 'Objetivo de teste do projeto.',
  dados: { descricao: 'Dados de teste.', origem: 'Criados para teste.' },
  solucao: ['Etapa 1'],
  resultados: [{ tipo: 'pendente', texto: 'Sem resultado ainda.' }],
  status: 'rascunho',
});

describe('segurança', () => {
  it('recusa chamadas sem o token da sessão', async () => {
    const r = await fetch(`${base}/api/conteudo`);
    expect(r.status).toBe(401);
  });

  it('recusa token errado', async () => {
    const r = await fetch(`${base}/api/conteudo`, { headers: { 'X-Admin-Token': 'x'.repeat(48) } });
    expect(r.status).toBe(401);
  });

  it('recusa Host diferente do endereço local (DNS rebinding)', async () => {
    const porta = new URL(base).port;
    const status = await new Promise<number>((ok) => {
      http.get({ host: '127.0.0.1', port: porta, path: '/', headers: { Host: 'site-malicioso.com' } }, (r) => ok(r.statusCode ?? 0));
    });
    expect(status).toBe(403);
  });

  it('recusa origem de outro site', async () => {
    const r = await api('GET', '/api/conteudo', undefined, { Origin: 'https://site-malicioso.com' });
    expect(r.status).toBe(403);
  });

  it('serve o painel com política de segurança de conteúdo e token embutido', async () => {
    const r = await fetch(`${base}/`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(await r.text()).toContain(painel.token);
  });

  it('bloqueia acesso a arquivos fora da pasta do painel', async () => {
    for (const caminho of ['/../package.json', '/%2e%2e/package.json', '/midia/img/../../package.json']) {
      const r = await fetch(base + caminho);
      expect(r.status, caminho).not.toBe(200);
    }
  });

  it('exige JSON nas gravações', async () => {
    const r = await fetch(`${base}/api/colecoes/projetos/itens`, {
      method: 'POST',
      headers: { 'X-Admin-Token': painel.token, 'Content-Type': 'text/plain' },
      body: 'x',
    });
    expect(r.status).toBe(415);
  });
});

describe('consultar e criar', () => {
  it('lista todas as coleções com versão', async () => {
    const r = await api('GET', '/api/conteudo');
    expect(r.status).toBe(200);
    expect(r.json.conteudo.projetos).toHaveLength(6);
    expect(Object.keys(r.json.versoes)).toContain('instituicoes');
  });

  it('cria projeto válido como rascunho e grava no arquivo', async () => {
    const v = await versoes();
    const r = await api('POST', '/api/colecoes/projetos/itens', { item: projetoNovo(), versao: v.projetos });
    expect(r.status).toBe(200);
    expect(r.json.versao).not.toBe(v.projetos);
    const lista = lerJson('projetos.json');
    expect(lista).toHaveLength(7);
    expect(lista[6]).toMatchObject({ slug: 'projeto-de-teste', status: 'rascunho' });
  });

  it('recusa dados inválidos com mensagens por campo e não grava nada', async () => {
    const v = await versoes();
    const antes = readFileSync(join(raiz, 'src/content/projetos.json'), 'utf8');
    const item = { ...projetoNovo(), titulo: '', slug: 'Endereço Inválido', categorias: [], links: [{ rotulo: 'X', href: '/nao-existe/' }] };
    const r = await api('POST', '/api/colecoes/projetos/itens', { item, versao: v.projetos });
    expect(r.status).toBe(422);
    const caminhos = r.json.erros.map((e: { caminho: string }) => e.caminho);
    expect(caminhos).toEqual(expect.arrayContaining(['titulo', 'slug', 'categorias', 'links.0.href']));
    expect(readFileSync(join(raiz, 'src/content/projetos.json'), 'utf8')).toBe(antes);
  });

  it('recusa endereço (slug) repetido', async () => {
    const v = await versoes();
    const r = await api('POST', '/api/colecoes/projetos/itens', { item: { ...projetoNovo(), slug: 'atividade-flask' }, versao: v.projetos });
    expect(r.status).toBe(422);
    expect(r.json.erros[0]).toMatchObject({ caminho: 'slug' });
  });

  it('gera identificador único para itens sem endereço editável', async () => {
    const v = await versoes();
    const r = await api('POST', '/api/colecoes/instituicoes/itens', { item: { id: '', nome: 'Senac' }, versao: v.instituicoes });
    expect(r.status).toBe(200);
    expect(r.json.item.id).toBe('senac-2');
  });

  it('valida sem gravar (validação ao vivo do formulário)', async () => {
    const r = await api('POST', '/api/validar/cursos', { item: { curso: '', instituicao: 'nao-existe', status: 'concluido', data: '2026-13' } });
    expect(r.status).toBe(200);
    const caminhos = r.json.erros.map((e: { caminho: string }) => e.caminho);
    expect(caminhos).toEqual(expect.arrayContaining(['curso', 'instituicao', 'data']));
  });
});

describe('atualizar', () => {
  it('atualiza item e registra a versão anterior no histórico', async () => {
    const v = await versoes();
    const atual = lerJson('projetos.json').find((p: { slug: string }) => p.slug === 'atividade-flask');
    const r = await api('PUT', '/api/colecoes/projetos/itens/atividade-flask', { item: { ...atual, periodo: '2025' }, versao: v.projetos });
    expect(r.status).toBe(200);
    expect(lerJson('projetos.json').find((p: { slug: string }) => p.slug === 'atividade-flask').periodo).toBe('2025');
    const h = await api('GET', '/api/historico?colecao=projetos');
    expect(h.json.itens[0].acao).toContain('Atividade Flask');
  });

  it('detecta edição simultânea (versão desatualizada) e não sobrescreve', async () => {
    const v = await versoes();
    const atual = lerJson('projetos.json')[0];
    expect((await api('PUT', `/api/colecoes/projetos/itens/${atual.slug}`, { item: { ...atual, periodo: '2025' }, versao: v.projetos })).status).toBe(200);
    const r = await api('PUT', `/api/colecoes/projetos/itens/${atual.slug}`, { item: { ...atual, periodo: '2024' }, versao: v.projetos });
    expect(r.status).toBe(409);
    expect(r.json.codigo).toBe('conflito');
    expect(lerJson('projetos.json')[0].periodo).toBe('2025');
  });

  it('não deixa mudar o endereço de um projeto usado em outra página', async () => {
    const v = await versoes();
    const sim = lerJson('projetos.json').find((p: { slug: string }) => p.slug === 'simulacao-torre-controle');
    const r = await api('PUT', '/api/colecoes/projetos/itens/simulacao-torre-controle', { item: { ...sim, slug: 'outro-endereco' }, versao: v.projetos });
    expect(r.status).toBe(422);
    expect(r.json.erros.some((e: { mensagem: string }) => e.mensagem.includes('usado em'))).toBe(true);
  });

  it('atualiza item único (página inicial) e reordena lista', async () => {
    const v = await versoes();
    const inicio = lerJson('inicio.json');
    expect((await api('PUT', '/api/colecoes/inicio', { dados: { ...inicio, titulo: 'Novo título' }, versao: v.inicio })).status).toBe(200);
    expect(lerJson('inicio.json').titulo).toBe('Novo título');

    const ids = lerJson('cursos.json').map((c: { id: string }) => c.id);
    const r = await api('POST', '/api/colecoes/cursos/ordem', { ids: [...ids].reverse(), versao: v.cursos });
    expect(r.status).toBe(200);
    expect(lerJson('cursos.json').map((c: { id: string }) => c.id)).toEqual([...ids].reverse());
  });
});

describe('excluir, lixeira e histórico', () => {
  it('exige confirmação digitada, move para a lixeira e restaura na mesma posição', async () => {
    const v = await versoes();
    const posicao = lerJson('projetos.json').findIndex((p: { slug: string }) => p.slug === 'laboratorio-roteirizacao');

    const semConfirmar = await api('POST', '/api/colecoes/projetos/itens/laboratorio-roteirizacao/excluir', { versao: v.projetos, confirmacao: 'banco' });
    expect(semConfirmar.status).toBe(400);
    expect(lerJson('projetos.json')).toHaveLength(6);

    const r = await api('POST', '/api/colecoes/projetos/itens/laboratorio-roteirizacao/excluir', { versao: v.projetos, confirmacao: 'laboratorio-roteirizacao' });
    expect(r.status).toBe(200);
    expect(lerJson('projetos.json')).toHaveLength(5);

    const lixeira = await api('GET', '/api/lixeira');
    expect(lixeira.json.itens[0]).toMatchObject({ colecao: 'projetos', chave: 'laboratorio-roteirizacao' });

    const rest = await api('POST', `/api/lixeira/${lixeira.json.itens[0].entrada}/restaurar`, {});
    expect(rest.status).toBe(200);
    const lista = lerJson('projetos.json');
    expect(lista[posicao].slug).toBe('laboratorio-roteirizacao');
    expect((await api('GET', '/api/lixeira')).json.itens).toHaveLength(0);
  });

  it('bloqueia exclusão de item usado em outras partes e informa onde', async () => {
    const v = await versoes();
    const refs = await api('GET', '/api/colecoes/instituicoes/itens/senac/referencias');
    expect(refs.json.referencias.length).toBeGreaterThan(0);
    const r = await api('POST', '/api/colecoes/instituicoes/itens/senac/excluir', { versao: v.instituicoes, confirmacao: 'senac' });
    expect(r.status).toBe(409);
    expect(r.json.codigo).toBe('referenciado');
    expect(lerJson('instituicoes.json').some((i: { id: string }) => i.id === 'senac')).toBe(true);
  });

  it('exclusão definitiva da lixeira exige nova confirmação', async () => {
    const v = await versoes();
    await api('POST', '/api/colecoes/marcos/itens/2017-09-chao-de-fabrica/excluir', { versao: v.marcos, confirmacao: '2017-09-chao-de-fabrica' });
    const entrada = (await api('GET', '/api/lixeira')).json.itens[0].entrada;
    expect((await api('POST', `/api/lixeira/${entrada}/excluir-definitivo`, { confirmacao: 'errado' })).status).toBe(400);
    expect((await api('POST', `/api/lixeira/${entrada}/excluir-definitivo`, { confirmacao: '2017-09-chao-de-fabrica' })).status).toBe(200);
    expect(readdirSync(join(raiz, '.admin', 'lixeira'))).toHaveLength(0);
  });

  it('restaura uma versão do histórico', async () => {
    let v = await versoes();
    const site = lerJson('site.json');
    await api('PUT', '/api/colecoes/site', { dados: { ...site, local: 'Niterói, RJ' }, versao: v.site });
    expect(lerJson('site.json').local).toBe('Niterói, RJ');
    const entrada = (await api('GET', '/api/historico?colecao=site')).json.itens[0].entrada;
    v = await versoes();
    const r = await api('POST', '/api/historico/restaurar', { entrada, versao: v.site });
    expect(r.status).toBe(200);
    expect(lerJson('site.json').local).toBe('Rio de Janeiro, RJ');
  });
});

describe('imagens', () => {
  const PNG_1x1 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABXvMqGgAAAABJRU5ErkJggg==';

  it('aceita PNG válido e grava em public/img/<pasta>', async () => {
    const r = await api('POST', '/api/imagens', { pasta: 'instituicoes', nome: 'Logo Teste.png', tipo: 'image/png', base64: PNG_1x1 });
    expect(r.status).toBe(200);
    expect(r.json.arquivo).toMatch(/^\/img\/instituicoes\/logo-teste-[0-9a-f]{8}\.png$/);
    expect(existsSync(join(raiz, 'public', r.json.arquivo))).toBe(true);
  });

  it('associa o logotipo a uma instituição', async () => {
    const img = await api('POST', '/api/imagens', { pasta: 'instituicoes', nome: 'teste.png', tipo: 'image/png', base64: PNG_1x1 });
    const v = await versoes();
    const inst = lerJson('instituicoes.json').find((i: { id: string }) => i.id === 'senac');
    const r = await api('PUT', '/api/colecoes/instituicoes/itens/senac', { item: { ...inst, logo: { arquivo: img.json.arquivo } }, versao: v.instituicoes });
    expect(r.status).toBe(200);
    expect(lerJson('instituicoes.json').find((i: { id: string }) => i.id === 'senac').logo.arquivo).toBe(img.json.arquivo);
  });

  it('recusa arquivo com conteúdo diferente do tipo declarado', async () => {
    const r = await api('POST', '/api/imagens', { pasta: 'projetos', nome: 'x.png', tipo: 'image/png', base64: Buffer.from('não é imagem').toString('base64') });
    expect(r.status).toBe(415);
  });

  it('recusa SVG com script ou link externo', async () => {
    for (const svg of [
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://exemplo.com/x.png"/></svg>',
    ]) {
      const r = await api('POST', '/api/imagens', { pasta: 'instituicoes', nome: 'x.svg', tipo: 'image/svg+xml', base64: Buffer.from(svg).toString('base64') });
      expect(r.status, svg).toBe(422);
    }
  });

  it('aceita SVG simples', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#17365D"/></svg>';
    const r = await api('POST', '/api/imagens', { pasta: 'instituicoes', nome: 'quadrado.svg', tipo: 'image/svg+xml', base64: Buffer.from(svg).toString('base64') });
    expect(r.status).toBe(200);
  });

  it('recusa pasta e formato não permitidos e arquivos grandes', async () => {
    expect((await api('POST', '/api/imagens', { pasta: '../src', nome: 'x.png', tipo: 'image/png', base64: PNG_1x1 })).status).toBe(400);
    expect((await api('POST', '/api/imagens', { pasta: 'projetos', nome: 'x.gif', tipo: 'image/gif', base64: PNG_1x1 })).status).toBe(415);
    const grande = Buffer.concat([Buffer.from(PNG_1x1, 'base64'), Buffer.alloc(2.1 * 1024 * 1024)]).toString('base64');
    expect((await api('POST', '/api/imagens', { pasta: 'projetos', nome: 'x.png', tipo: 'image/png', base64: grande })).status).toBe(413);
  });
});
