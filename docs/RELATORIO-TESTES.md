# Relatório de testes

**Última execução:** 11/10/2026, após o painel administrativo (Fase 1), a migração do conteúdo para JSON e os logotipos das instituições
**Ambiente:** container Linux na nuvem, Node 22.22, npm 10.9, Python 3.13, Chromium 141 (Playwright 1.56.1)
**Base:** versão E1–E16 (sobre o commit `6369885`), com as alterações ainda **não commitadas**

Neste relatório, "passou" significa que o teste **foi executado** e passou. O que não pôde ser executado está na seção "Não testado".

## Resumo

| Suíte | Comando | Resultado |
|---|---|---|
| Gerador de dados fictícios | `npm run test:dados` | **18 de 18 passaram** |
| Tipos TypeScript | `npm run typecheck` | **Sem erros** |
| Lógica, conteúdo, esquema, API do painel e `npm run admin` | `npm test` (Vitest, 6 arquivos) | **100 de 100 passaram** |
| Build de produção | `npm run build` | **12 páginas, sem erros** |
| Site no navegador | `npm run test:e2e` (Playwright + axe) | **56 de 56 passaram** |
| Painel no navegador | `npm run test:painel` (Playwright + axe) | **11 de 11 passaram** |
| Bateria completa | `npm run test:all` | **Código de saída 0** |
| Vulnerabilidades | `npm audit` | **0** (nenhuma dependência nova) |
| Lighthouse (celular, local) | Início e Sobre | **99 / 100 / 100 / 100** (desempenho, acessibilidade, boas práticas, SEO) |

## Migração do conteúdo para JSON: o site não mudou

O conteúdo saiu de `src/data/*.ts` e foi para `src/content/*.json`, gerado automaticamente a partir dos arquivos antigos para evitar erro de digitação. Antes de qualquer outra mudança, as 12 páginas geradas foram comparadas com a versão anterior, com o texto e a estrutura normalizados (desconsiderando só os nomes de arquivo com hash):

- **0 páginas diferentes**; `robots.txt` e `sitemap` idênticos.

Depois disso, só a página **Sobre** mudou, de propósito:
- Os selos das instituições nos cursos (neutros, enquanto não houver logotipo oficial).
- A correção de um erro de português na descrição para buscadores ("e à dashboards" → "e aos dashboards").

O campo `destaque` dos projetos, que não era usado em nenhuma página, foi substituído pela lista de projetos em destaque da página inicial, que agora é editável.

## Painel administrativo

### Comando `npm run admin` (Vitest, `tests/api/iniciar.test.ts`): 2 testes
Correção do erro relatado no Windows (`Cannot find module ...\node_modules\astro\astro.js`): o caminho do Astro agora é lido do `package.json` do próprio Astro (no Astro 7 é `bin/astro.mjs`).
- Sobe o painel **e a prévia de verdade**, confere que as duas respondem (página inicial e Sobre) e que `Ctrl + C` encerra os dois, sem processo sobrando.
- Com a porta da prévia ocupada (por exemplo, um `npm run dev` aberto), a prévia usa a porta seguinte e o terminal avisa.
- Executado no Linux. No Windows, a confirmação é a sua execução de `npm run admin`.

### API (Vitest, `tests/api/painel.test.ts`): 27 testes, sobre cópia temporária do conteúdo
- **Segurança:**
  - Recusa chamadas sem token ou com token errado (401).
  - Recusa `Host` diferente do endereço local, contra DNS rebinding (403), e `Origin` de outro site (403).
  - Exige JSON nas gravações (415).
  - Bloqueia caminhos como `/../package.json` e `/midia/img/../../`.
  - Serve a interface com política de segurança de conteúdo.
- **Criar:**
  - Grava projeto válido como rascunho.
  - Recusa dados inválidos com erro por campo **sem gravar nada** (arquivo idêntico byte a byte).
  - Recusa endereço repetido e gera identificador único.
  - Validação ao vivo sem gravar.
- **Atualizar:**
  - Registra a versão anterior no histórico.
  - **Detecta edição simultânea (409) e não sobrescreve.**
  - Impede mudar o endereço de um projeto usado em outra página.
  - Atualiza a página inicial e reordena listas.
- **Excluir:**
  - Exige confirmação digitada.
  - Envia para a lixeira e restaura na mesma posição.
  - Bloqueia item usado em outra parte (instituição usada por cursos).
  - Exclusão definitiva só com nova confirmação.
  - Restaura versão do histórico.
- **Imagens:**
  - Aceita PNG e SVG simples e associa o logotipo a uma instituição.
  - Recusa arquivo com conteúdo diferente do tipo declarado.
  - Recusa SVG com script, evento ou link externo.
  - Recusa pasta inválida, GIF e arquivo maior que 2 MB (413).

### Esquema (Vitest, `tests/unit/esquema.test.ts`): 16 testes
- Todo o conteúdo atual é válido.
- Obrigatórios, tamanhos e formato de endereço.
- Datas reais (rejeita 30/02 e mês 13) e curso concluído com data futura.
- Referências inexistentes; links `http://`, `javascript:` e páginas inexistentes.
- Coerência de datas entre empresa e cargos.
- Contatos: canal exibido sem dados e tipos repetidos.
- Imagem sem texto alternativo ou com caminho perigoso.
- Marcos fora de ordem.
- Normalização idempotente (o conteúdo atual não muda ao ser salvo de novo).

