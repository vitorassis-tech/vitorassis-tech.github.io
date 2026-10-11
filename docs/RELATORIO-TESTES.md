# Relatório de testes

**Data da execução:** 11/10/2026 (após a implementação das correções E1 a E16 e da nova identidade visual)
**Ambiente:** container Linux na nuvem, Node 22.22, npm 10.9, Python 3.13, Chromium 141 (Playwright 1.56.1)
**Base:** commit `6369885`, com as alterações ainda **não commitadas**

Neste relatório, "passou" significa que o teste **foi executado** e passou. O que não pôde ser executado está na seção "Não testado".

## Resumo

| Suíte | Comando | Resultado |
|---|---|---|
| Gerador de dados fictícios | `npm run test:dados` | **18 de 18 passaram** |
| Tipos TypeScript | `npm run typecheck` (`astro sync && tsc --noEmit`) | **Sem erros** |
| Lógica e conteúdo | `npm test` (Vitest) | **55 de 55 passaram** (3 arquivos) |
| Build de produção | `npm run build` | **12 páginas geradas, sem erros nem avisos** |
| Navegador (ponta a ponta) | `npm run test:e2e` (Playwright + axe) | **56 de 56 passaram** |
| Bateria completa | `npm run test:all` | **Código de saída 0** |
| Vulnerabilidades | `npm audit` | **0 vulnerabilidades** |
| Independência dos dados fictícios | script de verificação mantido **fora** do repositório | **Nenhuma coincidência** de quantidades de referência ou nomes reais |
| Desempenho, acessibilidade, SEO | Lighthouse 12.8 (emulação móvel, localhost) | Ver tabela abaixo |

## O que cada suíte cobre

### Python (`dados-demo/tests`): 18 testes
- Geração reprodutível, dias úteis e integridade referencial.
- Frota coerente: veículos em rota ≤ disponíveis e ≤ necessários.
- Entregas da frota batem com a tabela bruta; OTIF nunca excede os componentes.
- Cargas: programadas = expedidas + pendentes. Lista de pendências bate com o agregado. Dias sem pendência têm 0 horas.
- Existem dias sem pendência, o que garante que o estado vazio é exercitado.
- O resumo SQL (cobertura e entregas por veículo em rota) confere com o cálculo manual.
- Divisão por zero no SQL retorna nulo.
- Transportadoras com nomes genéricos (A a D).
- SQL, JSON e CSV sem termos de regras reais ("no-show", "spot", "máximo", "contrat…").
- Arquivos publicados com `simulado: true`, aviso "DADOS FICTÍCIOS" e parâmetros padrão 95/85 identificados como fictícios.

### Vitest (`tests/unit`): 55 testes
- **Indicadores:** cobertura de frota, entregas por veículo em rota, taxa de expedição, tempo médio de pendência e OTIF. Divisões por zero retornam `null`. Período sem pendências resulta em tempo médio `null`, não zero.
- **Farol:** padrão 95/85, classificação, **prioridade para Crítico**, limites exatos, indicadores sem dado ignorados, "sem dados" e validação dos limites informados.
- **Roteirização:** distância mínima entre pontos em 100 sementes com 5, 14 e 40 pontos. Trechos: N entregas geram N+1 trechos, e a soma é igual à distância total. O 2-opt nunca piora a rota.
- **Conteúdo (correções):**
  - E1: nenhum cargo na Profarma cita SQL, e o texto dos dashboards não generaliza o Roadnet.
  - E3: SQL aparece como formação.
  - E4: Torre com Roadnet e Excel, sem SQL, sem termos de regras e com "Em uso diário pela gerência."
  - E5: "Torre de Controle" não aparece como cargo ou etapa.
  - E6: objetivo idêntico ao aprovado.
  - E7: descrições de SEO sem SQL associado ao trabalho.
  - E8: nenhum texto afirma que uma demonstração reproduz o painel real.
  - E9: projetos e código das demonstrações sem termos de regras reais.
  - E11: arquivos marcados como fictícios.
  - E13: Atividade Flask sem afirmação de publicação.
  - E14: banco de dados sem MySQL.
  - Também verificados: privacidade (telefone oculto), links internos, datas e formatação.

