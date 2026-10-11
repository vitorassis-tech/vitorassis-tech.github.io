/**
 * Funções puras de indicadores logísticos (testadas em tests/unit).
 * Usadas pelo painel de demonstração com dados simulados.
 */

export interface LinhaEntrega {
  data: string;
  transportadora: string;
  regiao: string;
  entregas: number;
  no_prazo: number;
  completas: number;
  otif: number;
  peso_kg: number;
  custo_frete: number;
}

export interface LinhaFrota {
  data: string;
  transportadora: string;
  contratados: number;
  apresentados: number;
  utilizados: number;
  no_show: number;
  spot: number;
}

export interface Tabela {
  colunas: string[];
  linhas: (string | number)[][];
}

/** Converte o formato colunar {colunas, linhas} em lista de objetos. */
export function deColunar<T>(tabela: Tabela): T[] {
  if (!tabela || !Array.isArray(tabela.colunas) || !Array.isArray(tabela.linhas)) {
    throw new Error('Formato de dados inválido: esperado {colunas, linhas}.');
  }
  return tabela.linhas.map((linha) => {
    const obj: Record<string, string | number> = {};
    tabela.colunas.forEach((c, i) => {
      obj[c] = linha[i];
    });
    return obj as T;
  });
}

/** No-Show = MÁXIMO(Contratado − Apresentado; 0) */
export const noShow = (contratados: number, apresentados: number): number => Math.max(contratados - apresentados, 0);

/** Spot (frete extra) = MÁXIMO(Utilizado − Contratado; 0) */
export const spot = (utilizados: number, contratados: number): number => Math.max(utilizados - contratados, 0);

/** Divisão segura: retorna null quando o denominador é zero (não inventa valor). */
export const razao = (numerador: number, denominador: number): number | null =>
  denominador > 0 ? numerador / denominador : null;

export interface ResumoEntregas {
  entregas: number;
  otifPct: number | null;
  noPrazoPct: number | null;
  completasPct: number | null;
  custoTotal: number;
  custoPorEntrega: number | null;
}

export function resumirEntregas(linhas: LinhaEntrega[]): ResumoEntregas {
  let entregas = 0;
  let otif = 0;
  let noPrazo = 0;
  let completas = 0;
  let custo = 0;
  for (const l of linhas) {
    entregas += l.entregas;
    otif += l.otif;
    noPrazo += l.no_prazo;
    completas += l.completas;
    custo += l.custo_frete;
  }
  const pct = (n: number) => {
    const r = razao(n, entregas);
    return r === null ? null : r * 100;
  };
  return {
    entregas,
    otifPct: pct(otif),
    noPrazoPct: pct(noPrazo),
    completasPct: pct(completas),
    custoTotal: custo,
    custoPorEntrega: razao(custo, entregas),
  };
}

export interface ResumoFrota {
  contratados: number;
  apresentados: number;
  utilizados: number;
  noShow: number;
  spot: number;
}

/** Soma diária: No-Show e Spot são calculados por dia/transportadora e depois somados. */
export function resumirFrota(linhas: LinhaFrota[]): ResumoFrota {
  return linhas.reduce<ResumoFrota>(
    (acc, l) => ({
      contratados: acc.contratados + l.contratados,
      apresentados: acc.apresentados + l.apresentados,
      utilizados: acc.utilizados + l.utilizados,
      noShow: acc.noShow + noShow(l.contratados, l.apresentados),
      spot: acc.spot + spot(l.utilizados, l.contratados),
    }),
    { contratados: 0, apresentados: 0, utilizados: 0, noShow: 0, spot: 0 },
  );
}

/** Segunda-feira (AAAA-MM-DD) da semana de uma data ISO. */
export function inicioDaSemana(dataIso: string): string {
  const [a, m, d] = dataIso.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  const dia = dt.getUTCDay(); // 0 = domingo
  const deslocamento = dia === 0 ? -6 : 1 - dia;
  dt.setUTCDate(dt.getUTCDate() + deslocamento);
  return dt.toISOString().slice(0, 10);
}

export interface PontoSemanal {
  semana: string;
  entregas: number;
  otifPct: number | null;
}

/** OTIF semanal (ponderado pelo volume de entregas). */
export function otifSemanal(linhas: LinhaEntrega[]): PontoSemanal[] {
  const mapa = new Map<string, { entregas: number; otif: number }>();
  for (const l of linhas) {
    const s = inicioDaSemana(l.data);
    const atual = mapa.get(s) ?? { entregas: 0, otif: 0 };
    atual.entregas += l.entregas;
    atual.otif += l.otif;
    mapa.set(s, atual);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, v]) => {
      const r = razao(v.otif, v.entregas);
      return { semana, entregas: v.entregas, otifPct: r === null ? null : r * 100 };
    });
}

export function agruparPor<T, K extends string>(itens: T[], chave: (item: T) => K): Map<K, T[]> {
  const mapa = new Map<K, T[]>();
  for (const item of itens) {
    const k = chave(item);
    const lista = mapa.get(k);
    if (lista) lista.push(item);
    else mapa.set(k, [item]);
  }
  return mapa;
}
