/**
 * Testes de integridade do CONTEÚDO: protegem as regras do briefing
 * (nada inventado, dados simulados identificados, privacidade).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { projetos, categorias } from '../../src/data/projetos';
import { canais, canaisVisiveis, navegacao, site } from '../../src/data/site';
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

  it('demonstrações deixam explícito que os dados são fictícios', () => {
    for (const p of projetos.filter((x) => x.natureza === 'demonstracao')) {
      expect(p.dados.origem).toMatch(/FICTÍCIOS/);
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

const TERMOS_REGRAS_REAIS = /no-?show|\bspot\b|máximo\(|contrat/i;
const profarma = experiencias.find((e) => e.nomeCurto === 'Profarma')!;
const torre = projetos.find((p) => p.slug === 'torre-controle-expedicao')!;

describe('correções factuais (E1–E7, E13, E14)', () => {
  it('E1: nenhum cargo na Profarma associa SQL ao trabalho', () => {
    for (const c of profarma.cargos) for (const a of c.atividades) expect(a, a).not.toMatch(/\bSQL\b/);
  });

  it('E1: o texto geral dos dashboards não generaliza o Roadnet como origem', () => {
    const dash = profarma.cargos[0].atividades.find((a) => a.startsWith('Desenvolvimento e manutenção de dashboards'))!;
    expect(dash).toMatch(/relatórios e arquivos operacionais exportados/);
    expect(dash).toMatch(/Power Query/);
    expect(dash).toMatch(/DAX/);
    expect(dash).not.toMatch(/Roadnet|SAP|SQL/);
  });

  it('E3: SQL é competência de formação e nenhuma evidência de trabalho cita SQL', () => {
    const itens = competencias.flatMap((g) => g.itens);
    expect(itens.find((c) => c.nome === 'SQL')?.contexto).toBe('formacao');
    for (const c of itens.filter((i) => i.contexto === 'trabalho')) expect(`${c.nome} ${c.evidencia}`).not.toMatch(/\bSQL\b/);
  });

  it('E4: estudo de caso da Torre com Roadnet e Excel, sem SQL, sem regras e com uso diário', () => {
    expect(torre.tecnologias).toEqual(['Power BI', 'Power Query', 'DAX', 'Excel', 'Roadnet']);
    expect(torre.categorias).not.toContain('sql');
    expect(torre.dados.origem).toMatch(/Roadnet/);
    const texto = JSON.stringify(torre);
    expect(texto).not.toMatch(/\bSQL\b/);
    expect(texto).not.toMatch(TERMOS_REGRAS_REAIS);
    expect(torre.resultados).toContainEqual({ tipo: 'uso', texto: 'Em uso diário pela gerência.' });
  });

  it('E5: "Torre de Controle" não aparece como cargo ou etapa da carreira', () => {
    for (const m of marcos) expect(m.titulo).not.toMatch(/Torre de Controle/);
    for (const e of experiencias) for (const c of e.cargos) expect(c.titulo).not.toMatch(/Torre/);
  });

  it('E6: objetivo profissional é exatamente o texto aprovado', () => {
    expect(site.objetivo).toBe(
      'Atuar nas áreas de Análise de Dados, Business Intelligence e tecnologia, aplicando conhecimentos em Power BI, Excel, SQL, Python e automação para transformar dados em informações úteis à tomada de decisão.',
    );
  });

  it('E7: descrição padrão não associa SQL a dashboards do trabalho', () => {
    expect(site.descricaoPadrao).not.toMatch(/Power BI, SQL/);
  });

  it('E13: Atividade Flask não afirma publicação no GitHub sem repositório', () => {
    const flask = projetos.find((p) => p.slug === 'atividade-flask')!;
    const temRepo = flask.links.some((l) => /github\.com\/[^/]+\/[^/]+/.test(l.href));
    if (!temRepo) {
      expect(JSON.stringify(flask)).not.toMatch(/publicad[ao] no GitHub/i);
      expect(flask.tecnologias.join(' ')).not.toMatch(/GitHub/);
    }
    for (const g of competencias) for (const c of g.itens) expect(c.evidencia).not.toMatch(/publicada no GitHub/i);
  });

  it('E14: banco de dados sem MySQL nem material não comprovado', () => {
    const bd = projetos.find((p) => p.slug === 'banco-dados-relacional')!;
    expect(JSON.stringify(bd)).not.toMatch(/MySQL/);
    expect(bd.tecnologias).toEqual(['SQL', 'MER/DER']);
    expect(bd.resultados.every((r) => r.tipo === 'pendente')).toBe(true);
  });
});

describe('demonstrações independentes (E8–E11)', () => {
  it('E8: nenhum texto afirma que uma demonstração reproduz o painel real', () => {
    expect(JSON.stringify(projetos)).not.toMatch(/reproduz(em)? (apenas )?a lógica/i);
  });

  it('E9: projetos de demonstração não usam termos de regras reais', () => {
    for (const p of projetos.filter((x) => x.natureza === 'demonstracao')) {
      expect(JSON.stringify(p), p.slug).not.toMatch(TERMOS_REGRAS_REAIS);
    }
  });

  it('E9: código das demonstrações não usa termos de regras reais', () => {
    const arquivos = [
      'src/lib/kpis.ts',
      'src/scripts/painel-fretes.ts',
      'src/scripts/simulacao-torre.ts',
      'src/components/demos/PainelFretes.astro',
      'src/components/demos/SimulacaoTorre.astro',
      'dados-demo/sql/consultas.sql',
      'dados-demo/sql/schema.sql',
      'dados-demo/gerar_dados.py',
    ];
    for (const a of arquivos) expect(readFileSync(a, 'utf-8'), a).not.toMatch(TERMOS_REGRAS_REAIS);
  });

  it('E11: arquivos de dados publicados estão marcados como fictícios', () => {
    for (const a of ['public/dados/fretes-simulados.json', 'public/dados/torre-simulacao.json']) {
      const j = JSON.parse(readFileSync(a, 'utf-8'));
      expect(j.simulado).toBe(true);
      expect(j.aviso).toMatch(/FICTÍCIOS/);
    }
    expect(readFileSync('public/dados/entregas-simuladas.csv', 'utf-8').split('\n')[0]).toMatch(/FICTICIOS/);
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
