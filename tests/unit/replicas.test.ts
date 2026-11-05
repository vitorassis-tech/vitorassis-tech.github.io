import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { farolExpedido, farolParticipacao, reaisCurto } from '../../src/scripts/replica-expedicao';
import { faixaOcupacao, consolidarRegioes } from '../../src/scripts/replica-varejo';

const ler = (f: string) => JSON.parse(readFileSync(`public/dados/${f}`, 'utf8'));

describe('réplicas dos painéis de Power BI (dados fictícios)', () => {
  it('arquivos de dados são marcados como fictícios e não citam a empresa', () => {
    for (const f of ['painel-expedicao-ficticio.json', 'painel-varejo-ficticio.json']) {
      const bruto = readFileSync(`public/dados/${f}`, 'utf8');
      expect(JSON.parse(bruto).simulado).toBe(true);
      expect(bruto).not.toMatch(/profarma|libfarma|locafarma/i);
    }
  });

  it('farol do % expedido: OK na meta, atenção a partir do limite, crítico abaixo', () => {
    expect(farolExpedido(80, 80, 60)).toBe('normal');
    expect(farolExpedido(79.9, 80, 60)).toBe('atencao');
    expect(farolExpedido(59.9, 80, 60)).toBe('critico');
    expect(farolExpedido(null, 80, 60)).toBeNull();
    expect(farolParticipacao(25, 25, 10)).toBe('critico');
    expect(farolParticipacao(10, 25, 10)).toBe('atencao');
    expect(farolParticipacao(9.9, 25, 10)).toBe('normal');
  });

  it('valores em reais abreviados', () => {
    expect(reaisCurto(2_050_000)).toMatch(/^R\$\s2,05 mi$/);
    expect(reaisCurto(56_295)).toMatch(/^R\$\s56 mil$/);
  });

  it('faixas de ocupação: até 89%, 90% a 100% e acima de 100%', () => {
    expect(faixaOcupacao(89.9)).toBe('normal');
    expect(faixaOcupacao(90)).toBe('atencao');
    expect(faixaOcupacao(100)).toBe('atencao');
    expect(faixaOcupacao(100.1)).toBe('critico');
  });

  it('consolida rotas por região e ordena pela ocupação', () => {
    const regioes = [
      { regiao: 'A', perfil: 'VUC', capacidade: 100, transportadora: 'X' },
      { regiao: 'B', perfil: 'VUC', capacidade: 200, transportadora: 'X' },
      { regiao: 'C', perfil: 'VUC', capacidade: 100, transportadora: 'X' },
    ];
    const rotas = [
      { data: 'd', regiao: 'A', rota: 1, volume: 30 },
      { data: 'd', regiao: 'A', rota: 2, volume: 60 },
      { data: 'd', regiao: 'B', rota: 3, volume: 250 },
    ];
    const r = consolidarRegioes(regioes, rotas);
    expect(r.map((g) => g.regiao)).toEqual(['B', 'A']);
    expect(r[0].ocupacao).toBe(125);
    expect(r[1].rotas.map((x) => x.rota)).toEqual([2, 1]);
  });

  it('dados do varejo: toda rota pertence a uma região cadastrada', () => {
    const v = ler('painel-varejo-ficticio.json');
    const nomes = new Set(v.regioes.linhas.map((l: unknown[]) => l[0]));
    const iReg = v.rotas.colunas.indexOf('regiao');
    for (const l of v.rotas.linhas) expect(nomes.has(l[iReg])).toBe(true);
  });
});
