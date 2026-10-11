# Decisões de arquitetura, design e conteúdo

## Tecnologia

| Decisão | Motivo |
|---|---|
| **Astro 7 com saída estática** | HTML pronto (SEO e velocidade) e JavaScript só nas páginas que precisam (filtros e demonstrações). A versão 7.3.8 foi escolhida porque a 5.x tinha alertas de segurança no `npm audit`. |
| **Sem backend, banco ou autenticação** | Um portfólio não precisa deles: menos superfície de ataque e custo zero. |
| **Conteúdo em `src/data/*.ts`** | Separa conteúdo de apresentação. Os tipos TypeScript impedem campos faltando, e os testes de conteúdo validam as regras do briefing. |
| **CSS próprio, sem framework e sem dependência nova** | A identidade "Centro de Comando" foi feita só com CSS e SVG e as fontes já instaladas (Fraunces e IBM Plex Sans). Os rótulos técnicos usam a fonte monoespaçada do próprio sistema. |
| **Gráficos em SVG sem biblioteca** | Leves e sem dependência externa. As cores das séries foram validadas para daltonismo e contraste nas superfícies clara e escura. |
| **Fontes auto-hospedadas** | Nenhuma requisição a terceiros. As duas fontes principais são pré-carregadas. |
| **Lógica em funções puras (`src/lib`)** | Testáveis isoladamente; a interface só desenha. |
| **Pipeline Python → SQLite → SQL → JSON** | Os indicadores das demonstrações são calculados pelo SQL e conferidos por testes, inclusive contra o que a tela exibe. Só usa a biblioteca padrão. |
| **Melhoria progressiva** | Sem JavaScript, o site continua navegável e todos os projetos ficam visíveis. |

## Identidade visual: "Centro de Comando", modelo híbrido

**Conceito.** O site parece a tela de uma central de operações logísticas: grade de coordenadas, rotas, painéis com cantos de sinal e indicadores de status. Isso vem do trabalho real (roteirização e expedição), não de ficção científica.

**Híbrido:**
- **Faixas escuras de comando:** barra de navegação, abertura da página inicial (com a telemetria de carreira), topo de cada página, vitrine de demonstrações, consoles das demonstrações e contato.
- **Áreas claras de leitura:** frentes de atuação, projetos, competências, estudos de caso, experiência e Sobre. Textos longos ficam em fundo claro para preservar a legibilidade.

**Tokens principais:**

| Token | Cor | Uso |
|---|---|---|
| `--cmd-0` / `--cmd-1` | #07111F / #0B1A2C | Fundo das faixas e dos painéis escuros |
| `--cmd-text` / `--cmd-muted` | #E7EEF7 / #A3B5CB | Texto sobre o escuro (contraste 16:1 e 8,6:1) |
| `--signal` | #E58A2B | Laranja de sinal: botões principais, rota prevista, cantos dos painéis |
| `--trace` | #CFE2F6 | Rota concluída na telemetria |
| `--navy` / `--bg` / `--line` | #17365D / #F7F9FC / #D9E2EC | Áreas claras (paleta original do briefing) |
| `--serie-1-escuro` / `--serie-2-escuro` | #4F9BD9 / #CF7A24 | Séries de gráficos no fundo escuro (validadas) |
| `--st-normal` / `--st-atencao` / `--st-critico` | verde / âmbar / vermelho | Farol da simulação, sempre com forma e texto |

**Princípios:**
- Um elemento de destaque, a telemetria de carreira (rota real de 2017 às próximas etapas previstas), e o restante sóbrio.
- Movimento só onde informa: desenho da rota e sinal da posição atual, ambos desligados com "reduzir movimento". Não há `backdrop-filter`, para preservar o desempenho.
- No celular, a telemetria vira uma lista vertical legível.
- Status nunca depende só da cor: forma (círculo, triângulo, quadrado) e texto.

## Indicadores das demonstrações (fictícios e independentes)

As demonstrações **não** reproduzem quantidades, indicadores, fórmulas ou regras da Profarma. Usam indicadores didáticos:

| Indicador | Definição |
|---|---|
| OTIF | Entregas no prazo **e** completas ÷ entregas × 100 |
| Custo por entrega | Custo de frete ÷ entregas |
| Cobertura de frota | Veículos disponíveis ÷ veículos necessários × 100 |
| Entregas por veículo em rota | Entregas ÷ veículos em rota |
| Taxa de expedição | Cargas expedidas ÷ cargas programadas × 100 |
| Tempo médio de pendência | Horas em aberto ÷ cargas pendentes ("sem pendências" quando não há nenhuma) |
| Farol | **Crítico** se qualquer indicador estiver abaixo do limite crítico; senão **Atenção** se algum estiver abaixo do de atenção; senão **Normal**. Indicadores sem dados são ignorados; sem nenhum, o status é "Sem dados" |

- Os limites padrão de **95% e 85%** são **parâmetros demonstrativos fictícios**, ajustáveis na tela e validados (o crítico precisa ser menor que o de atenção).
- **Divisões por zero** retornam "sem dados", nunca 0% ou 100%.

## Honestidade de conteúdo

- A natureza de cada projeto fica sempre visível: profissional, acadêmico ou demonstração com dados fictícios.
- **SQL** aparece só como formação e em projetos de estudo, nunca nas atividades na Profarma. Testes automatizados garantem isso.
- O estudo de caso da Torre de Controle descreve o trabalho real (relatórios do Roadnet, Excel, Power Query, DAX, uso diário pela gerência) sem dados internos, quantidades, valores, percentuais nem regras.
- Resultados do tipo "medido" não existem enquanto não houver medição autorizada; um teste garante isso.
- Projetos acadêmicos mostram só o que está comprovado. O que falta aparece como pendência no próprio site.
- As demonstrações informam que foram feitas com apoio de IA generativa.
