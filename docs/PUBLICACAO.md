# Publicação gratuita (somente com sua autorização)

> **Nada foi publicado.** Este guia explica como publicar quando você decidir. Nenhum repositório foi criado e nenhum serviço foi conectado.

O site é estático: o comando `npm run build` gera a pasta `dist/`, que pode ir para qualquer hospedagem estática.

## Antes de publicar (checklist)

- [ ] Revisar as [pendências](PENDENCIAS.md), principalmente os textos do projeto profissional.
- [ ] Confirmar quais contatos devem aparecer (painel → Contato, ou `src/content/contatos.json`).
- [ ] Conferir no painel quais projetos estão como **Publicado** (rascunhos e arquivados não vão para o site).
- [ ] Rodar `npm run test:all` e confirmar que tudo passa.
- [ ] Definir o endereço final do site (necessário para SEO, sitemap e imagem de compartilhamento).

## Comparação das opções

| | GitHub Pages | Cloudflare Pages | Netlify |
|---|---|---|---|
| Custo | Gratuito | Gratuito | Gratuito (com limites mensais) |
| Endereço gratuito | `usuario.github.io` | `projeto.pages.dev` | `projeto.netlify.app` |
| Domínio próprio | Sim | Sim | Sim |
| Build automático a cada `git push` | Sim (GitHub Actions) | Sim | Sim |
| Facilidade para iniciante | Boa | Muito boa | Muito boa |

**Recomendação: GitHub Pages com o repositório `vitorassis-tech.github.io`.** O código fica no mesmo GitHub que já está no seu currículo, recrutadores podem ver o código-fonte, e o endereço fica `https://vitorassis-tech.github.io`, sem subpasta. Se quiser domínio próprio depois, as três opções aceitam.

---

## Opção A: GitHub Pages (recomendada)

1. No GitHub, crie um repositório **público** chamado exatamente `vitorassis-tech.github.io`.
2. No computador, dentro da pasta do projeto:

   ```bash
   git init
   git add .
   git commit -m "Portfólio: primeira versão"
   git branch -M main
   git remote add origin https://github.com/vitorassis-tech/vitorassis-tech.github.io.git
   ```

3. Copie o modelo de workflow para a pasta que o GitHub lê:

   ```bash
   mkdir -p .github/workflows
   cp docs/exemplos/deploy-github-pages.yml .github/workflows/deploy.yml
   git add .github && git commit -m "Publicação automática no GitHub Pages"
   ```

4. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. Envie o código: `git push -u origin main`.
6. Acompanhe na aba **Actions**. Em 1 a 3 minutos o site estará em `https://vitorassis-tech.github.io`.

**Se usar outro nome de repositório** (ex.: `portfolio`), o site ficará em `https://vitorassis-tech.github.io/portfolio/`. Nesse caso, no arquivo `.github/workflows/deploy.yml`, defina `BASE_PATH: /portfolio`.

## Opção B: Cloudflare Pages

1. Envie o projeto para um repositório no GitHub (passos 1 e 2 da opção A, com qualquer nome).
2. Em [dash.cloudflare.com](https://dash.cloudflare.com): **Workers & Pages → Create → Pages → Connect to Git**, escolha o repositório.
3. Configure:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Variáveis de ambiente: `NODE_VERSION = 22` e `SITE_URL = https://SEU-PROJETO.pages.dev`
4. Clique em **Save and Deploy**.

## Opção C: Netlify

1. Envie o projeto para o GitHub.
2. Em [app.netlify.com](https://app.netlify.com): **Add new site → Import an existing project**, escolha o repositório.
3. Build command `npm run build`, publish directory `dist`. Em **Environment variables**, adicione `NODE_VERSION = 22` e `SITE_URL = https://SEU-SITE.netlify.app`.
4. Clique em **Deploy**.

---

## Variáveis de build

| Variável | Exemplo | Para quê |
|---|---|---|
| `SITE_URL` | `https://vitorassis-tech.github.io` | Endereço absoluto usado no canonical, sitemap, robots e imagem OG |
| `BASE_PATH` | `/portfolio` | Só se o site ficar em uma subpasta |

Para testar localmente com essas variáveis (Linux/macOS/Git Bash):

```bash
SITE_URL=https://vitorassis-tech.github.io npm run build
```

No PowerShell:

```powershell
$env:SITE_URL="https://vitorassis-tech.github.io"; npm run build
```

## Depois de publicar

1. Abra o site no celular e no computador.
2. Teste a pré-visualização do link no [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).
3. Opcional: cadastre o site no [Google Search Console](https://search.google.com/search-console) e envie o `sitemap-index.xml`.
4. Opcional: rode o [PageSpeed Insights](https://pagespeed.web.dev/) para medir as Core Web Vitals reais.
5. Atualize o LinkedIn e o currículo com o endereço do portfólio.
