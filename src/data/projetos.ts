/**
 * Projetos e estudos de caso.
 * ------------------------------------------------------------------
 * Conteúdo em src/content/projetos.json (editável pelo painel: npm run admin).
 *
 * REGRAS DE CONTEÚDO
 * - `natureza` deixa explícito o tipo de projeto:
 *     'trabalho'     → feito no emprego; dados internos NÃO são exibidos
 *     'academico'    → feito em curso / instituição de ensino
 *     'demonstracao' → criado para o portfólio, com DADOS FICTÍCIOS
 * - Resultados só entram como 'medido' se houver medição real e autorizada;
 *   'uso' informa uso real sem números.
 * - Itens em `pendencias` aparecem no site como "Informação pendente".
 * - `status`: só projetos 'publicado' aparecem no site publicado.
 *   No modo prévia (painel), rascunhos e arquivados também aparecem, com aviso.
 */
import { conteudo, MODO_PREVIA } from './conteudo';
import { CATEGORIAS, NATUREZAS, STATUS } from '../lib/esquema.mjs';

export type Categoria = 'logistica' | 'bi' | 'sql' | 'python' | 'web' | 'ia';
export type Natureza = 'trabalho' | 'academico' | 'demonstracao';
export type StatusProjeto = 'publicado' | 'rascunho' | 'arquivado';

export const categorias = CATEGORIAS as Record<Categoria, string>;

const EXPLICACOES: Record<Natureza, string> = {
  trabalho: 'Desenvolvido no trabalho. Dados internos, prints e números da empresa não são exibidos.',
  academico: 'Desenvolvido em curso, como atividade prática.',
  demonstracao:
    'Criado para este portfólio. Dados, indicadores e parâmetros são fictícios, gerados por script e independentes de qualquer empresa.',
};

export const naturezas = Object.fromEntries(
  (Object.keys(NATUREZAS) as Natureza[]).map((n) => [n, { rotulo: NATUREZAS[n], explicacao: EXPLICACOES[n] }]),
) as Record<Natureza, { rotulo: string; explicacao: string }>;

export const rotulosStatus = STATUS as Record<StatusProjeto, string>;

export interface Resultado {
  /** medido: medição real e autorizada · uso: em uso real (sem números) · funcional: demonstração que funciona · pendente: sem medição/material */
  tipo: 'medido' | 'uso' | 'funcional' | 'pendente';
  texto: string;
}

export interface Projeto {
  slug: string;
  titulo: string;
  subtitulo: string;
  resumo: string;
  natureza: Natureza;
  instituicao?: string;
  periodo: string;
  categorias: Categoria[];
  tecnologias: string[];
  imagem?: { arquivo: string; alt: string };
  contexto: string;
  problema: string;
  objetivo: string;
  dados: { descricao: string; origem: string };
  solucao: string[];
  decisoes: { decisao: string; motivo: string }[];
  resultados: Resultado[];
  limitacoes: string[];
  proximosPassos: string[];
  links: { rotulo: string; href: string; externo?: boolean }[];
  /** Capturas reais do sistema, exibidas na seção "Telas" do estudo de caso */
  galeria: { legenda: string; imagem: { arquivo: string; alt: string } }[];
  demo?: 'painel-fretes' | 'roteirizacao' | 'torre-simulacao';
  pendencias: string[];
  /** Transparência sobre uso de IA generativa na construção */
  notaAutoria?: string;
  status: StatusProjeto;
}

type ProjetoBruto = Partial<Projeto> & Pick<Projeto, 'slug' | 'status'>;

const completar = (p: ProjetoBruto): Projeto =>
  ({
    decisoes: [],
    limitacoes: [],
    proximosPassos: [],
    links: [],
    galeria: [],
    pendencias: [],
    ...p,
  }) as Projeto;

/** Todos os projetos, em qualquer status (para testes e para o painel). */
export const todosProjetos: Projeto[] = (conteudo.projetos as ProjetoBruto[]).map(completar);

const visivel = (p: Projeto) => MODO_PREVIA || p.status === 'publicado';
const slugsVisiveis = new Set(todosProjetos.filter(visivel).map((p) => p.slug));

/**
 * Diz se um link interno pode ser exibido: links para projetos não publicados
 * (rascunho ou arquivado) são ocultados no site publicado, para não quebrar.
 */
export function linkDisponivel(href: string | undefined): boolean {
  if (!href) return false;
  const m = href.split('#')[0].match(/^\/projetos\/([a-z0-9-]+)\/$/);
  return !m || slugsVisiveis.has(m[1]);
}

/** Projetos exibidos no site: só publicados, exceto no modo prévia. Links para projetos ocultos são removidos. */
export const projetos: Projeto[] = todosProjetos.filter(visivel).map((p) => ({ ...p, links: p.links.filter((l) => linkDisponivel(l.href)) }));

export const projetoPorSlug = (slug: string): Projeto | undefined => projetos.find((p) => p.slug === slug);

/** Categorias que têm ao menos um projeto visível (evita filtros vazios). */
export const categoriasEmUso = (): Categoria[] =>
  (Object.keys(categorias) as Categoria[]).filter((c) => projetos.some((p) => p.categorias.includes(c)));
