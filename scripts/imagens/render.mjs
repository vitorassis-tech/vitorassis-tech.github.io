// Renderiza uma página de imagem (canvas) e salva em WebP.
// Uso: node render.mjs <pagina.html> <saida.webp> <largura> <altura> [query extra]
import { chromium } from '/home/claude/audit/site/node_modules/playwright-core/index.mjs';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
const [pagina, saida, w, h, extra = ''] = process.argv.slice(2);
const dados = {
  PONTOS: JSON.parse(readFileSync('/home/claude/imagens/pontos-globo.json', 'utf8')),
  MAPA: JSON.parse(readFileSync('/home/claude/imagens/pontos-mapa.json', 'utf8')),
};
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.addInitScript((d) => Object.assign(window, d), dados);
await p.goto(`file:///home/claude/imagens/${pagina}?w=${w}&h=${h}&${extra}`);
await p.waitForFunction(() => document.title === 'pronto', null, { timeout: 60000 });
const png = await p.locator('canvas').screenshot();
await sharp(png).webp({ quality: 82, effort: 6 }).toFile(saida);
console.log(saida);
await b.close();
