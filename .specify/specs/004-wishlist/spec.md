# Feature Specification: Wishlist

**Feature Branch**: `[004-wishlist]`

**Created**: 2026-06-09

**Status**: Ready for Implementation

**Input**: Requisitos do MVP e fluxo de descoberta de cartas via Explorar.

## Visão geral

A Wishlist deve permitir ao treinador armazenar cartas de interesse em um espaço dedicado, acessível somente após login. A lista deve ser pessoal, persistente e atualizável, preservando a integridade de itens por `cardId`.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver minha Wishlist (Priority: P1)

Como usuário autenticado, quero ver minha lista de cartas desejadas para consultar rapidamente o que pretendo colecionar.

**Independent Test**: Abrir Wishlist e validar que apenas cartas do usuário autenticado são exibidas.

**Acceptance Scenarios**:

1. **When** um usuário autenticado abre a tela Wishlist, **then** o sistema deve listar somente os itens pertencentes ao usuário atual.
2. **When** a Wishlist estiver vazia, **then** o sistema deve exibir um estado vazio amigável.
3. **When** a requisição de wishlist falhar, **then** o sistema deve exibir uma mensagem de erro e oferecer tentativa de nova carga.

---

### User Story 2 - Remover carta da Wishlist (Priority: P1)

Como usuário autenticado, quero poder remover cartas da minha Wishlist para manter a lista atualizada somente com o que ainda interessa.

**Independent Test**: Remover um item e confirmar que ele desaparece da lista sem quebrar a exibição.

**Acceptance Scenarios**:

1. **When** o usuário selecionar remover em um item, **then** o sistema deve excluir o item da wishlist do usuário atual.
2. **When** a remoção falhar, **then** o sistema deve manter o item visível e exibir erro amigável.
3. **When** o usuário remove o último item, **then** o sistema deve mostrar o estado vazio.

---

### User Story 3 - Acessar detalhes a partir da Wishlist (Priority: P2)

Como usuário autenticado, quero abrir o detalhe de uma carta na Wishlist para revisar metadados antes de decidir manter ou remover.

**Independent Test**: Abrir detalhe de carta a partir da Wishlist e validar que a tela mostra metadados mínimos.

**Acceptance Scenarios**:

1. **When** o usuário tocar em um item da Wishlist, **then** o sistema deve navegar para o detalhe da carta correspondente.
2. **When** a carta do detalhe for inválida ou não existir mais no catálogo, **then** o sistema deve informar que o item não pôde ser carregado.

---

### User Story 4 - Persistência e privacidade da Wishlist (Priority: P2)

Como usuário autenticado, quero ter certeza de que minha Wishlist é salva apenas para mim e não aparece para outros treinadores.

**Independent Test**: Entrar com dois usuários diferentes e verificar que cada um vê apenas sua própria wishlist.

**Acceptance Scenarios**:

1. **When** o usuário A está autenticado, **then** ele não deve ver itens da wishlist do usuário B.
2. **When** a mesma carta for adicionada duas vezes em fluxos diferentes, **then** deve existir apenas um item por `cardId` para o usuário.

## Edge Cases

- Lista vazia deve renderizar estado de vazio em vez de erros.
- Se o backend retornar wishlist incompleta ou inconsistente, o app deve manter a interface estável e permitir reload.
- Se um item existir em wishlist mas não no catálogo atual, a Wishlist deve exibir uma linha com fallback e permitir remoção.
- A ação de remoção deve ser confirmada visualmente no fluxo de UI e não deve reexibir um item removido sem reload.

## Success Criteria

- **SC-001**: 100% dos itens exibidos em Wishlist pertencem ao `userId` autenticado.
- **SC-002**: 100% das remoções removem o item do backend e da interface sem duplicações.
- **SC-003**: 100% dos estados vazios exibem mensagem de ausência de itens.
- **SC-004**: 100% das ações de detalhe a partir da wishlist direcionam ao mesmo `cardId`.

## Assumptions

- Autenticação por email/senha já está funcionando.
- `WishlistService` e `CardDetail` existem ou podem ser adaptados.
- O backend de desenvolvimento (`json-server`) expõe o recurso `wishlist` com `userId` e `cardId`.
- O fluxo de adicionar à wishlist já está implementado em Explorar/Detalhe.
