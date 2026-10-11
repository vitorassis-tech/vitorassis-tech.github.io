/**
 * Painel administrativo: CRUD completo, confirmações, lixeira, histórico,
 * logotipos, conflitos, acessibilidade e telas pequenas.
 * Executa sobre uma CÓPIA temporária do conteúdo (ver playwright.painel.config.ts).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABXvMqGgAAAABJRU5ErkJggg==', 'base64');

/** Erros de console, ignorando as respostas 4xx esperadas (validação, conflito). */
function vigiarErros(page: Page) {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of 4\d\d/.test(m.text())) erros.push(m.text());
  });
  return erros;
}

async function semViolacoesGraves(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const graves = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

async function chamarApi(page: Page, metodo: string, caminho: string, corpo?: unknown) {
  const token = await page.locator('meta[name="painel-token"]').getAttribute('content');
  return page.request.fetch(caminho, {
    method: metodo,
    headers: { 'X-Admin-Token': token!, 'Content-Type': 'application/json' },
    data: corpo ? JSON.stringify(corpo) : undefined,
  });
}

/** Campo de texto pelo rótulo exato (o leitor de tela também anuncia "(obrigatório)"). */
const campo = (page: Page, rotulo: string) =>
  page.getByRole('textbox', { name: new RegExp(`^${rotulo.replace(/[()]/g, '\\$&')}( \\(obrigatório\\))?$`) });

test.describe.configure({ mode: 'serial' });

test('consultar: lista, busca e filtro por status', async ({ page }) => {
  const erros = vigiarErros(page);
  await page.goto('/#/c/projetos');
  await expect(page.getByRole('heading', { level: 1, name: 'Projetos' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(6);
  await page.getByRole('searchbox').fill('flask');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: /^Rascunho/ }).click();
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await expect(page.getByText('Nenhum item encontrado com esses filtros.')).toBeVisible();
  await semViolacoesGraves(page);
  expect(erros).toEqual([]);
});

test('criar: validação clara, endereço automático e projeto salvo como rascunho', async ({ page }) => {
  const erros = vigiarErros(page);
  await page.goto('/#/c/projetos/novo');
  await page.getByRole('button', { name: 'Criar projeto' }).click();
  const resumo = page.locator('.resumo-erros');
  await expect(resumo).toBeVisible();
  await expect(resumo).toBeFocused();
  await expect(resumo).toContainText('Título: Campo obrigatório.');
  await expect(campo(page, 'Título')).toHaveAttribute('aria-invalid', 'true');

  // Link do resumo leva ao campo
  await resumo.getByRole('link', { name: /Título/ }).click();
  await expect(campo(page, 'Título')).toBeFocused();

  await campo(page, 'Título').fill('Análise de Entregas Teste');
  await expect(campo(page, 'Endereço da página')).toHaveValue('analise-de-entregas-teste');
  await campo(page, 'Subtítulo').fill('Subtítulo do projeto de teste');
  await campo(page, 'Resumo').fill('Resumo do projeto de teste para o painel.');
  await campo(page, 'Período').fill('2026');
  await page.getByLabel('Python e automação').check();
  await page.locator('[data-caminho="tecnologias"]').getByRole('button', { name: 'Adicionar linha' }).click();
  await page.getByLabel('Tecnologias: linha 1').fill('Python');
  await campo(page, 'Contexto').fill('Contexto do projeto de teste.');
  await campo(page, 'Problema').fill('Problema do projeto de teste.');
  await campo(page, 'Objetivo').fill('Objetivo do projeto de teste.');
  await campo(page, 'Descrição dos dados').fill('Dados fictícios de teste.');
  await campo(page, 'Origem dos dados').fill('DADOS FICTÍCIOS criados para teste.');
  await page.locator('[data-caminho="solucao"]').getByRole('button', { name: 'Adicionar linha' }).click();
  await page.getByLabel('Solução (etapas): linha 1').fill('Primeira etapa.');
  await page.getByRole('button', { name: 'Adicionar resultado' }).click();
  await page.locator('[data-caminho="resultados.0.texto"] textarea').fill('Ainda sem resultado.');

  await page.getByRole('button', { name: 'Criar projeto' }).click();
  await expect(page.locator('.aviso-sucesso').last()).toContainText('criado com sucesso');
  await expect(page).toHaveURL(/#\/c\/projetos\/editar\/analise-de-entregas-teste$/);
  await expect(page.getByRole('radio', { name: 'Rascunho' })).toBeChecked();

  await page.goto('/#/c/projetos');
  await expect(page.locator('tr', { hasText: 'Análise de Entregas Teste' }).locator('.chip')).toHaveText('Rascunho');
  expect(erros).toEqual([]);
});

test('atualizar: destaca alterações, protege a saída e salva', async ({ page }) => {
  await page.goto('/#/c/projetos/editar/analise-de-entregas-teste');
  const salvar = page.getByRole('button', { name: 'Salvar alterações' });
  await expect(salvar).toBeDisabled();
  await expect(page.locator('.barra-status')).toHaveText('Nenhuma alteração');

  await campo(page, 'Período').fill('2025');
  await expect(page.locator('[data-raiz="periodo"]')).toHaveClass(/alterado/);
  await expect(page.locator('.barra-status')).toHaveText('1 alteração não salva');
  await expect(salvar).toBeEnabled();

  // Sair sem salvar pede confirmação; cancelar mantém a edição
  await page.getByRole('link', { name: 'Cursos e certificações' }).click();
  await expect(page.getByRole('dialog', { name: 'Sair sem salvar?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page).toHaveURL(/editar\/analise-de-entregas-teste$/);
  await expect(campo(page, 'Período')).toHaveValue('2025');

  // Descartar volta ao valor salvo
  await page.getByRole('button', { name: 'Descartar alterações' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Descartar' }).click();
  await expect(campo(page, 'Período')).toHaveValue('2026');

  // Salvar de verdade
  await campo(page, 'Período').fill('2024');
  await salvar.click();
  await expect(page.locator('.aviso-sucesso').last()).toContainText('salvo com sucesso');
  await expect(page.locator('.barra-status')).toHaveText('Nenhuma alteração');
  await expect(salvar).toBeDisabled();
  await page.reload();
  await expect(campo(page, 'Período')).toHaveValue('2024');
});

test('atualizar: listas internas (adicionar, mover e remover linhas)', async ({ page }) => {
  await page.goto('/#/c/projetos/editar/analise-de-entregas-teste');
  const tec = page.locator('[data-caminho="tecnologias"]');
  await tec.getByRole('button', { name: 'Adicionar linha' }).click();
  await page.getByLabel('Tecnologias: linha 2').fill('SQL');
  await tec.getByRole('button', { name: 'Mover linha 2 para cima' }).click();
  await expect(page.getByLabel('Tecnologias: linha 1')).toHaveValue('SQL');
  await tec.getByRole('button', { name: 'Remover linha 2' }).click();
  await expect(tec.locator('textarea')).toHaveCount(1);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.locator('.aviso-sucesso').last()).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Tecnologias: linha 1')).toHaveValue('SQL');
});

test('excluir: exige digitar o identificador, vai para a lixeira e pode ser restaurado', async ({ page }) => {
  await page.goto('/#/c/projetos/editar/analise-de-entregas-teste');
  const gatilho = page.getByRole('button', { name: 'Mover para a lixeira' });
  await gatilho.click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText('Será removido do site');
  const confirmar = dialogo.getByRole('button', { name: 'Mover para a lixeira' });
  await expect(confirmar).toBeDisabled();
  await dialogo.getByRole('textbox').fill('analise-de-entregas');
  await expect(confirmar).toBeDisabled();

  // Esc fecha e devolve o foco ao botão que abriu
  await page.keyboard.press('Escape');
  await expect(dialogo).toBeHidden();
  await expect(gatilho).toBeFocused();

  await gatilho.click();
  await page.getByRole('dialog').getByRole('textbox').fill('analise-de-entregas-teste');
  await semViolacoesGraves(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Mover para a lixeira' }).click();
  await expect(page.locator('.aviso-sucesso').last()).toContainText('movido para a lixeira');
  await expect(page).toHaveURL(/#\/c\/projetos$/);
  await expect(page.locator('tbody tr')).toHaveCount(6);

  await page.getByRole('link', { name: 'Lixeira', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Restaurar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restaurar' }).click();
  await expect(page.locator('.aviso-sucesso').last()).toContainText('restaurado');
  await expect(page.getByText('A lixeira está vazia.')).toBeVisible();
  await page.goto('/#/c/projetos');
  await expect(page.locator('tbody tr')).toHaveCount(7);
});

test('excluir definitivamente só pela lixeira e com nova confirmação', async ({ page }) => {
  await page.goto('/#/c/projetos');
  await page.getByRole('button', { name: 'Mover “Análise de Entregas Teste” para a lixeira' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('analise-de-entregas-teste');
  await page.getByRole('dialog').getByRole('button', { name: 'Mover para a lixeira' }).click();
  await expect(page.locator('.aviso-sucesso').last()).toBeVisible();

  await page.goto('/#/lixeira');
  await page.getByRole('button', { name: 'Excluir definitivamente' }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText('não poderá ser restaurado');
  const confirmar = dialogo.getByRole('button', { name: 'Excluir definitivamente' });
  await expect(confirmar).toBeDisabled();
  await dialogo.getByRole('textbox').fill('analise-de-entregas-teste');
  await confirmar.click();
  await expect(page.getByText('A lixeira está vazia.')).toBeVisible();
});

test('excluir: item usado em outras páginas fica bloqueado, com explicação', async ({ page }) => {
  await page.goto('/#/c/projetos/editar/atividade-flask');
  await page.getByRole('button', { name: 'Mover para a lixeira' }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText('Não é possível excluir agora');
  await expect(dialogo).toContainText('Página inicial — Projetos em destaque');
  await expect(dialogo.getByRole('button', { name: 'Mover para a lixeira' })).toHaveCount(0);
  await dialogo.getByRole('button', { name: 'Entendi' }).click();
  await expect(dialogo).toBeHidden();
});

test('histórico: lista versões e restaura com confirmação', async ({ page }) => {
  await page.goto('/#/c/site');
  await campo(page, 'Cidade').fill('Niterói, RJ');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.locator('.aviso-sucesso').last()).toBeVisible();

  await page.goto('/#/historico/site');
  await expect(page.locator('tbody tr').first()).toContainText('Edição de Dados gerais');
  await page.getByRole('button', { name: 'Restaurar esta versão' }).first().click();
  await expect(page.getByRole('dialog')).toContainText('substituído por esta versão');
  await page.getByRole('dialog').getByRole('button', { name: 'Restaurar versão' }).click();
  await expect(page.locator('.aviso-sucesso').last()).toContainText('restaurado');
  await page.goto('/#/c/site');
  await expect(campo(page, 'Cidade')).toHaveValue('Rio de Janeiro, RJ');
});

test('instituições: enviar logotipo, pré-visualizar e salvar', async ({ page }) => {
  await page.goto('/#/c/instituicoes/editar/senac');
  await page.locator('input[type="file"]').setInputFiles({ name: 'logo-teste.png', mimeType: 'image/png', buffer: PNG_1x1 });
  await expect(page.locator('.aviso-sucesso').last()).toContainText('Imagem enviada');
  await expect(page.locator('.imagem-previa img')).toHaveAttribute('src', /\/midia\/img\/instituicoes\/logo-teste-[0-9a-f]{8}\.png$/);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.locator('.aviso-sucesso').last()).toContainText('salvo com sucesso');
  await page.goto('/#/c/instituicoes');
  await expect(page.locator('tr', { hasText: 'Senac' }).first()).toContainText('Com logotipo');

  // Formato inválido é recusado antes do envio
  await page.goto('/#/c/instituicoes/editar/faetec');
  await page.locator('input[type="file"]').setInputFiles({ name: 'x.gif', mimeType: 'image/gif', buffer: PNG_1x1 });
  await expect(page.locator('[data-caminho="logo"] > .msg-erro')).toContainText('Formato não aceito');
});

test('conflito: alteração feita em outro lugar não é sobrescrita', async ({ page }) => {
  await page.goto('/#/c/projetos/editar/atividade-flask');
  await campo(page, 'Período').fill('2023');
  // Outra "aba" altera o mesmo arquivo
  const dados = await (await chamarApi(page, 'GET', '/api/conteudo')).json();
  const item = dados.conteudo.projetos.find((p: { slug: string }) => p.slug === 'atividade-flask');
  const r = await chamarApi(page, 'PUT', '/api/colecoes/projetos/itens/atividade-flask', { item: { ...item, periodo: '2022' }, versao: dados.versoes.projetos });
  expect(r.status()).toBe(200);

  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  const dialogo = page.getByRole('dialog', { name: 'O conteúdo mudou em outro lugar' });
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole('button', { name: 'Recarregar dados' }).click();
  await expect(campo(page, 'Período')).toHaveValue('2022');
});

test('acessibilidade do formulário e tela de celular sem rolagem lateral', async ({ page }) => {
  await page.goto('/#/c/experiencias/editar/profarma');
  await expect(page.getByRole('heading', { level: 1, name: 'Profarma' })).toBeVisible();
  await semViolacoesGraves(page);

  await page.setViewportSize({ width: 375, height: 800 });
  // Menu recolhível no celular
  await page.goto('/#/c/projetos');
  const botaoMenu = page.getByRole('button', { name: 'Menu de seções' });
  await expect(botaoMenu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('link', { name: 'Instituições' })).toBeHidden();
  await botaoMenu.click();
  await page.getByRole('link', { name: 'Instituições' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Instituições' })).toBeVisible();
  await expect(botaoMenu).toHaveAttribute('aria-expanded', 'false');

  for (const rota of ['/#/c/projetos', '/#/c/projetos/editar/torre-controle-expedicao', '/#/c/contatos', '/#/lixeira', '/#/historico']) {
    await page.goto(rota);
    await page.waitForLoadState('networkidle');
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura, rota).toBeLessThanOrEqual(375);
  }
});
