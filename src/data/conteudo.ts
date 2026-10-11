/**
 * Carrega e VALIDA todo o conteúdo de src/content/*.json.
 * ------------------------------------------------------------------
 * - Se algum dado estiver inválido, o build falha com a lista de problemas,
 *   e o site anterior continua no ar (nada quebrado é publicado).
 * - Edite o conteúdo pelo painel (npm run admin) ou diretamente nos JSON.
 * - Este módulo só roda no servidor/build (usa node:fs).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { validarTudo, formatarErros } from '../lib/esquema.mjs';

import projetos from '../content/projetos.json';
import experiencias from '../content/experiencias.json';
import formacao from '../content/formacao.json';
import cursos from '../content/cursos.json';
import instituicoes from '../content/instituicoes.json';
import competencias from '../content/competencias.json';
import marcos from '../content/marcos.json';
import inicio from '../content/inicio.json';
import site from '../content/site.json';
import contatos from '../content/contatos.json';

export const conteudo = {
  projetos,
  experiencias,
  formacao,
  cursos,
  instituicoes,
  competencias,
  marcos,
  inicio,
  site,
  contatos,
};

const pastaPublica = join(process.cwd(), 'public');
const erros = validarTudo(conteudo, { arquivoExiste: (caminho: string) => existsSync(join(pastaPublica, caminho)) });
if (erros.length > 0) {
  throw new Error(`Conteúdo inválido em src/content/ (${erros.length} problema(s)):\n${formatarErros(erros)}`);
}

/**
 * Modo prévia: mostra rascunhos e arquivados com aviso.
 * Ativado pelo painel (npm run admin). Nunca use em build de publicação.
 */
export const MODO_PREVIA = process.env.PORTFOLIO_PREVIA === '1';
