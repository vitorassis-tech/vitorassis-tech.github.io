/**
 * Gera public/og-image.png (1200x630), a imagem de pré-visualização em redes sociais.
 * Uso: npm run og   (requer o Chromium do Playwright)
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// Fontes embutidas em base64 (o navegador não carrega file:// a partir de setContent)
const fonte = (p) => `data:font/woff2;base64,${readFileSync(path.join(raiz, 'node_modules', p)).toString('base64')}`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:F;src:url(${fonte('@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2')});font-weight:100 900}
@font-face{font-family:P;src:url(${fonte('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2')});font-weight:500}
body{margin:0;width:1200px;height:630px;background:#F7F9FC;font-family:P;color:#15253b;position:relative;overflow:hidden}
.n{position:absolute;left:80px;top:72px;font-size:28px;color:#9a4d08;display:flex;align-items:center;gap:18px}
.n:before{content:'';width:56px;height:3px;background:#E58A2B}
h1{position:absolute;left:80px;top:130px;margin:0;font-family:F;font-weight:560;font-size:84px;line-height:1.02;letter-spacing:-2px;color:#17365D;width:860px}
p{position:absolute;left:80px;bottom:64px;margin:0;font-size:28px;color:#4a5a70}
svg{position:absolute;right:0;bottom:0}
</style></head><body>
<div class="n">Vitor Assis</div>
<h1>Da operação logística às decisões guiadas por dados.</h1>
<p>Logística · Power BI · SQL · Python</p>
<svg width="540" height="330" viewBox="0 0 540 330" style="right:30px"><path d="M20 300 C 120 300, 120 220, 220 220 S 320 150, 380 140" fill="none" stroke="#17365D" stroke-width="6" stroke-linecap="round"/><path d="M380 140 C 430 130, 450 70, 500 60" fill="none" stroke="#E58A2B" stroke-width="6" stroke-dasharray="14 12" stroke-linecap="round"/><circle cx="20" cy="300" r="12" fill="#fff" stroke="#17365D" stroke-width="6"/><circle cx="220" cy="220" r="12" fill="#fff" stroke="#17365D" stroke-width="6"/><circle cx="380" cy="140" r="14" fill="#E58A2B" stroke="#17365D" stroke-width="6"/><circle cx="500" cy="60" r="12" fill="#fff" stroke="#E58A2B" stroke-width="5" stroke-dasharray="6 5"/></svg>
</body></html>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
await pagina.setContent(html, { waitUntil: 'load' });
await pagina.evaluate(() => document.fonts.ready);
await pagina.screenshot({ path: path.join(raiz, 'public', 'og-image.png') });
await navegador.close();
console.log('public/og-image.png gerado.');
