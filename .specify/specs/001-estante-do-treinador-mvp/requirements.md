# Requirements — Estante do Treinador MVP

**Feature**: Estante do Treinador MVP

**Spec Source**: `.specify/specs/001-estante-do-treinador-mvp/spec.md`

**Status**: Draft

## 1. Escopo funcional

Este documento consolida os requisitos do MVP para as áreas:

- Explorar
- Scanner
- Wishlist
- Perfil
- Home

O MVP pressupõe autenticação obrigatória por email/senha para qualquer funcionalidade protegida.

---

## 2. Requisitos funcionais em padrão EARS

### RF-EARS-001 — Busca de cartas em Explorar

- **Condição**: quando um usuário autenticado estiver na tela Explorar.
- **Gatilho**: quando o usuário informar um termo de busca.
- **Resposta**: o sistema deve retornar somente cartas cujo nome ou código corresponda ao termo informado.

### RF-EARS-002 — Filtros combináveis em Explorar

- **Condição**: quando um usuário autenticado estiver na tela Explorar.
- **Gatilho**: quando o usuário selecionar um ou mais filtros de coleção, Pokémon ou tipo.
- **Resposta**: o sistema deve exibir somente cartas que satisfaçam simultaneamente todos os filtros selecionados.

### RF-EARS-003 — Ação de adicionar à Wishlist em Explorar

- **Condição**: quando um usuário autenticado visualizar uma carta em Explorar ou na tela de detalhe da carta.
- **Gatilho**: quando o usuário tocar na ação "Adicionar à Wishlist".
- **Resposta**: o sistema deve criar um item na Wishlist quando a carta ainda não existir na Wishlist do usuário, ou deve atualizar o item existente quando a carta já estiver salva.

### RF-EARS-004 — Upload de imagem no Scanner

- **Condição**: quando um usuário autenticado estiver na tela Scanner.
- **Gatilho**: quando o usuário enviar uma imagem de carta.
- **Resposta**: o sistema deve enviar a imagem para o serviço de OCR e deve aguardar a resposta do OCR antes de avançar.

### RF-EARS-005 — Confirmação do código detectado pelo OCR

- **Condição**: quando o serviço de OCR retornar um código detectado.
- **Gatilho**: quando a resposta do OCR for recebida pelo aplicativo.
- **Resposta**: o sistema deve exibir o código em um campo editável e deve aguardar confirmação explícita do usuário antes de consultar o catálogo.

### RF-EARS-006 — Validação do formato do código

- **Condição**: quando o OCR retornar um código para confirmação.
- **Gatilho**: quando o código informado não obedecer ao formato letras-hífen-número.
- **Resposta**: o sistema deve rejeitar o código como inválido e deve exigir correção manual antes de continuar.

### RF-EARS-007 — Falha total ou parcial do OCR

- **Condição**: quando o serviço de OCR não detectar um código ou retornar múltiplas opções sem seleção final.
- **Gatilho**: quando a resposta do OCR for insuficiente para determinar um único código confirmado.
- **Resposta**: o sistema deve exibir entrada manual de código e não deve tentar adicionar a carta automaticamente.

### RF-EARS-008 — Adição à Estante pelo Scanner

- **Condição**: quando um usuário autenticado confirmar um código válido no Scanner.
- **Gatilho**: quando a confirmação explícita do usuário for submetida.
- **Resposta**: o sistema deve consultar o catálogo e deve adicionar a carta correspondente à Estante do usuário apenas uma vez.

### RF-EARS-009 — Bloqueio de Wishlist via Scanner

- **Condição**: quando um usuário autenticado concluir um fluxo válido no Scanner.
- **Gatilho**: quando o fluxo de Scanner for finalizado com sucesso.
- **Resposta**: o sistema não deve criar item de Wishlist a partir do Scanner.

### RF-EARS-010 — Wishlist única

- **Condição**: quando um usuário autenticado abrir a tela Wishlist.
- **Gatilho**: quando houver itens salvos para esse usuário.
- **Resposta**: o sistema deve exibir exatamente uma Wishlist contendo somente itens do usuário autenticado.

### RF-EARS-011 — CRUD de Wishlist por Explorar e detalhe

- **Condição**: quando um usuário autenticado visualizar uma carta em Explorar ou na tela de detalhe.
- **Gatilho**: quando o usuário adicionar, editar ou remover um item da Wishlist.
- **Resposta**: o sistema deve persistir a alteração na Wishlist e deve impedir duplicação de itens da mesma carta.

### RF-EARS-012 — Resolução de conflito Last Write Wins na Wishlist

- **Condição**: quando dois estados de um mesmo item de Wishlist competirem pela persistência.
- **Gatilho**: quando uma nova gravação for recebida com `updatedAt` diferente.
- **Resposta**: o sistema deve manter como valor persistido o estado com o `updatedAt` mais recente.

### RF-EARS-013 — Perfil restrito ao próprio usuário

- **Condição**: quando um usuário autenticado abrir a tela Perfil.
- **Gatilho**: quando o perfil do usuário for carregado.
- **Resposta**: o sistema deve exibir somente os dados do próprio usuário autenticado: `nick`, `avatar`, `bio` e feed de fotos.

### RF-EARS-014 — Atualização de perfil

- **Condição**: quando um usuário autenticado editar `nick`, `avatar` ou `bio`.
- **Gatilho**: quando o usuário confirmar a alteração.
- **Resposta**: o sistema deve persistir os novos valores somente para a conta do usuário autenticado.

### RF-EARS-015 — Publicação de fotos no perfil

