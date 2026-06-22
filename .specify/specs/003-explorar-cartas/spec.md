# Feature Specification: Explorar Cartas

**Feature Branch**: `[003-explorar-cartas]`

**Created**: 2026-06-08

**Status**: Ready for Implementation

**Input**: Conclusions from analysis: Explore must support search by text/code with combinable filters (coleção, Pokémon, tipo); user can add cards to Wishlist from Explore/detail; authentication is mandatory; Scanner must not add to Wishlist.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Buscar cartas por texto e código (Priority: P1)

Como usuário autenticado, quero pesquisar cartas por nome e código para encontrar rapidamente cartas específicas.

**Why this priority**: É o fluxo principal de descoberta e entrada para Wishlist.

**Independent Test**: Abrir Explorar, informar texto/código e validar que os resultados exibidos correspondem ao termo de busca.

**Acceptance Scenarios**:

1. **When** an authenticated user opens Explorar and enters a text query, **if** matching cards exist, **then** the system shall display only cards whose name or code matches the query.
2. **When** an authenticated user enters an empty query, **if** Explorar is loaded, **then** the system shall display the default discoverable list of cards.
3. **When** an authenticated user enters a query with mixed casing or extra spaces, **if** search is executed, **then** the system shall normalize the input before matching cards.

---

### User Story 2 - Filtrar por coleção, Pokémon e tipo (Priority: P1)

Como usuário autenticado, quero aplicar filtros por coleção, Pokémon e tipo para reduzir os resultados de forma precisa.

**Why this priority**: O valor de Explorar depende de filtros combináveis e verificáveis.

**Independent Test**: Aplicar filtros isolados e combinados e validar que cada resultado cumpre todos os critérios ativos.

**Acceptance Scenarios**:

1. **When** an authenticated user selects a coleção filter, **if** a card belongs to another collection, **then** the system shall exclude that card from results.
2. **When** an authenticated user selects a Pokémon filter, **if** a card is not from the selected Pokémon, **then** the system shall exclude that card from results.
3. **When** an authenticated user selects a tipo filter, **if** a card type does not match, **then** the system shall exclude that card from results.
4. **When** an authenticated user combines search and multiple filters, **if** a card fails any active criterion, **then** the system shall exclude that card from results.

---

### User Story 3 - Adicionar à Wishlist via Explorar (Priority: P2)

Como usuário autenticado, quero adicionar cartas à minha Wishlist a partir de Explorar e da tela de detalhe.

**Why this priority**: Converte descoberta em ação de coleção desejada no MVP.

**Independent Test**: Adicionar carta da lista e do detalhe; validar criação única/atualização sem duplicidade.

**Acceptance Scenarios**:

1. **When** an authenticated user taps "Adicionar à Wishlist" in Explorar, **if** the card is not in Wishlist, **then** the system shall create a new Wishlist item.
2. **When** an authenticated user taps "Adicionar à Wishlist" in Explorar, **if** the card already exists in Wishlist, **then** the system shall update the existing Wishlist item and shall not duplicate it.
3. **When** an authenticated user opens card detail from Explorar and adds to Wishlist, **if** save succeeds, **then** the card shall appear in the user Wishlist.
4. **When** a card comes from Scanner flow, **if** the user did not add from Explorar/detail, **then** the system shall not create Wishlist items from that scanner event.

---

### User Story 4 - Acessar detalhe da carta (Priority: P2)

Como usuário autenticado, quero abrir detalhes da carta para visualizar metadados antes de decidir adicionar à Wishlist.

**Why this priority**: Garante contexto de decisão e reduz erro de adição indevida.

**Independent Test**: Abrir detalhe a partir da lista e validar exibição mínima de metadados.

**Acceptance Scenarios**:

1. **When** an authenticated user taps a card in Explorar, **if** card data is available, **then** the system shall open card detail with image and core metadata.
2. **When** card detail is opened, **if** required metadata is missing, **then** the system shall show a graceful fallback and keep add-to-wishlist action available only when cardId is valid.

### Edge Cases

- What happens when no cards match search + filters? The system shall show an empty state with no stale results.
- What happens when catalog API is unavailable? The system shall show a friendly error and no write action shall occur.
- What happens when the same card appears in multiple variants? The system shall treat each cardId as unique wishlist reference.
- What happens when search input contains unsupported symbols? The system shall sanitize input and execute search safely.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: When an authenticated user searches in Explorar, the system MUST return cards matching name or code.
- **FR-002**: When filters (coleção, Pokémon, tipo) are active, the system MUST enforce all selected filters simultaneously.
- **FR-003**: When user adds a card to Wishlist from Explorar or card detail, the system MUST create or update a single Wishlist item for that card.
- **FR-004**: When a card is selected from results, the system MUST open a detail view with image and card metadata.
- **FR-005**: When no results match active criteria, the system MUST render an explicit empty state.
- **FR-006**: When catalog request fails, the system MUST show an error state and MUST not mutate Wishlist.
- **FR-007**: When protected Explore actions are accessed, the system MUST require an authenticated session.
- **FR-008**: Scanner-originated events MUST NOT add items to Wishlist unless action is triggered from Explorar/detail.

### Key Entities _(include if feature involves data)_

- **Card**: catálogo de carta; atributos mínimos: `id`, `nome`, `codigo`, `colecao`, `pokemon`, `tipo`, `imageUrl`.
- **ExploreFilter**: estado de filtros ativos; atributos mínimos: `query`, `colecao`, `pokemon`, `tipo`.
- **WishlistItem**: item salvo do usuário; atributos mínimos: `userId`, `cardId`, `createdAt`, `updatedAt`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In tests, 100% of displayed Explore results satisfy all active filters.
- **SC-002**: In tests, 100% of add-to-wishlist actions from Explorar/detail persist exactly one item per cardId.
- **SC-003**: In tests, 100% of search requests with trimmed/case-insensitive input produce normalized matching behavior.
- **SC-004**: In tests, 100% of no-result combinations render a deterministic empty state.
- **SC-005**: In tests, 0% of scanner-only events create Wishlist items.

## Assumptions

- Authentication (email/senha) is already implemented and required.
- Catalog data may come from external API or local dev backend behind `apiService/api.ts`.
- Explore writes only to Wishlist and does not mutate Estante directly.
- Scanner flow is out of scope for implementation here, except for non-regression on Wishlist behavior.
