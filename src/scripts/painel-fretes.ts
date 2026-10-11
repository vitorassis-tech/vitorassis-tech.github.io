/**
 * Painel de frota e entregas — DADOS FICTÍCIOS.
 * Carrega o JSON gerado pelo script Python, aplica filtros e desenha
 * indicadores, gráficos SVG e tabela. Sem bibliotecas externas.
 */
import {
  agruparPor,
  deColunar,
  inicioDaSemana,
  otifSemanal,
  resumirEntregas,
  resumirFrota,
  type LinhaEntrega,
  type LinhaFrota,
  type Tabela,
} from '../lib/kpis';
import { moeda, numero, percentual } from '../lib/formato';
import { corToken, escala, posicionarDica, preencherDica, svgEl } from './svg';

interface Payload {
  simulado: boolean;
  aviso: string;
  periodo: { inicio: string; fim: string };
  transportadoras: string[];
  regioes: string[];
  entregas: Tabela;
  frota: Tabela;
}

const dataCurta = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};
const dataLonga = (iso: string) => {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};
const decimal = (v: number | null) => (v === null ? 'sem dados' : numero(v, 1));

function validar(dados: unknown): asserts dados is Payload {
  const d = dados as Partial<Payload>;
  if (!d || d.simulado !== true || !Array.isArray(d.transportadoras) || !d.entregas || !d.frota || !d.periodo) {
    throw new Error('Arquivo de dados com formato inesperado.');
  }
}

export async function iniciarPainelFretes(raiz: HTMLElement): Promise<void> {
  const estado = raiz.querySelector<HTMLElement>('.estado')!;
  const conteudo = raiz.querySelector<HTMLElement>('.conteudo-painel')!;
  const form = raiz.querySelector<HTMLFormElement>('form.filtros')!;
  const fonte = raiz.dataset.fonte || '/dados/fretes-simulados.json';

  let payload: Payload;
  let entregas: LinhaEntrega[];
  let frota: LinhaFrota[];
  try {
    const resposta = await fetch(fonte, { headers: { Accept: 'application/json' } });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const json: unknown = await resposta.json();
    validar(json);
    payload = json;
    entregas = deColunar<LinhaEntrega>(payload.entregas);
    frota = deColunar<LinhaFrota>(payload.frota);
  } catch (erro) {
    console.warn('[painel-fretes] Falha ao carregar dados:', erro);
    estado.classList.add('erro');
    estado.textContent =
      'Não foi possível carregar os dados fictícios. Recarregue a página; se o problema continuar, gere os dados com "npm run dados".';
    return;
  }

  const selTransp = form.elements.namedItem('transportadora') as HTMLSelectElement;
  const selRegiao = form.elements.namedItem('regiao') as HTMLSelectElement;
  const selPeriodo = form.elements.namedItem('periodo') as HTMLSelectElement;
  for (const t of payload.transportadoras) selTransp.add(new Option(t, t));
  for (const r of payload.regioes) selRegiao.add(new Option(r, r));
  form.querySelectorAll<HTMLSelectElement | HTMLButtonElement>('select, button').forEach((el) => (el.disabled = false));

  const semanas = [...new Set(entregas.map((e) => inicioDaSemana(e.data)))].sort();

  const render = () => {
    const transp = selTransp.value;
    const regiao = selRegiao.value;
    const periodo = selPeriodo.value;
    const semanaMinima = periodo === 'tudo' ? '' : semanas[Math.max(0, semanas.length - Number(periodo))];
    const noPeriodo = (data: string) => !semanaMinima || inicioDaSemana(data) >= semanaMinima;

    const ent = entregas.filter(
      (e) => noPeriodo(e.data) && (!transp || e.transportadora === transp) && (!regiao || e.regiao === regiao),
    );
    const frt = frota.filter((l) => noPeriodo(l.data) && (!transp || l.transportadora === transp));
    const lista = transp ? [transp] : payload.transportadoras;

    estado.textContent = '';
    conteudo.hidden = false;

    const datas = ent.map((e) => e.data).sort();
    raiz.querySelector('.periodo-ativo')!.textContent = datas.length
      ? `Período exibido: ${dataLonga(datas[0])} a ${dataLonga(datas[datas.length - 1])}`
      : 'Nenhum dado para os filtros selecionados.';
    raiz.querySelector<HTMLElement>('.nota-frota')!.hidden = !regiao;

    renderKpis(raiz, ent, frt);
    renderOtif(raiz, ent);
    renderFrota(raiz, frt, lista);
    renderTabela(raiz, ent, frt, lista);
  };

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('change', render);
  form.addEventListener('reset', () => window.setTimeout(render, 0));

  let quadro = 0;
  new ResizeObserver(() => {
    window.cancelAnimationFrame(quadro);
    quadro = window.requestAnimationFrame(render);
  }).observe(raiz.querySelector('.graficos')!);

  render();
}

