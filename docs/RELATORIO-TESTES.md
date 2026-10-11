# Relatório de testes

**Data da execução:** 11/10/2026
**Ambiente:** container Linux na nuvem, Node 22.22, npm 10.9, Python 3.13, Chromium 141 (Playwright 1.56.1)
**Comando:** `npm run test:all`, mais as verificações manuais listadas abaixo

Neste relatório, "passou" significa que o teste **foi executado** e passou. O que não pôde ser executado está na seção "Não testado".

## Resumo

| Suíte | Ferramenta | Resultado |
|---|---|---|
| Gerador de dados simulados | Python `unittest` | **8 de 8 passaram** |
| Tipos TypeScript | `tsc --noEmit` | **Sem erros** |
| Lógica e conteúdo | Vitest | **29 de 29 passaram** (3 arquivos) |
| Build de produção | `astro build` | **11 páginas geradas, sem erros nem avisos** |
| Navegador (ponta a ponta) | Playwright + axe-core | **39 de 39 passaram** |
| Vulnerabilidades de dependências | `npm audit` | **0 vulnerabilidades** |
| Instalação limpa | `npm ci` (npm 10) em pasta vazia | **OK** |
| Desempenho, acessibilidade, SEO | Lighthouse 12.8 (emulação móvel, localhost) | Ver tabela abaixo |

## O que cada suíte cobre

### Python (`dados-demo/tests`)
- Dias úteis sem fim de semana; geração reprodutível (mesma semente, mesmos dados).
- No-Show e Spot calculados pelo SQL conferem com a regra `MÁXIMO(x − y; 0)` em todas as linhas.
- OTIF nunca excede entregas no prazo nem completas; total agregado bate com a tabela bruta.
- Integridade referencial (nenhuma entrega sem transportadora).
- O JSON publicado existe, está marcado `simulado: true`, contém o aviso "DADOS SIMULADOS" e tem formato consistente.

### Vitest (`tests/unit`)
- **KPIs:** No-Show, Spot, OTIF ponderado, custo por entrega, agrupamento semanal, retorno `null` quando não há dados (o painel mostra "sem dados", sem inventar valor).
- **Roteirização:** vizinho mais próximo visita todos os pontos; 2-opt desfaz cruzamento e **nunca piora** a rota (25 cenários); gerador determinístico; casos vazios.
- **Conteúdo:** slugs únicos; campos obrigatórios dos estudos de caso; demonstrações marcadas como simuladas; **nenhum resultado declarado como "medido"**; o projeto profissional não contém quantidades de veículos, valores em R$ ou percentuais; links internos válidos; telefone oculto; datas válidas e marcos em ordem; formatação pt-BR; prefixo de subpasta.

### Playwright (`tests/e2e`)
- **10 rotas** respondem 200, com um único `h1`, `title`, `meta description`, `canonical` e `lang="pt-BR"`, **sem erros no console**.
- Página 404 responde com status 404.
- `robots.txt` e `sitemap` gerados, com todas as rotas e sem a 404.
- Todos os links internos de todas as páginas respondem 200.
- Links externos com `rel="noopener"`; nenhum `tel:` ou número de telefone publicado.
- **Responsividade:** sem rolagem horizontal em **375, 430, 768 e 1280 px** em todas as rotas. O teste desativa o `overflow-x: clip` do `body` para não mascarar transbordos.
- **Teclado:** o primeiro Tab foca "Pular para o conteúdo"; o menu móvel abre, fecha com Esc e devolve o foco ao botão; o gráfico de OTIF pode ser percorrido com setas, Home e End.
- **Acessibilidade (axe, WCAG 2.1 A/AA):** nenhuma violação séria ou crítica nas 10 rotas e na 404.
- **Filtros de projetos:** filtram, anunciam o resultado para leitores de tela, persistem na URL e, **sem JavaScript**, todos os projetos continuam visíveis e os botões ficam ocultos.
- **Painel de fretes:** carrega, exibe o aviso de dados simulados, reage aos filtros, limpa os filtros e mostra uma **mensagem clara quando o JSON não carrega** (falha simulada com HTTP 500).
- **Laboratório de rotas:** recalcula ao mudar a quantidade de pontos, alterna entre as rotas e gera novos pontos.
- **Contato:** o botão copia o e-mail e anuncia a ação.

## Lighthouse (executado localmente)

| Página | Desempenho | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Início | 97 | 100 | 100 | 100 | 1,8 s | 0 | 150 ms |
| Painel de fretes | 100 | 100 | 100 | 100 | 1,5 s | 0 | 80 ms |

São métricas de laboratório (emulação de celular com rede limitada simulada) servidas a partir de `localhost`. Os valores reais dependem da hospedagem e devem ser medidos depois da publicação (PageSpeed Insights).

## Verificações visuais (manuais)

Capturas de tela revisadas em 375, 430, 768, 980, 1000, 1280 e 1440 px. Problemas encontrados e **corrigidos** durante a revisão:

1. Painel e laboratório transbordavam no celular (itens de grid com `min-width` automático). Corrigido com `minmax(0, 1fr)`.
2. Linhas da tabela do painel criadas por JavaScript não recebiam o estilo do componente. Corrigido com seletores `:global`.
3. Os indicadores do painel ficavam desalinhados no celular. A grade foi reescrita (mobile first).
4. O rótulo da última parada do mapa de rota era cortado entre 960 e 1100 px. A coluna de folga foi ampliada.
5. Espaços perdidos entre texto e link ("aTorre", "Origem:Sistemas"). Corrigidos, e foi feita uma varredura no HTML gerado em busca de casos parecidos.
6. Os botões de filtro apareciam sem JavaScript, apesar do atributo `hidden`. Corrigido (o teste pegou o erro).
7. Rótulos do eixo X sobrepostos no fim do gráfico de OTIF. Corrigido.

## Não testado / limitações do ambiente

- **Safari (iOS/macOS) e Firefox:** não estavam disponíveis no ambiente; os testes rodaram só no Chromium. Recomenda-se abrir o site no celular antes de publicar.
- **Leitores de tela reais** (NVDA, VoiceOver): não testados. A estrutura semântica e o axe foram verificados, mas isso não substitui o teste com leitor de tela.
- **Core Web Vitals de campo:** só podem ser medidas com o site publicado.
- **Windows:** os comandos foram executados em Linux. As instruções para Windows estão no README, mas não foram executadas.
- **Links externos** (LinkedIn, GitHub): o formato foi verificado, mas não foi feito acesso real a eles, porque o ambiente não tem acesso livre à internet.
