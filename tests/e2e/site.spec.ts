import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROTAS = [
  '/',
  '/sobre/',
  '/experiencia/',
  '/projetos/',
  '/contato/',
  '/projetos/torre-controle-expedicao/',
  '/projetos/painel-fretes-simulado/',
  '/projetos/laboratorio-roteirizacao/',
  '/projetos/atividade-flask/',
  '/projetos/banco-dados-relacional/',
];
const LARGURAS = [375, 430, 768, 1280];

/** Coleta erros de console e exceções da página. */
function vigiarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(e.message));
  return erros;
}

/** Mede transbordo horizontal real (o body usa overflow-x: clip, que esconderia o problema). */
async function transbordo(page: Page) {
  return page.evaluate(() => {
    document.body.style.overflowX = 'visible';
    const largura = document.documentElement.scrollWidth;
    const culpados = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > window.innerWidth + 1 && !el.closest('.tabela-rolagem, .visually-hidden');
      })
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
    document.body.style.overflowX = '';
    return { largura, culpados };
  });
}

test.describe('rotas, SEO e console', () => {
  for (const rota of ROTAS) {
    test(`carrega ${rota}`, async ({ page }) => {
      const erros = vigiarErros(page);
      const resposta = await page.goto(rota);
      expect(resposta?.status()).toBe(200);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page).toHaveTitle(/Vitor Assis/);
      const descricao = await page.locator('meta[name="description"]').getAttribute('content');
      expect(descricao && descricao.length).toBeGreaterThan(50);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
      expect(erros, erros.join('\n')).toEqual([]);
    });
  }

  test('página 404 para endereço inexistente', async ({ page }) => {
    const resposta = await page.goto('/nao-existe/');
    expect(resposta?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('rota');
  });

  test('robots.txt e sitemap', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain('Sitemap:');
    const sitemap = await request.get('/sitemap-0.xml');
    expect(sitemap.ok()).toBe(true);
    const xml = await sitemap.text();
    for (const rota of ROTAS) expect(xml).toContain(rota === '/' ? '<loc>' : rota);
    expect(xml).not.toContain('404');
  });

  test('todos os links internos respondem', async ({ page, request }) => {
    const visitados = new Set<string>();
    for (const rota of ROTAS) {
      await page.goto(rota);
      const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!));
      for (const h of hrefs) visitados.add(h.split('#')[0]);
    }
    for (const h of visitados) {
      const r = await request.get(h);
      expect(r.status(), h).toBe(200);
    }
  });

  test('links externos abrem com rel seguro', async ({ page }) => {
    for (const rota of ['/', '/contato/']) {
      await page.goto(rota);
      for (const rel of await page.locator('a[target="_blank"]').evaluateAll((as) => as.map((a) => a.getAttribute('rel')))) {
        expect(rel).toContain('noopener');
      }
    }
  });

  test('telefone não é publicado', async ({ page }) => {
    for (const rota of ['/', '/contato/']) {
      await page.goto(rota);
      await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
      expect(await page.content()).not.toMatch(/\+55\s*\(?\d{2}|wa\.me/);
    }
  });
});

test.describe('responsividade', () => {
  for (const largura of LARGURAS) {
    test(`sem rolagem horizontal em ${largura}px`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      for (const rota of ROTAS) {
        await page.goto(rota);
        await page.waitForLoadState('networkidle');
        const { largura: sw, culpados } = await transbordo(page);
        expect(sw, `${rota}: ${culpados.join(', ')}`).toBeLessThanOrEqual(largura);
      }
    });
  }
});

