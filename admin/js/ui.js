/**
 * Componentes de interface padronizados do painel:
 * elementos seguros (sem innerHTML), botões com carregamento, avisos e confirmações.
 */

/** Cria elemento com atributos e filhos. Texto sempre via textContent (seguro). */
export function el(tag, atributos = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(atributos ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'texto') e.textContent = v;
    else if (k === 'on') for (const [evento, fn] of Object.entries(v)) e.addEventListener(evento, fn);
    else if (k === 'dados') for (const [dk, dv] of Object.entries(v)) e.dataset[dk] = dv;
    else if (k in e && typeof v !== 'string') e[k] = v;
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const f of filhos.flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return e;
}

const SVG = 'http://www.w3.org/2000/svg';
const ICONES = {
  mais: 'M12 5v14M5 12h14',
  editar: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  lixeira: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  olho: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z',
  cima: 'M12 19V5M6 11l6-6 6 6',
  baixo: 'M12 5v14M6 13l6 6 6-6',
  restaurar: 'M4 12a8 8 0 108-8 8 8 0 00-6.3 3M4 4v4h4',
  alerta: 'M12 3l10 18H2L12 3zm0 6v5m0 3v.5',
  ok: 'M5 12l5 5L20 7',
  fechar: 'M6 6l12 12M18 6L6 18',
  historico: 'M12 7v5l3 3M3 12a9 9 0 109-9 9 9 0 00-7 3.4M3 3v4h4',
  externo: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  imagem: 'M4 5h16v14H4zM4 15l5-5 5 5 2-2 4 4M15 9.5a1 1 0 100-.01',
  enviar: 'M12 16V4M7 9l5-5 5 5M4 20h16',
};

export function icone(nome) {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', '18');
  s.setAttribute('height', '18');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  s.setAttribute('class', 'icone');
  const p = document.createElementNS(SVG, 'path');
  p.setAttribute('d', ICONES[nome] ?? '');
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '1.8');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  s.append(p);
  return s;
}

/**
 * Botão padronizado.
 * variantes: primario | secundario | perigo | perigo-contorno | discreto
 */
export function botao({ texto, variante = 'secundario', icone: nomeIcone, onClick, tipo = 'button', rotulo, compacto = false, desativado = false, dados }) {
  return el(
    'button',
    {
      type: tipo,
      class: `btn btn-${variante}${compacto ? ' btn-compacto' : ''}${texto ? '' : ' btn-icone'}`,
      'aria-label': rotulo,
      title: !texto ? rotulo : undefined,
      disabled: desativado,
      dados,
      on: onClick ? { click: onClick } : undefined,
    },
    nomeIcone ? icone(nomeIcone) : null,
    texto ? el('span', { class: 'btn-texto', texto }) : null,
  );
}

/** Executa uma ação mostrando carregamento no botão e impedindo clique duplo. */
export async function comCarregamento(btn, textoCarregando, acao) {
  if (btn.getAttribute('aria-busy') === 'true') return;
  const original = [...btn.childNodes];
  const largura = btn.offsetWidth;
  btn.setAttribute('aria-busy', 'true');
  btn.disabled = true;
  btn.replaceChildren(el('span', { class: 'spinner', 'aria-hidden': 'true' }), el('span', { class: 'btn-texto', texto: textoCarregando }));
  if (largura) btn.style.minWidth = `${largura}px`;
  try {
    return await acao();
  } finally {
    btn.replaceChildren(...original);
    btn.removeAttribute('aria-busy');
    btn.disabled = false;
    btn.style.minWidth = '';
  }
}

/* ---------------- Avisos (toasts) ---------------- */

function regiao() {
  return document.getElementById('avisos');
}

/**
 * Mostra um aviso. Sucesso some sozinho; erro fica até ser fechado.
 * @param {'sucesso'|'erro'|'info'} tipo
 */
export function avisar(tipo, mensagem, acao) {
  const fechar = () => item.remove();
  const item = el(
    'div',
    { class: `aviso aviso-${tipo}`, role: tipo === 'erro' ? 'alert' : 'status' },
    icone(tipo === 'erro' ? 'alerta' : 'ok'),
    el('p', { texto: mensagem }),
    acao ? el('a', { href: acao.href, target: acao.externo ? '_blank' : undefined, rel: acao.externo ? 'noopener noreferrer' : undefined, texto: acao.texto }) : null,
    botao({ variante: 'discreto', icone: 'fechar', rotulo: 'Fechar aviso', compacto: true, onClick: fechar }),
  );
  regiao().append(item);
  if (tipo !== 'erro') setTimeout(fechar, 7000);
  return item;
}

/* ---------------- Confirmações (modal) ---------------- */

