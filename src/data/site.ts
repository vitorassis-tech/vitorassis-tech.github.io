/**
 * Dados gerais do site e canais de contato.
 * ------------------------------------------------------------------
 * O conteúdo fica em src/content/site.json e src/content/contatos.json
 * (editáveis pelo painel: npm run admin).
 * O telefone está OCULTO por padrão: só exiba com autorização do proprietário.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
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
  /** Foto profissional (opcional), enviada pelo painel. */
  foto?: { arquivo: string; alt: string };
}

export interface FrenteInicio {
  rotulo: string;
  titulo: string;
  texto: string;
  formacao?: boolean;
}

export interface Inicio {
  /** Linha abaixo do nome, ex.: Technology & Data */
  posicionamento: string;
  /** Frase principal; a última palavra recebe destaque */
  titulo: string;
  subtitulo: string;
  apresentacao: string;
  areas: { nome: string; formacao?: boolean }[];
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

/**
 * Menu principal. Formação e Certificados apontam por enquanto para as seções da página Sobre;
 * na fase D do redesign passam a ter páginas próprias (/formacao/ e /certificados/).
 */
export const navegacao = [
  { href: '/', rotulo: 'Início' },
  { href: '/sobre/', rotulo: 'Sobre' },
  { href: '/experiencia/', rotulo: 'Experiência' },
  { href: '/projetos/', rotulo: 'Projetos' },
  { href: '/sobre/#formacao', rotulo: 'Formação' },
  { href: '/sobre/#cursos', rotulo: 'Certificados' },
  { href: '/contato/', rotulo: 'Contato' },
] as const;

/**
 * Currículo para download. O botão "Baixar currículo" só aparece quando o arquivo existe:
 * basta salvar o PDF em public/curriculo/vitor-assis-curriculo.pdf.
 */
export const CURRICULO = '/curriculo/vitor-assis-curriculo.pdf';
export const temCurriculo = (): boolean => existsSync(join(process.cwd(), 'public', CURRICULO));
