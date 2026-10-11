/**
 * Dados gerais do site e canais de contato.
 * ------------------------------------------------------------------
 * O conteúdo fica em src/content/site.json e src/content/contatos.json
 * (editáveis pelo painel: npm run admin).
 * O telefone está OCULTO por padrão: só exiba com autorização do proprietário.
 */
import { conteudo } from './conteudo';

export type TipoCanal = 'email' | 'linkedin' | 'github' | 'telefone';

export interface Canal {
  id: TipoCanal;
  rotulo: string;
  valor: string;
  href: string;
  exibir: boolean;
}

export interface Site {
  nome: string;
  nomeCompleto: string;
  cargoAtual: string;
  empresaAtual: string;
  posicionamento: string;
  local: string;
  idioma: 'pt-BR';
  descricaoPadrao: string;
  /** Objetivo profissional — texto aprovado pelo proprietário. */
  objetivo: string;
  /** Data da última revisão do conteúdo (AAAA-MM-DD). */
  revisadoEm: string;
}

export interface FrenteInicio {
  rotulo: string;
  titulo: string;
  texto: string;
  formacao?: boolean;
}

export interface Inicio {
  titulo: string;
  apresentacao: string;
  frentes: FrenteInicio[];
  faixa: { destaque: string; complemento: string }[];
  projetosDestaque: string[];
}

export const site: Site = { ...(conteudo.site as Omit<Site, 'idioma'>), idioma: 'pt-BR' };

export const canais: Canal[] = (conteudo.contatos.canais as Partial<Canal>[]).map((c) => ({
  id: c.id as TipoCanal,
  rotulo: c.rotulo ?? '',
  valor: c.valor ?? '',
  href: c.href ?? '',
  exibir: c.exibir === true,
}));

export const canaisVisiveis = (): Canal[] => canais.filter((c) => c.exibir && c.valor && c.href);

export const inicio = conteudo.inicio as Inicio;

export const navegacao = [
  { href: '/', rotulo: 'Início' },
  { href: '/sobre/', rotulo: 'Sobre' },
  { href: '/experiencia/', rotulo: 'Experiência' },
  { href: '/projetos/', rotulo: 'Projetos' },
  { href: '/contato/', rotulo: 'Contato' },
] as const;
