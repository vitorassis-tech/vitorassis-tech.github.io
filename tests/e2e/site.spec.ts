import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROTAS = [
  '/',
  '/sobre/',
  '/experiencia/',
  '/projetos/',
  '/contato/',
  '/projetos/torre-controle-expedicao/',
  '/projetos/simulacao-torre-controle/',
  '/projetos/painel-fretes-simulado/',
  '/projetos/laboratorio-roteirizacao/',
  '/projetos/atividade-flask/',
  '/projetos/banco-dados-relacional/',
];
const LARGURAS = [375, 430, 768, 1280, 1440];

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

test.describe('conteúdo profissional (E1–E8)', () => {
  test('experiência e página inicial não associam SQL ao trabalho', async ({ page }) => {
    await page.goto('/experiencia/');
    const profarma = await page.locator('.empresa').first().innerText();
    expect(profarma).toContain('Profarma');
    expect(profarma).not.toMatch(/\bSQL\b/);
    await page.goto('/');
    const operacaoEDados = await page.locator('.modulo').filter({ hasNotText: 'Em formação' }).allInnerTexts();
    for (const t of operacaoEDados) expect(t).not.toMatch(/\bSQL\b/);
    await expect(page.locator('.modulo.formacao')).toContainText('SQL');
  });

  test('estudo de caso da Torre: Roadnet e Excel, uso diário, sem fórmulas e com link para a simulação', async ({ page }) => {
    await page.goto('/projetos/torre-controle-expedicao/');
    const corpo = await page.locator('main').innerText();
    expect(corpo).toContain('Roadnet');
    expect(corpo).toContain('Excel');
    expect(corpo).toContain('Em uso diário pela gerência.');
    expect(corpo).not.toMatch(/MÁXIMO|No-Show|Spot \(|contrat/i);
    expect(corpo).not.toMatch(/\bSQL\b/);
    await expect(page.getByRole('link', { name: 'Ver a simulação com dados fictícios' })).toHaveAttribute('href', '/projetos/simulacao-torre-controle/');
  });

  test('objetivo profissional aprovado aparece na página Sobre', async ({ page }) => {
    await page.goto('/sobre/');
    await expect(page.locator('.objetivo p')).toHaveText(
      'Atuar nas áreas de Análise de Dados, Business Intelligence e tecnologia, aplicando conhecimentos em Power BI, Excel, SQL, Python e automação para transformar dados em informações úteis à tomada de decisão.',
    );
  });

  test('Atividade Flask: telas reais carregam, têm descrição e o repositório está linkado', async ({ page }) => {
    await page.goto('/projetos/atividade-flask/');
    const telas = page.locator('#telas figure');
    await expect(telas).toHaveCount(4);
    for (const img of await page.locator('#telas img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
      expect((await img.getAttribute('alt'))?.length).toBeGreaterThan(20);
    }
    await expect(page.locator('#telas figcaption').first()).not.toBeEmpty();
    await expect(page.getByRole('link', { name: /Código-fonte no GitHub/ })).toHaveAttribute('href', 'https://github.com/vitorassis-tech/atividade_flask');
    await expect(page.getByText('Informações pendentes')).toHaveCount(0);
    await expect(page.locator('.sumario a[href="#telas"]')).toHaveText('Telas');
  });
});

test.describe('movimento reduzido', () => {
  test('nenhuma animação roda quando o visitante pede menos movimento', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const animadas = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .flatMap((el) => [getComputedStyle(el), getComputedStyle(el, '::after'), getComputedStyle(el, '::before')])
        .filter((cs) => cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0.01).length,
    );
    expect(animadas).toBe(0);
  });
});

