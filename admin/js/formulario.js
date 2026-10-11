/**
 * Formulário gerado a partir do esquema (src/lib/esquema.mjs).
 * - Um único padrão de campos, rótulos, ajudas, contadores e mensagens de erro.
 * - Listas com adicionar, mover e remover itens.
 * - Rastreia campos alterados para evitar perdas e alterações acidentais.
 */
import { el, botao, icone, comCarregamento, avisar } from './ui.js';
import { novoSubitem, colecao as descritorDe, tituloDoItem, slugificar, STATUS } from '/esquema.mjs';
import { api } from './api.js';

let sequencia = 0;
const novoId = (p = 'campo') => `${p}-${++sequencia}`;
const TIPOS_IMAGEM = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const LIMITE_IMAGEM = 2 * 1024 * 1024;

/**
 * @param {{descritor:any, valor:any, conteudo:any, novo?:boolean, aoAlterar?:()=>void}} opcoes
 */
export function criarFormulario({ descritor, valor, conteudo, novo = false, aoAlterar = () => {} }) {
  const raiz = el('div', { class: 'formulario' });
  const avisarAlteracao = () => {
    atualizarMarcas();
    aoAlterar();
  };

  /* ---------- Estrutura comum de um campo ---------- */

  function grupo(campo, caminho, { conteudoCampo, idControle, agrupado = false, contador }) {
    const idAjuda = campo.ajuda ? `${idControle}-ajuda` : null;
    const idErro = `${idControle}-erro`;
    const descricao = [idAjuda, idErro].filter(Boolean).join(' ');
    const rotulo = [
      campo.rotulo,
      campo.obrigatorio ? el('span', { class: 'obrig', 'aria-hidden': 'true', texto: ' *' }) : null,
      campo.obrigatorio ? el('span', { class: 'visually-hidden', texto: ' (obrigatório)' }) : null,
    ];
    const msg = el('p', { class: 'msg-erro', id: idErro, hidden: true });
    const ajuda = campo.ajuda ? el('p', { class: 'ajuda', id: idAjuda, texto: campo.ajuda }) : null;
    const rodape = contador || ajuda ? el('div', { class: 'campo-rodape' }, ajuda ?? el('span'), contador ?? null) : null;

    const wrapper = agrupado
      ? el('fieldset', { class: 'campo-grupo campo-conjunto', dados: { caminho }, 'aria-describedby': descricao }, el('legend', { class: 'rotulo' }, rotulo), conteudoCampo, rodape, msg)
      : el('div', { class: 'campo-grupo', dados: { caminho } }, el('label', { class: 'rotulo', for: idControle }, rotulo), conteudoCampo, rodape, msg);
    if (!agrupado) {
      const controle = wrapper.querySelector(`#${CSS.escape(idControle)}`);
      controle?.setAttribute('aria-describedby', descricao);
    }
    return wrapper;
  }

  function contadorPara(entrada, max) {
    if (!max) return null;
    const c = el('span', { class: 'contador', 'aria-live': 'off' });
    const atualizar = () => {
      const n = entrada.value.length;
      c.textContent = `${n} / ${max}`;
      c.classList.toggle('contador-limite', n > max * 0.9);
    };
    entrada.addEventListener('input', atualizar);
    atualizar();
    return c;
  }

  const crescer = (ta) => {
    const minimo = ta.classList.contains('campo-linha') ? 42 : 64;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight + 2, minimo)}px`;
  };

  /* ---------- Controles por tipo ---------- */

  function controleSimples(campo, v, caminho) {
    const id = novoId();
    let entrada;
    if (campo.tipo === 'textoLongo') {
      entrada = el('textarea', { class: 'campo', id, rows: 3, maxlength: campo.max, required: campo.obrigatorio });
      entrada.value = v ?? '';
      entrada.addEventListener('input', () => crescer(entrada));
      requestAnimationFrame(() => crescer(entrada));
    } else {
      const tipos = { mesAno: 'month', data: 'date', numero: 'number' };
      entrada = el('input', {
        class: 'campo',
        id,
        type: tipos[campo.tipo] ?? 'text',
        maxlength: campo.max,
        required: campo.obrigatorio,
        inputmode: campo.tipo === 'url' ? 'url' : campo.tipo === 'numero' ? 'numeric' : undefined,
        placeholder: campo.tipo === 'mesAno' ? 'AAAA-MM' : campo.tipo === 'url' ? (campo.aceita?.includes('interno') ? '/projetos/... ou https://...' : 'https://...') : undefined,
        min: campo.tipo === 'numero' ? campo.min : undefined,
        max: campo.tipo === 'numero' ? campo.max : undefined,
        step: campo.tipo === 'numero' ? 1 : undefined,
        spellcheck: ['slug', 'url'].includes(campo.tipo) ? 'false' : undefined,
        autocomplete: 'off',
      });
      entrada.value = v ?? '';
    }
    const wrapper = grupo(campo, caminho, { conteudoCampo: entrada, idControle: id, contador: ['texto', 'textoLongo'].includes(campo.tipo) ? contadorPara(entrada, campo.max) : null });
    return {
      elemento: wrapper,
      entrada,
      obter: () => {
        const x = entrada.value;
        if (campo.tipo === 'numero') return x === '' ? null : Number(x);
        if (campo.tipo === 'mesAno' && x === '' && campo.nulo) return null;
        return x;
      },
    };
  }

  function controleBooleano(campo, v, caminho) {
    const id = novoId();
    const caixa = el('input', { type: 'checkbox', id, class: 'caixa', checked: v === true });
    const idErro = `${id}-erro`;
    const ajuda = campo.ajuda ? el('p', { class: 'ajuda', id: `${id}-ajuda`, texto: campo.ajuda }) : null;
    caixa.setAttribute('aria-describedby', [ajuda ? `${id}-ajuda` : null, idErro].filter(Boolean).join(' '));
    const wrapper = el(
      'div',
      { class: 'campo-grupo campo-booleano', dados: { caminho } },
      el('label', { class: 'opcao-caixa', for: id }, caixa, el('span', { texto: campo.rotulo })),
      ajuda,
      el('p', { class: 'msg-erro', id: idErro, hidden: true }),
    );
    return { elemento: wrapper, obter: () => caixa.checked };
  }

  function opcoesDe(campo) {
    if (campo.tipo === 'referencia' || campo.tipo === 'listaReferencia') {
      const d = descritorDe(campo.ref);
      return Object.fromEntries((conteudo[campo.ref] ?? []).map((i) => [i[d.chave], tituloDoItem(d, i)]));
    }
    return campo.opcoes;
  }

  function seletor(campo, v, id, rotuloAcessivel) {
    const sel = el('select', { class: 'campo', id, required: campo.obrigatorio, 'aria-label': rotuloAcessivel });
    const opcoes = opcoesDe(campo);
    if (!campo.obrigatorio || !(v in opcoes)) sel.append(el('option', { value: '', texto: campo.obrigatorio ? 'Selecione…' : '—' }));
    for (const [valorOpcao, texto] of Object.entries(opcoes)) if (valorOpcao !== '') sel.append(el('option', { value: valorOpcao, texto }));
    sel.value = v ?? '';
    return sel;
  }

  function controleOpcao(campo, v, caminho) {
    const id = novoId();
    const sel = seletor(campo, v, id);
    return { elemento: grupo(campo, caminho, { conteudoCampo: sel, idControle: id }), obter: () => sel.value };
  }

  function controleListaOpcoes(campo, v, caminho) {
    const id = novoId();
    const marcados = new Set(v ?? []);
    const caixas = Object.entries(campo.opcoes).map(([chave, texto], i) => {
      const c = el('input', { type: 'checkbox', class: 'caixa', id: i === 0 ? id : novoId(), value: chave, checked: marcados.has(chave) });
      return { chave, c, rotulo: el('label', { class: 'opcao-caixa', for: c.id }, c, el('span', { texto })) };
    });
    const conteudoCampo = el('div', { class: 'grade-opcoes' }, caixas.map((x) => x.rotulo));
    return {
      elemento: grupo(campo, caminho, { conteudoCampo, idControle: id, agrupado: true }),
      obter: () => caixas.filter((x) => x.c.checked).map((x) => x.chave),
    };
  }

  /** Lista de linhas (texto ou seleção), com mover e remover. */
  function controleListaLinhas(campo, v, caminho) {
    const id = novoId();
    const lista = el('ol', { class: 'lista-linhas' });
    const ehSelecao = campo.tipo === 'listaReferencia';
    let linhas = [];
    const obter = () => linhas.map((e) => e.value);

    function desenhar(valores, focarIndice) {
      lista.replaceChildren();
      linhas = valores.map((x, i) => {
        const idLinha = i === 0 ? id : novoId();
        const rotulo = `${campo.rotulo}: linha ${i + 1}`;
        let entrada;
        if (ehSelecao) entrada = seletor({ ...campo, obrigatorio: true }, x, idLinha, rotulo);
        else {
          entrada = el('textarea', { class: 'campo campo-linha', id: idLinha, rows: 1, 'aria-label': rotulo, maxlength: campo.max });
          entrada.value = x;
          entrada.addEventListener('input', () => crescer(entrada));
          requestAnimationFrame(() => crescer(entrada));
        }
        const acoes = el(
          'div',
          { class: 'acoes-linha' },
          botao({ variante: 'discreto', icone: 'cima', rotulo: `Mover linha ${i + 1} para cima`, compacto: true, desativado: i === 0, onClick: () => mover(i, -1) }),
          botao({ variante: 'discreto', icone: 'baixo', rotulo: `Mover linha ${i + 1} para baixo`, compacto: true, desativado: i === valores.length - 1, onClick: () => mover(i, 1) }),
          botao({ variante: 'discreto', icone: 'lixeira', rotulo: `Remover linha ${i + 1}`, compacto: true, onClick: () => remover(i) }),
        );
        lista.append(el('li', { class: 'linha', dados: { caminho: `${caminho}.${i}` } }, entrada, acoes, el('p', { class: 'msg-erro', hidden: true })));
        return entrada;
      });
      vazio.hidden = valores.length > 0;
      if (focarIndice !== undefined && linhas.length) linhas[Math.min(focarIndice, linhas.length - 1)].focus();
    }
    function mover(i, d) {
      const atual = obter();
      [atual[i], atual[i + d]] = [atual[i + d], atual[i]];
      desenhar(atual, i + d);
      avisarAlteracao();
    }
    function remover(i) {
      const atual = obter();
      atual.splice(i, 1);
      desenhar(atual, i);
      if (!atual.length) adicionar.focus();
      avisarAlteracao();
    }
    const vazio = el('p', { class: 'lista-vazia', texto: 'Nenhum item.' });
    const adicionar = botao({
      texto: ehSelecao ? 'Adicionar projeto' : 'Adicionar linha',
      icone: 'mais',
      variante: 'secundario',
      compacto: true,
      onClick: () => {
        const atual = obter();
        if (campo.maxItens && atual.length >= campo.maxItens) return avisar('info', `Limite de ${campo.maxItens} itens neste campo.`);
        atual.push('');
        desenhar(atual, atual.length - 1);
        avisarAlteracao();
      },
    });
    const conteudoCampo = el('div', { class: 'lista' }, lista, vazio, adicionar);
    desenhar([...(v ?? [])]);
    return { elemento: grupo(campo, caminho, { conteudoCampo, idControle: id, agrupado: true }), obter };
  }

  /** Lista de objetos (ex.: cargos, decisões, links). */
  function controleListaObjetos(campo, v, caminho) {
    const id = novoId();
    const container = el('div', { class: 'subitens' });
    let renderizados = [];
    const obter = () => renderizados.map((r) => r.obter());

    function resumoDe(obj) {
      const primeiro = campo.campos.find((c) => ['texto', 'textoLongo'].includes(c.tipo));
      const texto = primeiro ? String(obj?.[primeiro.nome] ?? '').trim() : '';
      return texto.length > 70 ? `${texto.slice(0, 70)}…` : texto;
    }

    function desenhar(valores, focarIndice) {
      container.replaceChildren();
      renderizados = valores.map((obj, i) => {
        const r = renderCampos(campo.campos, obj, `${caminho}.${i}`);
        const titulo = `${campo.rotuloItem ?? 'Item'} ${i + 1}`;
        const resumo = el('span', { class: 'subitem-resumo', texto: resumoDe(obj) });
        const cartao = el(
          'section',
          { class: 'subitem', dados: { caminho: `${caminho}.${i}` }, 'aria-label': titulo },
          el(
            'header',
            { class: 'subitem-cab' },
            el('h3', {}, el('span', { class: 'mono', texto: titulo }), resumo),
            el(
              'div',
              { class: 'acoes-linha' },
              botao({ variante: 'discreto', icone: 'cima', rotulo: `Mover ${titulo} para cima`, compacto: true, desativado: i === 0, onClick: () => mover(i, -1) }),
              botao({ variante: 'discreto', icone: 'baixo', rotulo: `Mover ${titulo} para baixo`, compacto: true, desativado: i === valores.length - 1, onClick: () => mover(i, 1) }),
              botao({ variante: 'discreto', icone: 'lixeira', rotulo: `Remover ${titulo}`, compacto: true, onClick: () => remover(i) }),
            ),
          ),
          el('div', { class: 'subitem-corpo' }, r.elementos),
          el('p', { class: 'msg-erro', hidden: true }),
        );
        cartao.addEventListener('input', () => (resumo.textContent = resumoDe(r.obter())));
        container.append(cartao);
        return r;
      });
      vazio.hidden = valores.length > 0;
      if (focarIndice !== undefined && container.children.length) {
        container.children[Math.min(focarIndice, container.children.length - 1)].querySelector('input, textarea, select')?.focus();
      }
    }
    function mover(i, d) {
      const atual = obter();
      [atual[i], atual[i + d]] = [atual[i + d], atual[i]];
      desenhar(atual, i + d);
      avisarAlteracao();
    }
    function remover(i) {
      const atual = obter();
      atual.splice(i, 1);
      desenhar(atual, i);
      if (!atual.length) adicionar.focus();
      avisarAlteracao();
    }
    const vazio = el('p', { class: 'lista-vazia', texto: 'Nenhum item cadastrado.' });
    const adicionar = botao({
      texto: `Adicionar ${String(campo.rotuloItem ?? 'item').toLowerCase()}`,
      icone: 'mais',
      variante: 'secundario',
      compacto: true,
      onClick: () => {
        const atual = obter();
        if (campo.maxItens && atual.length >= campo.maxItens) return avisar('info', `Limite de ${campo.maxItens} itens neste campo.`);
        atual.push(novoSubitem(campo));
        desenhar(atual, atual.length - 1);
        avisarAlteracao();
      },
    });
    const conteudoCampo = el('div', { class: 'lista' }, container, vazio, adicionar);
    desenhar([...(v ?? [])]);
    return { elemento: grupo(campo, caminho, { conteudoCampo, idControle: id, agrupado: true }), obter };
  }

  function controleObjeto(campo, v, caminho) {
    const id = novoId();
    const r = renderCampos(campo.campos, v ?? {}, caminho);
    const conteudoCampo = el('div', { class: 'objeto-corpo', id }, r.elementos);
    return { elemento: grupo(campo, caminho, { conteudoCampo, idControle: id, agrupado: true }), obter: r.obter };
  }

  function controleImagem(campo, v, caminho) {
    const id = novoId();
    let atual = v ? { ...v } : null;
    const previa = el('div', { class: 'imagem-previa' });
    const nomeArquivo = el('p', { class: 'imagem-nome mono' });
    const seletorArquivo = el('input', { type: 'file', id, class: 'visually-hidden', accept: TIPOS_IMAGEM.join(','), tabindex: '-1', 'aria-label': `Arquivo de imagem: ${campo.rotulo}` });
    const btnEnviar = botao({ texto: 'Escolher imagem', icone: 'enviar', variante: 'secundario', compacto: true, onClick: () => seletorArquivo.click() });
    const btnRemover = botao({
      texto: 'Remover imagem',
      icone: 'lixeira',
      variante: 'perigo-contorno',
      compacto: true,
      onClick: () => {
        atual = null;
        atualizar();
        avisarAlteracao();
        btnEnviar.focus();
      },
    });
    const idAlt = novoId();
    const alt = el('input', { class: 'campo', id: idAlt, type: 'text', maxlength: 160, autocomplete: 'off' });
    alt.value = v?.alt ?? '';
    const grupoAlt = el(
      'div',
      { class: 'campo-grupo', dados: { caminho: `${caminho}.alt` } },
      el('label', { class: 'rotulo', for: idAlt }, campo.altOpcional ? 'Descrição da imagem (opcional)' : 'Descrição da imagem (texto alternativo)', campo.altOpcional ? null : el('span', { class: 'obrig', 'aria-hidden': 'true', texto: ' *' })),
      alt,
      el('p', { class: 'ajuda', texto: campo.altOpcional ? 'O nome da instituição já aparece ao lado do logotipo no site.' : 'Descreva o que a imagem mostra, para quem usa leitor de tela.' }),
      el('p', { class: 'msg-erro', hidden: true }),
    );

    function atualizar() {
      previa.replaceChildren(
        atual?.arquivo ? el('img', { src: `/midia${atual.arquivo}`, alt: '', loading: 'lazy' }) : el('span', { class: 'imagem-vazia' }, icone('imagem'), 'Sem imagem'),
      );
      nomeArquivo.textContent = atual?.arquivo ? atual.arquivo.split('/').pop() : '';
      btnRemover.hidden = !atual?.arquivo;
      grupoAlt.hidden = !atual?.arquivo;
      btnEnviar.querySelector('.btn-texto').textContent = atual?.arquivo ? 'Trocar imagem' : 'Escolher imagem';
    }

    seletorArquivo.addEventListener('change', async () => {
      const arquivo = seletorArquivo.files?.[0];
      seletorArquivo.value = '';
      if (!arquivo) return;
      const msg = wrapper.querySelector(':scope > .msg-erro');
      msg.hidden = true;
      if (!TIPOS_IMAGEM.includes(arquivo.type)) return mostrarErroCampo(wrapper, 'Formato não aceito. Use PNG, JPG, WebP ou SVG.');
      if (arquivo.size > LIMITE_IMAGEM) return mostrarErroCampo(wrapper, 'Arquivo maior que 2 MB. Reduza a imagem e tente de novo.');
      try {
        await comCarregamento(btnEnviar, 'Enviando…', async () => {
          const base64 = await paraBase64(arquivo);
          const r = await api.enviarImagem({ pasta: campo.pasta, nome: arquivo.name, tipo: arquivo.type, base64 });
          atual = { arquivo: r.arquivo, alt: alt.value };
        });
        atualizar();
        avisarAlteracao();
        avisar('sucesso', 'Imagem enviada. Salve para aplicar a alteração.');
        if (!campo.altOpcional) alt.focus();
      } catch (erro) {
        mostrarErroCampo(wrapper, erro.message);
      }
    });

    const conteudoCampo = el(
      'div',
      { class: 'imagem' },
      previa,
      el('div', { class: 'imagem-acoes' }, nomeArquivo, el('div', { class: 'acoes-linha' }, btnEnviar, btnRemover), seletorArquivo, grupoAlt),
    );
    const wrapper = grupo(campo, caminho, { conteudoCampo, idControle: id, agrupado: true });
    atualizar();
    return {
      elemento: wrapper,
      obter: () => (atual?.arquivo ? { arquivo: atual.arquivo, alt: alt.value } : null),
    };
  }

  function criarControle(campo, v, caminho) {
    switch (campo.tipo) {
      case 'booleano':
        return controleBooleano(campo, v, caminho);
      case 'opcao':
      case 'referencia':
        return controleOpcao(campo, v, caminho);
      case 'listaOpcoes':
        return controleListaOpcoes(campo, v, caminho);
      case 'listaTexto':
      case 'listaReferencia':
        return controleListaLinhas(campo, v, caminho);
      case 'listaObjetos':
        return controleListaObjetos(campo, v, caminho);
      case 'objeto':
        return controleObjeto(campo, v, caminho);
      case 'imagem':
        return controleImagem(campo, v, caminho);
      default:
        return controleSimples(campo, v, caminho);
    }
  }

  function renderCampos(campos, obj, prefixo) {
    const ctrls = campos.map((c) => [c, criarControle(c, obj?.[c.nome], prefixo ? `${prefixo}.${c.nome}` : c.nome)]);
    return {
      elementos: ctrls.map(([, x]) => x.elemento),
      obter: () => Object.fromEntries(ctrls.map(([c, x]) => [c.nome, x.obter()])),
      controles: ctrls,
    };
  }

  /* ---------- Montagem ---------- */

  const controlesRaiz = [];
  let controleStatus = null;

  if (descritor.comStatus) {
    const id = novoId('status');
    const opcoes = Object.entries(STATUS).map(([chave, texto], i) => {
      const r = el('input', { type: 'radio', name: id, id: `${id}-${i}`, value: chave, checked: (valor.status ?? 'rascunho') === chave });
      return { r, label: el('label', { class: 'segmento', for: r.id }, r, el('span', { texto })) };
    });
    const explicacao = el('p', { class: 'ajuda', id: `${id}-ajuda`, texto: 'Só projetos publicados aparecem no site. Rascunhos e arquivados aparecem apenas na prévia.' });
    const campoStatus = el(
      'fieldset',
      { class: 'campo-grupo campo-conjunto', dados: { caminho: 'status', raiz: 'status' }, 'aria-describedby': `${id}-ajuda` },
      el('legend', { class: 'rotulo', texto: 'Status de publicação' }),
      el('div', { class: 'segmentado' }, opcoes.map((o) => o.label)),
      explicacao,
      el('p', { class: 'msg-erro', hidden: true }),
    );
    controleStatus = { obter: () => opcoes.find((o) => o.r.checked)?.r.value ?? 'rascunho' };
    raiz.append(el('section', { class: 'cartao' }, el('h2', { texto: 'Publicação' }), campoStatus));
  }

  for (const secao of descritor.secoes) {
    const r = renderCampos(secao.campos, valor, '');
    for (const [c, x] of r.controles) {
      x.elemento.dataset.raiz = c.nome;
      controlesRaiz.push([c, x]);
    }
    raiz.append(el('section', { class: 'cartao' }, el('h2', { texto: secao.titulo }), r.elementos));
  }

  // Endereço automático a partir do título (só ao criar, até o usuário editar o endereço)
  if (novo && descritor.chave === 'slug') {
    const titulo = controlesRaiz.find(([c]) => c.nome === descritor.campoTitulo)?.[1].entrada;
    const slug = controlesRaiz.find(([c]) => c.nome === 'slug')?.[1].entrada;
    let manual = false;
    slug?.addEventListener('input', () => (manual = true));
    titulo?.addEventListener('input', () => {
      if (!manual && slug) slug.value = slugificar(titulo.value);
    });
  }

  function obter() {
    const base = Object.fromEntries(controlesRaiz.map(([c, x]) => [c.nome, x.obter()]));
    if (descritor.tipo === 'lista' && descritor.chave === 'id') base.id = valor.id ?? '';
    if (controleStatus) base.status = controleStatus.obter();
    return base;
  }

  /* ---------- Alterações não salvas ---------- */

  let referencia = {};
  const tirarFoto = () => {
    const atual = obter();
    referencia = Object.fromEntries(Object.entries(atual).map(([k, v]) => [k, JSON.stringify(v)]));
  };

  function alterados() {
    const atual = obter();
    return Object.keys(atual).filter((k) => JSON.stringify(atual[k]) !== referencia[k]);
  }

  function atualizarMarcas() {
    const lista = new Set(alterados());
    for (const w of raiz.querySelectorAll('[data-raiz]')) w.classList.toggle('alterado', lista.has(w.dataset.raiz));
  }

  raiz.addEventListener('input', avisarAlteracao);
  raiz.addEventListener('change', avisarAlteracao);

  /* ---------- Erros ---------- */

  const tocados = new Set();
  raiz.addEventListener('focusout', (e) => {
    const w = e.target.closest?.('[data-caminho]');
    if (w) tocados.add(w.dataset.caminho);
  });

  function limparErros() {
    for (const w of raiz.querySelectorAll('.tem-erro')) w.classList.remove('tem-erro');
    for (const m of raiz.querySelectorAll('.msg-erro')) {
      m.hidden = true;
      m.textContent = '';
    }
    for (const i of raiz.querySelectorAll('[aria-invalid="true"]')) i.removeAttribute('aria-invalid');
  }

  function alvoDoCaminho(caminho) {
    let c = caminho;
    while (c !== undefined) {
      const w = raiz.querySelector(`[data-caminho="${CSS.escape(c)}"]`);
      if (w) return w;
      if (!c.includes('.')) break;
      c = c.slice(0, c.lastIndexOf('.'));
    }
    return null;
  }

  /**
   * Mostra os erros nos campos.
   * @param {{caminho:string, mensagem:string}[]} erros
   * @param {{apenasTocados?: boolean}} opcoes
   * @returns {{caminho:string, mensagem:string, rotulo:string, alvo:HTMLElement|null}[]} resumo para o topo da página
   */
  function marcarErros(erros, { apenasTocados = false } = {}) {
    limparErros();
    const resumo = [];
    for (const e of erros) {
      if (apenasTocados && ![...tocados].some((t) => e.caminho === t || e.caminho.startsWith(`${t}.`) || t.startsWith(`${e.caminho}.`))) continue;
      const w = alvoDoCaminho(e.caminho) ?? raiz.querySelector('[data-caminho]');
      if (!w) continue;
      w.classList.add('tem-erro');
      const msg = w.querySelector(':scope > .msg-erro');
      if (msg) {
        msg.textContent = msg.textContent ? `${msg.textContent} ${e.mensagem}` : e.mensagem;
        msg.hidden = false;
      }
      const controle = w.matches('input, textarea, select') ? w : w.querySelector(':scope > input, :scope > textarea, :scope > select, :scope > .lista textarea, :scope > .lista select');
      controle?.setAttribute('aria-invalid', 'true');
      const rotulo = w.querySelector(':scope > .rotulo, :scope > legend, :scope > label')?.textContent?.replace(/\s*\*\s*\(obrigatório\)|\s*\*$/, '').trim();
      resumo.push({ ...e, rotulo: rotulo || 'Campo', alvo: w });
    }
    return resumo;
  }

  function focar(alvo) {
    const controle = alvo?.querySelector('input:not([type="file"]), textarea, select, button') ?? alvo;
    alvo?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    controle?.focus({ preventScroll: true });
  }

  requestAnimationFrame(tirarFoto);
  tirarFoto();

  return {
    elemento: raiz,
    obter,
    alterados,
    marcarErros,
    limparErros,
    focar,
    tocados,
    redefinir: () => {
      tirarFoto();
      atualizarMarcas();
    },
  };
}

function mostrarErroCampo(wrapper, mensagem) {
  const msg = wrapper.querySelector(':scope > .msg-erro');
  wrapper.classList.add('tem-erro');
  msg.textContent = mensagem;
  msg.hidden = false;
}

function paraBase64(arquivo) {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result).split(',')[1] ?? '');
    leitor.onerror = () => falha(new Error('Não foi possível ler o arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}
