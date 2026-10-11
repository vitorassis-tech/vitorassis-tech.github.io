import { defineConfig, devices } from '@playwright/test';

/**
 * Testes do PAINEL ADMINISTRATIVO no navegador.
 * O servidor sobe com --copia-de-teste: o conteúdo real do portfólio nunca é alterado.
 * Os testes rodam em sequência porque compartilham a mesma cópia.
 */
const PORTA = 4331;

export default defineConfig({
  testDir: 'tests/painel',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORTA}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/admin/iniciar.mjs --sem-site --copia-de-teste --porta ${PORTA}`,
    url: `http://127.0.0.1:${PORTA}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