### Interface (Playwright, `tests/painel/painel.spec.ts`): 11 testes, sobre cópia temporária
1. **Consultar:** lista, busca, filtro por status, estado vazio, axe.
2. **Criar:**
   - Salvar vazio mostra o resumo de erros com foco, e os campos ficam com `aria-invalid`.
   - O link do resumo leva ao campo.
   - O endereço é gerado a partir do título.
   - O projeto é salvo como rascunho, aparece na lista e a URL muda para a edição.
3. **Atualizar:**
   - "Salvar" fica desativado sem alterações; o campo aparece marcado como "alterado" e a barra mostra "1 alteração não salva".
   - Sair da tela pede confirmação; cancelar mantém a edição.
   - Descartar volta ao valor salvo.
   - O valor salvo persiste após recarregar a página.
4. **Listas internas:** adicionar, mover e remover linhas, e salvar.
5. **Excluir:**
   - O botão só é liberado com o identificador exato.
   - Esc fecha a janela e devolve o foco.
   - axe com a janela aberta.
   - Vai para a lixeira e é restaurado.
6. **Excluir definitivamente:** só pela lixeira e com nova confirmação.
7. **Bloqueio:** projeto nos destaques mostra onde é usado e não oferece o botão de excluir.
8. **Histórico:** restaurar versão com confirmação.
9. **Logotipo:** envio, pré-visualização, salvamento e marcação "Com logotipo"; formato inválido recusado antes do envio.
10. **Conflito:** alteração feita "em outra aba" não é sobrescrita, e a tela oferece recarregar.
11. **Acessibilidade e celular:** axe no formulário de experiência; menu recolhível no celular; sem rolagem lateral em 375 px nas telas de lista, formulário, contato, lixeira e histórico.

### Status de publicação (verificação manual executada)
Numa cópia do projeto, um projeto foi marcado como **rascunho**:
- **Build normal:** 11 páginas, sem a página do rascunho; nenhum link para ele em nenhuma página (os links de outras páginas e competências que apontavam para ele foram ocultados automaticamente).
- **Build em modo prévia** (`PORTFOLIO_PREVIA=1`): a página aparece com o aviso "Prévia: Rascunho" e `noindex`.

### Problemas encontrados e corrigidos durante os testes do painel
- Seletor de arquivo de imagem sem rótulo para leitor de tela (apontado pelo axe).
- Rolagem lateral no celular: grade do layout, texto oculto para leitores de tela posicionado fora da tabela e títulos longos nos itens das listas.
- Menu ocupando a tela inteira no celular: virou um botão recolhível.
- Upload grande demais derrubava a conexão em vez de responder com uma mensagem clara: agora responde 413 com o texto "Imagens: até 2 MB".
- Links para projetos não publicados ficariam quebrados no site: agora são ocultados automaticamente.

## Histórico: execução anterior (correções E1–E16)

### O que cada suíte cobria na execução E1–E16

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

### Lighthouse da execução E1–E16

| Página | Desempenho | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Início | 99 | 100 | 100 | 100 | 1,8 s | 0 | 40 ms |
| Sobre | 99 | 100 | 100 | 100 | 2,0 s | 0,005 | 0 ms |
| Torre de Controle (estudo de caso) | 99 | 100 | 100 | 100 | 1,8 s | 0 | 0 ms |
| Simulação da Torre | 99 | 100 | 100 | 100 | 2,0 s | 0 | 0 ms |
| Painel de frota | 99 | 100 | 100 | 100 | 2,1 s | 0 | 0 ms |
| Laboratório | 99 | 100 | 100 | 100 | 2,0 s | 0 | 0 ms |

Na primeira medição, a página inicial teve desempenho 88 (TBT de 390 ms) por causa do `backdrop-filter` nos painéis. O efeito foi removido, e as duas medições seguintes deram 99. As simulações, o painel e o laboratório também foram medidos com o efeito ativo (99); não foram medidos de novo depois da remoção. Os valores são de laboratório. Os números reais dependem da hospedagem.

### Correções feitas durante os testes de E1–E16

1. Região rolável sem foco no laboratório (sequência de visitas), apontada pelo axe → recebeu `tabindex` e rótulo.
2. Teste de soma dos trechos lia uma tabela recolhida como vazia → passou a ler `textContent`.
3. Estilos de tabela da simulação vazavam para outras páginas → foram restritos ao componente.
4. Barra de navegação acinzentada sobre o fundo claro → ficou mais opaca.
5. Desempenho da página inicial abaixo de 90 → `backdrop-filter` removido.

## Não testado / limitações do ambiente

- **Painel no Windows:** `npm run admin` foi executado só em Linux. O servidor usa apenas recursos nativos do Node, e a prévia é iniciada sem depender do shell, mas isso só fica confirmado quando você rodar no seu PC.
- **Painel em Firefox e Safari:** não testado. O campo de mês usa o seletor nativo do navegador; no Firefox ele aparece como texto (formato AAAA-MM), com a mesma validação.

- **Firefox e Safari:** indisponíveis no ambiente; os testes rodaram só no Chromium.
- **Leitores de tela reais** (NVDA, VoiceOver): não testados.
- **Windows:** nada foi executado em Windows. As instruções estão no README, e o executor `scripts/python.mjs` foi preparado para `py`/`python`.
- **Core Web Vitals de campo:** só podem ser medidas com o site publicado.
- **Links externos** (LinkedIn, GitHub): o formato foi verificado, mas não foi feito acesso real.