### Playwright (`tests/e2e`): 56 testes
- **11 rotas** com status 200, um único `h1`, `title`, descrição, `canonical`, `lang="pt-BR"` e **sem erros no console**. A 404 responde com status 404. `robots.txt` e sitemap presentes. Todos os links internos respondem. Links externos usam `noopener`. Telefone não publicado.
- **Responsividade:** sem rolagem horizontal em **375, 430, 768, 1280 e 1440 px** em todas as rotas. O teste desativa o `overflow-x: clip` para não mascarar problemas.
- **Acessibilidade:** axe (WCAG 2.1 A/AA) sem violações sérias ou críticas nas 11 rotas e na 404. O primeiro Tab foca o link para pular ao conteúdo. O menu do celular abre, fecha com Esc e devolve o foco.
- **Movimento reduzido:** nenhuma animação roda na página inicial quando o visitante pede menos movimento.
- **Conteúdo:** a Experiência e as frentes "operação" e "dados" não citam SQL. A página da Torre cita Roadnet, Excel e uso diário, sem fórmulas, e tem link para a simulação. O objetivo aparece exato na página Sobre.
- **Filtros de projetos:** com 6 projetos, filtram, anunciam o resultado e persistem na URL. Sem JavaScript, tudo continua visível.
- **Painel de frota:**
  - Aviso visível, filtros funcionando e indicadores novos ("veíc." não aparece mais).
  - **A tabela confere com o resumo calculado pelo SQL** nas 4 transportadoras.
  - Gráficos navegáveis pelo teclado, com valores anunciados.
  - Mensagem clara quando os dados não carregam.
- **Simulação da Torre:**
  - Aviso visível que cita a Profarma; parâmetros "fictícios e ajustáveis"; faróis com texto.
  - Farol prioriza Crítico e reage aos limites ajustados.
  - Limite inválido mostra erro e mantém os últimos valores válidos.
  - **Estado sem pendências** mostra "Nenhuma carga pendente" e tempo médio "sem pendências".
  - Mensagem clara quando os dados não carregam.
- **Laboratório:**
  - Com **5, 14 e 40 pontos**, nos dois modos: o mapa tem N marcadores, a lista numerada tem N itens, os números do mapa vão de 1 a N, "Saída do CD" e "Retorno ao CD" aparecem sem número e há N+1 trechos.
  - A soma dos trechos é igual ao total, e novos pontos atualizam tudo.
  - Números do mapa com pelo menos 10,5 px de altura renderizada em tela de 375 px.

## Lighthouse (executado localmente, emulação móvel)

| Página | Desempenho | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Início | 99 | 100 | 100 | 100 | 1,8 s | 0 | 40 ms |
| Sobre | 99 | 100 | 100 | 100 | 2,0 s | 0,005 | 0 ms |
| Torre de Controle (estudo de caso) | 99 | 100 | 100 | 100 | 1,8 s | 0 | 0 ms |
| Simulação da Torre | 99 | 100 | 100 | 100 | 2,0 s | 0 | 0 ms |
| Painel de frota | 99 | 100 | 100 | 100 | 2,1 s | 0 | 0 ms |
| Laboratório | 99 | 100 | 100 | 100 | 2,0 s | 0 | 0 ms |

Na primeira medição, a página inicial teve desempenho 88 (TBT de 390 ms) por causa do `backdrop-filter` nos painéis. O efeito foi removido, e as duas medições seguintes deram 99. As simulações, o painel e o laboratório também foram medidos com o efeito ativo (99); não foram medidos de novo depois da remoção. Os valores são de laboratório. Os números reais dependem da hospedagem.

## Correções feitas durante os testes

1. Região rolável sem foco no laboratório (sequência de visitas), apontada pelo axe → recebeu `tabindex` e rótulo.
2. Teste de soma dos trechos lia uma tabela recolhida como vazia → passou a ler `textContent`.
3. Estilos de tabela da simulação vazavam para outras páginas → foram restritos ao componente.
4. Barra de navegação acinzentada sobre o fundo claro → ficou mais opaca.
5. Desempenho da página inicial abaixo de 90 → `backdrop-filter` removido.

## Não testado / limitações do ambiente

- **Firefox e Safari:** indisponíveis no ambiente; os testes rodaram só no Chromium.
- **Leitores de tela reais** (NVDA, VoiceOver): não testados.
- **Windows:** nada foi executado em Windows. As instruções estão no README, e o executor `scripts/python.mjs` foi preparado para `py`/`python`.
- **Core Web Vitals de campo:** só podem ser medidas com o site publicado.
- **Links externos** (LinkedIn, GitHub): o formato foi verificado, mas não foi feito acesso real.
