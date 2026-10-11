/**
 * Competências agrupadas, cada uma com a EVIDÊNCIA que a sustenta.
 * ------------------------------------------------------------------
 * Conteúdo em src/content/competencias.json (editável pelo painel).
 * Regra: só listar o que está no currículo; não atribuir níveis sem avaliação formal.
 */
import { conteudo } from './conteudo';
import { linkDisponivel } from './projetos';

export type Contexto = 'trabalho' | 'formacao';

export interface Competencia {
  nome: string;
  contexto: Contexto;
  evidencia: string;
  /** link interno opcional para a evidência */
  href?: string;
}

export interface GrupoCompetencias {
  id: string;
  grupo: string;
  descricao: string;
  itens: Competencia[];
}

/** Links de evidência para projetos não publicados são ocultados no site publicado. */
export const competencias: GrupoCompetencias[] = (conteudo.competencias as GrupoCompetencias[]).map((g) => ({
  ...g,
  itens: g.itens.map(({ href, ...c }) => (linkDisponivel(href) ? { ...c, href } : c)),
}));
