/**
 * Painel de frota e entregas — DADOS SIMULADOS.
 * Carrega o JSON gerado pelo script Python, aplica filtros e desenha
 * indicadores, gráficos SVG e tabela. Sem bibliotecas externas.
 */
import {
  deColunar,
  otifSemanal,
  resumirEntregas,
  resumirFrota,
  agruparPor,
  inicioDaSemana,
  type LinhaEntrega,
  type LinhaFrota,
  type Tabela,
} from '../lib/kpis';
import { moeda, numero, percentual } from '../lib/formato';
import { svgEl, escala, corToken, posicionarDica, preencherDica } from './svg';

interface Payload {
  simulado: boolean;
  aviso: string;
  periodo: { inicio: string; fim: string };
  transportadoras: string[];
  regioes: string[];
  entregas: Tabela;
  frota: Tabela;
}

interface Filtros {
  transportadora: string;
  regiao: string;
  periodo: string;
}

const dataCurta = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};
const dataLonga = (iso: string) => {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};

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
    console.error('[painel-fretes] Falha ao carregar dados:', erro);
    estado.classList.add('erro');
    estado.textContent =
      'Não foi possível carregar os dados simulados. Recarregue a página; se o problema continuar, gere os dados com "npm run dados".';
    return;
  }

  // Popula filtros
  const selTransp = form.elements.namedItem('transportadora') as HTMLSelectElement;
  const selRegiao = form.elements.namedItem('regiao') as HTMLSelectElement;
  const selPeriodo = form.elements.namedItem('periodo') as HTMLSelectElement;
  for (const t of payload.transportadoras) selTransp.add(new Option(t, t));
  for (const r of payload.regioes) selRegiao.add(new Option(r, r));
  form.querySelectorAll<HTMLSelectElement | HTMLButtonElement>('select, button').forEach((el) => (el.disabled = false));

  const semanas = [...new Set(entregas.map((e) => inicioDaSemana(e.data)))].sort();

  const lerFiltros = (): Filtros => ({
    transportadora: selTransp.value,
    regiao: selRegiao.value,
    periodo: selPeriodo.value,
  });

  const render = () => {
    const f = lerFiltros();
    const semanaMinima = f.periodo === 'tudo' ? '' : semanas[Math.max(0, semanas.length - Number(f.periodo))];
    const noPeriodo = (data: string) => !semanaMinima || inicioDaSemana(data) >= semanaMinima;

    const ent = entregas.filter(
      (e) => noPeriodo(e.data) && (!f.transportadora || e.transportadora === f.transportadora) && (!f.regiao || e.regiao === f.regiao),
    );
    const frt = frota.filter((l) => noPeriodo(l.data) && (!f.transportadora || l.transportadora === f.transportadora));

    estado.textContent = '';
    conteudo.hidden = false;

    const datas = ent.map((e) => e.data).sort();
    raiz.querySelector('.periodo-ativo')!.textContent = datas.length
      ? `Período exibido: ${dataLonga(datas[0])} a ${dataLonga(datas[datas.length - 1])}`
      : 'Nenhum dado para os filtros selecionados.';
    raiz.querySelector<HTMLElement>('.nota-frota')!.hidden = !f.regiao;

    renderKpis(raiz, ent, frt);
    renderOtif(raiz, ent);
    renderFrota(raiz, frt, f.transportadora ? [f.transportadora] : payload.transportadoras);
    renderTabela(raiz, ent, frt, f.transportadora ? [f.transportadora] : payload.transportadoras);
  };

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('change', render);
  form.addEventListener('reset', () => window.setTimeout(render, 0));

  let redimensionar = 0;
  const observador = new ResizeObserver(() => {
    window.cancelAnimationFrame(redimensionar);
    redimensionar = window.requestAnimationFrame(render);
  });
  observador.observe(raiz.querySelector('.graficos')!);

  render();
}

function renderKpis(raiz: HTMLElement, ent: LinhaEntrega[], frt: LinhaFrota[]) {
  const r = resumirEntregas(ent);
  const fr = resumirFrota(frt);
  const definir = (kpi: string, valor: string, sub: string) => {
    const el = raiz.querySelector(`[data-kpi="${kpi}"]`)!;
    el.querySelector('.valor')!.textContent = valor;
    el.querySelector('.sub')!.textContent = sub;
  };
  definir('entregas', numero(r.entregas), `${numero(ent.length)} combinações dia, transportadora e região`);
  definir('otif', percentual(r.otifPct), `No prazo ${percentual(r.noPrazoPct)}, completas ${percentual(r.completasPct)}`);
  definir('custo', r.custoPorEntrega === null ? 'sem dados' : moeda(r.custoPorEntrega), `Total ${moeda(r.custoTotal)}`);
  definir('noshow', `${numero(fr.noShow)} veíc.`, `${percentual(fr.contratados ? (fr.noShow / fr.contratados) * 100 : null)} dos contratados`);
  definir('spot', `${numero(fr.spot)} veíc.`, `${percentual(fr.contratados ? (fr.spot / fr.contratados) * 100 : null)} além do contrato`);
}

