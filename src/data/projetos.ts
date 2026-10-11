/**
 * Projetos e estudos de caso.
 * ------------------------------------------------------------------
 * REGRAS DE CONTEÚDO
 * - `natureza` deixa explícito o tipo de projeto:
 *     'trabalho'     → feito no emprego; dados internos NÃO são exibidos
 *     'academico'    → feito em curso / instituição de ensino
 *     'demonstracao' → criado para o portfólio, com DADOS SIMULADOS
 * - Resultados só entram como 'medido' se houver medição real e autorizada.
 * - Itens em `pendencias` aparecem no site como "Informação pendente".
 */

export type Categoria = 'logistica' | 'bi' | 'sql' | 'python' | 'web' | 'ia';
export type Natureza = 'trabalho' | 'academico' | 'demonstracao';

export const categorias: Record<Categoria, string> = {
  logistica: 'Logística e roteirização',
  bi: 'Power BI e dashboards',
  sql: 'SQL e modelagem',
  python: 'Python e automação',
  web: 'Desenvolvimento web',
  ia: 'IA aplicada',
};

export const naturezas: Record<Natureza, { rotulo: string; explicacao: string }> = {
  trabalho: {
    rotulo: 'Projeto profissional',
    explicacao: 'Desenvolvido no trabalho. Dados internos, prints e números da empresa não são exibidos.',
  },
  academico: {
    rotulo: 'Projeto acadêmico',
    explicacao: 'Desenvolvido em curso, como atividade prática.',
  },
  demonstracao: {
    rotulo: 'Demonstração com dados simulados',
    explicacao: 'Criado para este portfólio. Todos os dados são fictícios e gerados por script.',
  },
};

export interface Resultado {
  tipo: 'medido' | 'funcional' | 'pendente';
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
  demo?: 'painel-fretes' | 'roteirizacao';
  pendencias: string[];
  /** Transparência sobre uso de IA generativa na construção */
  notaAutoria?: string;
  destaque?: boolean;
}

