/**
 * Cliente da API do painel: envia o token da sessão e transforma
 * respostas de erro em mensagens claras.
 */
const TOKEN = document.querySelector('meta[name="painel-token"]')?.content ?? '';

export class ErroApi extends Error {
  constructor(status, corpo) {
    super(corpo?.mensagem ?? 'Erro inesperado.');
    this.status = status;
    this.codigo = corpo?.codigo;
    this.erros = corpo?.erros ?? [];
    this.referencias = corpo?.referencias ?? [];
  }
}

export async function chamar(metodo, caminho, corpo) {
  let resposta;
  try {
    resposta = await fetch(caminho, {
      method: metodo,
      headers: { 'X-Admin-Token': TOKEN, ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ErroApi(0, {
      mensagem: 'Sem conexão com o servidor do painel. Confira se o comando "npm run admin" ainda está rodando e tente de novo.',
      codigo: 'rede',
    });
  }
  let dados = null;
  try {
    dados = await resposta.json();
  } catch {
    dados = { mensagem: 'Resposta inválida do servidor do painel.' };
  }
  if (!resposta.ok || dados?.ok === false) throw new ErroApi(resposta.status, dados);
  return dados;
}

export const api = {
  conteudo: () => chamar('GET', '/api/conteudo'),
  validar: (colecao, item, idOriginal) => chamar('POST', `/api/validar/${colecao}`, { item, idOriginal }),
  criar: (colecao, item, versao) => chamar('POST', `/api/colecoes/${colecao}/itens`, { item, versao }),
  atualizar: (colecao, id, item, versao) => chamar('PUT', `/api/colecoes/${colecao}/itens/${encodeURIComponent(id)}`, { item, versao }),
  atualizarUnico: (colecao, dados, versao) => chamar('PUT', `/api/colecoes/${colecao}`, { dados, versao }),
  ordenar: (colecao, ids, versao) => chamar('POST', `/api/colecoes/${colecao}/ordem`, { ids, versao }),
  referencias: (colecao, id) => chamar('GET', `/api/colecoes/${colecao}/itens/${encodeURIComponent(id)}/referencias`),
  excluir: (colecao, id, versao, confirmacao) => chamar('POST', `/api/colecoes/${colecao}/itens/${encodeURIComponent(id)}/excluir`, { versao, confirmacao }),
  lixeira: () => chamar('GET', '/api/lixeira'),
  restaurarLixeira: (entrada) => chamar('POST', `/api/lixeira/${encodeURIComponent(entrada)}/restaurar`, {}),
  excluirDefinitivo: (entrada, confirmacao) => chamar('POST', `/api/lixeira/${encodeURIComponent(entrada)}/excluir-definitivo`, { confirmacao }),
  historico: (colecao) => chamar('GET', `/api/historico${colecao ? `?colecao=${colecao}` : ''}`),
  restaurarHistorico: (entrada, versao) => chamar('POST', '/api/historico/restaurar', { entrada, versao }),
  enviarImagem: (dados) => chamar('POST', '/api/imagens', dados),
};
