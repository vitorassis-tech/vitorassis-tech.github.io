/**
 * Experiência, formação, cursos e marcos da trajetória.
 * Fonte única: currículo enviado pelo proprietário (out/2026).
 * Não adicione itens que não estejam comprovados no currículo.
 */

export interface Cargo {
  titulo: string;
  inicio: string; // AAAA-MM
  fim: string | null; // null = atual
  atividades: string[];
}

export interface Empresa {
  nome: string;
  nomeCurto: string;
  inicio: string;
  fim: string | null;
  cargos: Cargo[];
}

export const experiencias: Empresa[] = [
  {
    nome: 'Profarma Distribuidora de Produtos Farmacêuticos',
    nomeCurto: 'Profarma',
    inicio: '2019-08',
    fim: null,
    cargos: [
      {
        titulo: 'Assistente de Logística II',
        inicio: '2026-05',
        fim: null,
        atividades: [
          'Desenvolvimento e manutenção de dashboards gerenciais em Power BI, a partir de relatórios e arquivos operacionais exportados, com tratamento no Power Query e indicadores em DAX, com foco em KPIs operacionais e financeiros para apoio à decisão da gerência.',
          'Concepção do dashboard “Torre de Controle Gerencial de Expedição” (frota, expedição e pendências), em uso diário pela gerência, com atualização diária, acompanhamento por transportadora e indicadores de status.',
          'Roteirização e planejamento de cargas (Roadnet), gestão de ocorrências e controle de fretes spot, com foco na redução de custos operacionais.',
          'Faturamento de transportes (SAP e COBOL), conferência de XML para liberação de CT-e e interface com transportadoras e clientes para garantia do nível de serviço (SLA).',
        ],
      },
      {
        titulo: 'Assistente de Logística I',
        inicio: '2025-03',
        fim: '2026-04',
        atividades: [
          'Apoio à operação de transportes: agendamento de coletas, controle de rotas e acompanhamento de pendências com motoristas e transportadoras.',
          'Monitoramento de KPIs, controle de custos de frete e cubagem em Excel Avançado e tratamento de devoluções, sinistros e pendências da logística reversa.',
        ],
      },
      {
        titulo: 'Auxiliar de Depósito',
        inicio: '2019-08',
        fim: '2025-02',
        atividades: [
          'Recebimento, armazenagem, separação e expedição com WMS e coletores RF, com participação em inventários cíclicos e rotativos e garantia da acuracidade do estoque.',
        ],
      },
    ],
  },
  {
    nome: 'DAGAD Serviços e Comércio de Extintores Ltda',
    nomeCurto: 'DAGAD',
    inicio: '2017-09',
    fim: '2018-04',
    cargos: [
      {
        titulo: 'Alimentador de Linha de Produção',
        inicio: '2017-09',
        fim: '2018-04',
        atividades: [
          'Manutenção de extintores e testes hidrostáticos em mangueiras de incêndio; instalação de abrigos de incêndio e entrega de extintores a clientes; abastecimento das linhas de produção e movimentação interna de materiais.',
        ],
      },
    ],
  },
];

export type Status = 'concluido' | 'andamento';

export interface Formacao {
  curso: string;
  instituicao: string;
  status: Status;
  /** AAAA-MM: conclusão (concluído) ou previsão (em andamento) */
  data: string;
  cargaHoraria?: number;
}

export const formacaoAcademica: Formacao[] = [
  { curso: 'Graduação Tecnológica em Logística', instituicao: 'UNISUAM', status: 'andamento', data: '2027-07' },
  { curso: 'Técnico em Qualidade', instituicao: 'Senac', status: 'andamento', data: '2026-11' },
  { curso: 'Técnico em Logística', instituicao: 'Senac', status: 'concluido', data: '2026-03' },
  { curso: 'Ensino Médio', instituicao: 'SEEDUC-RJ', status: 'concluido', data: '2025-02' },
];

export const cursos: Formacao[] = [
  { curso: 'Inteligência Artificial', instituicao: 'FAETEC', status: 'andamento', data: '2026-12' },
  { curso: 'Programação em Python', instituicao: 'Senac', status: 'andamento', data: '2026-11', cargaHoraria: 168 },
  { curso: 'Administrador de Banco de Dados', instituicao: 'SENAI Firjan', status: 'concluido', data: '2026-08', cargaHoraria: 180 },
  { curso: 'Data Analyst', instituicao: 'Xperium', status: 'concluido', data: '2026-04', cargaHoraria: 60 },
  { curso: 'Informática Fundamental', instituicao: 'Senac', status: 'concluido', data: '2026-02', cargaHoraria: 60 },
  { curso: 'Power BI', instituicao: 'Senac', status: 'concluido', data: '2025-10', cargaHoraria: 60 },
  { curso: 'Assistente de Logística', instituicao: 'SENAI', status: 'concluido', data: '2025-09', cargaHoraria: 180 },
  { curso: 'Excel Avançado', instituicao: 'Senac', status: 'concluido', data: '2025-02', cargaHoraria: 36 },
  { curso: 'Departamento Pessoal', instituicao: 'Senac', status: 'concluido', data: '2024-11', cargaHoraria: 160 },
  { curso: 'Brigada de Incêndio', instituicao: 'CTEST', status: 'concluido', data: '2021-09', cargaHoraria: 16 },
];

/**
 * Marcos exibidos no "mapa de rota" da página inicial.
 * `proxima: true` = etapa prevista (ainda não concluída).
 */
export interface Marco {
  data: string; // AAAA-MM
  titulo: string;
  detalhe: string;
  proxima?: boolean;
}

export const marcos: Marco[] = [
  { data: '2017-09', titulo: 'Chão de fábrica', detalhe: 'Linha de produção e manutenção de extintores na DAGAD' },
  { data: '2019-08', titulo: 'Armazém', detalhe: 'Auxiliar de Depósito na Profarma, com WMS e inventários' },
  { data: '2025-03', titulo: 'Transportes', detalhe: 'Assistente de Logística I: rotas, fretes e KPIs em Excel' },
  { data: '2025-10', titulo: 'Power BI', detalhe: 'Curso de Power BI concluído no Senac' },
  { data: '2026-05', titulo: 'Assistente de Logística II', detalhe: 'Dashboards gerenciais em Power BI' },
  { data: '2026-08', titulo: 'Banco de dados', detalhe: 'Administrador de Banco de Dados, SENAI Firjan' },
  { data: '2026-11', titulo: 'Python', detalhe: 'Programação em Python, Senac (previsão)', proxima: true },
  { data: '2026-12', titulo: 'Inteligência Artificial', detalhe: 'Curso na FAETEC (previsão)', proxima: true },
];
