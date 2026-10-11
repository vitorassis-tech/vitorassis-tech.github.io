/** Pequenos utilitários para criar SVG com segurança (sem innerHTML). */

const NS = 'http://www.w3.org/2000/svg';

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  atributos: Record<string, string | number> = {},
  texto?: string,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, String(v));
  if (texto !== undefined) el.textContent = texto;
  return el;
}

/** Escala linear simples. */
export const escala =
  (d0: number, d1: number, r0: number, r1: number) =>
  (v: number): number =>
    d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/** Lê uma variável CSS do documento (cores dos tokens). */
export const corToken = (nome: string, padrao: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || padrao;

/** Posiciona uma dica (tooltip) dentro do contêiner, sem sair das bordas. */
export function posicionarDica(dica: HTMLElement, conteiner: HTMLElement, x: number, y: number): void {
  dica.hidden = false;
  const largura = dica.offsetWidth;
  const max = conteiner.clientWidth;
  const xSeguro = Math.min(Math.max(x, largura / 2 + 4), max - largura / 2 - 4);
  dica.style.left = `${xSeguro}px`;
  dica.style.top = `${y}px`;
}

/** Preenche uma dica com linhas de texto (textContent, sem HTML). */
export function preencherDica(dica: HTMLElement, linhas: string[]): void {
  dica.replaceChildren(
    ...linhas.map((l, i) => {
      const div = document.createElement('div');
      div.textContent = l;
      if (i === 0) div.style.fontWeight = '600';
      return div;
    }),
  );
}
