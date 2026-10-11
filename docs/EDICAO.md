# Como editar o conteúdo

Todo o texto do site está em **`src/data/`**. Você não precisa mexer no HTML nem no CSS para atualizar informações. Depois de editar, salve o arquivo: com `npm run dev` rodando, o navegador atualiza sozinho.

> Dica: use o VS Code. Ele aponta erros de digitação (vírgula ou aspas faltando) em vermelho. Antes de publicar, rode `npm test`: os testes de conteúdo avisam se algo ficou inconsistente.

## Contatos (`src/data/site.ts`)

Cada canal tem `exibir: true` ou `exibir: false`.

**Para exibir o telefone/WhatsApp** (somente se quiser):

```ts
{
  id: 'telefone',
  rotulo: 'WhatsApp',
  valor: '+55 21 9XXXX-XXXX',
  href: 'https://wa.me/55219XXXXXXXX',
  exibir: true,
},
```

Se fizer isso, ajuste também os testes que garantem o telefone oculto (`tests/unit/conteudo.test.ts`, bloco "privacidade e contato", e `tests/e2e/site.spec.ts`, teste "telefone não é publicado").

## Objetivo profissional (`src/data/site.ts`)

O campo `objetivo` contém o texto aprovado. Se mudar o texto, atualize também o teste "E6" em `tests/unit/conteudo.test.ts`.

## Experiência, formação e cursos (`src/data/trajetoria.ts`)

- **Novo cargo:** adicione um objeto no início de `cargos` da empresa, com `inicio: 'AAAA-MM'` e `fim: null` (cargo atual). Coloque a data de fim no cargo anterior.
- **Curso concluído:** troque `status: 'andamento'` por `status: 'concluido'` e ajuste `data` para o mês de conclusão.
- **Telemetria de carreira (página inicial):** lista `marcos`. Mantenha a ordem cronológica e deixe os itens com `proxima: true` no fim. Use títulos curtos (até ~22 caracteres) e detalhes de até ~60 caracteres para não quebrar o layout.

## Competências (`src/data/competencias.ts`)

Cada competência tem `contexto` (`'trabalho'` ou `'formacao'`) e uma `evidencia`. O campo `href` é opcional e aponta para uma página do site.

## Projetos (`src/data/projetos.ts`)

Cada projeto é um objeto com os campos do estudo de caso. Para **adicionar um projeto**:

1. Copie um bloco existente (do `{` até o `},`) e cole no lugar desejado da lista. A ordem da lista é a ordem na página Projetos. Os projetos em destaque na página inicial são escolhidos pela lista `SLUGS_DESTAQUE`, no início de `src/pages/index.astro`.
2. Troque o `slug` (vira o endereço: `/projetos/seu-slug/`; use letras minúsculas, números e hífen).
3. Escolha a `natureza`. **Nunca** associe SQL às atividades na Profarma; os testes de conteúdo falham se isso acontecer.
   - `'trabalho'`: feito no emprego (não publique dados internos)
   - `'academico'`: feito em curso
   - `'demonstracao'`: dados fictícios (escreva "DADOS FICTÍCIOS" em `dados.origem`)
4. Em `resultados`, use `tipo: 'medido'` **somente** com medição real e autorizada. Para algo em uso real sem números, use `'uso'`. Para demonstrações, `'funcional'`. Para o que falta, `'pendente'`.
5. Use `pendencias: []` quando não houver nada pendente.

A página do projeto é criada automaticamente.

### Adicionar uma imagem a um projeto

1. Salve a imagem em `public/img/projetos/` (ex.: `atividade-flask.webp`). Prefira WebP ou PNG com até ~1600 px de largura.
2. No arquivo `src/pages/projetos/[slug].astro`, dentro da seção desejada, adicione:

```astro
<img src={url('/img/projetos/atividade-flask.webp')} alt="Tela inicial da Atividade Flask listando conteúdos cadastrados" width="1600" height="900" loading="lazy" />
```

Sempre escreva um `alt` que descreva o que a imagem mostra. Para fazer isso de forma genérica para todos os projetos, adicione um campo `imagem?: { src: string; alt: string }` ao tipo `Projeto` e renderize-o na página.

## Cores e fontes (`src/styles/global.css`)

As cores ficam no início do arquivo. As áreas claras de leitura usam `--navy`, `--ink`, `--muted` e `--accent`; as faixas escuras de comando usam os tokens `--cmd-*`, `--signal` e `--trace`. Dentro das classes `.cmd` e `.console`, os tokens claros são remapeados automaticamente para versões de alto contraste. O laranja `--accent` (#E58A2B) é usado só em elementos gráficos; para **texto** laranja use `--accent-ink`, que tem contraste suficiente. Ao mudar cores, rode `npm run test:e2e`: o teste de acessibilidade (axe) acusa contraste insuficiente.

## Dados fictícios

Para mudar a operação fictícia (número de dias, transportadoras, regiões, frota de referência), edite as constantes no topo de `dados-demo/gerar_dados.py` e rode os comandos abaixo. Não use quantidades, nomes ou regras reais de nenhuma empresa: os testes bloqueiam termos de regras reais, mas a conferência de quantidades reais precisa ser feita por você.

Os limites padrão do farol da simulação (95% e 85%) ficam em `PARAMETROS_FAROL` (`gerar_dados.py`) e em `LIMITES_PADRAO` (`src/lib/kpis.ts`). São parâmetros didáticos fictícios.

```bash
npm run dados
npm run test:dados
```

## Imagem de compartilhamento (LinkedIn, WhatsApp)

O texto fica em `scripts/gerar-og.mjs`. Depois de editar, rode `npm run og`.