function renderKpis(raiz: HTMLElement, ent: LinhaEntrega[], frt: LinhaFrota[]) {
  const r = resumirEntregas(ent);
  const f = resumirFrota(frt);
  const definir = (kpi: string, valor: string, sub: string) => {
    const el = raiz.querySelector(`[data-kpi="${kpi}"]`)!;
    el.querySelector('.valor')!.textContent = valor;
    el.querySelector('.sub')!.textContent = sub;
  };
  definir('entregas', numero(r.entregas), `${numero(ent.length)} combinações de dia, transportadora e região`);
  definir('otif', percentual(r.otifPct), `No prazo ${percentual(r.noPrazoPct)}, completas ${percentual(r.completasPct)}`);
  definir('custo', r.custoPorEntrega === null ? 'sem dados' : moeda(r.custoPorEntrega), `Total ${moeda(r.custoTotal)}`);
  definir('cobertura', percentual(f.coberturaPct), `${numero(f.disponiveis)} disponíveis para ${numero(f.necessarios)} necessários`);
  definir('produtividade', decimal(f.entregasPorVeiculo), `${numero(f.entregas)} entregas, ${numero(f.emRota)} veículos em rota`);
}

function renderOtif(raiz: HTMLElement, ent: LinhaEntrega[]) {
  const fig = raiz.querySelector<HTMLElement>('[data-grafico="otif"]')!;
  const area = fig.querySelector<HTMLElement>('.area')!;
  const dica = fig.querySelector<HTMLElement>('.tooltip')!;
  const anuncio = fig.querySelector<HTMLElement>('.anuncio')!;
  const pontos = otifSemanal(ent).filter((p) => p.otifPct !== null) as { semana: string; entregas: number; otifPct: number }[];

  fig.querySelector('tbody')!.replaceChildren(
    ...pontos.map((p) => {
      const tr = document.createElement('tr');
      for (const v of [dataLonga(p.semana), numero(p.entregas), percentual(p.otifPct)]) {
        const td = document.createElement('td');
        td.textContent = v;
        tr.append(td);
      }
      return tr;
    }),
  );

  const L = area.clientWidth || 600;
  const A = area.clientHeight || 240;
  const m = { t: 16, r: 16, b: 28, l: 40 };
  const svg = svgEl('svg', { viewBox: `0 0 ${L} ${A}`, 'aria-hidden': 'true' });
  area.replaceChildren(svg);
  dica.hidden = true;
  const corEixo = corToken('--cmd-muted', '#a3b5cb');

  if (pontos.length === 0) {
    svg.append(svgEl('text', { x: L / 2, y: A / 2, 'text-anchor': 'middle', fill: corEixo, 'font-size': 14 }, 'Sem dados para os filtros selecionados'));
    area.onkeydown = area.onpointermove = area.onfocus = null;
    return;
  }

  const valores = pontos.map((p) => p.otifPct);
  const yMin = Math.max(0, Math.floor((Math.min(...valores) - 3) / 5) * 5);
  const yMax = Math.min(100, Math.ceil((Math.max(...valores) + 2) / 5) * 5);
  const x = escala(0, Math.max(1, pontos.length - 1), m.l, L - m.r);
  const y = escala(yMin, yMax, A - m.b, m.t);
  const corLinha = corToken('--serie-1-escuro', '#4f9bd9');
  const corGrade = 'rgba(150,185,225,0.16)';

  const passo = yMax - yMin > 20 ? 10 : 5;
  for (let v = yMin; v <= yMax; v += passo) {
    svg.append(svgEl('line', { x1: m.l, x2: L - m.r, y1: y(v), y2: y(v), stroke: corGrade, 'stroke-width': 1 }));
    svg.append(svgEl('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', fill: corEixo, 'font-size': 11 }, `${v}%`));
  }
  const cada = Math.ceil(pontos.length / Math.max(2, Math.floor((L - m.l) / 70)));
  const ultimoIdx = pontos.length - 1;
  pontos.forEach((p, i) => {
    const regular = i % cada === 0 && (ultimoIdx - i >= cada || i === ultimoIdx);
    if (regular || i === ultimoIdx) {
      svg.append(svgEl('text', { x: x(i), y: A - 8, 'text-anchor': 'middle', fill: corEixo, 'font-size': 11 }, dataCurta(p.semana)));
    }
  });

  const d = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.otifPct).toFixed(1)}`).join(' ');
  svg.append(svgEl('path', { d, fill: 'none', stroke: corLinha, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  svg.append(svgEl('circle', { cx: x(ultimoIdx), cy: y(pontos[ultimoIdx].otifPct), r: 4, fill: corLinha, stroke: '#0b1a2c', 'stroke-width': 2 }));

  const guia = svgEl('line', { y1: m.t, y2: A - m.b, stroke: corEixo, 'stroke-width': 1, 'stroke-dasharray': '3 3', visibility: 'hidden' });
  const marcador = svgEl('circle', { r: 5, fill: corLinha, stroke: '#fff', 'stroke-width': 2, visibility: 'hidden' });
  svg.append(guia, marcador);

  let ativo = -1;
  const mostrar = (i: number, anunciar: boolean) => {
    ativo = Math.max(0, Math.min(ultimoIdx, i));
    const p = pontos[ativo];
    const px = x(ativo);
    const py = y(p.otifPct);
    guia.setAttribute('x1', String(px));
    guia.setAttribute('x2', String(px));
    guia.setAttribute('visibility', 'visible');
    marcador.setAttribute('cx', String(px));
    marcador.setAttribute('cy', String(py));
    marcador.setAttribute('visibility', 'visible');
    const linhas = [`Semana de ${dataLonga(p.semana)}`, `OTIF ${percentual(p.otifPct)}`, `${numero(p.entregas)} entregas`];
    preencherDica(dica, linhas);
    posicionarDica(dica, fig, (px / L) * area.clientWidth + area.offsetLeft, (py / A) * area.clientHeight + area.offsetTop);
    if (anunciar) anuncio.textContent = linhas.join(', ');
  };
  const esconder = () => {
    guia.setAttribute('visibility', 'hidden');
    marcador.setAttribute('visibility', 'hidden');
    dica.hidden = true;
  };

  area.onpointermove = (e: PointerEvent) => {
    const ret = area.getBoundingClientRect();
    const xl = ((e.clientX - ret.left) / ret.width) * L;
    mostrar(Math.round(((xl - m.l) / (L - m.l - m.r)) * ultimoIdx), false);
  };
  area.onpointerleave = esconder;
  area.onblur = esconder;
  area.onfocus = () => mostrar(ativo < 0 ? ultimoIdx : ativo, true);
  area.onkeydown = (e: KeyboardEvent) => {
    const mapa: Record<string, number> = { ArrowRight: ativo + 1, ArrowLeft: ativo - 1, Home: 0, End: ultimoIdx };
    if (e.key in mapa) {
      e.preventDefault();
      mostrar(mapa[e.key], true);
    } else if (e.key === 'Escape') {
      esconder();
    }
  };
}

function renderFrota(raiz: HTMLElement, frt: LinhaFrota[], transportadoras: string[]) {
  const fig = raiz.querySelector<HTMLElement>('[data-grafico="frota"]')!;
  const area = fig.querySelector<HTMLElement>('.area')!;
  const dica = fig.querySelector<HTMLElement>('.tooltip')!;
  const anuncio = fig.querySelector<HTMLElement>('.anuncio')!;
  const porT = agruparPor(frt, (l) => l.transportadora);
  const dados = transportadoras.map((t) => ({ t, ...resumirFrota(porT.get(t) ?? []) }));

  const L = area.clientWidth || 400;
  const A = area.clientHeight || 240;
  const m = { t: 20, r: 8, b: 28, l: 8 };
  const svg = svgEl('svg', { viewBox: `0 0 ${L} ${A}`, 'aria-hidden': 'true' });
  area.replaceChildren(svg);
  dica.hidden = true;

  const max = Math.max(1, ...dados.flatMap((d) => [d.necessarios, d.disponiveis]));
  const y = escala(0, max, A - m.b, m.t);
  const grupo = (L - m.l - m.r) / Math.max(1, dados.length);
  const barra = Math.min(28, (grupo - 16) / 2);
  const cores = [corToken('--serie-1-escuro', '#4f9bd9'), corToken('--serie-2-escuro', '#cf7a24')];
  const nomesSerie = ['Necessários', 'Disponíveis'];
  const corEixo = corToken('--cmd-muted', '#a3b5cb');
  const corTexto = corToken('--cmd-text', '#e7eef7');

  svg.append(svgEl('line', { x1: m.l, x2: L - m.r, y1: A - m.b, y2: A - m.b, stroke: 'rgba(150,185,225,0.3)', 'stroke-width': 1 }));

  type Barra = { cx: number; topo: number; texto: string[]; destaque: SVGRectElement };
  const barras: Barra[] = [];

  dados.forEach((d, gi) => {
    const cx = m.l + grupo * gi + grupo / 2;
    svg.append(svgEl('text', { x: cx, y: A - 8, 'text-anchor': 'middle', fill: corEixo, 'font-size': 11 }, d.t.replace('Transportadora ', 'Transp. ')));
    [d.necessarios, d.disponiveis].forEach((v, si) => {
      const bx = cx + (si === 0 ? -barra - 1 : 1);
      const topo = y(v);
      const h = Math.max(0, A - m.b - topo);
      const r = Math.min(4, barra / 2, h);
      if (h > 0) {
        svg.append(
          svgEl('path', {
            d: `M ${bx} ${A - m.b} V ${topo + r} Q ${bx} ${topo} ${bx + r} ${topo} H ${bx + barra - r} Q ${bx + barra} ${topo} ${bx + barra} ${topo + r} V ${A - m.b} Z`,
            fill: cores[si],
          }),
        );
      }
      svg.append(svgEl('text', { x: bx + barra / 2, y: topo - 5, 'text-anchor': 'middle', fill: corTexto, 'font-size': 11 }, numero(v)));
      const destaque = svgEl('rect', { x: bx - 3, y: m.t - 4, width: barra + 6, height: A - m.b - m.t + 4, fill: 'rgba(255,255,255,0.06)', rx: 4, visibility: 'hidden' });
      svg.insertBefore(destaque, svg.firstChild);
      const texto = [d.t, `${nomesSerie[si]}: ${numero(v)} veículos`, `Cobertura de frota: ${percentual(d.coberturaPct)}`];
      barras.push({ cx: bx + barra / 2, topo, texto, destaque });
      const alvo = svgEl('rect', { x: bx - 2, y: m.t, width: barra + 4, height: A - m.b - m.t, fill: 'transparent' });
      const idx = barras.length - 1;
      alvo.addEventListener('pointerenter', () => mostrar(idx, false));
      alvo.addEventListener('pointerleave', esconder);
      svg.append(alvo);
    });
  });

  let ativo = -1;
  function mostrar(i: number, anunciar: boolean) {
    if (barras.length === 0) return;
    barras.forEach((b) => b.destaque.setAttribute('visibility', 'hidden'));
    ativo = Math.max(0, Math.min(barras.length - 1, i));
    const b = barras[ativo];
    b.destaque.setAttribute('visibility', 'visible');
    preencherDica(dica, b.texto);
    posicionarDica(dica, fig, (b.cx / L) * area.clientWidth + area.offsetLeft, (b.topo / A) * area.clientHeight + area.offsetTop);
    if (anunciar) anuncio.textContent = b.texto.join(', ');
  }
  function esconder() {
    barras.forEach((b) => b.destaque.setAttribute('visibility', 'hidden'));
    dica.hidden = true;
  }
  area.onfocus = () => mostrar(ativo < 0 ? 0 : ativo, true);
  area.onblur = esconder;
  area.onkeydown = (e: KeyboardEvent) => {
    const mapa: Record<string, number> = { ArrowRight: ativo + 1, ArrowLeft: ativo - 1, Home: 0, End: barras.length - 1 };
    if (e.key in mapa) {
      e.preventDefault();
      mostrar(mapa[e.key], true);
    } else if (e.key === 'Escape') {
      esconder();
    }
  };
}

function renderTabela(raiz: HTMLElement, ent: LinhaEntrega[], frt: LinhaFrota[], transportadoras: string[]) {
  const corpo = raiz.querySelector<HTMLTableSectionElement>('table.resumo tbody')!;
  const eT = agruparPor(ent, (l) => l.transportadora);
  const fT = agruparPor(frt, (l) => l.transportadora);
  corpo.replaceChildren(
    ...transportadoras.map((t) => {
      const r = resumirEntregas(eT.get(t) ?? []);
      const f = resumirFrota(fT.get(t) ?? []);
      const tr = document.createElement('tr');
      tr.dataset.transportadora = t;
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = t;
      tr.append(th);
      for (const v of [
        numero(r.entregas),
        percentual(r.otifPct),
        r.custoPorEntrega === null ? 'sem dados' : moeda(r.custoPorEntrega),
        percentual(f.coberturaPct),
        decimal(f.entregasPorVeiculo),
      ]) {
        const td = document.createElement('td');
        td.className = 'num';
        td.textContent = v;
        tr.append(td);
      }
      return tr;
    }),
  );
}
