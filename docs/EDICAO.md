# Como editar o conteúdo

> **Forma recomendada: o painel administrativo.** Rode `npm run admin` e edite pelo navegador, com validação, lixeira e histórico. Veja [PAINEL.md](PAINEL.md).
>
> Esta página explica a edição **manual**. O conteúdo fica em **`src/content/*.json`**. Os arquivos em `src/data/*.ts` só carregam e validam esses JSON. Se algum dado ficar inválido, `npm run build` falha e mostra exatamente o campo com problema.

Todo o texto do site está em **`src/content/`** (arquivos JSON). Você não precisa mexer no HTML nem no CSS para atualizar informações. Depois de editar, salve o arquivo: com `npm run dev` rodando, o navegador atualiza sozinho.

> Dica: use o VS Code. Ele aponta erros de digitação (vírgula ou aspas faltando) em vermelho. Antes de publicar, rode `npm test`: os testes de conteúdo avisam se algo ficou inconsistente.

## Contatos (`src/content/contatos.json`)

Cada canal tem `"exibir": true` ou `"exibir": false`. No painel: **Contato** → canal → **Exibir no site**.

**Para exibir o telefone/WhatsApp** (somente se quiser):

```json
{
  "id": "telefone",
  "rotulo": "WhatsApp",
  "valor": "+55 21 9XXXX-XXXX",
  "href": "https://wa.me/55219XXXXXXXX",
  "exibir": true
}
```

Se fizer isso, ajuste também os testes que garantem o telefone oculto (`tests/unit/conteudo.test.ts`, bloco "privacidade e contato", e `tests/e2e/site.spec.ts`, teste "telefone não é publicado").

## Objetivo profissional (`src/content/site.json`)

O campo `objetivo` contém o texto aprovado. Se mudar o texto, atualize também o teste "E6" em `tests/unit/conteudo.test.ts`.

## Experiência, formação e cursos (`src/content/experiencias.json`, `formacao.json`, `cursos.json`, `instituicoes.json`, `marcos.json`)

- **Novo cargo:** adicione um objeto no início de `cargos` da empresa, com `"inicio": "AAAA-MM"` e `"fim": null` (cargo atual). Coloque a data de fim no cargo anterior.
- **Curso concluído:** troque `"status": "andamento"` por `"status": "concluido"` e ajuste `data` para o mês de conclusão.
- **Instituição:** cada curso aponta para o `id` de uma instituição em `instituicoes.json`. O logotipo oficial é enviado pelo painel (veja [PAINEL.md](PAINEL.md#logotipos-das-instituições)).
- **Telemetria de carreira (página inicial):** `marcos.json`. O site ordena por data automaticamente; as etapas com `"proxima": true` precisam ser as últimas. Títulos de até 28 caracteres e detalhes de até 70.

## Competências (`src/content/competencias.json`)

Cada competência tem `contexto` (`"trabalho"` ou `"formacao"`) e uma `evidencia`. O campo `href` é opcional e aponta para uma página do site.

## Projetos (`src/content/projetos.json`)

Cada projeto é um objeto com os campos do estudo de caso. Para **adicionar um projeto**:

1. Copie um bloco existente (do `{` até o `},`) e cole no lugar desejado da lista. **Mais simples: use o botão Novo projeto no painel.** A ordem da lista é a ordem na página Projetos. Os projetos em destaque na página inicial ficam em `projetosDestaque`, no arquivo `src/content/inicio.json` (ou no painel, em Página inicial).
2. Troque o `slug` (vira o endereço: `/projetos/seu-slug/`; use letras minúsculas, números e hífen).
3. Escolha a `natureza`. **Nunca** associe SQL às atividades na Profarma; os testes de conteúdo falham se isso acontecer.
   - `"trabalho"`: feito no emprego (não publique dados internos)
   - `"academico"`: feito em curso
   - `"demonstracao"`: dados fictícios (escreva "DADOS FICTÍCIOS" em `dados.origem`)
4. Em `resultados`, use `"tipo": "medido"` **somente** com medição real e autorizada. Para algo em uso real sem números, use `"uso"`. Para demonstrações, `"funcional"`. Para o que falta, `"pendente"`.
5. Defina `"status"`: `"publicado"`, `"rascunho"` (só aparece na prévia) ou `"arquivado"`.

A página do projeto é criada automaticamente.

### Adicionar uma imagem a um projeto

Pelo painel: abra o projeto, em **Imagem de capa** clique em **Escolher imagem**, descreva a imagem (texto alternativo) e salve. A imagem aparece no topo do estudo de caso.

Manualmente: salve o arquivo em `public/img/projetos/` (nome em minúsculas, sem espaços) e adicione ao projeto:

```json
"imagem": { "arquivo": "/img/projetos/atividade-flask.webp", "alt": "Tela inicial da Atividade Flask listando conteúdos cadastrados" }
```

Nunca use capturas com dados internos de empresas.

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
