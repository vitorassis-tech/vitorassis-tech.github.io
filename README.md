# Portfólio Vitor Assis: logística, dados e tecnologia

Site pessoal e profissional que conecta a experiência em logística e roteirização às competências em análise de dados, Power BI, SQL, Python e desenvolvimento web.

- **Tecnologia:** [Astro](https://astro.build) (site estático), TypeScript, CSS puro
- **Sem backend, banco de dados ou login.** O resultado do build é HTML/CSS/JS estático e pode ser hospedado de graça.
- **Testes:** Python `unittest` (dados), Vitest (lógica e conteúdo), Playwright + axe (navegador, responsividade e acessibilidade)

> As demonstrações usam **dados simulados**, identificados no site, no código e nos arquivos. Nenhum dado interno de empresa é publicado.

---

## 1. Pré-requisitos

| Ferramenta | Versão | Para quê |
|---|---|---|
| Node.js | **22.12 ou superior** (LTS 22 recomendado) | Rodar e gerar o site |
| npm | 10 ou superior (já vem com o Node) | Instalar dependências |
| Python | 3.10 ou superior | Regenerar os dados simulados (opcional) |
| Git | qualquer recente | Versionar e publicar (opcional) |

Para conferir as versões, abra o terminal (no Windows: PowerShell) e rode:

```bash
node -v
npm -v
python --version   # no Linux/macOS pode ser python3 --version
```

## 2. Executar localmente

```bash
# 1. Entre na pasta do projeto
cd portfolio-vitor-assis

# 2. Instale as dependências (só na primeira vez)
npm ci

# 3. Rode em modo de desenvolvimento (atualiza sozinho quando você edita)
npm run dev
```

Abra **http://localhost:4321** no navegador. Para parar o servidor, use `Ctrl + C` no terminal.

Para ver a versão final, igual à que será publicada:

```bash
npm run build      # gera a pasta dist/
npm run preview    # serve a pasta dist/ em http://localhost:4321
```

## 3. Comandos disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera o site final em `dist/` |
| `npm run preview` | Serve o build final localmente |
| `npm run dados` | Regenera os dados simulados (Python → SQLite → SQL → JSON/CSV) |
| `npm run og` | Regenera a imagem de compartilhamento `public/og-image.png` |
| `npm run typecheck` | Verifica os tipos TypeScript |
| `npm test` | Testes unitários e de conteúdo (Vitest) |
| `npm run test:dados` | Testes do gerador de dados (Python) |
| `npm run test:e2e` | Testes no navegador (Playwright + axe). Requer `npm run build` antes |
| `npm run test:all` | Roda tudo, na ordem certa |

**Windows:** os scripts `dados` e `test:dados` chamam `python3`. Se o seu Python responde como `python`, rode diretamente: `python dados-demo/gerar_dados.py` e `python -m unittest discover -s dados-demo/tests -v`.

**Primeira vez rodando os testes de navegador em um computador novo:** `npx playwright install chromium`.

## 4. Estrutura de pastas

```
portfolio-vitor-assis/
├── src/
│   ├── data/              ← TODO O CONTEÚDO EDITÁVEL fica aqui
│   │   ├── site.ts            nome, contatos (telefone oculto por padrão), menu
│   │   ├── trajetoria.ts      experiência, formação, cursos, marcos do "mapa de rota"
│   │   ├── competencias.ts    competências com evidência
│   │   └── projetos.ts        projetos e estudos de caso
│   ├── pages/             rotas do site (uma página = um arquivo)
│   ├── components/        partes reutilizáveis (cabeçalho, rodapé, lista de projetos, demos)
│   ├── layouts/           estrutura HTML base, SEO e metadados
│   ├── lib/               funções puras e testadas (KPIs, roteirização, formatação)
│   ├── scripts/           JavaScript dos componentes interativos
│   └── styles/global.css  cores, tipografia e estilos globais
├── public/                arquivos servidos como estão (favicon, imagem OG, dados simulados)
├── dados-demo/            pipeline Python + SQL que gera os dados simulados
│   ├── gerar_dados.py
│   ├── sql/schema.sql, sql/consultas.sql
│   └── tests/
├── tests/unit/            testes Vitest
├── tests/e2e/             testes Playwright
├── scripts/gerar-og.mjs   gerador da imagem de compartilhamento
└── docs/                  edição, publicação, testes, decisões e pendências
```

## 5. Documentação complementar

- [docs/EDICAO.md](docs/EDICAO.md): como editar textos, projetos, contatos, cores e imagens
- [docs/PUBLICACAO.md](docs/PUBLICACAO.md): como publicar de graça (GitHub Pages, Cloudflare Pages ou Netlify), **somente quando você decidir**
- [docs/RELATORIO-TESTES.md](docs/RELATORIO-TESTES.md): testes executados e resultados
- [docs/PENDENCIAS.md](docs/PENDENCIAS.md): informações que faltam e limitações conhecidas
- [docs/DECISOES.md](docs/DECISOES.md): arquitetura, identidade visual e justificativas

## 6. Privacidade e segurança

- Não há chaves, senhas ou tokens no projeto. Não há formulário que envie dados.
- O telefone está **oculto** (`exibir: false` em `src/data/site.ts`).
- Os nomes de transportadoras, contratos e números internos do trabalho **não** aparecem no site.
- Links externos abrem com `rel="noopener noreferrer"`.
- Fontes servidas pelo próprio site (sem Google Fonts nem rastreadores).
