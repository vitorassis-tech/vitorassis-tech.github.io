/**
 * Dados gerais do site e canais de contato.
 * ------------------------------------------------------------------
 * Fonte: currículo "Vitor_Assis_Curriculo_Ajustado.docx" (out/2026).
 * Para ocultar ou exibir um canal, altere `exibir`.
 * O telefone está OCULTO por padrão: só altere com autorização do proprietário.
 */

export interface Canal {
  id: 'email' | 'linkedin' | 'github' | 'telefone';
  rotulo: string;
  valor: string;
  href: string;
  exibir: boolean;
}

export const site = {
  nome: 'Vitor Assis',
  nomeCompleto: 'Vitor da Silva de Assis',
  cargoAtual: 'Assistente de Logística II',
  empresaAtual: 'Profarma',
  posicionamento: 'Logística, Análise de Dados e BI',
  local: 'Rio de Janeiro, RJ',
  idioma: 'pt-BR',
  descricaoPadrao:
    'Portfólio de Vitor Assis: experiência em logística, roteirização e gestão de fretes, com dashboards em Power BI, Power Query e DAX, e estudos em SQL, Python, bancos de dados e desenvolvimento web.',
  /** Objetivo profissional — texto aprovado pelo proprietário. Não alterar sem nova aprovação. */
  objetivo:
    'Atuar nas áreas de Análise de Dados, Business Intelligence e tecnologia, aplicando conhecimentos em Power BI, Excel, SQL, Python e automação para transformar dados em informações úteis à tomada de decisão.',
  /** Data da última revisão do conteúdo (AAAA-MM-DD). */
  revisadoEm: '2026-10-11',
} as const;

export const canais: Canal[] = [
  {
    id: 'email',
    rotulo: 'E-mail',
    valor: 'vitorazziz@gmail.com',
    href: 'mailto:vitorazziz@gmail.com',
    exibir: true,
  },
  {
    id: 'linkedin',
    rotulo: 'LinkedIn',
    valor: 'linkedin.com/in/vitorazziz',
    href: 'https://www.linkedin.com/in/vitorazziz',
    exibir: true,
  },
  {
    id: 'github',
    rotulo: 'GitHub',
    valor: 'github.com/vitorassis-tech',
    href: 'https://github.com/vitorassis-tech',
    exibir: true,
  },
  {
    id: 'telefone',
    rotulo: 'Telefone / WhatsApp',
    // Preencha somente se autorizar a publicação. Ex.: '+55 21 9XXXX-XXXX'
    valor: '',
    href: '',
    exibir: false,
  },
];

export const canaisVisiveis = (): Canal[] => canais.filter((c) => c.exibir && c.valor && c.href);

export const navegacao = [
  { href: '/', rotulo: 'Início' },
  { href: '/sobre/', rotulo: 'Sobre' },
  { href: '/experiencia/', rotulo: 'Experiência' },
  { href: '/projetos/', rotulo: 'Projetos' },
  { href: '/contato/', rotulo: 'Contato' },
] as const;
