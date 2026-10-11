/**
 * ESQUEMA ÚNICO DO CONTEÚDO DO PORTFÓLIO
 * ------------------------------------------------------------------
 * Fonte única de verdade para:
 *   - o build do site (src/data/*.ts valida o conteúdo e falha se houver erro);
 *   - o servidor do painel administrativo (scripts/admin/servidor.mjs);
 *   - a interface do painel (admin/), que monta os formulários a partir daqui.
 *
 * JavaScript puro, sem dependências, para rodar igual no Node e no navegador.
 * O conteúdo fica em src/content/*.json.
 */

/* ------------------------------------------------------------------ */
/* Vocabulários                                                        */
/* ------------------------------------------------------------------ */

export const NATUREZAS = {
  trabalho: 'Projeto profissional',
  academico: 'Projeto acadêmico',
  demonstracao: 'Demonstração com dados fictícios',
};

export const CATEGORIAS = {
  logistica: 'Logística e roteirização',
  bi: 'Power BI e dashboards',
  sql: 'SQL e modelagem',
  python: 'Python e automação',
  web: 'Desenvolvimento web',
  ia: 'IA aplicada',
};

export const STATUS = {
  publicado: 'Publicado',
  rascunho: 'Rascunho',
  arquivado: 'Arquivado',
};

export const TIPOS_RESULTADO = {
  medido: 'Resultado medido (somente com medição real e autorizada)',
  uso: 'Em uso real (sem números)',
  funcional: 'Demonstração funcional',
  pendente: 'Pendente',
};

export const DEMOS = {
  '': 'Nenhuma',
  'painel-fretes': 'Painel de frota e entregas',
  roteirizacao: 'Laboratório de roteirização',
  'torre-simulacao': 'Simulação da Torre de Controle',
};

export const SITUACOES_CURSO = { concluido: 'Concluído', andamento: 'Em andamento' };
export const CONTEXTOS_COMPETENCIA = { trabalho: 'Usada no trabalho', formacao: 'Em formação ou curso' };
export const TIPOS_CANAL = { email: 'E-mail', linkedin: 'LinkedIn', github: 'GitHub', telefone: 'Telefone / WhatsApp' };

/** Rotas fixas do site (usadas para validar links internos). */
export const ROTAS_FIXAS = ['/', '/sobre/', '/experiencia/', '/projetos/', '/contato/'];

/* ------------------------------------------------------------------ */
/* Descritores das coleções                                            */
/* ------------------------------------------------------------------ */

const LINK_INTERNO = 'Endereço interno (começando com /) ou externo (https://).';

/**
 * Tipos de campo:
 *  texto, textoLongo, slug, url, mesAno, data, numero, booleano, opcao,
 *  referencia, listaTexto, listaOpcoes, listaReferencia, listaObjetos, objeto, imagem
 */
