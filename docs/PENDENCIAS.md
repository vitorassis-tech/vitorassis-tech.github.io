# Pendências e limitações conhecidas

## Informações que dependem de você

| # | Pendência | Onde editar | Impacto |
|---|---|---|---|
| 1 | **Revisar o estudo de caso da Torre de Controle**: contexto, problema e se o painel já está em uso diário. O texto foi escrito com base no currículo e só afirma o que ele diz. | `src/data/projetos.ts` (`torre-controle-expedicao`) | Alto: é o projeto principal |
| 2 | Autorização da empresa para publicar **capturas anonimizadas** do painel (opcional) | idem + imagem em `public/img/` | Médio |
| 3 | **Resultados medidos** de projetos reais, se existirem e puderem ser divulgados | campo `resultados` | Médio |
| 4 | **Link do repositório da Atividade Flask** e uma captura de tela da aplicação | `atividade-flask` | Médio |
| 5 | **Tema do banco de dados do SENAI** (qual negócio foi modelado), imagem do DER e scripts SQL | `banco-dados-relacional` | Médio |
| 6 | Confirmar o **objetivo profissional** da página Sobre ("análise de dados e BI, de preferência em logística e supply chain") | `src/pages/sobre.astro` | Baixo |
| 7 | Confirmar os **canais de contato** exibidos (e-mail, LinkedIn e GitHub, que já estão no currículo). Telefone oculto por padrão. | `src/data/site.ts` | Baixo |
| 8 | **Foto profissional** (opcional). O site não depende de foto. | Ver `docs/EDICAO.md` | Baixo |
| 9 | **Currículo em PDF para download** (opcional). Não incluído porque o arquivo contém o telefone. Se quiser, gere uma versão sem telefone. | `public/` + link na página de contato | Baixo |
| 10 | Se o professor deve ser **creditado nominalmente** na Atividade Flask | `atividade-flask` | Baixo |
| 11 | **Endereço final** do site (`SITE_URL`) e plataforma de hospedagem | `docs/PUBLICACAO.md` | Necessário só para publicar |

## Sobre as demonstrações

- O **Painel de frota e entregas** e o **Laboratório de roteirização** foram criados para este portfólio, com apoio de IA generativa (isso está informado nas páginas). Antes de apresentá-los em entrevistas, vale estudar o código (`dados-demo/`, `src/lib/kpis.ts`, `src/lib/roteirizacao.ts`) para explicar com segurança cada decisão. A lógica de No-Show e Spot segue as regras que você definiu.
- A lista de pendências de cada projeto aparece **no próprio site**, na seção "Código e materiais". Quando resolver uma pendência, apague o item correspondente em `pendencias`.
- O portfólio ainda não tem um repositório público. Quando publicar, adicione o link "Ver o código-fonte" aos projetos de demonstração.

## Limitações técnicas conhecidas

- No celular, os números dos pontos no laboratório de roteirização ficam pequenos (o mapa encolhe proporcionalmente). A sequência completa está na lista "Sequência de visitas".
- O `robots.txt` só tem efeito na raiz do domínio. Em GitHub Pages com subpasta, o sitemap continua válido.
- Há só um idioma (pt-BR). Uma versão em inglês exigiria duplicar os textos em `src/data/`.
- Não há formulário de contato, de propósito: um formulário precisaria de serviço externo, e o briefing pede que nada seja conectado sem autorização. Se quiser um depois, o Formspree (plano gratuito) ou o Netlify Forms são opções sem backend próprio.
- O projeto "Torre de Controle Logística (visão executiva de entregas e fretes)" ficou fora porque não consta no currículo. Se for um trabalho real, ele pode ser incluído como projeto.
