/** Utilitários de formatação em pt-BR. */

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-05" → "mai/2026" */
export function mesAno(aaaamm: string): string {
  const [a, m] = aaaamm.split('-').map(Number);
  if (!a || !m || m < 1 || m > 12) throw new Error(`Data inválida: ${aaaamm}`);
  return `${MESES[m - 1]}/${a}`;
}

/** Período "ago/2019 – atual" */
export function periodo(inicio: string, fim: string | null): string {
  return `${mesAno(inicio)} – ${fim ? mesAno(fim) : 'atual'}`;
}

/** Duração aproximada em anos e meses entre AAAA-MM e AAAA-MM (ou referência). */
export function duracao(inicio: string, fim: string | null, referencia: string): string {
  const [a1, m1] = inicio.split('-').map(Number);
  const [a2, m2] = (fim ?? referencia).split('-').map(Number);
  const meses = (a2 - a1) * 12 + (m2 - m1) + 1;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (resto > 0) partes.push(`${resto} ${resto === 1 ? 'mês' : 'meses'}`);
  return partes.join(' e ') || 'menos de 1 mês';
}

const nf = (min: number, max: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });

export const numero = (v: number, casas = 0): string => nf(casas, casas).format(v);
export const moeda = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
export const percentual = (v: number | null, casas = 1): string => (v === null ? 'sem dados' : `${nf(casas, casas).format(v)}%`);

/** Prefixa caminhos internos com o BASE_URL do Astro (suporte a subpasta no GitHub Pages). */
export function url(caminho: string, base: string = import.meta.env?.BASE_URL ?? '/'): string {
  if (/^(https?:|mailto:|tel:|#)/.test(caminho)) return caminho;
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${b}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;
}