test.describe('navegação e acessibilidade', () => {
  test('link "Pular para o conteúdo" é o primeiro foco', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText('Pular para o conteúdo');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#conteudo$/);
  });

  test('menu do celular abre, fecha com Esc e devolve o foco', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    const botao = page.getByRole('button', { name: 'Menu' });
    const nav = page.locator('#menu-principal');
    await expect(nav).toBeHidden();
    await botao.click();
    await expect(botao).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(nav).toBeHidden();
    await expect(botao).toBeFocused();
    await botao.click();
    await nav.getByRole('link', { name: 'Projetos' }).click();
    await expect(page).toHaveURL(/\/projetos\/$/);
    await expect(page.locator('#menu-principal a[aria-current="page"]')).toHaveText('Projetos');
  });

  for (const rota of [...ROTAS, '/nao-existe/']) {
    test(`axe sem violações sérias em ${rota}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(rota);
      await page.waitForLoadState('networkidle');
      const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const graves = resultado.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }
});

test.describe('filtros de projetos', () => {
  test('filtra por categoria, anuncia o resultado e mantém a URL', async ({ page }) => {
    await page.goto('/projetos/');
    const itens = page.locator('.lista-projetos .item');
    await expect(itens).toHaveCount(5);
    await page.getByRole('button', { name: /Desenvolvimento web/ }).click();
    await expect(page.locator('.lista-projetos .item:visible')).toHaveCount(2);
    await expect(page.getByRole('button', { name: /Desenvolvimento web/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.status-filtro')).toHaveText('2 projetos exibidos');
    await expect(page).toHaveURL(/categoria=web/);

    await page.reload();
    await expect(page.locator('.lista-projetos .item:visible')).toHaveCount(2);
    await page.getByRole('button', { name: /^Todos/ }).click();
    await expect(page.locator('.lista-projetos .item:visible')).toHaveCount(5);
  });

  test('sem JavaScript, todos os projetos continuam visíveis', async ({ browser }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false });
    const page = await contexto.newPage();
    await page.goto('/projetos/');
    await expect(page.locator('.lista-projetos .item:visible')).toHaveCount(5);
    await expect(page.locator('.filtros')).toBeHidden();
    await contexto.close();
  });
});

test.describe('painel de fretes (dados simulados)', () => {
  test('carrega, mostra o aviso e reage aos filtros', async ({ page }) => {
    const erros = vigiarErros(page);
    await page.goto('/projetos/painel-fretes-simulado/');
    await expect(page.locator('.painel .aviso-simulado')).toContainText('Dados simulados');
    const entregas = page.locator('[data-kpi="entregas"] .valor');
    await expect(entregas).not.toHaveText('');
    const total = await entregas.textContent();
    await expect(page.locator('table.resumo tbody tr')).toHaveCount(4);
    await expect(page.locator('[data-grafico="otif"] svg path').first()).toBeAttached();

    await page.selectOption('select[name="transportadora"]', 'Transportadora B');
    await expect(entregas).not.toHaveText(total!);
    await expect(page.locator('table.resumo tbody tr')).toHaveCount(1);

    await page.selectOption('select[name="regiao"]', 'Região Centro');
    await expect(page.locator('.nota-frota')).toBeVisible();

    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(entregas).toHaveText(total!);
    expect(erros).toEqual([]);
  });

  test('gráfico de OTIF pode ser percorrido pelo teclado', async ({ page }) => {
    await page.goto('/projetos/painel-fretes-simulado/');
    const area = page.locator('[data-grafico="otif"] .area');
    await expect(page.locator('[data-kpi="otif"] .valor')).not.toHaveText('');
    await area.focus();
    const dica = page.locator('[data-grafico="otif"] .tooltip');
    await expect(dica).toBeVisible();
    const antes = await dica.textContent();
    await page.keyboard.press('Home');
    await expect(dica).not.toHaveText(antes!);
    await expect(dica).toContainText('OTIF');
  });

  test('mostra mensagem clara quando os dados não carregam', async ({ page }) => {
    await page.route('**/dados/fretes-simulados.json', (r) => r.fulfill({ status: 500, body: '' }));
    await page.goto('/projetos/painel-fretes-simulado/');
    await expect(page.locator('.painel .estado')).toContainText('Não foi possível carregar os dados simulados');
    await expect(page.locator('.conteudo-painel')).toBeHidden();
  });
});

test.describe('laboratório de roteirização', () => {
  test('calcula rotas, alterna a visualização e gera novos pontos', async ({ page }) => {
    const erros = vigiarErros(page);
    await page.goto('/projetos/laboratorio-roteirizacao/');
    const ganho = page.locator('[data-m="ganho"]');
    await expect(ganho).toHaveText(/%$/);
    await expect(page.locator('.mapa svg circle')).toHaveCount(14);

    await page.locator('input[name="qtd"]').fill('20');
    await expect(page.locator('.mapa svg circle')).toHaveCount(20);
    await expect(page.locator('output')).toHaveText('20');

    await page.locator('.segmentado label', { hasText: 'Vizinho mais próximo' }).click();
    await expect(page.getByRole('radio', { name: 'Vizinho mais próximo' })).toBeChecked();
    await expect(page.locator('.resumo-rota')).toContainText('vizinho mais próximo');

    const antes = await page.locator('[data-m="vizinho"]').textContent();
    await page.getByRole('button', { name: 'Gerar novos pontos' }).click();
    await expect(page.locator('[data-m="vizinho"]')).not.toHaveText(antes!);
    await expect(page.locator('.sequencia li')).toHaveCount(21);
    expect(erros).toEqual([]);
  });
});

test.describe('contato', () => {
  test('botão copia o e-mail e anuncia o resultado', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/contato/');
    await page.getByRole('button', { name: 'Copiar e-mail' }).click();
    await expect(page.locator('.status-copia')).toContainText('copiado');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('vitorazziz@gmail.com');
  });
});
