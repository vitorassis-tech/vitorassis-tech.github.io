/**
 * Painel administrativo do portfólio — aplicação principal.
 * Rotas (no endereço após #):
 *   #/c/<colecao>                lista (ou formulário, se for item único)
 *   #/c/<colecao>/novo           criar
 *   #/c/<colecao>/editar/<id>    editar
 *   #/lixeira  ·  #/historico
 */
import { COLECOES, colecao, tituloDoItem, idDoItem, novoItem, STATUS, NATUREZAS, normalizarItem } from '/esquema.mjs';
import { api, ErroApi } from './js/api.js';
import { el, botao, icone, comCarregamento, avisar, confirmar, dataHora, mesAno } from './js/ui.js';
import { criarFormulario } from './js/formulario.js';

const URL_SITE = document.querySelector('meta[name="painel-url-site"]')?.content ?? 'http://localhost:4321';
const principal = document.getElementById('principal');
const menu = document.getElementById('menu-colecoes');

const estado = { conteudo: null, versoes: null, formulario: null, rotaAtual: location.hash, ignorarProximaRota: false };

/* ------------------------------------------------------------------ */
/* Dados                                                               */
/* ------------------------------------------------------------------ */

async function recarregar() {
  const r = await api.conteudo();
  estado.conteudo = r.conteudo;
  estado.versoes = r.versoes;
  desenharMenu();
}

const urlPrevia = (d, item) => `${URL_SITE.replace(/\/$/, '')}${d.url(item ?? {})}`;

/* ------------------------------------------------------------------ */
/* Menu lateral                                                         */
/* ------------------------------------------------------------------ */

const GRUPOS_MENU = [
  ['Conteúdo', ['projetos', 'experiencias', 'formacao', 'cursos', 'instituicoes', 'competencias', 'marcos']],
  ['Páginas', ['inicio', 'site', 'contatos']],
];

