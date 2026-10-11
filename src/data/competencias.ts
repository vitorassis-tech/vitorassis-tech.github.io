/**
 * Competências agrupadas, cada uma com a EVIDÊNCIA que a sustenta.
 * Regra: só listar o que está no currículo; a evidência aponta para
 * cargo, curso ou projeto real. Não atribuir níveis (básico/avançado)
 * sem avaliação formal.
 */

export type Contexto = 'trabalho' | 'formacao';

export interface Competencia {
  nome: string;
  contexto: Contexto;
  evidencia: string;
  /** link interno opcional para a evidência */
  href?: string;
}

export interface GrupoCompetencias {
  grupo: string;
  descricao: string;
  itens: Competencia[];
}

export const competencias: GrupoCompetencias[] = [
  {
    grupo: 'Dados e BI',
    descricao: 'Do dado bruto ao painel que a gerência usa no dia a dia.',
    itens: [
      { nome: 'Power BI', contexto: 'trabalho', evidencia: 'Dashboards gerenciais na Profarma; curso Senac (60h)', href: '/projetos/torre-controle-expedicao/' },
      { nome: 'Power Query', contexto: 'trabalho', evidencia: 'Tratamento das bases dos dashboards gerenciais', href: '/projetos/torre-controle-expedicao/' },
      { nome: 'DAX', contexto: 'trabalho', evidencia: 'Medidas e indicadores de status nos painéis', href: '/projetos/torre-controle-expedicao/' },
      { nome: 'SQL', contexto: 'trabalho', evidencia: 'Extração de dados para os dashboards; curso SENAI Firjan', href: '/projetos/banco-dados-relacional/' },
      { nome: 'Excel Avançado', contexto: 'trabalho', evidencia: 'Controle de fretes, cubagem e KPIs; curso Senac (36h)' },
      { nome: 'MySQL', contexto: 'formacao', evidencia: 'Administrador de Banco de Dados, SENAI Firjan (180h)', href: '/projetos/banco-dados-relacional/' },
      { nome: 'Modelagem MER/DER', contexto: 'formacao', evidencia: 'Projeto de banco relacional no SENAI Firjan', href: '/projetos/banco-dados-relacional/' },
      { nome: 'KPIs e indicadores', contexto: 'trabalho', evidencia: 'Indicadores operacionais e financeiros na Profarma' },
    ],
  },
  {
    grupo: 'Programação',
    descricao: 'Em desenvolvimento, com projetos práticos de curso.',
    itens: [
      { nome: 'Python', contexto: 'formacao', evidencia: 'Programação em Python, Senac (168h, em andamento)', href: '/projetos/atividade-flask/' },
      { nome: 'Flask', contexto: 'formacao', evidencia: 'Atividade Flask, Senac RJ', href: '/projetos/atividade-flask/' },
      { nome: 'HTML5, CSS3 e JavaScript', contexto: 'formacao', evidencia: 'Interface da Atividade Flask', href: '/projetos/atividade-flask/' },
      { nome: 'Git e GitHub', contexto: 'formacao', evidencia: 'Atividade Flask publicada no GitHub', href: '/projetos/atividade-flask/' },
      { nome: 'Inteligência Artificial', contexto: 'formacao', evidencia: 'Curso na FAETEC (em andamento, previsão dez/2026)' },
    ],
  },
  {
    grupo: 'Sistemas',
    descricao: 'Ferramentas usadas na rotina da operação.',
    itens: [
      { nome: 'SAP', contexto: 'trabalho', evidencia: 'Faturamento de transportes e fonte dos dashboards' },
      { nome: 'WMS e coletores RF', contexto: 'trabalho', evidencia: 'Operação de armazém como Auxiliar de Depósito' },
      { nome: 'COBOL (sistema legado)', contexto: 'trabalho', evidencia: 'Faturamento de transportes' },
      { nome: 'Roadnet', contexto: 'trabalho', evidencia: 'Roteirização e planejamento de cargas' },
      { nome: 'Comprovei', contexto: 'trabalho', evidencia: 'Listado no currículo como sistema utilizado' },
      { nome: 'Pacote Office', contexto: 'trabalho', evidencia: 'Rotina administrativa e relatórios' },
    ],
  },
  {
    grupo: 'Logística e gestão',
    descricao: 'A base de negócio que orienta as análises.',
    itens: [
      { nome: 'Roteirização e planejamento de transportes', contexto: 'trabalho', evidencia: 'Assistente de Logística II, Profarma' },
      { nome: 'Gestão de fretes (inclusive spot)', contexto: 'trabalho', evidencia: 'Controle de fretes spot e custos' },
      { nome: 'Faturamento e CT-e', contexto: 'trabalho', evidencia: 'Conferência de XML para liberação de CT-e' },
      { nome: 'Logística reversa', contexto: 'trabalho', evidencia: 'Devoluções, sinistros e pendências' },
      { nome: 'Gestão de estoque e inventário', contexto: 'trabalho', evidencia: 'Inventários cíclicos e rotativos' },
      { nome: 'Melhoria contínua e qualidade', contexto: 'formacao', evidencia: 'Técnico em Qualidade, Senac (em andamento)' },
    ],
  },
];
