/**
 * Réplica interativa do Painel de Expedição — DADOS FICTÍCIOS.
 * Reconstrução em código do layout e dos cálculos do painel feito no Power BI.
 * Dados: public/dados/painel-expedicao-ficticio.json (gerados por dados-demo/gerar_paineis_bi.py).
 */
import { deColunar, type Tabela } from '../lib/kpis';
import { numero, percentual } from '../lib/formato';

interface Frota { data: string; transportadora: string; previstos: number; saidas: number }
interface Expedido { data: string; transportadora: string; volume: number; valor: number; clientes: number; fretes: number }
interface Pendencia { data: string; transportadora: string; operacao: string; motivo: string; volume: number; valor: number; clientes: number }
interface Payload {
  simulado: boolean;
  transportadoras: string[];
  parametros: { meta_expedido: number; atencao_expedido: number; pendente_critico: number; pendente_atencao: number };
  frota: Tabela;
  expedido: Tabela;
  pendencias: Tabela;
}
type Status = 'normal' | 'atencao' | 'critico';
const ROTULO: Record<Status, string> = { normal: 'OK', atencao: 'Atenção', critico: 'Crítico' };

const soma = <T>(l: T[], f: (x: T) => number) => l.reduce((s, x) => s + f(x), 0);
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);
const SEMANA = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
const dt = (iso: string) => new Date(`${iso}T12:00:00`);
const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const dataLonga = (iso: string) => `${SEMANA[dt(iso).getDay()]} ${dataCurta(iso)}/${iso.slice(0, 4)}`;
const menosDias = (iso: string, n: number) => {
  const d = dt(iso);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
export const reais = (v: number) => `R$ ${numero(Math.round(v))}`;
export function reaisCurto(v: number): string {
  if (Math.abs(v) >= 1e6) return `R$ ${numero(v / 1e6, 2)} mi`;
  if (Math.abs(v) >= 1e3) return `R$ ${numero(Math.round(v / 1e3))} mil`;
  return reais(v);
}
const sinal = (v: number, casas = 0) => `${v > 0 ? '▲' : v < 0 ? '▼' : '='} ${numero(Math.abs(v), casas)}`;

/** Farol do % expedido: OK a partir da meta, Atenção a partir do limite de atenção, senão Crítico. */
export function farolExpedido(v: number | null, meta: number, atencao: number): Status | null {
  if (v === null) return null;
  return v >= meta ? 'normal' : v >= atencao ? 'atencao' : 'critico';
}
/** Farol da participação no valor pendente: quanto maior a fatia, pior. */
export function farolParticipacao(v: number | null, critico: number, atencao: number): Status | null {
  if (v === null) return null;
  return v >= critico ? 'critico' : v >= atencao ? 'atencao' : 'normal';
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...filhos: (Node | string)[]) {
  const { dataset, style, ...resto } = props as { dataset?: Record<string, string>; style?: string };
  const e = Object.assign(document.createElement(tag), resto);
  if (dataset) Object.assign(e.dataset, dataset);
  if (style) e.setAttribute('style', style);
  e.append(...filhos);
  return e;
}
const selo = (s: Status | null, texto = true) =>
  s ? el('span', { className: texto ? 'farol' : 'farol so-icone', dataset: { status: s } }, texto ? ROTULO[s] : el('span', { className: 'visually-hidden' }, ROTULO[s])) : '';

export async function iniciarReplicaExpedicao(raiz: HTMLElement): Promise<void> {
  const estado = raiz.querySelector<HTMLElement>('.estado')!;
  const conteudo = raiz.querySelector<HTMLElement>('.conteudo')!;
  let dados: Payload, frota: Frota[], expedido: Expedido[], pendencias: Pendencia[];
  try {
    const r = await fetch(raiz.dataset.fonte!, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    dados = await r.json();
    if (dados.simulado !== true) throw new Error('Arquivo sem a marcação de dados fictícios.');
    frota = deColunar<Frota>(dados.frota);
    expedido = deColunar<Expedido>(dados.expedido);
    pendencias = deColunar<Pendencia>(dados.pendencias);
  } catch (erro) {
    console.warn('[replica-expedicao] Falha ao carregar dados:', erro);
    estado.classList.add('erro');
    estado.textContent = 'Não foi possível carregar o painel. Recarregue a página.';
    return;
  }
  const P = dados.parametros;
  const dias = [...new Set(frota.map((f) => f.data))].sort();
  const selDia = raiz.querySelector<HTMLSelectElement>('select[name="dia"]')!;
  const selTransp = raiz.querySelector<HTMLSelectElement>('select[name="transportadora"]')!;
  for (const d of [...dias].reverse()) selDia.add(new Option(dataLonga(d), d));
  for (const t of dados.transportadoras) selTransp.add(new Option(t, t));
  selDia.disabled = selTransp.disabled = false;
  const $ = (s: string) => raiz.querySelector<HTMLElement>(s)!;

  const resumir = (datas: Set<string>, transp: string) => {
    const f = (l: { data: string; transportadora: string }) => datas.has(l.data) && (!transp || l.transportadora === transp);
    const ex = expedido.filter(f), pe = pendencias.filter(f), fr = frota.filter(f);
    const volExp = soma(ex, (x) => x.volume), volPend = soma(pe, (x) => x.volume);
    return {
      ex, pe, fr, volExp, volPend,
      valExp: soma(ex, (x) => x.valor), valPend: soma(pe, (x) => x.valor),
      clientes: soma(ex, (x) => x.clientes), fretes: soma(ex, (x) => x.fretes),
      cargasPend: pe.length, clientesPend: soma(pe, (x) => x.clientes),
      pctExp: pct(volExp, volExp + volPend),
      previstos: soma(fr, (x) => x.previstos), saidas: soma(fr, (x) => x.saidas),
      cumpridos: soma(fr, (x) => Math.min(x.previstos, x.saidas)),
      extras: soma(fr, (x) => Math.max(x.saidas - x.previstos, 0)),
      faltas: soma(fr, (x) => Math.max(x.previstos - x.saidas, 0)),
    };
  };

  const kpi = (nome: string, valor: string | Node, ...linhas: (string | Node)[]) => {
    const card = $(`[data-kpi="${nome}"]`);
    card.querySelector('.valor')!.replaceChildren(valor);
    card.querySelector('.det')!.replaceChildren(...linhas.map((l) => el('span', {}, l)));
    return card;
  };
  const delta = (v: number, texto: string, melhorSeSobe: boolean) =>
    el('span', { className: `delta ${v === 0 ? '' : (v > 0) === melhorSeSobe ? 'bom' : 'ruim'}` }, texto);
  const barras = (alvo: HTMLElement, itens: { rotulo: string; valor: number; texto: string }[]) => {
    const max = Math.max(1, ...itens.map((i) => i.valor));
    alvo.replaceChildren(
      ...itens.map((i) =>
        el('li', {}, el('span', { className: 'rot' }, i.rotulo), el('span', { className: 'trilho' }, el('span', { className: 'barra', style: `width:${(i.valor / max) * 100}%` })), el('span', { className: 'val' }, i.texto)),
      ),
    );
    if (!itens.length) alvo.replaceChildren(el('li', { className: 'vazio' }, 'Sem valor pendente.'));
  };

  const render = () => {
    const dia = selDia.value, transp = selTransp.value;
    const r = resumir(new Set([dia]), transp);
    const anterior = menosDias(dia, 7);
    const temAnterior = dias.includes(anterior);
    const ra = resumir(new Set([anterior]), transp);
    const mes = resumir(new Set(dias.filter((d) => d.slice(0, 7) === dia.slice(0, 7) && d <= dia)), transp);
    const ref = `vs ${dataLonga(anterior).slice(0, 10)}`;
    estado.textContent = '';
    conteudo.hidden = false;
    $('.dia-exibido').textContent = `${dataLonga(dia)} · ${transp || 'todas as transportadoras'}`;

    // Cartões
    const st = farolExpedido(r.pctExp, P.meta_expedido, P.atencao_expedido);
    const cardPct = kpi('pct', percentual(r.pctExp), `meta ${P.meta_expedido}% · no mês ${percentual(mes.pctExp)}`,
      temAnterior && r.pctExp !== null && ra.pctExp !== null ? delta(r.pctExp - ra.pctExp, `${sinal(r.pctExp - ra.pctExp, 1)} p.p. ${ref}`, true) : '');
    cardPct.querySelector('.selo')!.replaceChildren(selo(st));
    const medidor = cardPct.querySelector<HTMLElement>('.medidor')!;
    medidor.style.setProperty('--v', `${Math.min(100, r.pctExp ?? 0)}%`);
    medidor.style.setProperty('--meta', `${P.meta_expedido}%`);
    medidor.dataset.status = st ?? '';
    kpi('volume', numero(r.volExp), `${numero(r.clientes)} clientes · ${numero(r.fretes)} fretes`,
      temAnterior && ra.volExp ? delta(r.volExp - ra.volExp, `${sinal(((r.volExp - ra.volExp) / ra.volExp) * 100, 1)}% ${ref}`, true) : '');
    kpi('valor', reaisCurto(r.valExp), r.fretes ? `${reaisCurto(r.valExp / r.fretes)} por frete` : 'sem fretes');
    kpi('vol-pend', numero(r.volPend), `${numero(r.cargasPend)} cargas · ${numero(r.clientesPend)} clientes`,
      temAnterior ? delta(r.volPend - ra.volPend, `${sinal(r.volPend - ra.volPend)} ${ref}`, false) : '');
    kpi('val-pend', reaisCurto(r.valPend), `${percentual(pct(r.valPend, r.valPend + r.valExp))} do valor programado`,
      temAnterior ? delta(r.valPend - ra.valPend, `${r.valPend - ra.valPend >= 0 ? '▲' : '▼'} ${reais(Math.abs(r.valPend - ra.valPend))} ${ref}`, false) : '');
    const stFrota: Status = r.faltas > 0 ? 'critico' : r.extras > 0 ? 'atencao' : 'normal';
    const cardFrota = kpi('frota', el('span', {}, numero(r.saidas), el('small', {}, ` / ${numero(r.previstos)}`)),
      `cumpridos ${r.cumpridos} · extras ${r.extras} · faltas ${r.faltas}`);
    cardFrota.querySelector('.selo')!.replaceChildren(el('span', { className: 'farol', dataset: { status: stFrota } }, r.faltas ? 'Falta' : r.extras ? 'Extra' : 'Completa'));

    // Resumo e destaque
    const porT = new Map<string, number>();
    r.pe.forEach((p) => porT.set(p.transportadora, (porT.get(p.transportadora) ?? 0) + p.valor));
    const porM = new Map<string, number>();
    r.pe.forEach((p) => porM.set(p.motivo, (porM.get(p.motivo) ?? 0) + p.valor));
    const maiorT = [...porT].sort((a, b) => b[1] - a[1])[0];
    const maiorM = [...porM].sort((a, b) => b[1] - a[1])[0];
    $('.resumo-texto').textContent =
      `Expedimos ${percentual(r.pctExp)} do volume programado (${numero(r.volExp)} de ${numero(r.volExp + r.volPend)} volumes). ` +
      (r.cargasPend ? `${numero(r.cargasPend)} ${r.cargasPend === 1 ? 'carga ficou pendente' : 'cargas ficaram pendentes'}, somando ${reais(r.valPend)}. ` : 'Nenhuma carga ficou pendente. ') +
      `Frota: ${r.saidas} saídas para ${r.previstos} previstas (${r.extras} extras, ${r.faltas} ${r.faltas === 1 ? 'falta' : 'faltas'}).`;
    $('.destaque-texto').textContent = maiorT
      ? `Maior impacto: ${maiorT[0]}, ${reais(maiorT[1])} (${percentual(pct(maiorT[1], r.valPend), 0)} do valor pendente). Motivo principal: ${maiorM[0]}.`
      : 'Sem pendências no dia.';

    // Expedido × pendente por transportadora
    const lista = (transp ? [transp] : dados.transportadoras)
      .map((t) => ({ t, x: resumir(new Set([dia]), t) }))
      .filter(({ x }) => x.volExp + x.volPend > 0)
      .sort((a, b) => (b.x.pctExp ?? 0) - (a.x.pctExp ?? 0));
    const maxVol = Math.max(1, ...lista.map(({ x }) => x.volExp + x.volPend));
    $('.exp-pend').replaceChildren(
      ...lista.map(({ t, x }) =>
        el('li', {},
          el('span', { className: 'rot' }, t.replace('Transportadora ', '')),
          el('span', { className: 'trilho' },
            el('span', { className: 'barra exp', style: `width:${(x.volExp / maxVol) * 100}%`, title: `Expedido: ${numero(x.volExp)}` }),
            el('span', { className: 'barra pend', style: `width:${(x.volPend / maxVol) * 100}%`, title: `Pendente: ${numero(x.volPend)}` })),
          el('span', { className: 'val' }, percentual(x.pctExp), ' ', selo(farolExpedido(x.pctExp, P.meta_expedido, P.atencao_expedido), false)),
        ),
      ),
    );

    // Valor pendente por operação e por motivo
    const agrupa = (chave: 'operacao' | 'motivo') => {
      const m = new Map<string, number>();
      r.pe.forEach((p) => m.set(p[chave], (m.get(p[chave]) ?? 0) + p.valor));
      return [...m].sort((a, b) => b[1] - a[1]).map(([rotulo, valor]) => ({ rotulo, valor, texto: reaisCurto(valor) }));
    };
    barras($('.por-operacao'), agrupa('operacao'));
    barras($('.por-motivo'), agrupa('motivo'));

    // Tabela por transportadora
    const linhas = (transp ? [transp] : dados.transportadoras).map((t) => ({ t, x: resumir(new Set([dia]), t) }));
    const celula = (v: string | Node, num = true) => el('td', { className: num ? 'num' : '' }, v);
    const marca = (n: number, s: Status) => (n > 0 ? el('span', {}, `${n} `, selo(s, false)) : '0');
    $('.tabela-transp tbody').replaceChildren(
      ...linhas.map(({ t, x }) =>
        el('tr', {},
          el('th', { scope: 'row' }, t),
          celula(numero(x.previstos)), celula(numero(x.saidas)), celula(numero(x.cumpridos)),
          celula(marca(x.extras, 'atencao')), celula(marca(x.faltas, 'critico')),
          celula(numero(x.volExp)), celula(numero(x.volPend)),
          celula(x.pctExp === null ? '—' : el('span', {}, `${percentual(x.pctExp)} `, selo(farolExpedido(x.pctExp, P.meta_expedido, P.atencao_expedido), false))),
          celula(x.valPend ? reais(x.valPend) : '—'),
          celula(x.valPend ? el('span', {}, `${percentual(pct(x.valPend, r.valPend))} `, selo(farolParticipacao(pct(x.valPend, r.valPend), P.pendente_critico, P.pendente_atencao), false)) : '—'),
        ),
      ),
    );
    $('.tabela-transp tfoot').replaceChildren(
      el('tr', {},
        el('th', { scope: 'row' }, 'Total'),
        celula(numero(r.previstos)), celula(numero(r.saidas)), celula(numero(r.cumpridos)), celula(numero(r.extras)), celula(numero(r.faltas)),
        celula(numero(r.volExp)), celula(numero(r.volPend)), celula(percentual(r.pctExp)), celula(reais(r.valPend)), celula(r.valPend ? '100,0%' : '—'),
      ),
    );
  };

  selDia.addEventListener('change', render);
  selTransp.addEventListener('change', render);
  render();
}