export const COLECOES = [
  {
    id: 'projetos',
    tipo: 'lista',
    rotulo: 'Projetos',
    singular: 'projeto',
    arquivo: 'projetos.json',
    chave: 'slug',
    chaveEditavel: true,
    campoTitulo: 'titulo',
    campoResumo: 'natureza',
    comStatus: true,
    ordenavel: true,
    url: (item) => `/projetos/${item.slug}/`,
    secoes: [
      {
        titulo: 'Identificação',
        campos: [
          { nome: 'titulo', rotulo: 'Título', tipo: 'texto', obrigatorio: true, max: 90 },
          {
            nome: 'slug',
            rotulo: 'Endereço da página',
            tipo: 'slug',
            obrigatorio: true,
            max: 60,
            ajuda: 'Aparece no endereço: /projetos/<endereço>/. Use letras minúsculas, números e hífen.',
          },
          { nome: 'subtitulo', rotulo: 'Subtítulo', tipo: 'texto', obrigatorio: true, max: 140 },
          { nome: 'resumo', rotulo: 'Resumo', tipo: 'textoLongo', obrigatorio: true, max: 400 },
          { nome: 'natureza', rotulo: 'Natureza', tipo: 'opcao', obrigatorio: true, opcoes: NATUREZAS },
          {
            nome: 'instituicao',
            rotulo: 'Empresa ou instituição',
            tipo: 'texto',
            max: 60,
            ajuda: 'Opcional. Ex.: Profarma, Senac RJ.',
          },
          { nome: 'periodo', rotulo: 'Período', tipo: 'texto', obrigatorio: true, max: 30, ajuda: 'Ex.: 2026' },
          { nome: 'categorias', rotulo: 'Categorias', tipo: 'listaOpcoes', obrigatorio: true, opcoes: CATEGORIAS, minItens: 1 },
          { nome: 'tecnologias', rotulo: 'Tecnologias', tipo: 'listaTexto', obrigatorio: true, minItens: 1, max: 40 },
          {
            nome: 'imagem',
            rotulo: 'Imagem de capa',
            tipo: 'imagem',
            pasta: 'projetos',
            ajuda: 'Opcional. JPG, PNG ou WebP até 2 MB. Nunca envie capturas com dados internos de empresas.',
          },
        ],
      },
      {
        titulo: 'Estudo de caso',
        campos: [
          { nome: 'contexto', rotulo: 'Contexto', tipo: 'textoLongo', obrigatorio: true, max: 700 },
          { nome: 'problema', rotulo: 'Problema', tipo: 'textoLongo', obrigatorio: true, max: 700 },
          { nome: 'objetivo', rotulo: 'Objetivo', tipo: 'textoLongo', obrigatorio: true, max: 500 },
          {
            nome: 'dados',
            rotulo: 'Dados utilizados',
            tipo: 'objeto',
            campos: [
              { nome: 'descricao', rotulo: 'Descrição dos dados', tipo: 'textoLongo', obrigatorio: true, max: 600 },
              {
                nome: 'origem',
                rotulo: 'Origem dos dados',
                tipo: 'textoLongo',
                obrigatorio: true,
                max: 600,
                ajuda: 'Em demonstrações, escreva "DADOS FICTÍCIOS".',
              },
            ],
          },
          { nome: 'solucao', rotulo: 'Solução (etapas)', tipo: 'listaTexto', obrigatorio: true, minItens: 1, max: 400 },
          {
            nome: 'decisoes',
            rotulo: 'Decisões técnicas',
            tipo: 'listaObjetos',
            rotuloItem: 'Decisão',
            campos: [
              { nome: 'decisao', rotulo: 'Decisão', tipo: 'texto', obrigatorio: true, max: 160 },
              { nome: 'motivo', rotulo: 'Motivo', tipo: 'textoLongo', obrigatorio: true, max: 400 },
            ],
          },
          {
            nome: 'resultados',
            rotulo: 'Resultados',
            tipo: 'listaObjetos',
            rotuloItem: 'Resultado',
            minItens: 1,
            obrigatorio: true,
            campos: [
              { nome: 'tipo', rotulo: 'Tipo', tipo: 'opcao', obrigatorio: true, opcoes: TIPOS_RESULTADO },
              { nome: 'texto', rotulo: 'Texto', tipo: 'textoLongo', obrigatorio: true, max: 400 },
            ],
          },
          { nome: 'limitacoes', rotulo: 'Limitações', tipo: 'listaTexto', max: 400 },
          { nome: 'proximosPassos', rotulo: 'Próximos passos', tipo: 'listaTexto', max: 400 },
        ],
      },
      {
        titulo: 'Materiais e transparência',
        campos: [
          {
            nome: 'galeria',
            rotulo: 'Telas do projeto',
            tipo: 'listaObjetos',
            rotuloItem: 'Tela',
            maxItens: 8,
            ajuda: 'Capturas reais do sistema funcionando, na ordem em que devem aparecer. Use só dados de exemplo; nunca dados internos de empresas.',
            campos: [
              { nome: 'legenda', rotulo: 'Legenda', tipo: 'texto', obrigatorio: true, max: 140, ajuda: 'Aparece abaixo da imagem. Ex.: Página inicial com os conteúdos cadastrados.' },
              { nome: 'imagem', rotulo: 'Imagem', tipo: 'imagem', obrigatorio: true, pasta: 'projetos', ajuda: 'JPG, PNG ou WebP até 2 MB.' },
            ],
          },
          {
            nome: 'links',
            rotulo: 'Links',
            tipo: 'listaObjetos',
            rotuloItem: 'Link',
            campos: [
              { nome: 'rotulo', rotulo: 'Texto do link', tipo: 'texto', obrigatorio: true, max: 90 },
              { nome: 'href', rotulo: 'Endereço', tipo: 'url', obrigatorio: true, aceita: ['interno', 'https'], ajuda: LINK_INTERNO },
              { nome: 'externo', rotulo: 'Abrir em nova aba (link externo)', tipo: 'booleano' },
            ],
          },
          { nome: 'demo', rotulo: 'Demonstração interativa', tipo: 'opcao', opcoes: DEMOS },
          { nome: 'pendencias', rotulo: 'Informações pendentes (aparecem no site)', tipo: 'listaTexto', max: 300 },
          { nome: 'notaAutoria', rotulo: 'Nota de autoria / uso de IA', tipo: 'textoLongo', max: 300 },
        ],
      },
    ],
  },
  {
    id: 'experiencias',
    tipo: 'lista',
    rotulo: 'Experiência',
    singular: 'empresa',
    arquivo: 'experiencias.json',
    chave: 'id',
    campoTitulo: 'nomeCurto',
    campoResumo: 'nome',
    ordenavel: true,
    url: () => '/experiencia/',
    secoes: [
      {
        titulo: 'Empresa',
        campos: [
          { nome: 'nome', rotulo: 'Razão social / nome completo', tipo: 'texto', obrigatorio: true, max: 120 },
          { nome: 'nomeCurto', rotulo: 'Nome curto', tipo: 'texto', obrigatorio: true, max: 40 },
          { nome: 'inicio', rotulo: 'Início', tipo: 'mesAno', obrigatorio: true },
          { nome: 'fim', rotulo: 'Fim', tipo: 'mesAno', nulo: true, ajuda: 'Deixe vazio se ainda trabalha na empresa.' },
        ],
      },
      {
        titulo: 'Cargos (do mais recente para o mais antigo)',
        campos: [
          {
            nome: 'cargos',
            rotulo: 'Cargos',
            tipo: 'listaObjetos',
            rotuloItem: 'Cargo',
            minItens: 1,
            obrigatorio: true,
            campos: [
              { nome: 'titulo', rotulo: 'Cargo', tipo: 'texto', obrigatorio: true, max: 80 },
              { nome: 'inicio', rotulo: 'Início', tipo: 'mesAno', obrigatorio: true },
              { nome: 'fim', rotulo: 'Fim', tipo: 'mesAno', nulo: true, ajuda: 'Vazio = cargo atual.' },
              { nome: 'atividades', rotulo: 'Atividades', tipo: 'listaTexto', obrigatorio: true, minItens: 1, max: 500 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'formacao',
    tipo: 'lista',
    rotulo: 'Formação acadêmica',
    singular: 'formação',
    arquivo: 'formacao.json',
    chave: 'id',
    campoTitulo: 'curso',
    campoResumo: 'instituicao',
    ordenavel: true,
    url: () => '/sobre/',
    secoes: [{ titulo: 'Formação', campos: camposCurso(false) }],
  },
  {
    id: 'cursos',
    tipo: 'lista',
    rotulo: 'Cursos e certificações',
    singular: 'curso',
    arquivo: 'cursos.json',
    chave: 'id',
    campoTitulo: 'curso',
    campoResumo: 'instituicao',
    ordenavel: true,
    url: () => '/sobre/',
    secoes: [{ titulo: 'Curso', campos: camposCurso(true) }],
  },
  {
    id: 'instituicoes',
    tipo: 'lista',
    rotulo: 'Instituições',
    singular: 'instituição',
    arquivo: 'instituicoes.json',
    chave: 'id',
    campoTitulo: 'nome',
    ordenavel: true,
    url: () => '/sobre/',
    secoes: [
      {
        titulo: 'Instituição',
        campos: [
          { nome: 'nome', rotulo: 'Nome exibido', tipo: 'texto', obrigatorio: true, max: 60 },
          { nome: 'site', rotulo: 'Site oficial', tipo: 'url', aceita: ['https'], ajuda: 'Opcional. Ex.: https://www.exemplo.edu.br' },
          {
            nome: 'logo',
            rotulo: 'Logotipo oficial',
            tipo: 'imagem',
            pasta: 'instituicoes',
            altOpcional: true,
            ajuda:
              'Use somente o arquivo oficial da instituição, respeitando o manual de marca dela. PNG, JPG, WebP ou SVG até 2 MB. Sem logotipo, o site mostra um selo neutro.',
          },
        ],
      },
    ],
  },
  {
    id: 'competencias',
    tipo: 'lista',
    rotulo: 'Competências',
    singular: 'grupo de competências',
    arquivo: 'competencias.json',
    chave: 'id',
    campoTitulo: 'grupo',
    campoResumo: 'descricao',
    ordenavel: true,
    url: () => '/sobre/#competencias',
    secoes: [
      {
        titulo: 'Grupo',
        campos: [
          { nome: 'grupo', rotulo: 'Nome do grupo', tipo: 'texto', obrigatorio: true, max: 40 },
          { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true, max: 140 },
          {
            nome: 'itens',
            rotulo: 'Competências',
            tipo: 'listaObjetos',
            rotuloItem: 'Competência',
            minItens: 1,
            obrigatorio: true,
            campos: [
              { nome: 'nome', rotulo: 'Competência', tipo: 'texto', obrigatorio: true, max: 60 },
              { nome: 'contexto', rotulo: 'Contexto', tipo: 'opcao', obrigatorio: true, opcoes: CONTEXTOS_COMPETENCIA },
              { nome: 'evidencia', rotulo: 'Evidência', tipo: 'texto', obrigatorio: true, max: 200 },
              { nome: 'href', rotulo: 'Link da evidência', tipo: 'url', aceita: ['interno'], ajuda: 'Opcional. Endereço interno, ex.: /projetos/atividade-flask/' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'marcos',
    tipo: 'lista',
    rotulo: 'Telemetria de carreira',
    singular: 'marco',
    arquivo: 'marcos.json',
    chave: 'id',
    campoTitulo: 'titulo',
    campoResumo: 'data',
    ordenavel: false,
    nota: 'Os marcos são exibidos automaticamente em ordem de data.',
    url: () => '/',
    secoes: [
      {
        titulo: 'Marco',
        campos: [
          { nome: 'data', rotulo: 'Mês', tipo: 'mesAno', obrigatorio: true },
          { nome: 'titulo', rotulo: 'Título', tipo: 'texto', obrigatorio: true, max: 28, ajuda: 'Curto: até 28 caracteres.' },
          { nome: 'detalhe', rotulo: 'Detalhe', tipo: 'texto', obrigatorio: true, max: 70 },
          { nome: 'proxima', rotulo: 'Etapa prevista (ainda não concluída)', tipo: 'booleano' },
        ],
      },
    ],
  },
  {
    id: 'inicio',
    tipo: 'unico',
    rotulo: 'Página inicial',
    arquivo: 'inicio.json',
    url: () => '/',
    secoes: [
      {
        titulo: 'Abertura',
        campos: [
          { nome: 'titulo', rotulo: 'Título principal', tipo: 'texto', obrigatorio: true, max: 80 },
          { nome: 'apresentacao', rotulo: 'Apresentação', tipo: 'textoLongo', obrigatorio: true, max: 420 },
        ],
      },
      {
        titulo: 'Frentes de atuação',
        campos: [
          {
            nome: 'frentes',
            rotulo: 'Frentes',
            tipo: 'listaObjetos',
            rotuloItem: 'Frente',
            minItens: 1,
            maxItens: 3,
            obrigatorio: true,
            campos: [
              { nome: 'rotulo', rotulo: 'Rótulo técnico', tipo: 'texto', obrigatorio: true, max: 30 },
              { nome: 'titulo', rotulo: 'Título', tipo: 'texto', obrigatorio: true, max: 40 },
              { nome: 'texto', rotulo: 'Texto', tipo: 'textoLongo', obrigatorio: true, max: 320 },
              { nome: 'formacao', rotulo: 'Marcar como "em formação"', tipo: 'booleano' },
            ],
          },
        ],
      },
      {
        titulo: 'Faixa de destaques e projetos',
        campos: [
          {
            nome: 'faixa',
            rotulo: 'Faixa de destaques',
            tipo: 'listaObjetos',
            rotuloItem: 'Destaque',
            maxItens: 6,
            campos: [
              { nome: 'destaque', rotulo: 'Destaque (em negrito)', tipo: 'texto', obrigatorio: true, max: 40 },
              { nome: 'complemento', rotulo: 'Complemento', tipo: 'texto', obrigatorio: true, max: 60 },
            ],
          },
          {
            nome: 'projetosDestaque',
            rotulo: 'Projetos em destaque',
            tipo: 'listaReferencia',
            ref: 'projetos',
            maxItens: 4,
            ajuda: 'Até 4. Só projetos publicados aparecem no site.',
          },
        ],
      },
    ],
  },
  {
    id: 'site',
    tipo: 'unico',
    rotulo: 'Dados gerais',
    arquivo: 'site.json',
    url: () => '/sobre/',
    secoes: [
      {
        titulo: 'Identificação',
        campos: [
          { nome: 'nome', rotulo: 'Nome de exibição', tipo: 'texto', obrigatorio: true, max: 40 },
          { nome: 'nomeCompleto', rotulo: 'Nome completo', tipo: 'texto', obrigatorio: true, max: 80 },
          { nome: 'cargoAtual', rotulo: 'Cargo atual', tipo: 'texto', obrigatorio: true, max: 60 },
          { nome: 'empresaAtual', rotulo: 'Empresa atual', tipo: 'texto', obrigatorio: true, max: 60 },
          { nome: 'posicionamento', rotulo: 'Posicionamento (rodapé)', tipo: 'texto', obrigatorio: true, max: 80 },
          { nome: 'local', rotulo: 'Cidade', tipo: 'texto', obrigatorio: true, max: 60 },
        ],
      },
      {
        titulo: 'Textos e SEO',
        campos: [
          { nome: 'objetivo', rotulo: 'Objetivo profissional', tipo: 'textoLongo', obrigatorio: true, max: 400 },
          { nome: 'descricaoPadrao', rotulo: 'Descrição para buscadores', tipo: 'textoLongo', obrigatorio: true, max: 300, min: 70 },
          { nome: 'revisadoEm', rotulo: 'Conteúdo revisado em', tipo: 'data', obrigatorio: true },
        ],
      },
    ],
  },
  {
    id: 'contatos',
    tipo: 'unico',
    rotulo: 'Contato',
    arquivo: 'contatos.json',
    url: () => '/contato/',
    secoes: [
      {
        titulo: 'Canais',
        campos: [
          {
            nome: 'canais',
            rotulo: 'Canais de contato',
            tipo: 'listaObjetos',
            rotuloItem: 'Canal',
            minItens: 1,
            obrigatorio: true,
            campos: [
              { nome: 'id', rotulo: 'Tipo', tipo: 'opcao', obrigatorio: true, opcoes: TIPOS_CANAL },
              { nome: 'rotulo', rotulo: 'Nome exibido', tipo: 'texto', obrigatorio: true, max: 40 },
              { nome: 'valor', rotulo: 'Texto exibido', tipo: 'texto', max: 80 },
              { nome: 'href', rotulo: 'Endereço do link', tipo: 'url', aceita: ['https', 'mailto', 'tel'] },
              {
                nome: 'exibir',
                rotulo: 'Exibir no site',
                tipo: 'booleano',
                ajuda: 'O telefone fica oculto por padrão. Só exiba se quiser que fique público.',
              },
            ],
          },
        ],
      },
    ],
  },
];

function camposCurso(comCarga) {
  const campos = [
    { nome: 'curso', rotulo: 'Curso', tipo: 'texto', obrigatorio: true, max: 90 },
    { nome: 'instituicao', rotulo: 'Instituição', tipo: 'referencia', ref: 'instituicoes', obrigatorio: true },
    { nome: 'status', rotulo: 'Situação', tipo: 'opcao', obrigatorio: true, opcoes: SITUACOES_CURSO },
    {
      nome: 'data',
      rotulo: 'Conclusão ou previsão',
      tipo: 'mesAno',
      obrigatorio: true,
      ajuda: 'Concluído: mês de conclusão. Em andamento: mês previsto.',
    },
  ];
  if (comCarga) campos.push({ nome: 'cargaHoraria', rotulo: 'Carga horária (horas)', tipo: 'numero', min: 1, max: 5000 });
  return campos;
}

export const colecao = (id) => COLECOES.find((c) => c.id === id);
export const camposDe = (descritor) => descritor.secoes.flatMap((s) => s.campos);

/* ------------------------------------------------------------------ */
/* Utilitários                                                          */
/* ------------------------------------------------------------------ */

export function slugificar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

export const tituloDoItem = (descritor, item) =>
  descritor.tipo === 'unico' ? descritor.rotulo : String(item?.[descritor.campoTitulo] ?? item?.[descritor.chave] ?? '');

export const idDoItem = (descritor, item) => (descritor.tipo === 'lista' ? item?.[descritor.chave] : descritor.id);

/** Valor inicial de um campo vazio. */
function vazio(campo) {
  switch (campo.tipo) {
    case 'booleano':
      return false;
    case 'listaTexto':
    case 'listaOpcoes':
    case 'listaReferencia':
    case 'listaObjetos':
      return [];
    case 'objeto':
      return Object.fromEntries(campo.campos.map((c) => [c.nome, vazio(c)]));
    case 'imagem':
      return null;
    case 'numero':
      return null;
    case 'mesAno':
      return campo.nulo ? null : '';
    case 'opcao':
      return campo.obrigatorio ? Object.keys(campo.opcoes)[0] : '';
    default:
      return '';
  }
}

/** Item novo com valores padrão (para o formulário "Novo"). */
export function novoItem(colecaoId) {
  const d = colecao(colecaoId);
  const item = {};
  if (d.tipo === 'lista' && d.chave === 'id') item.id = '';
  for (const c of camposDe(d)) item[c.nome] = vazio(c);
  if (d.comStatus) item.status = 'rascunho';
  return item;
}

/** Item novo de uma lista de objetos (botão "Adicionar"). */
export const novoSubitem = (campo) => Object.fromEntries(campo.campos.map((c) => [c.nome, vazio(c)]));

/**
 * Normaliza um item antes de salvar: apara textos, remove linhas vazias de listas
 * e omite campos opcionais vazios. Mantém o JSON estável e enxuto.
 */
export function normalizar(campos, item) {
  const saida = {};
  for (const c of campos) {
    let v = item?.[c.nome];
    switch (c.tipo) {
      case 'texto':
      case 'textoLongo':
      case 'slug':
      case 'url':
      case 'data':
        v = typeof v === 'string' ? v.trim() : v;
        if (c.tipo === 'textoLongo' && typeof v === 'string') v = v.replace(/\r\n/g, '\n');
        if (v === '' && !c.obrigatorio) v = undefined;
        break;
      case 'mesAno':
        v = typeof v === 'string' ? v.trim() : v;
        if (v === '' || v === undefined) v = c.nulo ? null : undefined;
        break;
      case 'opcao':
        if (v === '' && !c.obrigatorio) v = undefined;
        break;
      case 'numero':
        if (v === '' || v === null || v === undefined) v = undefined;
        else if (typeof v === 'string') v = Number(v.replace(',', '.'));
        break;
      case 'booleano':
        v = v === true;
        if (!v && !c.obrigatorio && c.nome !== 'exibir') v = undefined;
        break;
      case 'listaTexto':
        v = Array.isArray(v) ? v.map((s) => (typeof s === 'string' ? s.trim() : s)).filter((s) => s !== '') : v;
        break;
      case 'listaOpcoes':
      case 'listaReferencia':
        v = Array.isArray(v) ? v.filter((s) => s !== '') : v;
        break;
      case 'listaObjetos':
        v = Array.isArray(v) ? v.map((sub) => normalizar(c.campos, sub)) : v;
        break;
      case 'objeto':
        v = v && typeof v === 'object' ? normalizar(c.campos, v) : v;
        break;
      case 'imagem':
        if (v && typeof v === 'object') v = { arquivo: String(v.arquivo ?? '').trim(), alt: String(v.alt ?? '').trim() };
        if (!v || !v.arquivo) v = undefined;
        else if (!v.alt) delete v.alt;
        break;
    }
    if (v !== undefined) saida[c.nome] = v;
  }
  return saida;
}

/** Normaliza um item completo de uma coleção (inclui chave e status). */
export function normalizarItem(colecaoId, item) {
  const d = colecao(colecaoId);
  const base = normalizar(camposDe(d), item);
  if (d.tipo !== 'lista') return base;
  const saida = {};
  if (d.chave === 'id') saida.id = String(item?.id ?? '').trim();
  Object.assign(saida, base);
  if (d.comStatus) saida.status = item?.status;
  return saida;
}

/* ------------------------------------------------------------------ */
/* Validação                                                            */
/* ------------------------------------------------------------------ */

const RE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const RE_DATA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const RE_IMAGEM = /^\/img\/[a-z0-9-]+\/[a-z0-9-]+\.(png|jpe?g|webp|svg)$/;
const RE_INTERNO = /^\/[A-Za-z0-9\-._~/]*(#[A-Za-z0-9\-_]+)?$/;

const vazioTexto = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

function validarUrl(v, aceita) {
  if (typeof v !== 'string') return 'Informe um endereço.';
  if (v.startsWith('/')) {
    if (!aceita.includes('interno')) return 'Use um endereço externo completo (https://...).';
    return RE_INTERNO.test(v) ? null : 'Endereço interno inválido. Ex.: /projetos/meu-projeto/';
  }
  if (v.startsWith('mailto:')) {
    if (!aceita.includes('mailto')) return 'Este campo não aceita e-mail.';
    return /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'E-mail inválido. Ex.: mailto:nome@exemplo.com';
  }
  if (v.startsWith('tel:')) {
    if (!aceita.includes('tel')) return 'Este campo não aceita telefone.';
    return /^tel:\+?[0-9]{8,15}$/.test(v) ? null : 'Telefone inválido. Ex.: tel:+5521999999999';
  }
  if (!aceita.includes('https')) return 'Use um endereço interno, começando com /.';
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:') return 'Use um endereço seguro, começando com https://';
    if (!u.hostname.includes('.')) return 'Endereço incompleto.';
    return null;
  } catch {
    return 'Endereço inválido. Ex.: https://www.exemplo.com';
  }
}

function existeMesAno(v) {
  return RE_MES.test(v);
}

function existeData(v) {
  if (!RE_DATA.test(v)) return false;
  const [a, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Valida um valor conforme o campo. Acumula erros em `erros` com caminhos do tipo
 * "cargos.0.inicio" (iguais aos nomes usados no formulário do painel).
 */
function validarCampo(c, v, caminho, erros, ctx) {
  const erro = (mensagem, sub = '') => erros.push({ caminho: sub ? `${caminho}.${sub}` : caminho, mensagem });
  const ausente =
    v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

  if (ausente) {
    if (c.obrigatorio && c.tipo !== 'booleano') erro(c.tipo.startsWith('lista') ? `Adicione pelo menos ${c.minItens ?? 1} item.` : 'Campo obrigatório.');
    return;
  }

  switch (c.tipo) {
    case 'texto':
    case 'textoLongo': {
      if (typeof v !== 'string') return erro('Valor inválido.');
      const n = v.trim().length;
      if (c.max && n > c.max) erro(`Use no máximo ${c.max} caracteres (atual: ${n}).`);
      if (c.min && n < c.min) erro(`Use pelo menos ${c.min} caracteres (atual: ${n}).`);
      if (c.tipo === 'texto' && /[\r\n]/.test(v)) erro('Use uma única linha.');
      break;
    }
    case 'slug':
      if (typeof v !== 'string' || !RE_SLUG.test(v)) erro('Use só letras minúsculas sem acento, números e hífen. Ex.: meu-projeto');
      else if (c.max && v.length > c.max) erro(`Use no máximo ${c.max} caracteres.`);
      break;
    case 'url': {
      const m = validarUrl(v, c.aceita ?? ['https']);
      if (m) erro(m);
      else if (v.startsWith('/') && ctx.rotaExiste && !ctx.rotaExiste(v)) erro(`A página ou arquivo ${v.split('#')[0]} não existe no site.`);
      break;
    }
    case 'mesAno':
      if (typeof v !== 'string' || !existeMesAno(v)) erro('Informe mês e ano válidos (AAAA-MM).');
      break;
    case 'data':
      if (typeof v !== 'string' || !existeData(v)) erro('Informe uma data válida (AAAA-MM-DD).');
      break;
    case 'numero':
      if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) erro('Informe um número inteiro.');
      else if ((c.min !== undefined && v < c.min) || (c.max !== undefined && v > c.max)) erro(`Informe um valor entre ${c.min} e ${c.max}.`);
      break;
    case 'booleano':
      if (typeof v !== 'boolean') erro('Valor inválido.');
      break;
    case 'opcao':
      if (!(v in c.opcoes)) erro('Escolha uma das opções.');
      break;
    case 'referencia': {
      const alvo = ctx.conteudo?.[c.ref];
      if (alvo && !alvo.some((i) => i[colecao(c.ref).chave] === v)) erro(`“${v}” não está cadastrada em ${colecao(c.ref).rotulo}.`);
      break;
    }
    case 'listaTexto':
      if (!Array.isArray(v)) return erro('Valor inválido.');
      if (c.minItens && v.length < c.minItens) erro(`Adicione pelo menos ${c.minItens} item.`);
      v.forEach((s, i) => {
        if (typeof s !== 'string' || s.trim() === '') erro('Linha vazia.', String(i));
        else if (c.max && s.trim().length > c.max) erro(`Use no máximo ${c.max} caracteres (atual: ${s.trim().length}).`, String(i));
      });
      break;
    case 'listaOpcoes':
      if (!Array.isArray(v)) return erro('Valor inválido.');
      if (c.minItens && v.length < c.minItens) erro(`Marque pelo menos ${c.minItens} opção.`);
      if (v.some((s) => !(s in c.opcoes))) erro('Há uma opção inválida.');
      if (new Set(v).size !== v.length) erro('Há opções repetidas.');
      break;
    case 'listaReferencia': {
      if (!Array.isArray(v)) return erro('Valor inválido.');
      if (c.maxItens && v.length > c.maxItens) erro(`Escolha no máximo ${c.maxItens}.`);
      if (new Set(v).size !== v.length) erro('Há itens repetidos.');
      const alvo = ctx.conteudo?.[c.ref];
      if (alvo) {
        const ids = new Set(alvo.map((i) => i[colecao(c.ref).chave]));
        const faltando = v.filter((x) => !ids.has(x));
        if (faltando.length) erro(`Não encontrado em ${colecao(c.ref).rotulo}: ${faltando.join(', ')}.`);
      }
      break;
    }
    case 'listaObjetos':
      if (!Array.isArray(v)) return erro('Valor inválido.');
      if (c.minItens && v.length < c.minItens) erro(`Adicione pelo menos ${c.minItens} item.`);
      if (c.maxItens && v.length > c.maxItens) erro(`Use no máximo ${c.maxItens} itens.`);
      v.forEach((sub, i) => validarObjeto(c.campos, sub, `${caminho}.${i}`, erros, ctx));
      break;
    case 'objeto':
      if (typeof v !== 'object' || Array.isArray(v)) return erro('Valor inválido.');
      validarObjeto(c.campos, v, caminho, erros, ctx);
      break;
    case 'imagem':
      if (typeof v !== 'object') return erro('Valor inválido.');
      if (!v.arquivo || !RE_IMAGEM.test(v.arquivo)) erro('Envie a imagem novamente (arquivo inválido).', 'arquivo');
      else if (ctx.arquivoExiste && !ctx.arquivoExiste(v.arquivo)) erro('O arquivo da imagem não foi encontrado. Envie novamente.', 'arquivo');
      if (vazioTexto(v.alt)) {
        if (!c.altOpcional) erro('Descreva a imagem (texto alternativo para acessibilidade).', 'alt');
      } else if (v.alt.trim().length > 160) erro('Use no máximo 160 caracteres.', 'alt');
      break;
  }
}

function validarObjeto(campos, obj, prefixo, erros, ctx) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    erros.push({ caminho: prefixo, mensagem: 'Valor inválido.' });
    return;
  }
  for (const c of campos) validarCampo(c, obj[c.nome], prefixo ? `${prefixo}.${c.nome}` : c.nome, erros, ctx);
}

/** Regras que envolvem mais de um campo. */
function regrasExtras(colecaoId, item, erros) {
  const e = (caminho, mensagem) => erros.push({ caminho, mensagem });
  if (colecaoId === 'experiencias') {
    if (item.fim && item.inicio && item.fim < item.inicio) e('fim', 'O fim não pode ser anterior ao início.');
    (item.cargos ?? []).forEach((c, i) => {
      if (c.inicio && item.inicio && c.inicio < item.inicio) e(`cargos.${i}.inicio`, 'O cargo não pode começar antes da entrada na empresa.');
      if (c.fim && c.inicio && c.fim < c.inicio) e(`cargos.${i}.fim`, 'O fim não pode ser anterior ao início.');
      if (c.fim && item.fim && c.fim > item.fim) e(`cargos.${i}.fim`, 'O cargo não pode terminar depois da saída da empresa.');
      if (!c.fim && item.fim) e(`cargos.${i}.fim`, 'A empresa tem data de saída: informe o fim deste cargo.');
    });
  }
  if (colecaoId === 'contatos') {
    const ids = (item.canais ?? []).map((c) => c.id);
    (item.canais ?? []).forEach((c, i) => {
      if (ids.indexOf(c.id) !== i) e(`canais.${i}.id`, 'Este tipo de canal já foi usado.');
      if (c.exibir && vazioTexto(c.valor)) e(`canais.${i}.valor`, 'Para exibir o canal, informe o texto exibido.');
      if (c.exibir && vazioTexto(c.href)) e(`canais.${i}.href`, 'Para exibir o canal, informe o endereço do link.');
      if (c.href && c.id === 'email' && !c.href.startsWith('mailto:')) e(`canais.${i}.href`, 'E-mail deve começar com mailto:');
      if (c.href && ['linkedin', 'github'].includes(c.id) && !c.href.startsWith('https://')) e(`canais.${i}.href`, 'Use um endereço https://');
    });
  }
  if (colecaoId === 'cursos' || colecaoId === 'formacao') {
    if (item.status === 'concluido' && item.data && item.data > mesAtual()) e('data', 'Curso concluído não pode ter data futura. Use "Em andamento".');
  }
}

const mesAtual = () => new Date().toISOString().slice(0, 7);

/**
 * Valida um item de uma coleção.
 * @param {string} colecaoId
 * @param {object} item
 * @param {{conteudo?: object, idOriginal?: string, rotaExiste?: (p:string)=>boolean, arquivoExiste?: (p:string)=>boolean}} ctx
 * @returns {{caminho:string, mensagem:string}[]}
 */
export function validarItem(colecaoId, item, ctx = {}) {
  const d = colecao(colecaoId);
  if (!d) return [{ caminho: '', mensagem: 'Coleção desconhecida.' }];
  const erros = [];
  if (!item || typeof item !== 'object' || Array.isArray(item)) return [{ caminho: '', mensagem: 'Dados inválidos.' }];

  if (d.tipo === 'lista') {
    const chave = item[d.chave];
    if (d.chave === 'id' && (typeof chave !== 'string' || !RE_SLUG.test(chave))) {
      erros.push({ caminho: 'id', mensagem: 'Identificador inválido.' });
    }
    const lista = ctx.conteudo?.[colecaoId];
    if (lista && typeof chave === 'string') {
      const duplicado = lista.some((outro) => outro[d.chave] === chave && chave !== ctx.idOriginal);
      if (duplicado) erros.push({ caminho: d.chave, mensagem: `Já existe ${artigo(d)} ${d.singular} com este ${d.chave === 'slug' ? 'endereço' : 'identificador'}.` });
    }
    if (d.comStatus && !(item.status in STATUS)) erros.push({ caminho: 'status', mensagem: 'Escolha o status.' });
  }
  validarObjeto(camposDe(d), item, '', erros, ctx);
  regrasExtras(colecaoId, item, erros);
  return erros;
}

const artigo = (d) => (/[aã]$|ção$/.test(d.singular) ? 'uma' : 'um');

/** Valida uma coleção inteira (lista ou item único). */
export function validarColecao(colecaoId, dados, ctx = {}) {
  const d = colecao(colecaoId);
  if (d.tipo === 'unico') return validarItem(colecaoId, dados, ctx);
  if (!Array.isArray(dados)) return [{ caminho: '', mensagem: 'A coleção precisa ser uma lista.' }];
  const erros = [];
  const vistos = new Set();
  dados.forEach((item, i) => {
    const chave = item?.[d.chave];
    if (vistos.has(chave)) erros.push({ caminho: `${i}.${d.chave}`, mensagem: `Identificador repetido: ${chave}` });
    vistos.add(chave);
    for (const er of validarItem(colecaoId, item, { ...ctx, conteudo: { ...ctx.conteudo, [colecaoId]: undefined } })) {
      erros.push({ caminho: `${i}${er.caminho ? '.' + er.caminho : ''}`, mensagem: er.mensagem, item: chave });
    }
  });
  if (colecaoId === 'marcos') {
    const ordenados = [...dados].sort((a, b) => String(a.data).localeCompare(String(b.data)));
    const primeiroPrevisto = ordenados.findIndex((m) => m.proxima);
    if (primeiroPrevisto >= 0 && ordenados.slice(primeiroPrevisto).some((m) => !m.proxima)) {
      erros.push({ caminho: '', mensagem: 'As etapas previstas precisam ser posteriores às concluídas.' });
    }
  }
  return erros;
}

/** Valida todo o conteúdo. Retorna erros com o nome da coleção. */
export function validarTudo(conteudo, ctx = {}) {
  const erros = [];
  const ctxCompleto = { rotaExiste: rotaExisteFn(conteudo, ctx.arquivoExiste), ...ctx, conteudo };
  for (const d of COLECOES) {
    if (conteudo[d.id] === undefined) {
      erros.push({ colecao: d.id, caminho: '', mensagem: `Arquivo ${d.arquivo} ausente.` });
      continue;
    }
    for (const e of validarColecao(d.id, conteudo[d.id], ctxCompleto)) erros.push({ colecao: d.id, ...e });
  }
  return erros;
}

/** Função que diz se um endereço interno existe (rotas fixas, projetos ou arquivos). */
export function rotaExisteFn(conteudo, arquivoExiste) {
  return (href) => {
    const caminho = href.split('#')[0];
    if (ROTAS_FIXAS.includes(caminho)) return true;
    const m = caminho.match(/^\/projetos\/([a-z0-9-]+)\/$/);
    if (m) return (conteudo.projetos ?? []).some((p) => p.slug === m[1]);
    if (arquivoExiste) return arquivoExiste(caminho);
    return true; // no navegador não dá para verificar arquivos; o servidor confere
  };
}

/** Formata erros de validação em texto (para o build e para o terminal). */
export function formatarErros(erros) {
  return erros
    .map((e) => `- ${e.colecao ? colecao(e.colecao)?.rotulo + ' › ' : ''}${e.item ? e.item + ' › ' : ''}${e.caminho || '(geral)'}: ${e.mensagem}`)
    .join('\n');
}

/* ------------------------------------------------------------------ */
/* Referências (o que depende de um item)                              */
/* ------------------------------------------------------------------ */

/**
 * Lista onde um item é usado em outras partes do conteúdo.
 * Usado para bloquear exclusões que quebrariam o site e para explicar o impacto.
 */
export function referenciasPara(colecaoId, id, conteudo) {
  const refs = [];
  if (colecaoId === 'projetos') {
    const href = `/projetos/${id}/`;
    if ((conteudo.inicio?.projetosDestaque ?? []).includes(id)) {
      refs.push({ colecao: 'inicio', id: 'inicio', titulo: 'Página inicial', onde: 'Projetos em destaque' });
    }
    for (const p of conteudo.projetos ?? []) {
      if (p.slug !== id && (p.links ?? []).some((l) => l.href.split('#')[0] === href)) {
        refs.push({ colecao: 'projetos', id: p.slug, titulo: p.titulo, onde: 'Links' });
      }
    }
    for (const g of conteudo.competencias ?? []) {
      for (const c of g.itens ?? []) {
        if (c.href && c.href.split('#')[0] === href) refs.push({ colecao: 'competencias', id: g.id, titulo: `${g.grupo} › ${c.nome}`, onde: 'Link da evidência' });
      }
    }
  }
  if (colecaoId === 'instituicoes') {
    for (const col of ['formacao', 'cursos']) {
      for (const c of conteudo[col] ?? []) {
        if (c.instituicao === id) refs.push({ colecao: col, id: c.id, titulo: c.curso, onde: 'Instituição' });
      }
    }
  }
  return refs;
}

/** Resumo legível das referências (ex.: "2 usos"). */
export const resumoReferencias = (refs) => plural(refs.length, 'uso', 'usos');