let modalAberto = null;

/**
 * Janela de confirmação acessível.
 * - exigirTexto: o usuário precisa digitar exatamente este texto para liberar a ação.
 * - bloqueio: se informado, explica por que a ação não é possível e não mostra o botão de confirmar.
 * - aoConfirmar: função assíncrona; se lançar erro, a mensagem aparece dentro da janela.
 * @returns {Promise<boolean>} true se confirmou e a ação terminou com sucesso
 */
export function confirmar({ titulo, mensagem, detalhes = [], textoConfirmar = 'Confirmar', textoCarregando = 'Processando…', variante = 'primario', exigirTexto, bloqueio, aoConfirmar }) {
  return new Promise((resolver) => {
    const anterior = document.activeElement;
    const idTitulo = `modal-titulo-${Date.now()}`;
    const idDesc = `${idTitulo}-desc`;
    let processando = false;

    const erroEl = el('p', { class: 'modal-erro', role: 'alert', hidden: true });
    const campo = exigirTexto
      ? el('input', { class: 'campo', type: 'text', id: `${idTitulo}-conf`, autocomplete: 'off', spellcheck: 'false', 'aria-describedby': `${idTitulo}-conf-ajuda` })
      : null;
    const btnConfirmar = bloqueio ? null : botao({ texto: textoConfirmar, variante, desativado: Boolean(exigirTexto) });
    const btnCancelar = botao({ texto: bloqueio ? 'Entendi' : 'Cancelar', variante: 'secundario' });

    const fechar = (resultado) => {
      if (processando) return;
      fundo.remove();
      modalAberto = null;
      document.removeEventListener('keydown', teclas, true);
      document.body.classList.remove('com-modal');
      if (anterior && anterior.focus) anterior.focus();
      resolver(resultado);
    };

    const caixa = el(
      'div',
      { class: `modal modal-${variante}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': idTitulo, 'aria-describedby': idDesc },
      el(
        'div',
        { class: 'modal-cab' },
        el('span', { class: `modal-icone modal-icone-${bloqueio ? 'bloqueio' : variante}`, 'aria-hidden': 'true' }, icone(variante === 'perigo' || bloqueio ? 'alerta' : 'ok')),
        el('div', {}, el('h2', { id: idTitulo, texto: titulo }), el('p', { id: idDesc, texto: mensagem })),
      ),
      detalhes.length ? el('div', { class: 'modal-detalhes' }, detalhes) : null,
      bloqueio ? el('p', { class: 'modal-bloqueio', texto: bloqueio }) : null,
      campo
        ? el(
            'div',
            { class: 'modal-confirmacao' },
            el('label', { for: campo.id }, 'Para confirmar, digite ', el('strong', { class: 'mono', texto: exigirTexto })),
            campo,
            el('p', { class: 'ajuda', id: `${idTitulo}-conf-ajuda`, texto: 'O botão só é liberado quando o texto estiver idêntico.' }),
          )
        : null,
      erroEl,
      el('div', { class: 'modal-acoes' }, btnCancelar, btnConfirmar),
    );
    const fundo = el('div', { class: 'modal-fundo', on: { mousedown: (e) => e.target === fundo && fechar(false) } }, caixa);

    function teclas(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        fechar(false);
      } else if (e.key === 'Tab') {
        const focaveis = [...caixa.querySelectorAll('button:not([disabled]), input, a[href]')];
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    }

    if (campo) campo.addEventListener('input', () => (btnConfirmar.disabled = campo.value.trim() !== exigirTexto));
    btnCancelar.addEventListener('click', () => fechar(false));
    btnConfirmar?.addEventListener('click', async () => {
      if (exigirTexto && campo.value.trim() !== exigirTexto) return;
      erroEl.hidden = true;
      processando = true;
      try {
        await comCarregamento(btnConfirmar, textoCarregando, () => (aoConfirmar ? aoConfirmar() : null));
        processando = false;
        fechar(true);
      } catch (erro) {
        processando = false;
        erroEl.textContent = erro.message || 'Não foi possível concluir. Tente novamente.';
        erroEl.hidden = false;
      }
    });

    if (modalAberto) modalAberto.remove();
    modalAberto = fundo;
    document.body.classList.add('com-modal');
    document.body.append(fundo);
    document.addEventListener('keydown', teclas, true);
    (campo ?? btnCancelar).focus();
  });
}

/* ---------------- Formatação ---------------- */

export const dataHora = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const mesAno = (v) => {
  const m = /^(\d{4})-(\d{2})$/.exec(v ?? '');
  return m ? `${MESES[Number(m[2]) - 1]}/${m[1]}` : v;
};
