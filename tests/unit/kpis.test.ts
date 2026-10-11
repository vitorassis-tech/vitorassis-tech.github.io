import { describe, expect, it } from 'vitest';
import {
  deColunar,
  inicioDaSemana,
  noShow,
  otifSemanal,
  razao,
  resumirEntregas,
  resumirFrota,
  spot,
  type LinhaEntrega,
  type LinhaFrota,
} from '../../src/lib/kpis';

const entrega = (p: Partial<LinhaEntrega>): LinhaEntrega => ({
  data: '2026-01-05',
  transportadora: 'Transportadora A',
  regiao: 'Região Centro',
  entregas: 10,
  no_prazo: 9,
  completas: 10,
  otif: 9,
  peso_kg: 100,
  custo_frete: 500,
  ...p,
});

describe('regras de frota', () => {
  it('No-Show = MÁXIMO(contratado − apresentado; 0)', () => {
    expect(noShow(10, 8)).toBe(2);
    expect(noShow(10, 10)).toBe(0);
    expect(noShow(10, 12)).toBe(0);
  });

  it('Spot = MÁXIMO(utilizado − contratado; 0)', () => {
    expect(spot(12, 10)).toBe(2);
    expect(spot(9, 10)).toBe(0);
  });

  it('soma No-Show e Spot por dia, sem compensar dias diferentes', () => {
    const linhas: LinhaFrota[] = [
      { data: '2026-01-05', transportadora: 'A', contratados: 10, apresentados: 8, utilizados: 9, no_show: 2, spot: 0 },
      { data: '2026-01-06', transportadora: 'A', contratados: 10, apresentados: 12, utilizados: 13, no_show: 0, spot: 3 },
    ];
    const r = resumirFrota(linhas);
    expect(r.noShow).toBe(2);
    expect(r.spot).toBe(3);
    expect(r.contratados).toBe(20);
  });
});

describe('indicadores de entrega', () => {
  it('calcula OTIF, custo por entrega e percentuais', () => {
    const r = resumirEntregas([entrega({}), entrega({ entregas: 10, otif: 7, no_prazo: 8, completas: 9, custo_frete: 300 })]);
    expect(r.entregas).toBe(20);
    expect(r.otifPct).toBeCloseTo(80);
    expect(r.noPrazoPct).toBeCloseTo(85);
    expect(r.custoPorEntrega).toBeCloseTo(40);
  });

  it('não inventa valor quando não há entregas', () => {
    const r = resumirEntregas([]);
    expect(r.otifPct).toBeNull();
    expect(r.custoPorEntrega).toBeNull();
    expect(razao(1, 0)).toBeNull();
  });

  it('agrupa OTIF por semana (segunda-feira) e pondera pelo volume', () => {
    const pontos = otifSemanal([
      entrega({ data: '2026-01-05', entregas: 10, otif: 10 }),
      entrega({ data: '2026-01-09', entregas: 30, otif: 15 }),
      entrega({ data: '2026-01-12', entregas: 10, otif: 5 }),
    ]);
    expect(pontos).toHaveLength(2);
    expect(pontos[0].semana).toBe('2026-01-05');
    expect(pontos[0].otifPct).toBeCloseTo(62.5);
    expect(pontos[1].otifPct).toBeCloseTo(50);
  });

  it('início da semana trata domingo e meio de semana', () => {
    expect(inicioDaSemana('2026-01-07')).toBe('2026-01-05');
    expect(inicioDaSemana('2026-01-11')).toBe('2026-01-05');
    expect(inicioDaSemana('2026-01-05')).toBe('2026-01-05');
  });
});

describe('formato colunar', () => {
  it('converte cabeçalho + linhas em objetos', () => {
    expect(deColunar<{ a: number; b: string }>({ colunas: ['a', 'b'], linhas: [[1, 'x']] })).toEqual([{ a: 1, b: 'x' }]);
  });
  it('rejeita formato inválido', () => {
    // @ts-expect-error teste de entrada inválida
    expect(() => deColunar({})).toThrow();
  });
});
