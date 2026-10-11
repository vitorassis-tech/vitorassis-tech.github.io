# Painel administrativo (Fase 1: uso local)

O painel permite **criar, consultar, editar e excluir** todo o conteúdo do portfólio sem mexer em arquivos manualmente. Ele roda **somente no seu computador** e não precisa de conta, serviço externo nem dependência nova.

## Como abrir

No PowerShell, dentro da pasta do projeto:

```powershell
npm run admin
```

Aparecem dois endereços:

| Endereço | Para quê |
|---|---|
| **http://127.0.0.1:4330** | O painel |
| **http://localhost:4321** | Prévia do site, que mostra também os rascunhos (com aviso). Leva alguns segundos para abrir. Se a porta estiver ocupada (por exemplo, por um `npm run dev` aberto), a prévia usa a seguinte e o terminal avisa |

Para encerrar, pressione `Ctrl + C`. Se a porta estiver ocupada: `npm run admin -- --porta 4331`.

> As alterações feitas no painel ficam nos arquivos da pasta `src/content/`. Para guardar uma versão definitiva, faça um commit como sempre (`git add .` e `git commit -m "..."`).

## O que dá para editar

| Seção | Operações |
|---|---|
| Projetos | Criar, editar, mover para a lixeira, ordenar, status (publicado, rascunho, arquivado), imagem de capa |
| Experiência | Empresas e cargos, com atividades |
| Formação acadêmica e Cursos | Curso, instituição, situação, data e carga horária |
| **Instituições** | Nome, site e **logotipo oficial** (exibido ao lado dos cursos) |
| Competências | Grupos e competências, com evidência e link |
| Telemetria de carreira | Marcos da linha do tempo da página inicial (ordenados por data) |
| Página inicial | Título, apresentação, frentes, faixa de destaques e projetos em destaque |
| Dados gerais | Nome, cargo, objetivo profissional, descrição para buscadores |
| Contato | Canais (o telefone continua oculto até você marcar "Exibir") |

## Como cada operação funciona

**Consultar.** Lista com busca, filtro por status (em projetos) e botões para mover para cima ou para baixo. A ordem da lista é a ordem no site.

**Criar e editar.**
- Campos obrigatórios marcados com `*`, contador de caracteres e ajuda em cada campo.
- Validação enquanto você digita e de novo ao salvar, com resumo no topo. Cada item do resumo leva ao campo com problema.
- Campos alterados ficam marcados como **alterado**, e a barra inferior mostra quantas alterações não foram salvas.
- O botão **Salvar** só é liberado quando algo mudou. **Descartar alterações** volta aos valores salvos, com confirmação.
- Se você tentar sair da tela com alterações não salvas, o painel pergunta antes.
- Novos projetos começam como **Rascunho** e só aparecem no site depois de publicados.

**Excluir.**
1. **Mover para a lixeira** abre uma janela que mostra o que sai do site.
2. Para confirmar, é preciso **digitar o identificador** do item.
3. O item vai para a **Lixeira**, de onde pode ser restaurado na mesma posição.
4. **Excluir definitivamente** só existe dentro da Lixeira e pede uma nova confirmação digitada.
5. Se o item for usado em outra parte do site (por exemplo, um projeto nos destaques da página inicial, ou uma instituição usada por cursos), a exclusão é **bloqueada** e o painel mostra onde ele é usado.

**Histórico de versões.** Antes de cada gravação, a versão anterior da seção é guardada. Você pode restaurar qualquer uma, com confirmação, e a versão atual também vai para o histórico. São mantidas as 100 versões mais recentes de cada seção.

**Edição em duas abas.** Se o mesmo conteúdo for alterado em outro lugar (outra aba ou edição manual do arquivo), o painel **não sobrescreve**: ele avisa e oferece recarregar.

## Logotipos das instituições

1. Baixe o logotipo **oficial** no site da instituição (geralmente na área de imprensa ou de identidade visual).
2. No painel, abra **Instituições**, escolha a instituição e clique em **Escolher imagem**.
3. Clique em **Salvar alterações**.

- Formatos: PNG, JPG, WebP ou SVG, até 2 MB. SVGs com scripts ou links externos são recusados por segurança.
- Prefira arquivos quadrados ou com fundo transparente.
- Sem logotipo, o site mostra um **selo neutro** com um ícone genérico e o nome da instituição. O selo não imita a marca de ninguém.
- Muitas instituições têm regras de uso da marca. Senac e SENAI, por exemplo, publicam manuais de identidade visual. Respeite essas regras e, se tiver dúvida, consulte a instituição.

## Segurança

| Proteção | Como funciona |
|---|---|
| Acesso só local | O servidor escuta apenas em `127.0.0.1`. Outros aparelhos da rede não conseguem abrir. |
| Token da sessão | Cada início gera um token aleatório. Toda chamada à API precisa dele. Outros sites abertos no navegador não conseguem lê-lo nem usá-lo. |
| Endereço e origem conferidos | Requisições com `Host` ou `Origin` diferentes do painel são recusadas, o que protege contra *DNS rebinding* e CSRF. |
| Validação no servidor | O mesmo esquema do build do site (`src/lib/esquema.mjs`). Nada inválido é gravado. |
| Gravação segura | Arquivo temporário e troca atômica, uma gravação por vez. |
| Imagens | Tipo conferido pelo conteúdo real do arquivo, limite de 2 MB, nome gerado pelo sistema, SVG ativo bloqueado. |
| Interface | Política de segurança de conteúdo restritiva, sem `innerHTML` com dados e sem scripts de terceiros. |
| Build | Se algum dado estiver inválido, `npm run build` falha e mostra o problema. Nada quebrado é publicado. |

## Onde ficam os dados e o backup

- **Conteúdo:** `src/content/*.json`, versionado no Git.
- **Imagens enviadas:** `public/img/projetos/` e `public/img/instituicoes/`, também versionadas no Git.
- **Lixeira e histórico:** `.admin/lixeira/` e `.admin/historico/`. Ficam só no seu computador e estão no `.gitignore`.

O backup principal é o **Git**: faça commits regularmente. Para uma cópia extra, compacte a pasta do projeto (sem `node_modules`) uma vez por mês.

## Limitações conhecidas

- O painel funciona no computador onde o projeto está. Ele não edita o site já publicado na internet. Isso é a Fase 2.
- Não há edição simultânea por várias pessoas.
- Imagens trocadas ou removidas continuam em `public/img/` (o painel não apaga arquivos de imagem). Se quiser, apague manualmente as que não forem mais usadas.
- A reordenação é feita por botões (mover para cima ou para baixo), não por arrastar.

## Fase 2 (não implementada, depende da sua autorização)

Painel on-line em `/admin`, com login pela sua conta do GitHub, prévia de cada alteração e publicação automática. Exige criar contas gratuitas (GitHub e Cloudflare) e instalar o adaptador `@astrojs/cloudflare` (licença MIT, compatível com o Astro 7). O painel local continua funcionando.
