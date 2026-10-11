# Pendências e limitações conhecidas

Atualizado em 11/10/2026, após o estudo de caso do banco de dados (SENAI Firjan).

## Informações e materiais que dependem de você

| # | Pendência | Onde aparece / onde editar | Impacto |
|---|---|---|---|
| 1 | Se o professor deve ser **creditado nominalmente** na Atividade Flask | `atividade-flask` | Baixo |
| 2 | **Capturas anonimizadas da Torre de Controle real**, somente com autorização da empresa | `torre-controle-expedicao` | Opcional |
| 3 | **Resultados medidos** de projetos reais, se existirem e puderem ser divulgados | campo `resultados` | Opcional |
| 4 | **Endereço final do site** (`SITE_URL`) e plataforma de hospedagem | `docs/PUBLICACAO.md` | Só para publicar |
| 5 | **Logotipos das instituições:** 7 de 8 enviados pelo painel. Quando possível, troque os que não vieram do site oficial ou do manual de marca da instituição | Painel → Instituições | Opcional |
| 6 | **Sites oficiais das instituições** (opcional, campo já existe) | Painel → Instituições | Opcional |
| 7 | **Revisão no Windows:** `npm run dev`, `npm run admin`, `npm run build` e `npm test` já foram executados por você com sucesso. Falta só `npm run dados` | — | Baixo |
| 8 | **Fase 2 do painel** (on-line, com login): depende da sua autorização e da criação de contas | `docs/PAINEL.md` | Futuro |

Os itens 2 e 3 aparecem no próprio site, na seção "Código e materiais" de cada estudo de caso, como "Informações pendentes". Quando resolver uma, apague o item em `pendencias`.

## Resolvidas

- **Atividade Flask:** link do repositório público (`github.com/vitorassis-tech/atividade_flask`) e quatro telas reais, capturadas com o próprio código do repositório rodando localmente e com os dados de exemplo do `database.sql`.
- **Banco de dados (SENAI Firjan):** tema (escola de música), SGBD (MySQL, informado no próprio script) e scripts enviados. Os scripts **não** foram copiados para o repositório; o site mostra descrição, diagrama gerado a partir do script e saídas reais das consultas. Para publicar os scripts, crie um repositório e adicione o link no projeto.

## Decisões aplicadas que alteraram textos do currículo

- O item do cargo atual sobre dashboards foi reescrito sem SQL, mencionando relatórios e arquivos operacionais exportados, Power Query e DAX. O Roadnet aparece como origem só no dashboard da Torre de Controle.
- O item sobre a Torre de Controle trocou "regras de contrato por transportadora" por "acompanhamento por transportadora" e passou a informar "em uso diário pela gerência". O motivo foi não mencionar regras contratuais.
- O posicionamento do rodapé passou de "Logística e Supply Chain, Análise de Dados e BI" para "Logística, Análise de Dados e BI", alinhado ao objetivo sem exclusividade por logística.

Se o seu currículo em Word ainda usar os textos antigos, vale atualizá-lo para manter a consistência.

## Sobre as demonstrações

- **Simulação da Torre de Controle**, **Painel de frota e entregas** e **Laboratório de roteirização** foram criados para este portfólio com apoio de IA generativa (isso está informado nas páginas). Antes de apresentá-los em entrevistas, estude o código (`dados-demo/`, `src/lib/kpis.ts`, `src/lib/roteirizacao.ts`, `src/scripts/`).
- Os indicadores das demonstrações são didáticos e independentes da Profarma: cobertura de frota, entregas por veículo em rota, taxa de expedição, tempo médio de pendência e farol com limites fictícios de 95% e 85%.
- A independência das quantidades fictícias foi verificada contra as quantidades reais que você informou, por um script mantido **fora** do repositório. Se mudar os dados fictícios, repita essa conferência.

## Limitações técnicas conhecidas

- **Navegadores:** os testes automatizados rodam só no Chromium. Firefox e Safari não estavam disponíveis no ambiente.
- **Leitores de tela reais** (NVDA, VoiceOver) não foram testados. Foram verificados a estrutura semântica, o axe e os anúncios dos gráficos.
- **Windows:** os comandos foram executados em Linux. O executor `scripts/python.mjs` foi feito para escolher `py`/`python` no Windows, mas não foi testado lá.
- O `robots.txt` só tem efeito na raiz do domínio. Em GitHub Pages com subpasta, o sitemap continua válido.
- Não há formulário de contato no site.
- O painel administrativo é **local** (Fase 1). Ele não edita o site já publicado; isso é a Fase 2.
- O painel não apaga arquivos de imagem antigos em `public/img/`. Imagens trocadas continuam na pasta até serem apagadas manualmente.
- A reordenação no painel é feita por botões (para cima e para baixo), não por arrastar.
- A lixeira e o histórico do painel (`.admin/`) ficam só no seu computador. O backup definitivo é o Git.
- O projeto "Torre de Controle Logística (visão executiva)" não foi incluído porque não consta no currículo.