function desenharMenu() {
  const atual = location.hash;
  const link = (href, texto, contagem) =>
    el(
      'a',
      { href, 'aria-current': atual === href || atual.startsWith(`${href}/`) ? 'page' : undefined },
      el('span', { texto }),
      contagem !== undefined ? el('span', { class: 'contagem mono', texto: String(contagem) }) : null,
    );
  menu.replaceChildren(
    ...GRUPOS_MENU.map(([titulo, ids]) =>
      el(
        'div',
        { class: 'menu-grupo' },
        el('p', { class: 'menu-titulo mono', texto: titulo }),
        el('ul', {}, ids.map((id) => {
          const d = colecao(id);
          return el('li', {}, link(`#/c/${id}`, d.rotulo, d.tipo === 'lista' ? estado.conteudo?.[id]?.length : undefined));
        })),
      ),
    ),
    el(
      'div',
      { class: 'menu-grupo' },
      el('p', { class: 'menu-titulo mono', texto: 'Segurança' }),
      el('ul', {}, el('li', {}, link('#/lixeira', 'Lixeira')), el('li', {}, link('#/historico', 'Histórico de versões'))),
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Roteamento com proteção de alterações não salvas                    */
/* ------------------------------------------------------------------ */

const temAlteracoes = () => Boolean(estado.formulario && estado.formulario.alterados().length);

window.addEventListener('beforeunload', (e) => {
  if (temAlteracoes()) {
    e.preventDefault();
    e.returnValue = '';
  }
});

window.addEventListener('hashchange', async () => {
  if (estado.ignorarProximaRota) {
    estado.ignorarProximaRota = false;
    return;
  }
  if (temAlteracoes()) {
    const destino = location.hash;
    estado.ignorarProximaRota = true;
    location.hash = estado.rotaAtual;
    const ok = await confirmar({
      titulo: 'Sair sem salvar?',
      mensagem: 'Há alterações não salvas neste formulário. Se sair agora, elas serão perdidas.',
      textoConfirmar: 'Sair e descartar',
      variante: 'perigo',
    });
    if (!ok) return;
    estado.formulario = null;
    location.hash = destino;
    return;
  }
  rotear();
});

async function rotear() {
  estado.rotaAtual = location.hash || '#/c/projetos';
  if (!location.hash) history.replaceState(null, '', '#/c/projetos');
  estado.formulario = null;
  desenharMenu();
  const partes = estado.rotaAtual.replace(/^#\//, '').split('/').map(decodeURIComponent);
  try {
    if (partes[0] === 'c' && colecao(partes[1])) {
      const d = colecao(partes[1]);
      if (d.tipo === 'unico') return telaFormulario(d, null);
      if (partes[2] === 'novo') return telaFormulario(d, null, true);
      if (partes[2] === 'editar' && partes[3]) return telaFormulario(d, partes[3]);
      return telaLista(d);
    }
    if (partes[0] === 'lixeira') return telaLixeira();
    if (partes[0] === 'historico') return telaHistorico(partes[1]);
    telaMensagem('Página não encontrada', 'Escolha uma opção no menu.');
  } catch (erro) {
    telaMensagem('Não foi possível abrir esta tela', erro.message);
  }
}

function montar(...filhos) {
  principal.replaceChildren(...filhos);
  principal.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function cabecalho({ trilha, titulo, acoes = [], descricao }) {
  return el(
    'header',
    { class: 'tela-cab' },
    el('div', {}, trilha ? el('p', { class: 'trilha' }, trilha) : null, el('h1', { texto: titulo }), descricao ? el('p', { class: 'tela-desc', texto: descricao }) : null),
    acoes.length ? el('div', { class: 'tela-acoes' }, acoes) : null,
  );
}

function telaMensagem(titulo, mensagem) {
  montar(cabecalho({ titulo }), el('p', { class: 'estado-vazio', texto: mensagem }));
}

/* ------------------------------------------------------------------ */
/* CONSULTAR: lista                                                     */
/* ------------------------------------------------------------------ */

function telaLista(d) {
  const lista = estado.conteudo[d.id];
  let filtroStatus = 'todos';
  let busca = '';

  const campoBusca = el('input', { class: 'campo', type: 'search', id: 'busca', placeholder: `Buscar em ${d.rotulo.toLowerCase()}`, 'aria-label': `Buscar em ${d.rotulo}` });
  const anuncio = el('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const corpo = el('tbody');

  const abas = d.comStatus
    ? el(
        'div',
        { class: 'abas', role: 'group', 'aria-label': 'Filtrar por status' },
        [['todos', 'Todos'], ...Object.entries(STATUS)].map(([chave, texto]) =>
          el('button', {
            type: 'button',
            class: 'aba',
            'aria-pressed': String(chave === 'todos'),
            dados: { status: chave },
            texto: `${texto} ${chave === 'todos' ? lista.length : lista.filter((x) => x.status === chave).length}`,
            on: {
              click: (e) => {
                filtroStatus = chave;
                for (const b of e.currentTarget.parentElement.children) b.setAttribute('aria-pressed', String(b === e.currentTarget));
                desenhar();
              },
            },
          }),
        ),
      )
    : null;

  function desenhar() {
    const termo = busca.trim().toLowerCase();
    const visiveis = lista.filter(
      (item) => (filtroStatus === 'todos' || item.status === filtroStatus) && (!termo || JSON.stringify(item).toLowerCase().includes(termo)),
    );
    const filtrado = visiveis.length !== lista.length;
    corpo.replaceChildren(
      ...visiveis.map((item) => {
        const id = idDoItem(d, item);
        const i = lista.indexOf(item);
        const titulo = tituloDoItem(d, item);
        return el(
          'tr',
          { dados: { id } },
          d.ordenavel
            ? el(
                'td',
                { class: 'col-ordem' },
                botao({ variante: 'discreto', icone: 'cima', compacto: true, rotulo: `Mover “${titulo}” para cima`, desativado: filtrado || i === 0, onClick: (e) => reordenar(i, -1, e.currentTarget) }),
                botao({ variante: 'discreto', icone: 'baixo', compacto: true, rotulo: `Mover “${titulo}” para baixo`, desativado: filtrado || i === lista.length - 1, onClick: (e) => reordenar(i, 1, e.currentTarget) }),
              )
            : null,
          el('th', { scope: 'row' }, el('a', { href: `#/c/${d.id}/editar/${encodeURIComponent(id)}`, class: 'link-item', texto: titulo })),
          el('td', { class: 'col-info', texto: resumoItem(d, item) }),
          d.comStatus ? el('td', {}, el('span', { class: `chip chip-${item.status}`, texto: STATUS[item.status] })) : null,
          el(
            'td',
            { class: 'col-acoes' },
            el('a', { class: 'btn btn-secundario btn-compacto', href: `#/c/${d.id}/editar/${encodeURIComponent(id)}` }, icone('editar'), el('span', { class: 'btn-texto', texto: 'Editar' })),
            el('a', { class: 'btn btn-discreto btn-compacto', href: urlPrevia(d, item), target: '_blank', rel: 'noopener noreferrer' }, icone('olho'), el('span', { class: 'btn-texto', texto: 'Prévia' }), el('span', { class: 'visually-hidden', texto: ' (abre em nova aba)' })),
            botao({ variante: 'discreto', icone: 'lixeira', compacto: true, rotulo: `Mover “${titulo}” para a lixeira`, onClick: () => moverParaLixeira(d, id) }),
          ),
        );
      }),
    );
    vazio.hidden = visiveis.length > 0;
    anuncio.textContent = `${visiveis.length} ${visiveis.length === 1 ? 'item exibido' : 'itens exibidos'}`;
  }

  async function reordenar(i, delta, btn) {
    const ids = lista.map((x) => idDoItem(d, x));
    [ids[i], ids[i + delta]] = [ids[i + delta], ids[i]];
    try {
      await comCarregamento(btn, '', () => api.ordenar(d.id, ids, estado.versoes[d.id]));
      await recarregar();
      telaLista(d);
      principal.querySelector(`tr[data-id="${CSS.escape(ids[i + delta])}"] button[aria-label*="${delta < 0 ? 'cima' : 'baixo'}"]`)?.focus();
      avisar('sucesso', 'Ordem atualizada.');
    } catch (erro) {
      tratarErro(erro);
    }
  }

  campoBusca.addEventListener('input', () => {
    busca = campoBusca.value;
    desenhar();
  });

  const vazio = el('p', { class: 'estado-vazio', hidden: true, texto: 'Nenhum item encontrado com esses filtros.' });
  const tabela = el(
    'div',
    { class: 'tabela-rolagem', role: 'region', 'aria-label': `Lista de ${d.rotulo}`, tabindex: '0' },
    el(
      'table',
      { class: 'tabela' },
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          d.ordenavel ? el('th', { scope: 'col', class: 'col-ordem' }, el('span', { class: 'visually-hidden', texto: 'Ordem' })) : null,
          el('th', { scope: 'col', texto: 'Título' }),
          el('th', { scope: 'col', texto: 'Detalhe' }),
          d.comStatus ? el('th', { scope: 'col', texto: 'Status' }) : null,
          el('th', { scope: 'col', class: 'col-acoes' }, el('span', { class: 'visually-hidden', texto: 'Ações' })),
        ),
      ),
      corpo,
    ),
  );

  montar(
    cabecalho({
      trilha: 'Conteúdo',
      titulo: d.rotulo,
      descricao: d.nota,
      acoes: [el('a', { class: 'btn btn-primario', href: `#/c/${d.id}/novo` }, icone('mais'), el('span', { class: 'btn-texto', texto: `Novo ${d.singular}` }))],
    }),
    el('div', { class: 'barra-filtros' }, campoBusca, abas),
    anuncio,
    tabela,
    vazio,
    d.ordenavel ? el('p', { class: 'ajuda', texto: 'A ordem da lista é a ordem de exibição no site. Para reordenar, limpe a busca e os filtros.' }) : null,
  );
  desenhar();
}

function resumoItem(d, item) {
  if (d.id === 'projetos') return NATUREZAS[item.natureza] ?? '';
  if (d.id === 'formacao' || d.id === 'cursos') {
    const inst = estado.conteudo.instituicoes.find((i) => i.id === item.instituicao)?.nome ?? item.instituicao;
    return `${inst} · ${item.status === 'concluido' ? 'Concluído' : 'Em andamento'}, ${mesAno(item.data)}`;
  }
  if (d.id === 'experiencias') return `${mesAno(item.inicio)} – ${item.fim ? mesAno(item.fim) : 'atual'}`;
  if (d.id === 'instituicoes') return item.logo ? 'Com logotipo' : 'Sem logotipo (selo neutro)';
  if (d.id === 'marcos') return `${mesAno(item.data)}${item.proxima ? ' · prevista' : ''}`;
  if (d.id === 'competencias') return `${item.itens?.length ?? 0} competências`;
  return String(item[d.campoResumo] ?? '');
}

/* ------------------------------------------------------------------ */
/* CRIAR / ATUALIZAR: formulário                                        */
/* ------------------------------------------------------------------ */

function telaFormulario(d, id, novo = false) {
  const unico = d.tipo === 'unico';
  let original = unico ? estado.conteudo[d.id] : novo ? novoItem(d.id) : estado.conteudo[d.id].find((x) => idDoItem(d, x) === id);
  if (!original) return telaMensagem('Item não encontrado', `Este ${d.singular} não existe mais. Ele pode ter sido excluído em outra aba.`);
  let idAtual = id;

  const resumoErros = el('div', { class: 'resumo-erros', role: 'alert', tabindex: '-1', hidden: true });
  const contagem = el('span', { class: 'barra-status', 'aria-live': 'polite' });
  const btnSalvar = botao({ texto: novo ? `Criar ${d.singular}` : 'Salvar alterações', variante: 'primario', tipo: 'submit' });
  const btnDescartar = botao({ texto: 'Descartar alterações', variante: 'discreto', onClick: descartar });

  let validacaoPendente = null;
  let tentouSalvar = false;
  const form = criarFormulario({
    descritor: d,
    valor: original,
    conteudo: estado.conteudo,
    novo,
    aoAlterar: () => {
      atualizarBarra();
      clearTimeout(validacaoPendente);
      validacaoPendente = setTimeout(validarAoVivo, 500);
    },
  });
  estado.formulario = form;

  function atualizarBarra() {
    const n = form.alterados().length;
    contagem.textContent = n ? `${n} ${n === 1 ? 'alteração não salva' : 'alterações não salvas'}` : novo ? 'Preencha os campos e clique em criar' : 'Nenhuma alteração';
    barra.classList.toggle('com-alteracoes', n > 0);
    btnDescartar.hidden = n === 0;
    // Na edição, salvar só fica disponível quando algo mudou (evita gravações acidentais)
    if (!novo && btnSalvar.getAttribute('aria-busy') !== 'true') btnSalvar.disabled = n === 0;
  }

  async function validarAoVivo() {
    try {
      const r = await api.validar(d.id, form.obter(), novo ? undefined : idAtual);
      const resumo = form.marcarErros(r.erros, { apenasTocados: !tentouSalvar });
      if (tentouSalvar) mostrarResumo(resumo);
    } catch {
      /* validação ao vivo é auxiliar: falhas aparecem ao salvar */
    }
  }

  function mostrarResumo(resumo) {
    if (!resumo.length) {
      resumoErros.hidden = true;
      return;
    }
    resumoErros.replaceChildren(
      el('h2', { texto: `${resumo.length} ${resumo.length === 1 ? 'campo precisa' : 'campos precisam'} de atenção` }),
      el('p', { texto: 'Corrija os itens abaixo para salvar. Nada foi gravado.' }),
      el(
        'ul',
        {},
        resumo.map((e) =>
          el('li', {}, el('a', { href: '#', texto: `${e.rotulo}: ${e.mensagem}`, on: { click: (ev) => (ev.preventDefault(), form.focar(e.alvo)) } })),
        ),
      ),
    );
    resumoErros.hidden = false;
  }

  async function salvar(e) {
    e.preventDefault();
    tentouSalvar = true;
    clearTimeout(validacaoPendente);
    const item = form.obter();
    try {
      const r = await comCarregamento(btnSalvar, novo ? 'Criando…' : 'Salvando…', async () => {
        if (unico) return api.atualizarUnico(d.id, item, estado.versoes[d.id]);
        if (novo) return api.criar(d.id, item, estado.versoes[d.id]);
        return api.atualizar(d.id, idAtual, item, estado.versoes[d.id]);
      });
      await recarregar();
      form.limparErros();
      resumoErros.hidden = true;
      const salvo = r.item ?? normalizarItem(d.id, item);
      const titulo = unico ? d.rotulo : tituloDoItem(d, salvo);
      avisar('sucesso', `${unico ? d.rotulo : `“${titulo}”`} ${novo ? 'criado' : 'salvo'} com sucesso.`, { href: urlPrevia(d, salvo), texto: 'Ver prévia', externo: true });
      form.redefinir();
      if (novo || (!unico && idDoItem(d, salvo) !== idAtual)) {
        estado.formulario = null;
        estado.ignorarProximaRota = true;
        location.hash = `#/c/${d.id}/editar/${encodeURIComponent(idDoItem(d, salvo))}`;
        rotear();
        return;
      }
      original = salvo;
      atualizarBarra();
    } catch (erro) {
      if (erro instanceof ErroApi && erro.status === 422) {
        const resumo = form.marcarErros(erro.erros);
        const outros = erro.erros.filter((x) => x.colecao && x.colecao !== d.id);
        mostrarResumo([...resumo, ...outros.map((x) => ({ ...x, rotulo: colecao(x.colecao)?.rotulo ?? 'Outro conteúdo', alvo: null }))]);
        resumoErros.focus();
        return;
      }
      tratarErro(erro);
    }
  }

  async function descartar() {
    const ok = await confirmar({
      titulo: 'Descartar alterações?',
      mensagem: 'Os campos voltarão aos valores salvos. Esta ação não afeta o que já está gravado.',
      textoConfirmar: 'Descartar',
      variante: 'perigo',
    });
    if (!ok) return;
    estado.formulario = null;
    rotear();
  }

  const titulo = unico ? d.rotulo : novo ? `Novo ${d.singular}` : tituloDoItem(d, original);
  const acoes = [];
  if (!novo) {
    acoes.push(el('a', { class: 'btn btn-secundario', href: urlPrevia(d, original), target: '_blank', rel: 'noopener noreferrer' }, icone('olho'), el('span', { class: 'btn-texto', texto: 'Ver prévia' }), el('span', { class: 'visually-hidden', texto: ' (abre em nova aba)' })));
    if (!unico) acoes.push(botao({ texto: 'Mover para a lixeira', icone: 'lixeira', variante: 'perigo-contorno', onClick: () => moverParaLixeira(d, idAtual) }));
  }

  const barra = el('div', { class: 'barra-salvar' }, contagem, el('div', { class: 'tela-acoes' }, btnDescartar, btnSalvar));
  const formulario = el('form', { class: 'tela-form', novalidate: true, on: { submit: salvar } }, resumoErros, form.elemento, barra);

  montar(
    cabecalho({
      trilha: unico ? 'Páginas' : el('a', { href: `#/c/${d.id}`, texto: d.rotulo }),
      titulo,
      acoes,
      descricao: novo && d.comStatus ? 'Novos projetos começam como rascunho: só aparecem no site depois de publicados.' : undefined,
    }),
    formulario,
  );
  atualizarBarra();
}

/* ------------------------------------------------------------------ */
/* EXCLUIR: confirmação explícita → lixeira                             */
/* ------------------------------------------------------------------ */

async function moverParaLixeira(d, id) {
  let info;
  try {
    info = await api.referencias(d.id, id);
  } catch (erro) {
    return tratarErro(erro);
  }
  const detalhes = [
    el('p', {}, el('strong', { texto: 'Será removido do site: ' }), `a página ou seção ${info.url}`, info.imagens.length ? ` e ${info.imagens.length} imagem(ns) deixará(ão) de ser exibida(s)` : '', '.'),
  ];
  const bloqueado = info.referencias.length > 0;
  if (bloqueado) {
    detalhes.push(
      el('p', { texto: 'Este item é usado em:' }),
      el('ul', {}, info.referencias.map((r) => el('li', { texto: `${r.titulo} — ${r.onde}` }))),
    );
  }
  const ok = await confirmar({
    titulo: `Mover “${info.titulo}” para a lixeira?`,
    mensagem: bloqueado
      ? 'Não é possível excluir agora, porque outras partes do site dependem deste item.'
      : 'O item sai do site na próxima publicação. Você pode restaurá-lo pela Lixeira ou pelo Histórico de versões.',
    detalhes,
    bloqueio: bloqueado ? 'Remova ou troque as referências acima e tente novamente.' : undefined,
    exigirTexto: bloqueado ? undefined : id,
    textoConfirmar: 'Mover para a lixeira',
    textoCarregando: 'Movendo…',
    variante: 'perigo',
    aoConfirmar: async () => {
      await api.excluir(d.id, id, estado.versoes[d.id], id);
    },
  });
  if (!ok || bloqueado) return;
  estado.formulario = null;
  await recarregar();
  avisar('sucesso', `“${info.titulo}” foi movido para a lixeira.`, { href: '#/lixeira', texto: 'Abrir lixeira' });
  estado.ignorarProximaRota = location.hash !== `#/c/${d.id}`;
  location.hash = `#/c/${d.id}`;
  rotear();
}

/* ------------------------------------------------------------------ */
/* Lixeira                                                              */
/* ------------------------------------------------------------------ */

async function telaLixeira() {
  const { itens } = await api.lixeira();
  const linhas = itens.map((x) =>
    el(
      'tr',
      {},
      el('th', { scope: 'row', texto: x.titulo }),
      el('td', { texto: x.rotuloColecao }),
      el('td', { texto: dataHora(x.excluidoEm) }),
      el(
        'td',
        { class: 'col-acoes' },
        botao({
          texto: 'Restaurar',
          icone: 'restaurar',
          variante: 'secundario',
          compacto: true,
          onClick: async () => {
            const ok = await confirmar({
              titulo: `Restaurar “${x.titulo}”?`,
              mensagem: `O item volta para ${x.rotuloColecao}, na posição em que estava.`,
              textoConfirmar: 'Restaurar',
              textoCarregando: 'Restaurando…',
              aoConfirmar: () => api.restaurarLixeira(x.entrada),
            });
            if (!ok) return;
            await recarregar();
            avisar('sucesso', `“${x.titulo}” foi restaurado.`, { href: `#/c/${x.colecao}/editar/${encodeURIComponent(x.chave)}`, texto: 'Abrir' });
            telaLixeira();
          },
        }),
        botao({
          texto: 'Excluir definitivamente',
          icone: 'lixeira',
          variante: 'perigo-contorno',
          compacto: true,
          onClick: async () => {
            const ok = await confirmar({
              titulo: `Excluir “${x.titulo}” definitivamente?`,
              mensagem: 'O item sai da lixeira e não poderá ser restaurado por aqui. Ele ainda pode existir no histórico de versões e no Git, se já tiver sido salvo em um commit.',
              exigirTexto: x.chave,
              textoConfirmar: 'Excluir definitivamente',
              textoCarregando: 'Excluindo…',
              variante: 'perigo',
              aoConfirmar: () => api.excluirDefinitivo(x.entrada, x.chave),
            });
            if (!ok) return;
            avisar('sucesso', `“${x.titulo}” foi excluído definitivamente.`);
            telaLixeira();
          },
        }),
      ),
    ),
  );
  montar(
    cabecalho({ trilha: 'Segurança', titulo: 'Lixeira', descricao: 'Itens excluídos ficam aqui até você restaurar ou excluir definitivamente.' }),
    itens.length
      ? el(
          'div',
          { class: 'tabela-rolagem', role: 'region', 'aria-label': 'Itens na lixeira', tabindex: '0' },
          el(
            'table',
            { class: 'tabela' },
            el('thead', {}, el('tr', {}, el('th', { scope: 'col', texto: 'Item' }), el('th', { scope: 'col', texto: 'Origem' }), el('th', { scope: 'col', texto: 'Excluído em' }), el('th', { scope: 'col', class: 'col-acoes' }, el('span', { class: 'visually-hidden', texto: 'Ações' })))),
            el('tbody', {}, linhas),
          ),
        )
      : el('p', { class: 'estado-vazio', texto: 'A lixeira está vazia.' }),
  );
}

/* ------------------------------------------------------------------ */
/* Histórico de versões                                                 */
/* ------------------------------------------------------------------ */

async function telaHistorico(filtro) {
  const { itens } = await api.historico(filtro);
  const seletor = el(
    'select',
    { class: 'campo', id: 'filtro-historico', on: { change: (e) => (location.hash = e.target.value ? `#/historico/${e.target.value}` : '#/historico') } },
    el('option', { value: '', texto: 'Todas as seções' }),
    COLECOES.map((c) => el('option', { value: c.id, texto: c.rotulo, selected: c.id === filtro })),
  );
  const linhas = itens.map((x) =>
    el(
      'tr',
      {},
      el('td', { texto: dataHora(x.salvoEm) }),
      el('td', { texto: x.rotuloColecao }),
      el('th', { scope: 'row', texto: `Antes de: ${x.acao}` }),
      el(
        'td',
        { class: 'col-acoes' },
        botao({
          texto: 'Restaurar esta versão',
          icone: 'restaurar',
          variante: 'secundario',
          compacto: true,
          onClick: async () => {
            const ok = await confirmar({
              titulo: `Restaurar ${x.rotuloColecao} para a versão de ${dataHora(x.salvoEm)}?`,
              mensagem: `Todo o conteúdo de ${x.rotuloColecao} será substituído por esta versão. A versão atual também vai para o histórico, então esta ação pode ser desfeita.`,
              textoConfirmar: 'Restaurar versão',
              textoCarregando: 'Restaurando…',
              variante: 'perigo',
              aoConfirmar: () => api.restaurarHistorico(x.entrada, estado.versoes[x.colecao]),
            });
            if (!ok) return;
            await recarregar();
            avisar('sucesso', `${x.rotuloColecao} foi restaurado para a versão de ${dataHora(x.salvoEm)}.`, { href: `#/c/${x.colecao}`, texto: 'Abrir' });
            telaHistorico(filtro);
          },
        }),
      ),
    ),
  );
  montar(
    cabecalho({ trilha: 'Segurança', titulo: 'Histórico de versões', descricao: 'Cada salvamento guarda a versão anterior da seção. São mantidas as 100 versões mais recentes de cada seção.' }),
    el('div', { class: 'barra-filtros' }, el('label', { for: 'filtro-historico', class: 'rotulo-inline', texto: 'Seção' }), seletor),
    itens.length
      ? el(
          'div',
          { class: 'tabela-rolagem', role: 'region', 'aria-label': 'Versões salvas', tabindex: '0' },
          el(
            'table',
            { class: 'tabela' },
            el('thead', {}, el('tr', {}, el('th', { scope: 'col', texto: 'Salvo em' }), el('th', { scope: 'col', texto: 'Seção' }), el('th', { scope: 'col', texto: 'Versão' }), el('th', { scope: 'col', class: 'col-acoes' }, el('span', { class: 'visually-hidden', texto: 'Ações' })))),
            el('tbody', {}, linhas),
          ),
        )
      : el('p', { class: 'estado-vazio', texto: 'Nenhuma versão anterior ainda. O histórico começa a partir do primeiro salvamento pelo painel.' }),
  );
}

/* ------------------------------------------------------------------ */
/* Erros                                                                */
/* ------------------------------------------------------------------ */

async function tratarErro(erro) {
  if (erro instanceof ErroApi && erro.codigo === 'conflito') {
    await confirmar({
      titulo: 'O conteúdo mudou em outro lugar',
      mensagem: erro.message,
      detalhes: [el('p', { texto: 'Para não sobrescrever a outra alteração, nada foi gravado. Ao recarregar, suas alterações não salvas neste formulário serão perdidas.' })],
      textoConfirmar: 'Recarregar dados',
      textoCarregando: 'Recarregando…',
      aoConfirmar: async () => {
        estado.formulario = null;
        await recarregar();
        rotear();
      },
    });
    return;
  }
  if (erro instanceof ErroApi && erro.codigo === 'referenciado') {
    avisar('erro', `${erro.message} Usado em: ${erro.referencias.map((r) => r.titulo).join(', ')}.`);
    return;
  }
  avisar('erro', erro.message || 'Algo deu errado. Nada foi gravado.');
}

/* ------------------------------------------------------------------ */
/* Início                                                               */
/* ------------------------------------------------------------------ */

document.getElementById('link-site').href = URL_SITE;

// Menu recolhível em telas pequenas (fecha ao escolher uma seção)
const botaoMenu = document.getElementById('botao-menu');
const lateral = document.querySelector('.lateral');
botaoMenu.addEventListener('click', () => {
  const aberto = botaoMenu.getAttribute('aria-expanded') !== 'true';
  botaoMenu.setAttribute('aria-expanded', String(aberto));
  lateral.classList.toggle('menu-aberto', aberto);
});
menu.addEventListener('click', (e) => {
  if (e.target.closest('a') && getComputedStyle(botaoMenu).display !== 'none') {
    botaoMenu.setAttribute('aria-expanded', 'false');
    lateral.classList.remove('menu-aberto');
  }
});
try {
  await recarregar();
  rotear();
} catch (erro) {
  telaMensagem('Não foi possível carregar o conteúdo', erro.message);
}