test.describe('filtros de projetos', () => {
  test('filtra por categoria, anuncia o resultado e mantém a URL', async ({ page }) => {
    await page.goto('/projetos/');
    const itens = page.locator('.lista-projetos .item');
    await expect(itens).toHaveCount(6);
    await page.getByRole('button', { name: /Desenvolvimento web/ }).click();
    await expect(page.locator('.lista-projetos .item:visible')).toHaveCount(2);
    await expect(page.getByRole('button', { name: /Desenvolvimento web/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.status-filtro')).toHaveText('2 projetos exibidos');
    await expect(page).toHaveURL(/categoria=web/);

    await page.reload();
    await expect(page.locator('.lista-projetos .item:visible')).toHaveCount(2);
    await page.getByRole('button', { name: /^Todos/ }).click();
    await expect(page.locator('.lista-projetos .item:visible')).toHaveCount(6);
  });

  test('sem JavaScript, todos os projetos continuam visíveis', async ({ browser }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false });
    const page = await contexto.newPage();
    await page.goto('/projetos/');
    await expect(page.locator('.lista-projetos .item:visible')).toHaveCount(6);
    await expect(page.locator('.filtros')).toBeHidden();
    await contexto.close();
  });
});

test.describe('painel de frota e entregas (dados fictícios)', () => {
  test('carrega, mostra o aviso e reage aos filtros', async ({ page }) => {
    const erros = vigiarErros(page);
    await page.goto('/projetos/painel-fretes-simulado/');
    await expect(page.locator('.painel .aviso-simulado')).toContainText('Dados fictícios');
    const entregas = page.locator('[data-kpi="entregas"] .valor');
    await expect(entregas).not.toHaveText('');
    const total = await entregas.textContent();
    await expect(page.locator('table.resumo tbody tr')).toHaveCount(4);
    await expect(page.locator('[data-kpi="cobertura"] .valor')).toHaveText(/%$/);
    await expect(page.locator('[data-kpi="produtividade"] .valor')).toHaveText(/^\d+,\d$/);
    await expect(page.locator('[data-kpi="cobertura"] .valor')).not.toContainText('veíc.');

    await page.selectOption('select[name="transportadora"]', 'Transportadora B');
    await expect(entregas).not.toHaveText(total!);
    await expect(page.locator('table.resumo tbody tr')).toHaveCount(1);

    await page.selectOption('select[name="regiao"]', 'Região Centro');
    await expect(page.locator('.nota-frota')).toBeVisible();

    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(entregas).toHaveText(total!);
    expect(erros).toEqual([]);
  });

  test('tabela do painel confere com o resumo calculado pelo SQL', async ({ page, request }) => {
    const json = await (await request.get('/dados/fretes-simulados.json')).json();
    const cols: string[] = json.resumo_sql.colunas;
    const fmt = (v: number, casas: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
    await page.goto('/projetos/painel-fretes-simulado/');
    await expect(page.locator('table.resumo tbody tr')).toHaveCount(4);
    for (const linha of json.resumo_sql.linhas) {
      const r = Object.fromEntries(cols.map((c, i) => [c, linha[i]]));
      const celulas = await page.locator(`table.resumo tbody tr[data-transportadora="${r.transportadora}"] td`).allInnerTexts();
      expect(celulas[0]).toBe(fmt(r.entregas, 0));
      expect(celulas[1]).toBe(`${fmt(r.otif_pct, 1)}%`);
      expect(celulas[2].replace(/\s/g, ' ')).toBe(`R$ ${fmt(r.custo_por_entrega, 2)}`);
      expect(celulas[3]).toBe(`${fmt(r.cobertura_pct, 1)}%`);
      expect(celulas[4]).toBe(fmt(r.entregas_por_veiculo_em_rota, 1));
    }
  });

  test('gráficos podem ser percorridos pelo teclado e os valores são anunciados', async ({ page }) => {
    await page.goto('/projetos/painel-fretes-simulado/');
    await expect(page.locator('[data-kpi="otif"] .valor')).not.toHaveText('');
    const otif = page.locator('[data-grafico="otif"]');
    await otif.locator('.area').focus();
    await expect(otif.locator('.tooltip')).toBeVisible();
    await page.keyboard.press('Home');
    await expect(otif.locator('.anuncio')).toContainText('OTIF');

    const frota = page.locator('[data-grafico="frota"]');
    await frota.locator('.area').focus();
    await expect(frota.locator('.anuncio')).toContainText('Transportadora A');
    await page.keyboard.press('ArrowRight');
    await expect(frota.locator('.anuncio')).toContainText('Disponíveis');
    await page.keyboard.press('End');
    await expect(frota.locator('.anuncio')).toContainText('Transportadora D');
  });

  test('mostra mensagem clara quando os dados não carregam', async ({ page }) => {
    await page.route('**/dados/fretes-simulados.json', (r) => r.fulfill({ status: 500, body: '' }));
    await page.goto('/projetos/painel-fretes-simulado/');
    await expect(page.locator('.painel .estado')).toContainText('Não foi possível carregar os dados fictícios');
    await expect(page.locator('.conteudo-painel')).toBeHidden();
  });
});

test.describe('simulação da Torre de Controle', () => {
  test('aviso visível, parâmetros fictícios e faróis com texto', async ({ page }) => {
    const erros = vigiarErros(page);
    await page.goto('/projetos/simulacao-torre-controle/');
    await expect(page.locator('.torre .aviso-simulado')).toContainText('Simulação com dados fictícios');
    await expect(page.locator('.torre .aviso-simulado')).toContainText('Profarma');
    await expect(page.locator('.parametros legend')).toContainText('fictícios e ajustáveis');
    await expect(page.locator('input[name="atencao"]')).toHaveValue('95');
    await expect(page.locator('input[name="critico"]')).toHaveValue('85');
    await expect(page.locator('table.quadro tbody tr')).toHaveCount(4);
    for (const t of await page.locator('table.quadro .farol').allInnerTexts()) expect(['Normal', 'Atenção', 'Crítico', 'Sem dados']).toContain(t);
    expect(erros).toEqual([]);
  });

  test('farol prioriza Crítico e reage aos limites ajustados', async ({ page }) => {
    await page.goto('/projetos/simulacao-torre-controle/');
    await page.selectOption('select[name="periodo"]', '0');
    await expect(page.locator('table.quadro tbody tr')).toHaveCount(4);
    const status = async () => page.locator('table.quadro tbody tr').evaluateAll((trs) => trs.map((tr) => (tr as HTMLElement).dataset.status));
    // Limites muito baixos: nenhum indicador abaixo → tudo Normal
    await page.fill('input[name="critico"]', '10');
    await page.fill('input[name="atencao"]', '20');
    await page.locator('input[name="atencao"]').blur();
    await expect.poll(status).toEqual(['normal', 'normal', 'normal', 'normal']);
    // Limites muito altos: qualquer indicador abaixo do crítico → Crítico (prioridade)
    await page.fill('input[name="atencao"]', '100');
    await page.fill('input[name="critico"]', '99.5');
    await page.locator('input[name="critico"]').blur();
    await expect.poll(status).toEqual(['critico', 'critico', 'critico', 'critico']);
    await page.getByRole('button', { name: 'Restaurar 95% e 85%' }).click();
    await expect(page.locator('input[name="atencao"]')).toHaveValue('95');
  });

  test('limites inválidos mostram erro e mantêm os últimos válidos', async ({ page }) => {
    await page.goto('/projetos/simulacao-torre-controle/');
    await page.fill('input[name="critico"]', '97');
    await page.locator('input[name="critico"]').blur();
    await expect(page.locator('.erro-parametros')).toContainText('menor que o de atenção');
    await expect(page.locator('input[name="critico"]')).toHaveAttribute('aria-invalid', 'true');
  });

  test('período sem pendências mostra estado vazio e tempo médio "sem pendências"', async ({ page, request }) => {
    const json = await (await request.get('/dados/torre-simulacao.json')).json();
    const c = json.cargas.colunas as string[];
    const linhas = (json.cargas.linhas as unknown[][]).map((l) => Object.fromEntries(c.map((k, i) => [k, l[i]])));
    const dias = [...new Set(linhas.map((l) => l.data as string))].sort();
    const ultimo = dias[dias.length - 1];
    const semPend = linhas.find((l) => l.data === ultimo && l.pendentes === 0);
    test.skip(!semPend, 'Último dia sem transportadora livre de pendências nos dados gerados.');
    await page.goto('/projetos/simulacao-torre-controle/');
    await page.selectOption('select[name="periodo"]', '1');
    await page.selectOption('select[name="transportadora"]', semPend!.transportadora as string);
    await expect(page.locator('.pend-resumo')).toContainText('Nenhuma carga pendente');
    await expect(page.locator('[data-kpi="tempo"] .valor')).toHaveText('sem pendências');
    await expect(page.locator('.pendencias .tabela-rolagem')).toBeHidden();
  });

  test('mostra mensagem clara quando os dados não carregam', async ({ page }) => {
    await page.route('**/dados/torre-simulacao.json', (r) => r.fulfill({ status: 500, body: '' }));
    await page.goto('/projetos/simulacao-torre-controle/');
    await expect(page.locator('.torre .estado')).toContainText('Não foi possível carregar a simulação');
  });
});

test.describe('laboratório de roteirização', () => {
  for (const qtd of [5, 14, 40]) {
    test(`mapa e lista correspondem com ${qtd} pontos (saída e retorno sem número)`, async ({ page }) => {
      const erros = vigiarErros(page);
      await page.goto('/projetos/laboratorio-roteirizacao/');
      await page.locator('input[name="qtd"]').fill(String(qtd));
      await expect(page.locator('output')).toHaveText(String(qtd));
      for (const modo of ['Vizinho mais próximo', 'Após 2-opt']) {
        await page.locator('.segmentado label', { hasText: modo }).click();
        await expect(page.locator('.mapa svg circle')).toHaveCount(qtd);
        await expect(page.locator('.sequencia li')).toHaveCount(qtd);
        const numerosMapa = await page.locator('.mapa svg text[data-ordem]').evaluateAll((ts) => ts.map((t) => Number(t.textContent)).sort((a, b) => a - b));
        expect(numerosMapa).toEqual(Array.from({ length: qtd }, (_, i) => i + 1));
        await expect(page.locator('[data-extremo="saida"]')).toHaveText('Saída do CD');
        await expect(page.locator('[data-extremo="retorno"]')).toHaveText('Retorno ao CD');
        await expect(page.locator('.sequencia li', { hasText: 'CD' })).toHaveCount(0);
        await expect(page.locator('.resumo-rota')).toContainText(`${qtd} entregas`);
        await expect(page.locator('table.trechos tbody tr')).toHaveCount(qtd + 1);
      }
      expect(erros).toEqual([]);
    });
  }

  test('a soma dos trechos é igual à distância total e novos pontos atualizam tudo', async ({ page }) => {
    await page.goto('/projetos/laboratorio-roteirizacao/');
    await expect(page.locator('[data-m="ganho"]')).toHaveText(/%$/);
    const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
    const conferir = async () => {
      const trechos = (await page.locator('table.trechos tbody td.num').allTextContents()).map(num);
      expect(trechos.every((v) => v > 0)).toBe(true);
      const total = num((await page.locator('.total-trechos').textContent()) ?? '');
      expect(total).toBeGreaterThan(0);
      expect(Math.abs(trechos.reduce((a, b) => a + b, 0) - total)).toBeLessThan(0.05 * trechos.length);
      expect(num(await page.locator('[data-m="otimizada"]').innerText())).toBeCloseTo(total, 1);
    };
    await conferir();
    const antes = await page.locator('[data-m="vizinho"]').textContent();
    await page.getByRole('button', { name: 'Gerar novos pontos' }).click();
    await expect(page.locator('[data-m="vizinho"]')).not.toHaveText(antes!);
    await conferir();
    await expect(page.locator('[data-m="ganho"]')).toHaveText(/%$/);
  });

  test('números do mapa ficam legíveis no celular (≥ 11 px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/projetos/laboratorio-roteirizacao/');
    const alturas = await page.locator('.mapa svg text[data-ordem]').evaluateAll((ts) => ts.map((t) => t.getBoundingClientRect().height));
    expect(alturas.length).toBeGreaterThan(0);
    expect(Math.min(...alturas)).toBeGreaterThanOrEqual(10.5);
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
