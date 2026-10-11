# Pendências e limitações conhecidas

Atualizado em 11/10/2026, após a implementação das correções E1 a E16.

## Informações e materiais que dependem de você

| # | Pendência | Onde aparece / onde editar | Impacto |
|---|---|---|---|
| 1 | **Link do repositório específico da Atividade Flask.** Sem ele, o site não afirma publicação no GitHub e o link aponta só para o perfil | `src/data/projetos.ts` (`atividade-flask`) e `src/data/competencias.ts` (Git e GitHub) | Médio |
| 2 | **Capturas de tela reais da Atividade Flask** | `public/img/projetos/` + `docs/EDICAO.md` | Médio |
| 3 | Se o professor deve ser **creditado nominalmente** na Atividade Flask | `atividade-flask` | Baixo |
| 4 | **Banco de dados (SENAI Firjan):** tema, imagem do DER, scripts SQL e qual SGBD foi usado. Hoje a página só mostra o que está no currículo, e o MySQL foi retirado do projeto | `banco-dados-relacional` | Médio |
| 5 | **Capturas anonimizadas da Torre de Controle real**, somente com autorização da empresa | `torre-controle-expedicao` | Opcional |
| 6 | **Resultados medidos** de projetos reais, se existirem e puderem ser divulgados | campo `resultados` | Opcional |
| 7 | **Endereço final do site** (`SITE_URL`) e plataforma de hospedagem | `docs/PUBLICACAO.md` | Só para publicar |
| 8 | **Revisão no seu computador Windows:** rodar `npm ci`, `npm run dev` e `npm run dados`, que não foram executados em Windows | — | Validação final |

Os itens 1, 2, 4, 5 e 6 aparecem no próprio site, na seção "Código e materiais" de cada estudo de caso, como "Informações pendentes". Quando resolver uma, apague o item em `pendencias`.

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
- Não há formulário de contato nem painel administrativo. O painel administrativo depende da sua aprovação da arquitetura (CMS baseado em Git) e da criação de contas, ainda não autorizadas.
- O projeto "Torre de Controle Logística (visão executiva)" não foi incluído porque não consta no currículo.