export const projetos: Projeto[] = [
  {
    slug: 'torre-controle-expedicao',
    titulo: 'Torre de Controle Gerencial de Expedição',
    subtitulo: 'Frota, expedição e pendências em um painel diário para a gerência',
    resumo:
      'Painel em Power BI que reúne frota, cargas expedidas e não expedidas e pendências, aplicando as regras de contrato de cada transportadora para sinalizar o que precisa de atenção.',
    natureza: 'trabalho',
    instituicao: 'Profarma',
    periodo: '2026',
    categorias: ['bi', 'logistica', 'sql'],
    tecnologias: ['Power BI', 'Power Query', 'DAX', 'SQL', 'SAP', 'Excel'],
    contexto:
      'Na expedição, a gerência precisa saber todos os dias quantos veículos cada transportadora apresentou em relação ao contratado, quanto foi preciso contratar de frota extra e quais cargas ficaram pendentes.',
    problema:
      'Frota, cargas expedidas, cargas não expedidas, placas e rotas vêm de bases diferentes. Para enxergar desvios, é preciso consolidar tudo e comparar com o contrato de cada transportadora.',
    objetivo:
      'Oferecer uma visão única e atualizada diariamente, com indicadores de status que mostrem onde o contrato não foi cumprido e onde houve necessidade de frota adicional.',
    dados: {
      descricao:
        'Base consolidada com cargas expedidas, cargas não expedidas, cadastro de placas, rotas e informações de saída, além do contrato diário de veículos por transportadora.',
      origem:
        'Sistemas internos da empresa (SAP e controles operacionais). Por serem dados internos, nenhuma tabela, print ou número real é publicado aqui.',
    },
    solucao: [
      'Tratamento e padronização das bases no Power Query, com atualização diária.',
      'Modelagem relacionando cargas, placas, rotas e transportadoras.',
      'Medidas DAX para veículos contratados, apresentados e utilizados por transportadora.',
      'Regras de contrato aplicadas aos indicadores: No-Show = MÁXIMO(Contratado − Apresentado; 0) e Spot (frete extra) = MÁXIMO(Utilizado − Contratado; 0).',
      'Indicadores de status (faróis) calculados em DAX, separando situação normal, atenção e crítica.',
    ],
    decisoes: [
      {
        decisao: 'Separar No-Show e Spot em duas medidas',
        motivo: 'São problemas diferentes: falta de veículo contratado e excesso de demanda. Somados, um esconderia o outro.',
      },
      {
        decisao: 'Calcular faróis em DAX, e não com formatação manual',
        motivo: 'A regra fica documentada no modelo e vale igual para todos os dias e transportadoras.',
      },
    ],
    resultados: [
      { tipo: 'funcional', texto: 'Painel concebido para atualização diária e acompanhamento da gerência.' },
      {
        tipo: 'pendente',
        texto: 'Ganhos quantitativos (tempo, custo, redução de no-show) não são informados: não há medição autorizada para publicação.',
      },
    ],
    limitacoes: [
      'Por confidencialidade, o painel real não pode ser exibido. O projeto “Painel de frota e entregas” reproduz apenas a lógica dos indicadores, com dados simulados.',
    ],
    proximosPassos: [
      'Automatizar a atualização diária das bases.',
      'Publicar capturas de tela anonimizadas, se houver autorização da empresa.',
    ],
    links: [{ rotulo: 'Ver a demonstração com dados simulados', href: '/projetos/painel-fretes-simulado/' }],
    pendencias: [
      'Capturas de tela anonimizadas do painel (somente com autorização da empresa).',
      'Resultados medidos, caso existam e possam ser divulgados.',
      'Revisão do texto deste estudo de caso (contexto, problema e situação atual de uso do painel).',
    ],
    destaque: true,
  },
  {
    slug: 'painel-fretes-simulado',
    titulo: 'Painel de frota e entregas',
    subtitulo: 'Python, SQL e visualização interativa a partir de uma operação fictícia',
    resumo:
      'Pipeline completo e reproduzível: Python gera uma operação logística fictícia, o SQL calcula OTIF, custo, No-Show e Spot, e o site apresenta um painel interativo com filtros.',
    natureza: 'demonstracao',
    periodo: '2026',
    categorias: ['bi', 'python', 'sql', 'logistica'],
    tecnologias: ['Python', 'SQLite', 'SQL', 'JavaScript', 'SVG'],
    contexto:
      'Os painéis que desenvolvo no trabalho usam dados internos e não podem ser mostrados. Esta demonstração existe para que recrutadores possam ver, de forma aberta, o tipo de raciocínio aplicado: modelagem, regras de negócio e visualização.',
    problema:
      'Como apresentar indicadores de transporte (pontualidade, completude, custo e uso de frota) de forma confiável sem expor nenhum dado real?',
    objetivo:
      'Construir um fluxo de ponta a ponta, do dado bruto ao painel, que qualquer pessoa possa executar e auditar.',
    dados: {
      descricao:
        '60 dias úteis de uma operação fictícia com 4 transportadoras genéricas (A, B, C e D) e 5 regiões. Cada entrega tem data, transportadora, região, prazo, completude, peso e custo.',
      origem:
        'DADOS SIMULADOS, gerados pelo script dados-demo/gerar_dados.py com semente fixa (resultado sempre igual). Não representam nenhuma empresa real.',
    },
    solucao: [
      'Script Python (somente biblioteca padrão) gera a operação e grava em um banco SQLite.',
      'Modelo relacional com tabelas de transportadora, região, operação diária e entrega.',
      'Consultas SQL calculam os agregados diários, No-Show, Spot e o resumo por transportadora.',
      'O resultado é exportado em JSON e CSV e consumido pelo painel do site.',
      'Painel em JavaScript puro, com gráficos em SVG, filtros e tabela acessível.',
    ],
    decisoes: [
      {
        decisao: 'SQLite em vez de um servidor de banco',
        motivo: 'Roda em qualquer computador sem instalação e é suficiente para o volume da demonstração.',
      },
      {
        decisao: 'Os indicadores são calculados no SQL e conferidos por testes',
        motivo: 'Os testes garantem que No-Show e Spot seguem exatamente as regras definidas.',
      },
      {
        decisao: 'Gráficos em SVG sem biblioteca externa',
        motivo: 'O painel fica leve, rápido e sem dependências de terceiros.',
      },
      {
        decisao: 'OTIF = entregas no prazo e completas ÷ total',
        motivo: 'É a definição mais comum de OTIF. As duas condições precisam ser atendidas na mesma entrega.',
      },
    ],
    resultados: [
      { tipo: 'funcional', texto: 'Painel interativo funcionando nesta página, com filtros por transportadora, região e período.' },
      { tipo: 'funcional', texto: 'Testes automatizados conferem as regras de No-Show, Spot e OTIF.' },
    ],
    limitacoes: [
      'Os números do painel são fictícios e não devem ser lidos como desempenho real de nenhuma operação.',
      'A geração de dados usa probabilidades simples e não modela sazonalidade mensal, feriados ou janelas de entrega.',
    ],
    proximosPassos: [
      'Recriar o mesmo painel no Power BI a partir do CSV, para comparar as duas abordagens.',
      'Adicionar a análise de custo por região em Python (pandas).',
    ],
    links: [
      { rotulo: 'Baixar a base agregada (CSV, dados simulados)', href: '/dados/entregas-simuladas.csv' },
    ],
    demo: 'painel-fretes',
    pendencias: ['Endereço do repositório no GitHub, quando o código do portfólio for publicado.'],
    notaAutoria: 'Desenvolvido com apoio de ferramentas de IA generativa, com revisão das regras de negócio.',
  },
  {
    slug: 'laboratorio-roteirizacao',
    titulo: 'Laboratório de roteirização',
    subtitulo: 'Como um algoritmo monta e melhora a sequência de entregas',
    resumo:
      'Demonstração interativa que monta uma rota com a heurística do vizinho mais próximo e a melhora com 2-opt, mostrando o ganho de distância calculado em tempo real.',
    natureza: 'demonstracao',
    periodo: '2026',
    categorias: ['logistica', 'web'],
    tecnologias: ['TypeScript', 'SVG', 'Algoritmos de roteirização'],
    contexto:
      'No dia a dia, roteirizo cargas com o Roadnet. Esta demonstração mostra, de forma simplificada e aberta, a lógica que existe por trás de um roteirizador.',
    problema:
      'Dado um centro de distribuição e um conjunto de pontos de entrega, em que ordem visitar os pontos para percorrer a menor distância?',
    objetivo:
      'Tornar visível a diferença entre uma rota construída de forma gulosa e uma rota otimizada localmente.',
    dados: {
      descricao: 'Pontos de entrega gerados aleatoriamente em um plano fictício, sem endereços reais.',
      origem: 'DADOS SIMULADOS, gerados no navegador a cada clique em “Gerar novos pontos”.',
    },
    solucao: [
      'Vizinho mais próximo: a partir do CD, vai sempre ao ponto ainda não visitado mais próximo.',
      '2-opt: inverte trechos da rota enquanto isso reduzir a distância total.',
      'O painel compara as duas rotas e calcula a redução de distância para os pontos exibidos.',
    ],
    decisoes: [
      {
        decisao: 'Distância euclidiana (linha reta)',
        motivo: 'Mantém a demonstração simples e verificável. Um roteirizador real usa a malha viária.',
      },
      {
        decisao: 'Lista textual da sequência ao lado do mapa',
        motivo: 'Garante que a informação seja acessível também para leitores de tela.',
      },
    ],
    resultados: [
      {
        tipo: 'funcional',
        texto: 'A redução exibida é calculada na hora para os pontos simulados da tela. Ela não representa ganho em operação real.',
      },
    ],
    limitacoes: [
      'Não considera trânsito, janelas de horário, capacidade de veículo, restrições de circulação nem múltiplos veículos.',
      'O 2-opt encontra um bom resultado local, não necessariamente a rota ótima.',
    ],
    proximosPassos: [
      'Adicionar capacidade de veículo e múltiplas rotas (problema de roteirização de veículos, VRP).',
      'Implementar a mesma lógica em Python, comparando com bibliotecas como OR-Tools.',
    ],
    links: [],
    demo: 'roteirizacao',
    pendencias: ['Endereço do repositório no GitHub, quando o código do portfólio for publicado.'],
    notaAutoria: 'Desenvolvido com apoio de ferramentas de IA generativa.',
  },
  {
    slug: 'atividade-flask',
    titulo: 'Atividade Flask',
    subtitulo: 'Aplicação web de gerenciamento de conteúdo com Python',
    resumo:
      'Aplicação web com cadastro, consulta, edição e exclusão lógica de conteúdos, construída com Python, Flask e SQLite como atividade prática do curso de Python.',
    natureza: 'academico',
    instituicao: 'Senac RJ',
    periodo: '2026',
    categorias: ['web', 'python', 'sql'],
    tecnologias: ['Python', 'Flask', 'SQLite', 'Jinja', 'HTML5', 'CSS3', 'JavaScript', 'Git e GitHub'],
    contexto: 'Atividade prática proposta no curso de Programação em Python do Senac RJ.',
    problema: 'Criar um pequeno site dinâmico capaz de gerenciar conteúdos armazenados em banco de dados.',
    objetivo: 'Praticar o ciclo completo de uma aplicação web: rotas, templates, banco de dados e operações CRUD.',
    dados: {
      descricao: 'Tabela de conteúdos criada pelo próprio projeto (script de criação do banco).',
      origem: 'Dados de exemplo cadastrados durante o desenvolvimento.',
    },
    solucao: [
      'Rotas em Flask para listar, criar, visualizar e editar conteúdos.',
      'Templates Jinja com um layout base reaproveitado nas páginas Início, Novo conteúdo, Sobre e Contatos.',
      'Banco SQLite com script de criação (setupdb.py e database.sql).',
      'Exclusão lógica: o registro não é apagado; o campo de status muda de “on” para “off”.',
    ],
    decisoes: [
      {
        decisao: 'Exclusão lógica em vez de física',
        motivo: 'Preserva o histórico e permite recuperar um conteúdo removido por engano.',
      },
      {
        decisao: 'Template base com herança no Jinja',
        motivo: 'Cabeçalho, menu e rodapé ficam em um só lugar, evitando repetição.',
      },
    ],
    resultados: [{ tipo: 'funcional', texto: 'Aplicação funcional executada localmente e publicada no GitHub.' }],
    limitacoes: ['Projeto de estudo: não possui autenticação de usuários nem está hospedado em servidor público.'],
    proximosPassos: ['Adicionar autenticação e validação de formulários.', 'Publicar uma versão online.'],
    links: [{ rotulo: 'Perfil no GitHub', href: 'https://github.com/vitorassis-tech', externo: true }],
    pendencias: [
      'Link direto do repositório da Atividade Flask.',
      'Captura de tela da aplicação (você tem o print usado no LinkedIn).',
    ],
  },
  {
    slug: 'banco-dados-relacional',
    titulo: 'Banco de dados relacional',
    subtitulo: 'Modelagem MER/DER, dicionário de dados e implementação em SQL',
    resumo:
      'Projeto do curso de Administrador de Banco de Dados: modelagem conceitual e lógica, dicionário de dados, criação de tabelas e inserção de dados em SQL.',
    natureza: 'academico',
    instituicao: 'SENAI Firjan',
    periodo: '2026',
    categorias: ['sql'],
    tecnologias: ['SQL', 'MySQL', 'MER/DER'],
    contexto: 'Projeto prático do curso Administrador de Banco de Dados (180h), concluído em agosto de 2026.',
    problema: 'Estruturar um banco de dados relacional desde a modelagem até a implementação.',
    objetivo: 'Aplicar as etapas de projeto de banco de dados: modelo conceitual, modelo lógico e implementação física.',
    dados: {
      descricao: 'Dados de exemplo inseridos via SQL para validar o modelo.',
      origem: 'Criados durante o curso.',
    },
    solucao: [
      'Modelo Entidade-Relacionamento (MER) e Diagrama Entidade-Relacionamento (DER).',
      'Dicionário de dados descrevendo tabelas, campos, tipos e restrições.',
      'Scripts SQL de criação de tabelas e inserção de dados.',
    ],
    decisoes: [],
    resultados: [{ tipo: 'funcional', texto: 'Banco criado e populado conforme o modelo.' }],
    limitacoes: [],
    proximosPassos: ['Publicar o DER e os scripts SQL no GitHub.'],
    links: [],
    pendencias: [
      'Tema do banco (qual negócio foi modelado).',
      'Imagem do DER e scripts SQL, se puderem ser publicados.',
      'Decisões de modelagem e limitações, para completar o estudo de caso.',
    ],
  },
];

export const projetoPorSlug = (slug: string): Projeto | undefined => projetos.find((p) => p.slug === slug);

/** Categorias que têm ao menos um projeto (evita filtros vazios). */
export const categoriasEmUso = (): Categoria[] =>
  (Object.keys(categorias) as Categoria[]).filter((c) => projetos.some((p) => p.categorias.includes(c)));
