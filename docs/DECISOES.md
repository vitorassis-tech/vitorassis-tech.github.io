# Decisões de arquitetura e design

## Tecnologia

| Decisão | Motivo |
|---|---|
| **Astro 7 com saída estática** | Gera HTML pronto (ótimo para SEO e velocidade) e só envia JavaScript às páginas que precisam (filtros e demos). Tem componentes reutilizáveis e hospedagem gratuita em qualquer serviço estático. Usamos a versão 7.3.8 porque a 5.x tinha alertas de segurança no `npm audit`. |
| **Sem backend, banco ou autenticação** | Um portfólio não precisa deles. Menos superfície de ataque e custo zero. |
| **Conteúdo em `src/data/*.ts`** | Separa conteúdo de apresentação. Os tipos TypeScript impedem campos faltando, e os testes de conteúdo validam as regras do briefing. |
| **CSS próprio, sem framework** | Identidade autoral, menos peso e controle total de contraste e responsividade. |
| **Gráficos em SVG sem biblioteca** | Painel leve, sem dependência externa. As cores das séries foram validadas para daltonismo e contraste. |
| **Fontes auto-hospedadas (@fontsource)** | Nenhuma requisição a terceiros (privacidade/LGPD) e controle do carregamento. As duas fontes principais são pré-carregadas. |
| **Lógica em funções puras (`src/lib`)** | Testáveis isoladamente; a interface só desenha. |
| **Pipeline Python → SQLite → SQL → JSON** | Demonstra Python e SQL de verdade: os indicadores do painel são calculados pelo SQL e conferidos por testes. Só usa a biblioteca padrão. |
| **Melhoria progressiva** | Sem JavaScript, o site continua navegável e todos os projetos ficam visíveis. |

## Identidade visual

**Conceito: "mapa de rota".** A roteirização é o ponto de partida da trajetória do Vitor, então a página inicial abre com a carreira desenhada como uma rota que sobe da esquerda para a direita. Cada parada é um marco real do currículo; o trecho tracejado em laranja mostra as próximas etapas previstas (Python e IA). A mesma linguagem aparece no ícone, nos marcadores da linha do tempo, no laboratório de rotas e na imagem de compartilhamento.

**Paleta** (base do briefing, com ajustes só para contraste):

| Token | Cor | Uso |
|---|---|---|
| `--navy` | #17365D | Marca, títulos, rota concluída |
| `--bg` | #F7F9FC | Fundo |
| `--line` | #D9E2EC | Divisórias |
| `--accent` | #E58A2B | Marcas gráficas (rota prevista, sublinhados). Nunca em texto pequeno |
| `--accent-ink` | #9A4D08 | Laranja para texto (contraste ≈ 6:1) |
| `--ink` / `--muted` | #15253B / #4A5A70 | Texto principal e secundário |
| `--serie-1` / `--serie-2` | #2563A8 / #C9741F | Séries dos gráficos (validadas: separação para daltonismo e contraste ≥ 3:1) |

**Tipografia:** *Fraunces* (serifada variável com eixo óptico) nos títulos, que dá o tom editorial, e *IBM Plex Sans* no texto, que tem origem técnica, ótima leitura em telas e algarismos tabulares nos dados.

**Princípios aplicados**
- Um único elemento de destaque (o mapa de rota). O restante é sóbrio.
- Lista editorial de projetos, sem grade de cartões repetidos.
- Estrutura visual que carrega informação: selos com **forma + texto** (círculo = profissional, quadrado = acadêmico, losango laranja = simulado), borda contínua = trabalho, tracejada = formação.
- Animação só no carregamento do mapa de rota e no desenho da rota otimizada, ambas desligadas com "reduzir movimento".
- Sem métricas decorativas: os números do site vêm do currículo (datas, carga horária) ou são calculados a partir de dados simulados identificados.

## Honestidade de conteúdo

- Natureza de cada projeto sempre visível (profissional, acadêmico, demonstração).
- O tipo de resultado `medido` existe, mas nenhum projeto o usa: não há medições autorizadas, e um teste automatizado garante isso.
- Pendências aparecem no site, em vez de serem preenchidas com suposições.
- O projeto profissional descreve o método e as regras, mas não publica dados, prints, nomes de parceiros nem números de contrato.
- As demonstrações informam que foram feitas com apoio de IA generativa.
