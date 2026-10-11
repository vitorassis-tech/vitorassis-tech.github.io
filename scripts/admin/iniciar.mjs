/**
 * Inicia o painel administrativo local.
 *   npm run admin
 *
 * Abre dois endereços, ambos só neste computador:
 *   - Painel:  http://127.0.0.1:4330
 *   - Prévia:  http://localhost:4321  (site em modo prévia: mostra rascunhos com aviso)
 *
 * Opções:
 *   --porta 4330          porta do painel
 *   --porta-site 4321     porta da prévia do site
 *   --sem-site            não inicia a prévia do site
 *   --copia-de-teste      trabalha numa CÓPIA temporária do conteúdo (usado nos testes automáticos)
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarServidor } from './servidor.mjs';

const PROJETO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const valor = (nome, padrao) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};
const porta = Number(valor('--porta', 4330));
const portaSite = Number(valor('--porta-site', 4321));
const semSite = args.includes('--sem-site');
const copiaDeTeste = args.includes('--copia-de-teste');

let raiz = PROJETO;
let pastaTemporaria = null;
if (copiaDeTeste) {
  pastaTemporaria = mkdtempSync(join(tmpdir(), 'painel-teste-'));
  cpSync(join(PROJETO, 'src', 'content'), join(pastaTemporaria, 'src', 'content'), { recursive: true });
  cpSync(join(PROJETO, 'public'), join(pastaTemporaria, 'public'), { recursive: true });
  raiz = pastaTemporaria;
}

/** Procura uma porta livre a partir da indicada (a prévia pode conflitar com um "npm run dev" já aberto). */
function portaLivre(inicial, tentativas = 20) {
  return new Promise((ok, falha) => {
    const testar = (p, restantes) => {
      const teste = net.createServer();
      teste.once('error', () => (restantes > 0 ? testar(p + 1, restantes - 1) : falha(new Error('Nenhuma porta livre para a prévia.'))));
      teste.once('listening', () => teste.close(() => ok(p)));
      teste.listen(p);
    };
    testar(inicial, tentativas);
  });
}

const portaPrevia = semSite ? portaSite : await portaLivre(portaSite);
const painel = criarServidor({ raiz, porta, urlSite: `http://localhost:${portaPrevia}` });

/**
 * Caminho do executável do Astro, lido do package.json do próprio Astro
 * (o local muda entre versões; no Astro 7 é bin/astro.mjs).
 */
export function caminhoCliAstro() {
  const pastaAstro = join(PROJETO, 'node_modules', 'astro');
  const pacote = JSON.parse(readFileSync(join(pastaAstro, 'package.json'), 'utf8'));
  const bin = typeof pacote.bin === 'string' ? pacote.bin : pacote.bin?.astro;
  const caminho = join(pastaAstro, bin ?? 'bin/astro.mjs');
  if (!existsSync(caminho)) throw new Error(`Astro não encontrado em ${caminho}. Rode "npm ci" e tente de novo.`);
  return caminho;
}

let site = null;
function encerrar(codigo = 0) {
  if (site && !site.killed) site.kill();
  painel.parar().finally(() => {
    if (pastaTemporaria) rmSync(pastaTemporaria, { recursive: true, force: true });
    process.exit(codigo);
  });
}
process.on('SIGINT', () => encerrar(0));
process.on('SIGTERM', () => encerrar(0));

try {
  const { url } = await painel.iniciar();
  console.log('\n  Painel administrativo (somente neste computador)');
  console.log(`  ┃ Painel   ${url}`);
  if (copiaDeTeste) console.log(`  ┃ Modo     cópia de teste em ${raiz} (o conteúdo real NÃO é alterado)`);
  if (!semSite) {
    console.log(`  ┃ Prévia   http://localhost:${portaPrevia}/ (mostra rascunhos; leva alguns segundos para abrir)`);
    if (portaPrevia !== portaSite) console.log(`  ┃ Aviso    a porta ${portaSite} está ocupada (talvez um "npm run dev" aberto); a prévia usa a ${portaPrevia}.`);
    const astro = caminhoCliAstro();
    // --ignore-lock: a prévia roda em primeiro plano, como processo filho do painel,
    // e é encerrada junto com ele (Ctrl + C). Não interfere em um "npm run dev" aberto.
    // Variáveis VITEST* (presentes quando o painel é iniciado pelos testes automáticos)
    // mudam o comportamento do servidor de desenvolvimento do Astro; não são repassadas.
    const ambiente = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('VITEST')));
    site = spawn(process.execPath, [astro, 'dev', '--port', String(portaPrevia), '--ignore-lock'], {
      cwd: PROJETO,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: { ...ambiente, PORTFOLIO_PREVIA: '1' },
    });
    site.on('exit', (c) => {
      if (c && c !== 0) console.error(`  A prévia do site parou (código ${c}). O painel continua funcionando.`);
    });
  }
  console.log('\n  Para encerrar, pressione Ctrl + C.\n');
} catch (erro) {
  if (erro.code === 'EADDRINUSE') {
    console.error(`\n  A porta ${porta} já está em uso. Feche o outro painel ou use: npm run admin -- --porta 4331\n`);
  } else {
    console.error('\n  Não foi possível iniciar o painel:', erro.message, '\n');
  }
  encerrar(1);
}
