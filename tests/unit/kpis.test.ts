import { describe, expect, it } from 'vitest';
import {
  coberturaFrota,
  deColunar,
  entregasPorVeiculoEmRota,
  farol,
  inicioDaSemana,
  LIMITES_PADRAO,
  otifSemanal,
  razao,
  resumirCargas,
  resumirEntregas,
  resumirFrota,
  taxaExpedicao,
  validarLimites,
  type LinhaCargas,
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

describe('indicadores didáticos de frota', () => {
  it('cobertura de frota = disponíveis ÷ necessários × 100', () => {
    expect(coberturaFrota(9, 10)).toBeCloseTo(90);
    expect(coberturaFrota(12, 10)).toBeCloseTo(120);
  });

  it('entregas por veículo em rota = entregas ÷ veículos em rota', () => {
    expect(entregasPorVeiculoEmRota(70, 10)).toBeCloseTo(7);
  });

  it('divisão por zero retorna null (sem dados), nunca 0', () => {
    expect(coberturaFrota(3, 0)).toBeNull();
    expect(entregasPorVeiculoEmRota(5, 0)).toBeNull();
    expect(taxaExpedicao(0, 0)).toBeNull();
    expect(razao(1, 0)).toBeNull();
  });

  it('resume a frota somando antes de dividir (média ponderada)', () => {
    const linhas: LinhaFrota[] = [
      { data: '2026-01-05', transportadora: 'A', necessarios: 10, disponiveis: 8, em_rota: 8, entregas: 56 },
      { data: '2026-01-06', transportadora: 'A', necessarios: 30, disponiveis: 30, em_rota: 30, entregas: 210 },
    ];
    const r = resumirFrota(linhas);
    expect(r.coberturaPct).toBeCloseTo(95);
    expect(r.entregasPorVeiculo).toBeCloseTo(7);
    expect(resumirFrota([]).coberturaPct).toBeNull();
  });
});

describe('cargas e pendências', () => {
  const linha = (p: Partial<LinhaCargas>): LinhaCargas => ({
    data: '2026-01-05',
    transportadora: 'A',
    programadas: 20,
    expedidas: 18,
    pendentes: 2,
    horas_pendencia: 10,
    ...p,
  });

  it('taxa de expedição e tempo médio de pendência', () => {
    const r = resumirCargas([linha({}), linha({ programadas: 10, expedidas: 10, pendentes: 0, horas_pendencia: 0 })]);
    expect(r.taxaExpedicaoPct).toBeCloseTo((28 / 30) * 100);
    expect(r.tempoMedioPendencia).toBeCloseTo(5);
  });

  it('período sem pendências: tempo médio é null, não zero', () => {
    const r = resumirCargas([linha({ programadas: 10, expedidas: 10, pendentes: 0, horas_pendencia: 0 })]);
    expect(r.pendentes).toBe(0);
    expect(r.tempoMedioPendencia).toBeNull();
    expect(r.taxaExpedicaoPct).toBeCloseTo(100);
  });

  it('sem cargas programadas: taxa é null', () => {
    expect(resumirCargas([]).taxaExpedicaoPct).toBeNull();
  });
});

describe('farol (parâmetros fictícios)', () => {
  it('usa 95% e 85% como padrão', () => {
    expect(LIMITES_PADRAO).toEqual({ atencao: 95, critico: 85 });
  });

  it('classifica normal, atenção e crítico', () => {
    expect(farol([99, 97])).toBe('normal');
    expect(farol([99, 90])).toBe('atencao');
    expect(farol([99, 80])).toBe('critico');
  });

  it('prioriza Crítico quando qualquer indicador está abaixo do limite crítico', () => {
    expect(farol([90, 84.9])).toBe('critico');
    expect(farol([84, 100])).toBe('critico');
  });

  it('limite exato não rebaixa o status', () => {
    expect(farol([95, 95])).toBe('normal');
    expect(farol([85, 99])).toBe('atencao');
  });

  it('ignora indicadores sem dado e retorna sem-dados quando nenhum existe', () => {
    expect(farol([null, 99])).toBe('normal');
    expect(farol([null, 80])).toBe('critico');
    expect(farol([null, null])).toBe('sem-dados');
  });

  it('respeita limites ajustados', () => {
    expect(farol([92], { atencao: 90, critico: 80 })).toBe('normal');
    expect(farol([79], { atencao: 90, critico: 80 })).toBe('critico');
  });

  it('valida os limites informados', () => {
    expect(validarLimites({ atencao: 95, critico: 85 })).toEqual([]);
    expect(validarLimites({ atencao: 80, critico: 85 })).toHaveLength(1);
    expect(validarLimites({ atencao: 120, critico: 85 })).toHaveLength(1);
    expect(validarLimites({ atencao: Number.NaN, critico: 85 })).toHaveLength(1);
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