- **Condição**: quando um usuário autenticado estiver na tela Perfil.
- **Gatilho**: quando o usuário enviar uma foto para o feed.
- **Resposta**: o sistema deve salvar a URL retornada pelo upload em `db.json` e deve exibir a foto no feed do próprio usuário.

### RF-EARS-016 — Home com navegação reduzida

- **Condição**: quando um usuário autenticado abrir a tela Home.
- **Gatilho**: quando a navegação principal for renderizada.
- **Resposta**: o sistema deve exibir somente as entradas `Estante` e `Coleções`.

### RF-EARS-017 — Remoção de Minhas Fotos da Home

- **Condição**: quando um usuário autenticado abrir a tela Home.
- **Gatilho**: quando os itens de navegação forem renderizados.
- **Resposta**: o sistema não deve exibir aba, botão ou atalho equivalente a `Minhas Fotos`.

### RF-EARS-018 — Controle de acesso por autenticação

- **Condição**: quando qualquer funcionalidade protegida for acessada.
- **Gatilho**: quando não houver sessão autenticada válida.
- **Resposta**: o sistema deve impedir o acesso e deve exigir autenticação por email/senha.

---

## 3. Requisitos não funcionais em padrão EARS

### RNF-EARS-001 — Normalização de códigos

- **Condição**: quando o usuário informar um código de carta em qualquer fluxo.
- **Gatilho**: quando o código for processado pelo aplicativo.
- **Resposta**: o sistema deve normalizar o valor para maiúsculas e remover espaços antes de consultar catálogo ou OCR.

### RNF-EARS-002 — Tratamento de falha de catálogo

- **Condição**: quando a API de catálogo estiver indisponível.
- **Gatilho**: quando o aplicativo tentar buscar ou confirmar uma carta.
- **Resposta**: o sistema deve exibir mensagem de falha e não deve criar nem atualizar itens de Estante, Wishlist ou Perfil relacionados àquela operação.

### RNF-EARS-003 — Tratamento de upload sem URL

- **Condição**: quando um upload de imagem de perfil ou avatar terminar sem URL válida.
- **Gatilho**: quando o backend retornar resposta inválida ou incompleta.
- **Resposta**: o sistema deve rejeitar a gravação e não deve exibir a imagem no feed ou no avatar do usuário.

### RNF-EARS-004 — Visibilidade de dados de terceiros

- **Condição**: quando um usuário autenticado tentar acessar conteúdo de outro usuário.
- **Gatilho**: quando a navegação ou a API apontar para um identificador diferente do usuário autenticado.
- **Resposta**: o sistema deve negar a visualização e deve retornar apenas os dados do próprio usuário autenticado.

### RNF-EARS-005 — OCR por API externa

- **Condição**: quando o fluxo Scanner for executado.
- **Gatilho**: quando uma imagem de carta for enviada.
- **Resposta**: o sistema deve usar um serviço de OCR via API e não deve executar OCR on-device no MVP.

### RNF-EARS-006 — Upload de imagens com persistência de URL

- **Condição**: quando uma imagem de avatar ou foto de perfil for enviada.
- **Gatilho**: quando o upload for bem-sucedido.
- **Resposta**: o sistema deve persistir somente a URL retornada no armazenamento do backend de desenvolvimento.

---

## 4. Entidades de dados

### User

- Representa a conta autenticada do usuário.
- Atributos mínimos: `id`, `email`, `passwordRef`, `nick`, `avatarUrl`, `bio`.

### Card

- Representa uma carta do catálogo Pokémon TCG.
- Atributos mínimos: `code`, `name`, `collection`, `pokemon`, `type`, `imageUrl`.

### EstanteItem

- Representa uma carta adicionada à coleção do usuário.
- Atributos mínimos: `userId`, `cardId`, `quantity`, `createdAt`.

### WishlistItem

- Representa uma carta salva para intenção futura.
- Atributos mínimos: `userId`, `cardId`, `quantity`, `note`, `status`, `createdAt`, `updatedAt`.

### ProfilePhoto

- Representa uma foto publicada pelo usuário no feed do perfil.
- Atributos mínimos: `userId`, `imageUrl`, `caption`, `createdAt`.

### ScanResult

- Representa uma tentativa de leitura OCR.
- Atributos mínimos: `imageUrl`, `detectedCode`, `confirmationStatus`, `resultState`.

---

## 5. Critérios mensuráveis de aceitação

### CA-001

100% das cartas apresentadas em Explorar devem satisfazer todos os filtros ativos.

### CA-002

100% dos fluxos Scanner devem exigir confirmação explícita antes de consultar o catálogo.

### CA-003

100% dos scans confirmados com sucesso devem criar somente um item de Estante e nunca criar item de Wishlist.

### CA-004

100% dos uploads de foto de perfil bem-sucedidos devem persistir uma URL e renderizar a foto no feed do usuário autenticado.

### CA-005

100% das renderizações da Home devem exibir somente Estante e Coleções.

### CA-006

100% das tentativas de acesso ao Perfil de outro usuário devem ser bloqueadas.

### CA-007

100% dos conflitos de Wishlist devem ser resolvidos pelo maior `updatedAt`.

---

## 6. Dependências explícitas

- Autenticação por email/senha deve estar disponível.
- O catálogo deve ser acessível por API externa ou backend local compatível com `apiService/api.ts`.
- O OCR deve ser acessível via API externa.
- O backend de desenvolvimento deve aceitar upload de imagens e retornar URLs persistíveis em `db.json`.
- O MVP deve manter a navegação reduzida da Home com apenas `Estante` e `Coleções`.
