// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * URL pública do site. Defina antes do build de publicação:
 *   SITE_URL=https://seu-endereco.com npm run build
 * Sem a variável, usa o endereço local (canonical e sitemap apontarão para localhost).
 */
const SITE_URL = process.env.SITE_URL || 'http://localhost:4321';
/** Subcaminho opcional (ex.: "/portfolio" no GitHub Pages de projeto). */
const BASE_PATH = process.env.BASE_PATH || '/';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
