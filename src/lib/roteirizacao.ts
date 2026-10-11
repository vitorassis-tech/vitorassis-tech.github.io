/**
 * Heurísticas simples de roteirização (problema do caixeiro-viajante).
 * - Vizinho mais próximo: construção gulosa da rota.
 * - 2-opt: melhoria local invertendo trechos.
 * A rota começa e termina no depósito (índice 0).
 * Funções puras — testadas em tests/unit/roteirizacao.test.ts.
 */

export interface Ponto {
  x: number;
  y: number;
}

export const distancia = (a: Ponto, b: Ponto): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Distância total de uma rota fechada (volta ao primeiro ponto). */
export function distanciaRota(pontos: Ponto[], rota: number[]): number {
  if (rota.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < rota.length; i++) {
    total += distancia(pontos[rota[i]], pontos[rota[(i + 1) % rota.length]]);
  }
  return total;
}

export function vizinhoMaisProximo(pontos: Ponto[], inicio = 0): number[] {
  if (pontos.length === 0) return [];
  const visitado = new Array<boolean>(pontos.length).fill(false);
  const rota = [inicio];
  visitado[inicio] = true;
  for (let passo = 1; passo < pontos.length; passo++) {
    const atual = pontos[rota[rota.length - 1]];
    let melhor = -1;
    let melhorDist = Infinity;
    for (let j = 0; j < pontos.length; j++) {
      if (visitado[j]) continue;
      const d = distancia(atual, pontos[j]);
      if (d < melhorDist) {
        melhorDist = d;
        melhor = j;
      }
    }
    visitado[melhor] = true;
    rota.push(melhor);
  }
  return rota;
}

/** Melhoria 2-opt. Mantém o depósito (posição 0) fixo. */
export function doisOpt(pontos: Ponto[], rotaInicial: number[], maxIteracoes = 1000): number[] {
  const rota = [...rotaInicial];
  const n = rota.length;
  if (n < 4) return rota;
  let melhorou = true;
  let iteracoes = 0;
  while (melhorou && iteracoes < maxIteracoes) {
    melhorou = false;
    iteracoes++;
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const a = pontos[rota[i - 1]];
        const b = pontos[rota[i]];
        const c = pontos[rota[k]];
        const d = pontos[rota[(k + 1) % n]];
        const delta = distancia(a, c) + distancia(b, d) - distancia(a, b) - distancia(c, d);
        if (delta < -1e-9) {
          // inverte o trecho i..k
          let esq = i;
          let dir = k;
          while (esq < dir) {
            [rota[esq], rota[dir]] = [rota[dir], rota[esq]];
            esq++;
            dir--;
          }
          melhorou = true;
        }
      }
    }
  }
  return rota;
}

/** Gerador pseudoaleatório determinístico (mulberry32) para pontos reproduzíveis. */
export function geradorAleatorio(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gera depósito no centro + `quantidade` pontos dentro de uma margem do plano. */
export function gerarPontos(quantidade: number, semente: number, largura = 100, altura = 60, margem = 6): Ponto[] {
  const aleatorio = geradorAleatorio(semente);
  const pontos: Ponto[] = [{ x: largura / 2, y: altura / 2 }];
  for (let i = 0; i < quantidade; i++) {
    pontos.push({
      x: margem + aleatorio() * (largura - 2 * margem),
      y: margem + aleatorio() * (altura - 2 * margem),
    });
  }
  return pontos;
}
