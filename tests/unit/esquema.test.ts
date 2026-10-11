/**
 * Testes do esquema compartilhado (validação usada no build, no servidor e no painel).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  COLECOES,
  normalizarItem,
  novoItem,
  referenciasPara,
  slugificar,
  validarItem,
  validarTudo,
} from '../../src/lib/esquema.mjs';

const conteudo = Object.fromEntries(COLECOES.map((d) => [d.id, JSON.parse(readFileSync(`src/content/${d.arquivo}`, 'utf8'))]));
const caminhos = (erros: { caminho: string }[]) => erros.map((e) => e.caminho);

describe('conteúdo atual', () => {
  it('todo o conteúdo de src/content é válido', () => {
    expect(validarTudo(conteudo)).toEqual([]);
  });

  it('cada coleção tem um arquivo JSON e campos com rótulo', () => {
    for (const d of COLECOES) {
      expect(conteudo[d.id], d.arquivo).toBeDefined();
      for (const s of d.secoes) for (const c of s.campos) expect(c.rotulo, `${d.id}.${c.nome}`).toBeTruthy();
    }
  });

  it('todos os projetos têm status válido', () => {
    for (const p of conteudo.projetos) expect(['publicado', 'rascunho', 'arquivado']).toContain(p.status);
  });
});

describe('validação de campos', () => {
  it('campos obrigatórios, tamanho máximo e formato do endereço', () => {
    const item = { ...novoItem('projetos'), titulo: 'x'.repeat(91), slug: 'Com Espaço', status: 'rascunho' };
    const erros = caminhos(validarItem('projetos', item, { conteudo }));
    expect(erros).toEqual(expect.arrayContaining(['titulo', 'slug', 'subtitulo', 'resumo', 'categorias', 'tecnologias', 'solucao', 'resultados']));
  });

  it('valida datas e números', () => {
    const curso = { id: 'teste', curso: 'Teste', instituicao: 'senac', status: 'andamento', data: '2026-13', cargaHoraria: 1.5 };
    expect(caminhos(validarItem('cursos', curso, { conteudo }))).toEqual(expect.arrayContaining(['data', 'cargaHoraria']));
    expect(validarItem('site', { ...conteudo.site, revisadoEm: '2026-02-30' }, { conteudo })[0]?.caminho).toBe('revisadoEm');
  });

  it('curso concluído não pode ter data futura', () => {
    const curso = { id: 'teste', curso: 'Teste', instituicao: 'senac', status: 'concluido', data: '2099-01' };
    expect(caminhos(validarItem('cursos', curso, { conteudo }))).toContain('data');
  });

  it('referências precisam existir (instituição do curso e projetos em destaque)', () => {
    const curso = { id: 'teste', curso: 'Teste', instituicao: 'nao-existe', status: 'andamento', data: '2026-12' };
    expect(caminhos(validarItem('cursos', curso, { conteudo }))).toContain('instituicao');
    const inicio = { ...conteudo.inicio, projetosDestaque: ['nao-existe'] };
    expect(caminhos(validarItem('inicio', inicio, { conteudo }))).toContain('projetosDestaque');
  });

  it('links: externos só https e internos precisam existir', () => {
    const base = conteudo.projetos[0];
    const comLinks = (href: string) => ({ ...base, links: [{ rotulo: 'X', href }] });
    const ctx = { conteudo, rotaExiste: (h: string) => ['/', '/sobre/'].includes(h.split('#')[0]) };
    expect(validarItem('projetos', comLinks('http://inseguro.com'), { ...ctx, idOriginal: base.slug })[0]?.caminho).toBe('links.0.href');
    expect(validarItem('projetos', comLinks('javascript:alert(1)'), { ...ctx, idOriginal: base.slug })[0]?.caminho).toBe('links.0.href');
    expect(validarItem('projetos', comLinks('/pagina-inexistente/'), { ...ctx, idOriginal: base.slug })[0]?.caminho).toBe('links.0.href');
    expect(validarItem('projetos', comLinks('/sobre/'), { ...ctx, idOriginal: base.slug })).toEqual([]);
  });

  it('experiência: datas coerentes entre empresa e cargos', () => {
    const e = structuredClone(conteudo.experiencias[0]);
    e.cargos[0].inicio = '2010-01';
    e.cargos[1].fim = '2001-01';
    const erros = caminhos(validarItem('experiencias', e, { conteudo, idOriginal: e.id }));
    expect(erros).toEqual(expect.arrayContaining(['cargos.0.inicio', 'cargos.1.fim']));
  });

  it('contato: canal exibido precisa de texto e link; tipos não se repetem', () => {
    const c = structuredClone(conteudo.contatos);
    c.canais[3].exibir = true; // telefone sem número
    c.canais[1].id = 'email';
    const erros = caminhos(validarItem('contatos', c, { conteudo }));
    expect(erros).toEqual(expect.arrayContaining(['canais.3.valor', 'canais.3.href', 'canais.1.id']));
  });

  it('imagem: arquivo seguro e texto alternativo (opcional só no logotipo)', () => {
    const p = { ...conteudo.projetos[0], imagem: { arquivo: '/img/projetos/capa.png' } };
    expect(caminhos(validarItem('projetos', p, { conteudo, idOriginal: p.slug }))).toContain('imagem.alt');
    const malicioso = { ...conteudo.projetos[0], imagem: { arquivo: '../../etc/passwd', alt: 'x' } };
    expect(caminhos(validarItem('projetos', malicioso, { conteudo, idOriginal: p.slug }))).toContain('imagem.arquivo');
    const inst = { id: 'senac', nome: 'Senac', logo: { arquivo: '/img/instituicoes/senac.png' } };
    expect(validarItem('instituicoes', inst, { conteudo, idOriginal: 'senac' })).toEqual([]);
  });

  it('marcos: etapas previstas depois das concluídas', () => {
    const marcos = structuredClone(conteudo.marcos);
    marcos[0].proxima = true;
    expect(validarTudo({ ...conteudo, marcos }).some((e) => e.colecao === 'marcos')).toBe(true);
  });
});

describe('referências e normalização', () => {
  it('encontra onde um projeto e uma instituição são usados', () => {
    expect(referenciasPara('projetos', 'atividade-flask', conteudo).map((r) => r.onde)).toContain('Projetos em destaque');
    expect(referenciasPara('instituicoes', 'senac', conteudo).length).toBeGreaterThan(0);
    expect(referenciasPara('instituicoes', 'ctest', conteudo)).toHaveLength(1);
  });

  it('normaliza: apara textos, remove linhas vazias e campos opcionais vazios', () => {
    const n = normalizarItem('projetos', { ...conteudo.projetos[0], titulo: '  Título  ', tecnologias: ['A', '  ', 'B '], instituicao: '', notaAutoria: '' }) as Record<string, unknown>;
    expect(n.titulo).toBe('Título');
    expect(n.tecnologias).toEqual(['A', 'B']);
    expect('instituicao' in n).toBe(false);
    expect('notaAutoria' in n).toBe(false);
  });

  it('normalizar não altera o conteúdo atual (idempotente)', () => {
    for (const d of COLECOES) {
      const dados = conteudo[d.id];
      const normal = d.tipo === 'lista' ? dados.map((i: object) => normalizarItem(d.id, i)) : normalizarItem(d.id, dados);
      expect(normal, d.id).toEqual(dados);
    }
  });

  it('gera endereços sem acentos', () => {
    expect(slugificar('Análise de Dados & BI — 2026')).toBe('analise-de-dados-bi-2026');
  });
});
