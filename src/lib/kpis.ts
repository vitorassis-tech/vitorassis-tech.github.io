/**
 * Funções puras de indicadores logísticos (testadas em tests/unit).
 * Usadas pelas demonstrações com dados fictícios (indicadores didáticos, independentes de qualquer empresa).
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
  necessarios: number;
  disponiveis: number;
  em_rota: number;
  /** entregas do dia (todas as regiões) */
  entregas: number;
}

export interface LinhaCargas {
  data: string;
  transportadora: string;
  programadas: number;
  expedidas: number;
  pendentes: number;
  horas_pendencia: number;
}

export interface LinhaPendencia {
  data: string;
  transportadora: string;
  motivo: string;
  horas: number;
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

/** Converte razão em percentual, preservando null (sem dados). */
export const pct = (numerador: number, denominador: number): number | null => {
  const r = razao(numerador, denominador);
  return r === null ? null : r * 100;
};

/** Cobertura de frota (%) = veículos disponíveis ÷ veículos necessários × 100. Indicador didático. */
export const coberturaFrota = (disponiveis: number, necessarios: number): number | null => pct(disponiveis, necessarios);

/** Entregas por veículo em rota = entregas ÷ veículos em rota. Indicador didático. */
export const entregasPorVeiculoEmRota = (entregas: number, emRota: number): number | null => razao(entregas, emRota);

/** Taxa de expedição (%) = cargas expedidas ÷ cargas programadas × 100. Indicador didático. */
export const taxaExpedicao = (expedidas: number, programadas: number): number | null => pct(expedidas, programadas);

export interface ResumoFrota {
  necessarios: number;
  disponiveis: number;
  emRota: number;
  entregas: number;
  coberturaPct: number | null;
  entregasPorVeiculo: number | null;
}

export function resumirFrota(linhas: LinhaFrota[]): ResumoFrota {
  const t = linhas.reduce(
    (acc, l) => ({
      necessarios: acc.necessarios + l.necessarios,
      disponiveis: acc.disponiveis + l.disponiveis,
      emRota: acc.emRota + l.em_rota,
      entregas: acc.entregas + l.entregas,
    }),
    { necessarios: 0, disponiveis: 0, emRota: 0, entregas: 0 },
  );
  return {
    ...t,
    coberturaPct: coberturaFrota(t.disponiveis, t.necessarios),
    entregasPorVeiculo: entregasPorVeiculoEmRota(t.entregas, t.emRota),
  };
}

export interface ResumoCargas {
  programadas: number;
  expedidas: number;
  pendentes: number;
  taxaExpedicaoPct: number | null;
  /** null quando não há pendências no período (não é zero) */
  tempoMedioPendencia: number | null;
}

export function resumirCargas(linhas: LinhaCargas[]): ResumoCargas {
  const t = linhas.reduce(
    (acc, l) => ({
      programadas: acc.programadas + l.programadas,
      expedidas: acc.expedidas + l.expedidas,
      pendentes: acc.pendentes + l.pendentes,
      horas: acc.horas + l.horas_pendencia,
    }),
    { programadas: 0, expedidas: 0, pendentes: 0, horas: 0 },
  );
  return {
    programadas: t.programadas,
    expedidas: t.expedidas,
    pendentes: t.pendentes,
    taxaExpedicaoPct: taxaExpedicao(t.expedidas, t.programadas),
    tempoMedioPendencia: razao(t.horas, t.pendentes),
  };
}

/* ---------------- Farol da simulação (parâmetros fictícios) ---------------- */

export type StatusFarol = 'normal' | 'atencao' | 'critico' | 'sem-dados';

export interface LimitesFarol {
  /** abaixo deste valor (%): Atenção */
  atencao: number;
  /** abaixo deste valor (%): Crítico */
  critico: number;
}

/** Parâmetros demonstrativos FICTÍCIOS (ajustáveis na tela). */
export const LIMITES_PADRAO: LimitesFarol = { atencao: 95, critico: 85 };

/** Valida os limites informados pelo visitante. Retorna a lista de erros (vazia = válido). */
export function validarLimites(l: LimitesFarol): string[] {
  const erros: string[] = [];
  for (const [nome, v] of [
    ['Atenção', l.atencao],
    ['Crítico', l.critico],
  ] as const) {
    if (!Number.isFinite(v)) erros.push(`${nome}: informe um número.`);
    else if (v < 0 || v > 100) erros.push(`${nome}: use um valor entre 0 e 100.`);
  }
  if (erros.length === 0 && l.critico >= l.atencao) erros.push('O limite crítico precisa ser menor que o de atenção.');
  return erros;
}

/**
 * Farol com prioridade para Crítico:
 * - Crítico se QUALQUER indicador disponível estiver abaixo do limite crítico;
 * - senão Atenção se algum estiver abaixo do limite de atenção;
 * - senão Normal;
 * - "sem-dados" se nenhum indicador puder ser calculado.
 * Indicadores sem dado (null) são ignorados — nunca viram zero.
 */
export function farol(valores: (number | null)[], limites: LimitesFarol = LIMITES_PADRAO): StatusFarol {
  const disponiveis = valores.filter((v): v is number => v !== null && Number.isFinite(v));
  if (disponiveis.length === 0) return 'sem-dados';
  if (disponiveis.some((v) => v < limites.critico)) return 'critico';
  if (disponiveis.some((v) => v < limites.atencao)) return 'atencao';
  return 'normal';
}

export const ROTULO_FAROL: Record<StatusFarol, string> = {
  normal: 'Normal',
  atencao: 'Atenção',
  critico: 'Crítico',
  'sem-dados': 'Sem dados',
};

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
