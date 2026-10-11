/**
 * Testes de integridade do CONTEÚDO: protegem as regras do briefing
 * (nada inventado, dados simulados identificados, privacidade).
 */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { projetos, categorias } from '../../src/data/projetos';
import { canais, canaisVisiveis, navegacao } from '../../src/data/site';
import { experiencias, cursos, formacaoAcademica, marcos } from '../../src/data/trajetoria';
import { competencias } from '../../src/data/competencias';
import { mesAno, periodo, duracao, url, percentual } from '../../src/lib/formato';

const rotasInternas = new Set<string>([...navegacao.map((n) => n.href), ...projetos.map((p) => `/projetos/${p.slug}/`)]);

describe('projetos', () => {
  it('têm slugs únicos e em formato de URL', () => {
    const slugs = projetos.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it('possuem os campos obrigatórios do estudo de caso', () => {
    for (const p of projetos) {
      for (const campo of [p.titulo, p.resumo, p.contexto, p.problema, p.objetivo, p.dados.descricao, p.dados.origem]) {
        expect(campo.trim().length).toBeGreaterThan(10);
      }
      expect(p.solucao.length).toBeGreaterThan(0);
      expect(p.resultados.length).toBeGreaterThan(0);
      expect(p.categorias.every((c) => c in categorias)).toBe(true);
    }
  });

  it('demonstrações deixam explícito que os dados são simulados', () => {
    for (const p of projetos.filter((x) => x.natureza === 'demonstracao')) {
      expect(p.dados.origem).toMatch(/SIMULADOS/);
      expect(p.notaAutoria).toBeTruthy();
    }
  });

  it('nenhum resultado é declarado como "medido" sem que exista medição (regra do briefing)', () => {
    const medidos = projetos.flatMap((p) => p.resultados.filter((r) => r.tipo === 'medido'));
    expect(medidos).toHaveLength(0);
  });

  it('projeto profissional não publica números internos', () => {
    const torre = projetos.find((p) => p.natureza === 'trabalho')!;
    const texto = JSON.stringify(torre);
    // Quantidades contratuais, valores financeiros e percentuais da empresa não podem aparecer
    expect(texto).not.toMatch(/\d+\s*ve[ií]culos/i);
    expect(texto).not.toMatch(/R\$\s*\d/);
    expect(texto).not.toMatch(/\d+([.,]\d+)?\s*%/);
    expect(torre.dados.origem).toMatch(/internos/);
  });

  it('links internos apontam para rotas ou arquivos existentes', () => {
    for (const p of projetos) {
      for (const l of p.links.filter((x) => !x.externo)) {
        const ok = rotasInternas.has(l.href) || existsSync(`public${l.href}`);
        expect(ok, `link quebrado: ${l.href}`).toBe(true);
      }
    }
    for (const g of competencias) for (const c of g.itens) if (c.href) expect(rotasInternas.has(c.href.split('#')[0])).toBe(true);
  });
});

describe('privacidade e contato', () => {
  it('telefone fica oculto por padrão', () => {
    expect(canaisVisiveis().some((c) => c.id === 'telefone')).toBe(false);
    expect(canais.find((c) => c.id === 'telefone')?.valor).toBe('');
  });
  it('canais visíveis usam https ou mailto', () => {
    for (const c of canaisVisiveis()) expect(c.href).toMatch(/^(https:\/\/|mailto:)/);
  });
});

describe('trajetória', () => {
  it('datas válidas e cargos dentro do período da empresa', () => {
    for (const e of experiencias) {
      for (const c of e.cargos) {
        expect(c.inicio >= e.inicio).toBe(true);
        if (c.fim && e.fim) expect(c.fim <= e.fim).toBe(true);
        expect(() => mesAno(c.inicio)).not.toThrow();
      }
    }
    for (const f of [...cursos, ...formacaoAcademica]) expect(() => mesAno(f.data)).not.toThrow();
  });
  it('marcos estão em ordem cronológica e os previstos vêm por último', () => {
    const datas = marcos.map((m) => m.data);
    expect([...datas].sort()).toEqual(datas);
    const primeiroPrevisto = marcos.findIndex((m) => m.proxima);
    expect(marcos.slice(primeiroPrevisto).every((m) => m.proxima)).toBe(true);
  });
});

describe('formatação', () => {
  it('formata datas e períodos em pt-BR', () => {
    expect(mesAno('2026-05')).toBe('mai/2026');
    expect(periodo('2019-08', null)).toBe('ago/2019 – atual');
    expect(duracao('2025-03', '2026-04', '2026-10')).toBe('1 ano e 2 meses');
    expect(() => mesAno('2026-13')).toThrow();
  });
  it('trata ausência de valor sem inventar número', () => {
    expect(percentual(null)).toBe('sem dados');
  });
  it('prefixa caminhos com a base do site', () => {
    expect(url('/projetos/', '/portfolio/')).toBe('/portfolio/projetos/');
    expect(url('/projetos/', '/')).toBe('/projetos/');
    expect(url('https://exemplo.com', '/portfolio/')).toBe('https://exemplo.com');
  });
});
