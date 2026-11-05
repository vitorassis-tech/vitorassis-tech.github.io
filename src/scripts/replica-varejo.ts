/**
 * Réplica interativa do Painel de Logística Varejo — DADOS FICTÍCIOS.
 * Reconstrução em código do layout e dos cálculos do painel feito no Power BI.
 * Dados: public/dados/painel-varejo-ficticio.json (gerados por dados-demo/gerar_paineis_bi.py).
 */
import { deColunar, type Tabela } from '../lib/kpis';
import { numero, percentual } from '../lib/formato';

interface Regiao { regiao: string; perfil: string; capacidade: number; transportadora: string }
interface Rota { data: string; regiao: string; rota: number; volume: number }
interface Payload { simulado: boolean; transportadoras: string[]; faixas: { atencao: number; acima: number }; regioes: Tabela; rotas: Tabela }
type Faixa = 'normal' | 'atencao' | 'critico';
const ROTULO_FAIXA: Record<Faixa, string> = { normal: 'Dentro do limite', atencao: 'Atenção', critico: 'Acima da capacidade' };
const MAX_REGIOES = 10;

const SEMANA = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
const dataLonga = (iso: string) => `${SEMANA[new Date(`${iso}T12:00:00`).getDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Faixa de ocupação: abaixo do limite de atenção, entre atenção e 100%, ou acima da capacidade. */
export function faixaOcupacao(v: number, atencao = 90, acima = 100): Faixa {
  return v > acima ? 'critico' : v >= atencao ? 'atencao' : 'normal';
}

export interface ResumoRegiao extends Regiao { volume: number; ocupacao: number; rotas: { rota: number; volume: number }[] }

/** Consolida as rotas do dia por região (somente regiões com volume), ordenadas pela ocupação. */
export function consolidarRegioes(regioes: Regiao[], rotas: Rota[]): ResumoRegiao[] {
  const porRegiao = new Map<string, { rota: number; volume: number }[]>();
  for (const r of rotas) {
    const l = porRegiao.get(r.regiao) ?? [];
    l.push({ rota: r.rota, volume: r.volume });
    porRegiao.set(r.regiao, l);
  }
  return regioes
    .filter((g) => porRegiao.has(g.regiao))
    .map((g) => {
      const lista = porRegiao.get(g.regiao)!.sort((a, b) => b.volume - a.volume);
      const volume = lista.reduce((s, x) => s + x.volume, 0);
      return { ...g, volume, ocupacao: (volume / g.capacidade) * 100, rotas: lista };
    })
    .sort((a, b) => b.ocupacao - a.ocupacao);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...filhos: (Node | string)[]) {
  const { dataset, style, ...resto } = props as { dataset?: Record<string, string>; style?: string };
  const e = Object.assign(document.createElement(tag), resto);
  if (dataset) Object.assign(e.dataset, dataset);
  if (style) e.setAttribute('style', style);
  e.append(...filhos);
  return e;
}

export async function iniciarReplicaVarejo(raiz: HTMLElement): Promise<void> {
  const estado = raiz.querySelector<HTMLElement>('.estado')!;
  const conteudo = raiz.querySelector<HTMLElement>('.conteudo')!;
  let dados: Payload, regioes: Regiao[], rotas: Rota[];
  try {
    const r = await fetch(raiz.dataset.fonte!, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    dados = await r.json();
    if (dados.simulado !== true) throw new Error('Arquivo sem a marcação de dados fictícios.');
    regioes = deColunar<Regiao>(dados.regioes);
    rotas = deColunar<Rota>(dados.rotas);
  } catch (erro) {
    console.warn('[replica-varejo] Falha ao carregar dados:', erro);
    estado.classList.add('erro');
    estado.textContent = 'Não foi possível carregar o painel. Recarregue a página.';
    return;
  }
  const { atencao, acima } = dados.faixas;
  const faixa = (v: number) => faixaOcupacao(v, atencao, acima);
  const $ = (s: string) => raiz.querySelector<HTMLElement>(s)!;
  const dias = [...new Set(rotas.map((r) => r.data))].sort();
  const selDia = raiz.querySelector<HTMLSelectElement>('select[name="dia"]')!;
  for (const d of [...dias].reverse()) selDia.add(new Option(dataLonga(d), d));
  selDia.disabled = false;

  let transp = '';
  const grupo = $('.botoes-transp');
  const botoes = ['', ...dados.transportadoras].map((t) =>
    el('button', { type: 'button', className: 'bt-transp', textContent: t ? t.replace('Transportadora ', '') : 'Todas', dataset: { transportadora: t } }),
  );
  grupo.replaceChildren(...botoes);
  botoes.forEach((b) =>
    b.addEventListener('click', () => {
      transp = b.dataset.transportadora ?? '';
      render();
    }),
  );

  const pctTexto = (v: number) => percentual(v, 1);
  const seloFaixa = (v: number) => el('span', { className: 'faixa', dataset: { faixa: faixa(v) } }, pctTexto(v));

  const render = () => {
    botoes.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.transportadora ?? '') === transp)));
    const dia = selDia.value;
    const regs = regioes.filter((g) => !transp || g.transportadora === transp);
    const doDia = rotas.filter((r) => r.data === dia);
    const lista = consolidarRegioes(regs, doDia);
    estado.textContent = '';
    conteudo.hidden = false;
    $('.dia-exibido').textContent = `${dataLonga(dia)} · ${transp || 'todas as transportadoras'}`;

    if (!lista.length) {
      $('.cartoes').replaceChildren(el('p', { className: 'vazio' }, 'Sem rotas para este filtro.'));
      return;
    }
    const volume = lista.reduce((s, g) => s + g.volume, 0);
    const capacidade = lista.reduce((s, g) => s + g.capacidade, 0);
    const ocup = (volume / capacidade) * 100;
    const maiorOcup = lista[0];
    const maiorVol = [...lista].sort((a, b) => b.volume - a.volume)[0];
    const todasRotas = lista.flatMap((g) => g.rotas.map((r) => ({ ...r, regiao: g.regiao }))).sort((a, b) => b.volume - a.volume);
    const maiorRota = todasRotas[0];

    // Cartões
    const card = (rotulo: string, valor: string | Node, ...det: (string | Node)[]) =>
      el('section', { className: 'kpi', ariaLabel: rotulo }, el('h3', {}, rotulo), el('p', { className: 'valor' }, valor), el('p', { className: 'det' }, ...det));
    const medidor = el('span', { className: 'medidor', dataset: { faixa: faixa(ocup) }, style: `--v:${Math.min(100, ocup)}%` });
    $('.cartoes').replaceChildren(
      card('Volume da operação', numero(volume), el('span', { className: 'chip' }, `${lista.length} ${lista.length === 1 ? 'região' : 'regiões'}`), ' no dia'),
      card('Ocupação da operação', seloFaixa(ocup), el('span', { className: 'chip' }, ROTULO_FAIXA[faixa(ocup)]), el('span', { className: 'cap' }, `${numero(volume)} de ${numero(capacidade)}`), medidor),
      card('Maior ocupação', seloFaixa(maiorOcup.ocupacao), el('span', { className: 'chip' }, maiorOcup.regiao), el('span', { className: 'cap' }, `${maiorOcup.perfil} · cap. ${maiorOcup.capacidade}`)),
      card('Região com mais volume', numero(maiorVol.volume), el('span', { className: 'chip' }, maiorVol.regiao), el('span', { className: 'cap' }, `${pctTexto(maiorVol.ocupacao)} do veículo`)),
      card('Maior rota', el('span', { className: 'destaque' }, String(maiorRota.rota)), el('span', { className: 'chip laranja' }, `${numero(maiorRota.volume)} vol.`), el('span', { className: 'cap' }, maiorRota.regiao)),
    );

    // Ocupação por região
    const exibidas = lista.slice(0, MAX_REGIOES);
    const escala = Math.max(120, ...exibidas.map((g) => g.ocupacao));
    $('.ocupacao tbody').replaceChildren(
      ...exibidas.map((g) =>
        el('tr', { dataset: { faixa: faixa(g.ocupacao) } },
          el('th', { scope: 'row' }, g.regiao),
          el('td', {}, el('span', { className: 'chip' }, g.perfil)),
          el('td', { className: 'col-barra' },
            el('span', { className: 'trilho', style: `--marco:${(100 / escala) * 100}%` },
              el('span', { className: 'barra', dataset: { faixa: faixa(g.ocupacao) }, style: `width:${(g.ocupacao / escala) * 100}%` }))),
          el('td', { className: 'num' }, `${numero(g.volume)} / ${numero(g.capacidade)}`),
          el('td', { className: 'num' }, seloFaixa(g.ocupacao)),
        ),
      ),
    );
    $('.ocupacao tfoot').replaceChildren(
      el('tr', {},
        el('th', { scope: 'row', colSpan: 3 }, `Total · ${lista.length} regiões${lista.length > MAX_REGIOES ? ` (mostrando as ${MAX_REGIOES} de maior ocupação)` : ''}`),
        el('td', { className: 'num' }, `${numero(volume)} / ${numero(capacidade)}`),
        el('td', { className: 'num' }, seloFaixa(ocup)),
      ),
    );

    // 10 maiores rotas
    const top = todasRotas.slice(0, 10);
    $('.top-rotas').replaceChildren(
      ...top.map((r, i) =>
        el('li', { className: i === 0 ? 'lider' : '' },
          el('span', { className: 'pos' }, String(i + 1)),
          el('span', { className: 'cod' }, String(r.rota)),
          el('span', { className: 'reg' }, r.regiao),
          el('span', { className: 'trilho' }, el('span', { className: 'barra', style: `width:${(r.volume / top[0].volume) * 100}%` })),
          el('span', { className: 'num' }, numero(r.volume)),
        ),
      ),
    );

    // Rotas por região (mesma escala em todos os quadros)
    const maxRota = maiorRota.volume;
    $('.quadros').replaceChildren(
      ...exibidas.map((g) =>
        el('li', { className: 'quadro' },
          el('h4', {}, el('span', { className: 'nome' }, g.regiao), el('span', { className: 'chip' }, g.perfil)),
          el('p', { className: 'linha-vol' }, el('strong', {}, numero(g.volume)), el('span', { className: 'cap' }, ` de ${g.capacidade} · ${g.rotas.length} ${g.rotas.length === 1 ? 'rota' : 'rotas'}`), seloFaixa(g.ocupacao)),
          el('span', { className: 'medidor', dataset: { faixa: faixa(g.ocupacao) }, style: `--v:${Math.min(100, g.ocupacao)}%` }),
          el('ul', { className: 'rotas' },
            ...g.rotas.map((r) =>
              el('li', { className: r.rota === maiorRota.rota && g.regiao === maiorRota.regiao ? 'lider' : '' },
                el('span', { className: 'cod' }, String(r.rota)),
                el('span', { className: 'trilho' }, el('span', { className: 'barra', style: `width:${(r.volume / maxRota) * 100}%` })),
                el('span', { className: 'num' }, numero(r.volume)),
              ),
            ),
          ),
        ),
      ),
    );
  };

  selDia.addEventListener('change', render);
  render();
}