function renderOtif(raiz: HTMLElement, ent: LinhaEntrega[]) {
  const fig = raiz.querySelector<HTMLElement>('[data-grafico="otif"]')!;
  const area = fig.querySelector<HTMLElement>('.area')!;
  const dica = fig.querySelector<HTMLElement>('.tooltip')!;
  const pontos = otifSemanal(ent).filter((p) => p.otifPct !== null) as { semana: string; entregas: number; otifPct: number }[];

  // Tabela acessível
  const corpo = fig.querySelector('tbody')!;
  corpo.replaceChildren(
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

  if (pontos.length === 0) {
    svg.append(svgEl('text', { x: L / 2, y: A / 2, 'text-anchor': 'middle', fill: corToken('--muted', '#4a5a70'), 'font-size': 14 }, 'Sem dados para os filtros selecionados'));
    return;
  }

  const valores = pontos.map((p) => p.otifPct);
  const yMin = Math.max(0, Math.floor((Math.min(...valores) - 3) / 5) * 5);
  const yMax = Math.min(100, Math.ceil((Math.max(...valores) + 2) / 5) * 5);
  const x = escala(0, Math.max(1, pontos.length - 1), m.l, L - m.r);
  const y = escala(yMin, yMax, A - m.b, m.t);
  const corLinha = corToken('--serie-1', '#2563a8');
  const corEixo = corToken('--muted', '#4a5a70');
  const corGrade = corToken('--line', '#d9e2ec');

  // Grade e eixo Y
  const passo = yMax - yMin > 20 ? 10 : 5;
  for (let v = yMin; v <= yMax; v += passo) {
    svg.append(svgEl('line', { x1: m.l, x2: L - m.r, y1: y(v), y2: y(v), stroke: corGrade, 'stroke-width': 1 }));
    svg.append(svgEl('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', fill: corEixo, 'font-size': 11 }, `${v}%`));
  }
  // Eixo X: rótulos espaçados
  const cada = Math.ceil(pontos.length / Math.max(2, Math.floor((L - m.l) / 70)));
  const ultimoIdx = pontos.length - 1;
  pontos.forEach((p, i) => {
    const regular = i % cada === 0 && (ultimoIdx - i >= cada || i === ultimoIdx);
    if (regular || i === ultimoIdx) {
      svg.append(svgEl('text', { x: x(i), y: A - 8, 'text-anchor': 'middle', fill: corEixo, 'font-size': 11 }, dataCurta(p.semana)));
    }
  });

  // Linha
  const d = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.otifPct).toFixed(1)}`).join(' ');
  svg.append(svgEl('path', { d, fill: 'none', stroke: corLinha, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

  // Rótulo direto apenas no último ponto
  const ultimo = pontos[pontos.length - 1];
  svg.append(svgEl('circle', { cx: x(pontos.length - 1), cy: y(ultimo.otifPct), r: 4, fill: corLinha, stroke: '#fff', 'stroke-width': 2 }));

  // Camada de interação: guia + marcador
  const guia = svgEl('line', { y1: m.t, y2: A - m.b, stroke: corEixo, 'stroke-width': 1, 'stroke-dasharray': '3 3', visibility: 'hidden' });
  const marcador = svgEl('circle', { r: 5, fill: corLinha, stroke: '#fff', 'stroke-width': 2, visibility: 'hidden' });
  svg.append(guia, marcador);

  let ativo = -1;
  const mostrar = (i: number) => {
    ativo = Math.max(0, Math.min(pontos.length - 1, i));
    const p = pontos[ativo];
    const px = x(ativo);
    const py = y(p.otifPct);
    guia.setAttribute('x1', String(px));
    guia.setAttribute('x2', String(px));
    guia.setAttribute('visibility', 'visible');
    marcador.setAttribute('cx', String(px));
    marcador.setAttribute('cy', String(py));
    marcador.setAttribute('visibility', 'visible');
    preencherDica(dica, [`Semana de ${dataLonga(p.semana)}`, `OTIF ${percentual(p.otifPct)}`, `${numero(p.entregas)} entregas`]);
    posicionarDica(dica, fig, (px / L) * area.clientWidth + area.offsetLeft, (py / A) * area.clientHeight + area.offsetTop);
  };
  const esconder = () => {
    guia.setAttribute('visibility', 'hidden');
    marcador.setAttribute('visibility', 'hidden');
    dica.hidden = true;
  };

  area.onpointermove = (e: PointerEvent) => {
    const ret = area.getBoundingClientRect();
    const xl = ((e.clientX - ret.left) / ret.width) * L;
    const i = Math.round(((xl - m.l) / (L - m.l - m.r)) * (pontos.length - 1));
    mostrar(i);
  };
  area.onpointerleave = esconder;
  area.onblur = esconder;
  area.onfocus = () => mostrar(ativo < 0 ? pontos.length - 1 : ativo);
  area.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      if (e.key === 'Home') mostrar(0);
      else if (e.key === 'End') mostrar(pontos.length - 1);
      else mostrar(ativo + (e.key === 'ArrowRight' ? 1 : -1));
    } else if (e.key === 'Escape') {
      esconder();
    }
  };
}

function renderFrota(raiz: HTMLElement, frt: LinhaFrota[], transportadoras: string[]) {
  const fig = raiz.querySelector<HTMLElement>('[data-grafico="frota"]')!;
  const area = fig.querySelector<HTMLElement>('.area')!;
  const dica = fig.querySelector<HTMLElement>('.tooltip')!;
  const porT = agruparPor(frt, (l) => l.transportadora);
  const dados = transportadoras.map((t) => ({ t, ...resumirFrota(porT.get(t) ?? []) }));

  const L = area.clientWidth || 400;
  const A = area.clientHeight || 240;
  const m = { t: 20, r: 8, b: 28, l: 8 };
  const svg = svgEl('svg', { viewBox: `0 0 ${L} ${A}`, 'aria-hidden': 'true' });
  area.replaceChildren(svg);
  dica.hidden = true;

  const max = Math.max(1, ...dados.flatMap((d) => [d.noShow, d.spot]));
  const y = escala(0, max, A - m.b, m.t);
  const grupo = (L - m.l - m.r) / dados.length;
  const barra = Math.min(28, (grupo - 16) / 2);
  const cores = [corToken('--serie-1', '#2563a8'), corToken('--serie-2', '#c9741f')];
  const corEixo = corToken('--muted', '#4a5a70');
  const corTexto = corToken('--ink', '#15253b');

  svg.append(svgEl('line', { x1: m.l, x2: L - m.r, y1: A - m.b, y2: A - m.b, stroke: corToken('--line-strong', '#b9c7d8'), 'stroke-width': 1 }));

  dados.forEach((d, gi) => {
    const cx = m.l + grupo * gi + grupo / 2;
    const rotulo = d.t.replace('Transportadora ', 'Transp. ');
    svg.append(svgEl('text', { x: cx, y: A - 8, 'text-anchor': 'middle', fill: corEixo, 'font-size': 11 }, rotulo));
    [d.noShow, d.spot].forEach((v, si) => {
      const bx = cx + (si === 0 ? -barra - 1 : 1);
      const topo = y(v);
      const h = Math.max(0, A - m.b - topo);
      // Barra com topo arredondado e base reta, ancorada na linha de base
      const r = Math.min(4, barra / 2, h);
      const caminho = h > 0
        ? `M ${bx} ${A - m.b} V ${topo + r} Q ${bx} ${topo} ${bx + r} ${topo} H ${bx + barra - r} Q ${bx + barra} ${topo} ${bx + barra} ${topo + r} V ${A - m.b} Z`
        : '';
      if (caminho) svg.append(svgEl('path', { d: caminho, fill: cores[si] }));
      svg.append(svgEl('text', { x: bx + barra / 2, y: topo - 5, 'text-anchor': 'middle', fill: corTexto, 'font-size': 11 }, numero(v)));
      // Alvo de interação maior que a barra
      const alvo = svgEl('rect', { x: bx - 2, y: m.t, width: barra + 4, height: A - m.b - m.t, fill: 'transparent' });
      alvo.addEventListener('pointerenter', () => {
        preencherDica(dica, [d.t, `${si === 0 ? 'No-Show' : 'Spot'}: ${numero(v)} veículos`, `Contratados no período: ${numero(d.contratados)}`]);
        posicionarDica(dica, fig, ((bx + barra / 2) / L) * area.clientWidth + area.offsetLeft, (topo / A) * area.clientHeight + area.offsetTop);
      });
      alvo.addEventListener('pointerleave', () => (dica.hidden = true));
      svg.append(alvo);
    });
  });
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
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = t;
      tr.append(th);
      for (const v of [
        numero(r.entregas),
        percentual(r.otifPct),
        r.custoPorEntrega === null ? 'sem dados' : moeda(r.custoPorEntrega),
        numero(f.noShow),
        numero(f.spot),
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
