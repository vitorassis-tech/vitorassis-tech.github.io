/**
 * Gera as imagens de pré-visualização em redes sociais (1200x630):
 *   - public/og-image.png        imagem geral do site
 *   - public/og/<slug>.png       uma por projeto publicado (título, natureza e a primeira tela da galeria)
 * Uso: npm run og   (requer o Chromium do Playwright). Rode de novo ao criar ou renomear um projeto.
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// Fontes embutidas em base64 (o navegador não carrega file:// a partir de setContent)
const fonte = (p) => `data:font/woff2;base64,${readFileSync(path.join(raiz, 'node_modules', p)).toString('base64')}`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:F;src:url(${fonte('@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2')});font-weight:100 900}
@font-face{font-family:P;src:url(${fonte('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2')});font-weight:500}
body{margin:0;width:1200px;height:630px;background:radial-gradient(900px 420px at 80% 20%,rgba(79,155,217,.18),transparent 60%),#07111F;font-family:P;color:#E7EEF7;position:relative;overflow:hidden}
body:before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(150,185,225,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(150,185,225,.12) 1px,transparent 1px);background-size:64px 64px}
.n{position:absolute;left:80px;top:72px;font-size:28px;color:#F6C690;display:flex;align-items:center;gap:18px}
.n:before{content:'';width:56px;height:3px;background:#E58A2B}
h1{position:absolute;left:80px;top:130px;margin:0;font-family:F;font-weight:560;font-size:84px;line-height:1.02;letter-spacing:-2px;color:#FFFFFF;width:860px}
p{position:absolute;left:80px;bottom:64px;margin:0;font-size:28px;color:#A3B5CB}
svg{position:absolute;right:0;bottom:0}
</style></head><body>
<div class="n">Vitor Assis</div>
<h1>Da operação logística às decisões guiadas por dados.</h1>
<p>Logística · Power BI · SQL · Python</p>
<svg width="540" height="330" viewBox="0 0 540 330" style="right:30px"><path d="M20 300 C 120 300, 120 220, 220 220 S 320 150, 380 140" fill="none" stroke="#CFE2F6" stroke-width="6" stroke-linecap="round"/><path d="M380 140 C 430 130, 450 70, 500 60" fill="none" stroke="#E58A2B" stroke-width="6" stroke-dasharray="14 12" stroke-linecap="round"/><circle cx="20" cy="300" r="12" fill="#0B1A2C" stroke="#CFE2F6" stroke-width="6"/><circle cx="220" cy="220" r="12" fill="#0B1A2C" stroke="#CFE2F6" stroke-width="6"/><circle cx="380" cy="140" r="14" fill="#E58A2B" stroke="#07111F" stroke-width="6"/><circle cx="500" cy="60" r="12" fill="#0B1A2C" stroke="#E58A2B" stroke-width="5" stroke-dasharray="6 5"/></svg>
</body></html>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
await pagina.setContent(html, { waitUntil: 'load' });
await pagina.evaluate(() => document.fonts.ready);
await pagina.screenshot({ path: path.join(raiz, 'public', 'og-image.png') });
console.log('public/og-image.png gerado.');

/* ---------- Uma imagem por projeto publicado ---------- */
const NATUREZAS = { trabalho: 'Projeto profissional', academico: 'Projeto acadêmico', demonstracao: 'Demonstração com dados fictícios' };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const imagem = (arquivo) => {
  const ext = path.extname(arquivo).slice(1).replace('jpg', 'jpeg');
  return `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${readFileSync(path.join(raiz, 'public', arquivo)).toString('base64')}`;
};
const rota = `<svg class="rota" width="470" height="300" viewBox="0 0 540 330"><path d="M20 300 C 120 300, 120 220, 220 220 S 320 150, 380 140" fill="none" stroke="#CFE2F6" stroke-width="6" stroke-linecap="round"/><path d="M380 140 C 430 130, 450 70, 500 60" fill="none" stroke="#E58A2B" stroke-width="6" stroke-dasharray="14 12" stroke-linecap="round"/><circle cx="20" cy="300" r="12" fill="#0B1A2C" stroke="#CFE2F6" stroke-width="6"/><circle cx="220" cy="220" r="12" fill="#0B1A2C" stroke="#CFE2F6" stroke-width="6"/><circle cx="380" cy="140" r="14" fill="#E58A2B" stroke="#07111F" stroke-width="6"/><circle cx="500" cy="60" r="12" fill="#0B1A2C" stroke="#E58A2B" stroke-width="5" stroke-dasharray="6 5"/></svg>`;
const estiloProjeto = `
@font-face{font-family:F;src:url(${fonte('@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2')});font-weight:100 900}
@font-face{font-family:P;src:url(${fonte('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2')});font-weight:500}
@font-face{font-family:P;src:url(${fonte('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-ext-500-normal.woff2')});font-weight:500;unicode-range:U+0100-024F}
body{margin:0;width:1200px;height:630px;background:radial-gradient(900px 420px at 80% 20%,rgba(79,155,217,.18),transparent 60%),#07111F;font-family:P;color:#E7EEF7;position:relative;overflow:hidden}
body:before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(150,185,225,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(150,185,225,.12) 1px,transparent 1px);background-size:64px 64px}
.n{position:absolute;left:72px;top:64px;font-size:24px;color:#F6C690;display:flex;align-items:center;gap:16px}
.n:before{content:'';width:48px;height:3px;background:#E58A2B}
.col{position:absolute;left:72px;top:118px;width:540px}
h1{margin:0;font-family:F;font-weight:560;font-size:56px;line-height:1.05;letter-spacing:-1.2px;color:#fff}
.nat{margin-top:26px;font-size:24px;color:#F6C690}
.tec{margin-top:12px;font-size:22px;color:#A3B5CB;line-height:1.4}
.url{position:absolute;left:72px;bottom:52px;font-size:22px;color:#A3B5CB}
.tela{position:absolute;right:56px;top:150px;width:500px;height:312px;border-radius:14px;overflow:hidden;border:2px solid rgba(207,226,246,.35);box-shadow:0 24px 60px -20px rgba(0,0,0,.8);background:#0B1A2C}
.tela img{width:100%;height:100%;object-fit:cover;object-position:top}
.rota{position:absolute;right:40px;bottom:60px}`;
const projetos = JSON.parse(readFileSync(path.join(raiz, 'src', 'content', 'projetos.json'), 'utf8')).filter((p) => p.status === 'publicado');
mkdirSync(path.join(raiz, 'public', 'og'), { recursive: true });
for (const p of projetos) {
  const primeira = p.galeria?.[0]?.imagem?.arquivo ?? p.imagem?.arquivo;
  const natureza = [NATUREZAS[p.natureza], p.instituicao].filter(Boolean).join(' · ');
  const corpo = `<div class="n">Vitor Assis · Estudo de caso</div>
<div class="col"><h1>${esc(p.titulo)}</h1><p class="nat">${esc(natureza)}</p><p class="tec">${esc(p.tecnologias.slice(0, 4).join(' · '))}</p></div>
${primeira ? `<div class="tela"><img src="${imagem(primeira)}" alt=""></div>` : rota}
<p class="url">vitorassis-tech.github.io</p>`;
  await pagina.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${estiloProjeto}</style></head><body>${corpo}</body></html>`, { waitUntil: 'load' });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.screenshot({ path: path.join(raiz, 'public', 'og', `${p.slug}.png`) });
  console.log(`public/og/${p.slug}.png gerado.`);
}
await navegador.close();
