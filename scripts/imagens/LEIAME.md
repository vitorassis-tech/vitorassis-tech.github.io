# Imagens de fundo do portfólio (geradas por código)

As imagens de `public/img/fundos/` são originais, desenhadas em canvas por estes arquivos:

| Arquivo | Imagem |
|---|---|
| `globo.html` | Abertura: globo digital com rotas saindo do Rio de Janeiro |
| `mapa.html` | Contato: mapa-múndi de pontos com conexões |
| `armazem.html` | Sobre: centro de distribuição em perspectiva isométrica |
| `estrada.html` | Experiência: rodovia à noite com rastros de luz |
| `formacao.html` | Formação e Certificados: capelo e livros em traço luminoso |

O contorno dos continentes vem do Natural Earth (domínio público), via pacote `world-atlas`.
Não há texto nem marca d'água nas imagens.

Para gerar de novo (opcional, fora do projeto): em uma pasta separada, `npm i d3-geo world-atlas topojson-client sharp playwright-core`,
copie estes arquivos, rode `node pontos.mjs` e depois `node render.mjs globo.html saida.webp 2560 1440`
(ajuste o caminho do navegador em `render.mjs`).
