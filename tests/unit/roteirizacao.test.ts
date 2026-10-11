import { describe, expect, it } from 'vitest';
import { distanciaRota, doisOpt, gerarPontos, geradorAleatorio, vizinhoMaisProximo } from '../../src/lib/roteirizacao';

describe('roteirização', () => {
  const quadrado = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('mede a distância da rota fechada', () => {
    expect(distanciaRota(quadrado, [0, 1, 2, 3])).toBeCloseTo(40);
  });

  it('vizinho mais próximo visita todos os pontos uma única vez, começando no depósito', () => {
    const pontos = gerarPontos(20, 3);
    const rota = vizinhoMaisProximo(pontos);
    expect(rota[0]).toBe(0);
    expect(new Set(rota).size).toBe(pontos.length);
  });

  it('2-opt desfaz cruzamentos', () => {
    const cruzada = [0, 2, 1, 3];
    const melhorada = doisOpt(quadrado, cruzada);
    expect(distanciaRota(quadrado, melhorada)).toBeCloseTo(40);
    expect(melhorada[0]).toBe(0);
  });

  it('2-opt nunca piora a rota', () => {
    for (let semente = 1; semente <= 25; semente++) {
      const pontos = gerarPontos(25, semente);
      const inicial = vizinhoMaisProximo(pontos);
      const melhorada = doisOpt(pontos, inicial);
      expect(distanciaRota(pontos, melhorada)).toBeLessThanOrEqual(distanciaRota(pontos, inicial) + 1e-9);
      expect(new Set(melhorada).size).toBe(pontos.length);
    }
  });

  it('gerador é determinístico e fica entre 0 e 1', () => {
    const a = geradorAleatorio(42);
    const b = geradorAleatorio(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('pontos ficam dentro do plano', () => {
    for (const p of gerarPontos(50, 9, 100, 60, 6)) {
      expect(p.x).toBeGreaterThanOrEqual(6);
      expect(p.x).toBeLessThanOrEqual(94);
      expect(p.y).toBeGreaterThanOrEqual(6);
      expect(p.y).toBeLessThanOrEqual(54);
    }
  });

  it('casos vazios não quebram', () => {
    expect(vizinhoMaisProximo([])).toEqual([]);
    expect(distanciaRota([], [])).toBe(0);
  });
});
