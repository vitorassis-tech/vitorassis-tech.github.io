/**
 * Experiência, formação, cursos, instituições e marcos da trajetória.
 * ------------------------------------------------------------------
 * Conteúdo em src/content/*.json (editável pelo painel: npm run admin).
 * Fonte: currículo enviado pelo proprietário. Não adicione itens não comprovados.
 */
import { conteudo } from './conteudo';

export interface Cargo {
  titulo: string;
  inicio: string; // AAAA-MM
  fim: string | null; // null = atual
  atividades: string[];
}

export interface Empresa {
  id: string;
  nome: string;
  nomeCurto: string;
  inicio: string;
  fim: string | null;
  cargos: Cargo[];
}

export type Status = 'concluido' | 'andamento';

export interface Logo {
  /** caminho público, ex.: /img/instituicoes/senac.png */
  arquivo: string;
  alt: string;
}

export interface Instituicao {
  id: string;
  nome: string;
  site?: string;
  logo?: Logo;
}

export interface Formacao {
  id: string;
  curso: string;
  /** Nome exibido da instituição */
  instituicao: string;
  instituicaoId: string;
  /** Logotipo oficial, se cadastrado; sem ele, o site mostra um selo neutro */
  logo?: Logo;
  status: Status;
  /** AAAA-MM: conclusão (concluído) ou previsão (em andamento) */
  data: string;
  cargaHoraria?: number;
}

export interface Marco {
  data: string; // AAAA-MM
  titulo: string;
  detalhe: string;
  proxima?: boolean;
}

export const experiencias = conteudo.experiencias as Empresa[];

export const instituicoes = conteudo.instituicoes as Instituicao[];

const porId = new Map(instituicoes.map((i) => [i.id, i]));

type FormacaoBruta = Omit<Formacao, 'instituicao' | 'instituicaoId' | 'logo'> & { instituicao: string };

const resolver = (f: FormacaoBruta): Formacao => {
  const inst = porId.get(f.instituicao)!;
  return { ...f, instituicao: inst.nome, instituicaoId: inst.id, logo: inst.logo };
};

export const formacaoAcademica: Formacao[] = (conteudo.formacao as FormacaoBruta[]).map(resolver);
export const cursos: Formacao[] = (conteudo.cursos as FormacaoBruta[]).map(resolver);

/**
 * Marcos exibidos na telemetria de carreira, sempre em ordem de data.
 * `proxima: true` = etapa prevista (ainda não concluída).
 */
export const marcos: Marco[] = [...(conteudo.marcos as (Marco & { id: string })[])]
  .sort((a, b) => a.data.localeCompare(b.data))
  .map(({ id: _id, ...m }) => m);
