/**
 * Gera as imagens de capa dos projetos que têm demonstração interativa.
 * ---------------------------------------------------------------------
 * Abre cada estudo de caso no site já construído, fotografa a própria demonstração
 * (dados fictícios; o aviso fica no cartão do projeto) e salva em public/img/projetos/capa-<slug>.webp (960 × 600).
 *
 * Uso:  npm run build  →  npm run capas
 * As capas ficam versionadas; só é preciso rodar de novo quando uma demonstração mudar.
 * Projetos sem demonstração usam a primeira tela da galeria como capa (definida no painel).
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import sharp from 'sharp';

const PROJETO = join(import.meta.dirname, '..');
const PORTA = 4329;
const projetos = JSON.parse(readFileSync(join(PROJETO, 'src/content/projetos.json'), 'utf8')).filter((p) => p.demo);

const servidor = spawn(process.execPath, [join(PROJETO, 'node_modules/astro/bin/astro.mjs'), 'preview', '--port', String(PORTA), '--ignore-lock'], {
  cwd: PROJETO,
  stdio: 'ignore',
});
const encerrar = () => servidor.kill();
process.on('exit', encerrar);

async function esperarServidor() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${PORTA}/`)).ok) return;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('A prévia do site não respondeu. Rode "npm run build" antes de "npm run capas".');
}

await esperarServidor();
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' });

for (const p of projetos) {
  await pagina.goto(`http://localhost:${PORTA}/projetos/${p.slug}/`, { waitUntil: 'networkidle' });
  // Menu fixo e aviso ficam fora da foto: o cartão do projeto já mostra o selo "dados fictícios"
  await pagina.addStyleTag({ content: '.site-header, #demonstracao .aviso-simulado { display: none !important; }' });
  const alvo = pagina.locator('#demonstracao > :not(h2):not(p)').first();
  await alvo.scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(600);
  const caixa = await alvo.boundingBox();
  if (!caixa) throw new Error(`Demonstração não encontrada em ${p.slug}.`);
  const rolagem = await pagina.evaluate(() => window.scrollY);
  // Recorte 16:10 a partir do topo da demonstração
  const altura = Math.min(caixa.height, caixa.width / 1.6);
  const png = await pagina.screenshot({ fullPage: true, clip: { x: caixa.x, y: caixa.y + rolagem, width: caixa.width, height: altura } });
  const destino = join(PROJETO, 'public/img/projetos', `capa-${p.slug}.webp`);
  await sharp(png).resize(960, 600, { fit: 'cover', position: 'top' }).webp({ quality: 82 }).toFile(destino);
  console.log(`public/img/projetos/capa-${p.slug}.webp gerada.`);
}

await navegador.close();
encerrar();
