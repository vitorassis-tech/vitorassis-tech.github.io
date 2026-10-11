# Portfólio Vitor Assis: logística, dados e tecnologia

Site pessoal e profissional que conecta a experiência em logística e roteirização às competências em análise de dados, Power BI, SQL, Python e desenvolvimento web.

- **Tecnologia:** [Astro](https://astro.build) (site estático), TypeScript, CSS próprio
- **Visual:** direção híbrida "Centro de Comando": faixas escuras de comando e áreas claras de leitura
- **Site publicado sem backend, banco de dados ou login.** O build gera HTML/CSS/JS estático, que pode ser hospedado de graça.
- **Painel administrativo local** (`npm run admin`): criar, editar e excluir todo o conteúdo, com validação, lixeira e histórico. Veja [docs/PAINEL.md](docs/PAINEL.md).
- **Testes:** Python `unittest` (dados), Vitest (lógica, conteúdo e API do painel), Playwright + axe (site e painel no navegador, responsividade e acessibilidade)

> As demonstrações usam **dados e parâmetros fictícios**, independentes de qualquer empresa e identificados no site, no código e nos arquivos. Nenhum dado interno da Profarma é publicado.

---

## 1. Pré-requisitos

| Ferramenta | Versão | Para quê |
|---|---|---|
| Node.js | **22.12 ou superior** (LTS 22) | Rodar e gerar o site |
| npm | 10 ou superior (vem com o Node) | Instalar dependências |
| Python | 3.10 ou superior | Só para regenerar os dados fictícios (opcional) |
| Git | qualquer recente | Versionar (opcional) |

## 2. Executar no Windows (passo a passo)

1. Instale o **Node.js 22 LTS** em <https://nodejs.org> (botão "LTS"). Aceite as opções padrão.
2. Abra o **PowerShell**: tecla Windows, digite `PowerShell` e pressione Enter.
3. Confira as versões:
   ```powershell
   node -v
   npm -v
   ```
   O primeiro comando precisa mostrar `v22.12` ou superior.
4. Entre na pasta do projeto:
   ```powershell
   cd C:\Projetos\portfolio-vitor-assis\portfolio-vitor-assis
   ```
5. Instale as dependências (só na primeira vez ou quando o `package-lock.json` mudar):
   ```powershell
   npm ci
   ```
6. Rode o site em modo de desenvolvimento:
   ```powershell
   npm run dev
   ```
7. Abra **http://localhost:4321** no navegador. Para parar, volte ao PowerShell e pressione `Ctrl + C`.

**Ver a versão final (igual à que seria publicada):**

```powershell
npm run build
npm run preview
```

Depois abra **http://localhost:4321**.

> Se o PowerShell bloquear o `npm` com erro de "execução de scripts", rode uma vez:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e confirme com `S`.

## 3. Comandos disponíveis

| Comando | O que faz |
|---|---|
| `npm run admin` | **Painel administrativo** em http://127.0.0.1:4330 e prévia do site em http://localhost:4321 |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera o site final em `dist/` |
| `npm run preview` | Serve o build final localmente |
| `npm run dados` | Regenera os dados fictícios (Python → SQLite → SQL → JSON/CSV). Funciona no Windows (`py`/`python`) e no Linux/macOS (`python3`) |
| `npm run og` | Regenera a imagem de compartilhamento `public/og-image.png` |
| `npm run typecheck` | Verifica os tipos TypeScript |
| `npm test` | Testes unitários e de conteúdo (Vitest) |
| `npm run test:dados` | Testes do gerador de dados (Python) |
| `npm run test:e2e` | Testes do site no navegador (Playwright + axe). Requer `npm run build` antes |
| `npm run test:painel` | Testes do painel no navegador, sobre uma cópia temporária do conteúdo |
| `npm run test:all` | Roda tudo, na ordem certa |

**Primeira vez rodando os testes de navegador em um computador novo:** `npx playwright install chromium`.

## 4. Estrutura de pastas

```
portfolio-vitor-assis/
├── src/
│   ├── content/           ← TODO O CONTEÚDO EDITÁVEL (JSON), editado pelo painel
│   ├── data/              carrega e valida o conteúdo, com tipos para as páginas
│   ├── lib/esquema.mjs    esquema único do conteúdo (build, servidor e painel)
│   ├── pages/             rotas do site (uma página = um arquivo)
│   ├── components/        cabeçalho, rodapé, telemetria, vitrine, lista de projetos
│   │   └── demos/             PainelFretes, SimulacaoTorre, LaboratorioRotas
│   ├── layouts/           estrutura HTML base, SEO e metadados
│   ├── lib/               funções puras e testadas (indicadores, farol, roteirização, formatação)
│   ├── scripts/           JavaScript das demonstrações
│   └── styles/global.css  tokens de cor, tipografia e superfícies claras/escuras
├── public/dados/          dados FICTÍCIOS publicados (JSON e CSV)
├── dados-demo/            gerador Python + SQL dos dados fictícios, com testes
├── tests/unit/            testes Vitest
├── tests/e2e/             testes Playwright
├── admin/                 interface do painel administrativo (não é publicada)
├── scripts/admin/         servidor local do painel
├── scripts/               gerador da imagem OG e executor de Python multiplataforma
├── tests/api/             testes da API do painel
├── tests/painel/          testes do painel no navegador
└── docs/                  edição, publicação, testes, decisões e pendências
```

## 5. Documentação complementar

- [docs/PAINEL.md](docs/PAINEL.md): painel administrativo (uso, segurança, lixeira, histórico, logotipos)
- [docs/EDICAO.md](docs/EDICAO.md): como editar textos, projetos, contatos, cores e imagens
- [docs/PUBLICACAO.md](docs/PUBLICACAO.md): como publicar de graça, **somente quando você autorizar**
- [docs/RELATORIO-TESTES.md](docs/RELATORIO-TESTES.md): testes executados e resultados
- [docs/PENDENCIAS.md](docs/PENDENCIAS.md): informações que faltam e limitações conhecidas
- [docs/DECISOES.md](docs/DECISOES.md): arquitetura, identidade visual, indicadores fictícios e justificativas

## 6. Privacidade e segurança

- Não há chaves, senhas ou tokens no projeto. O site publicado não tem formulário que envie dados.
- O painel administrativo roda só em `127.0.0.1`, com token aleatório por sessão, e não faz parte do site publicado.
- O telefone está **oculto** (`"exibir": false` em `src/content/contatos.json`).
- O estudo de caso da Torre de Controle não publica dados internos, capturas, clientes, placas, quantidades, valores, percentuais nem regras da empresa.
- As demonstrações usam indicadores didáticos e parâmetros fictícios, com testes que bloqueiam termos de regras reais.
- Links externos abrem com `rel="noopener noreferrer"`. As fontes são servidas pelo próprio site, sem rastreadores.
