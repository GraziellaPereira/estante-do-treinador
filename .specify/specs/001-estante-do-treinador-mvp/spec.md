# Feature Specification: Estante do Treinador MVP

**Feature Branch**: `[001-estante-do-treinador-mvp]`

**Created**: 2026-06-08

**Status**: Draft

**Input**: Conclusions from analysis: authentication is mandatory with email/password; Explore supports filters by collection, Pokémon, and type; Scanner uses image upload + OCR via API and, after explicit confirmation, adds the card to the user's Estante; Wishlist is unique and is not fed by Scanner; Profile manages nick, avatar, bio, and photo feed; Home shows only Estante and Coleções.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Explorar cartas com filtros combináveis (Priority: P1)

Como usuário autenticado, quero pesquisar cartas por nome, código, coleção, Pokémon e tipo para encontrar cartas específicas e adicionar cartas à minha Wishlist sem usar o Scanner.

**Why this priority**: This is the primary discovery flow and the entry point for the rest of the MVP.

**Independent Test**: Can be tested by opening Explorar, typing a search term, selecting one or more filters, and verifying that only cards matching every selected filter are shown.

**Acceptance Scenarios**:

1. **When** an authenticated user opens Explorar and enters a search term, **if** the catalog contains at least one matching card, **then** the system shall display only cards whose name or code matches the entered term.
2. **When** an authenticated user selects a collection filter in Explorar, **if** a card does not belong to the selected collection, **then** the system shall exclude that card from the result list.
3. **When** an authenticated user selects a Pokémon filter in Explorar, **if** a card does not correspond to the selected Pokémon, **then** the system shall exclude that card from the result list.
4. **When** an authenticated user selects a type filter in Explorar, **if** a card does not match the selected type, **then** the system shall exclude that card from the result list.
5. **When** an authenticated user combines search text with collection, Pokémon, or type filters, **if** a card fails any selected criterion, **then** the system shall exclude that card from the result list.
6. **When** an authenticated user taps "Adicionar à Wishlist" from Explorar or from a card detail screen, **if** the card is not already in the user's Wishlist, **then** the system shall create one new Wishlist item for that card.
7. **When** an authenticated user taps "Adicionar à Wishlist" from Explorar or from a card detail screen, **if** the card already exists in the user's Wishlist, **then** the system shall update the existing Wishlist item instead of creating a duplicate.

---

### User Story 2 - Escanear carta e adicionar à Estante (Priority: P1)

Como usuário autenticado, quero enviar uma foto de uma carta para que o OCR detecte o código, eu confirme o código reconhecido e a carta seja adicionada à minha Estante.

**Why this priority**: This is the core acquisition flow for moving a card into the user's collection.

**Independent Test**: Can be tested by uploading an image, receiving a detected code, confirming that code, and verifying that the card is added to the user's Estante without creating a Wishlist item.

**Acceptance Scenarios**:

1. **When** an authenticated user uploads a card image in Scanner, **if** the OCR service returns a code that matches the format letters-hyphen-number, **then** the system shall display the detected code in an editable confirmation field.
2. **When** an authenticated user uploads a card image in Scanner, **if** the OCR service returns a code that does not match the format letters-hyphen-number, **then** the system shall reject the code as invalid and require manual correction before continuing.
3. **When** an authenticated user uploads a card image in Scanner, **if** the OCR service cannot detect a code, **then** the system shall show a manual code entry field and shall not attempt to add the card automatically.
4. **When** an authenticated user confirms a valid code in Scanner, **if** the catalog API returns exactly one matching card, **then** the system shall create one new item in the user's Estante.
5. **When** an authenticated user confirms a valid code in Scanner, **if** the catalog API returns a matching card, **then** the system shall not create any Wishlist item for that scan.
6. **When** an authenticated user confirms a valid code in Scanner, **if** the catalog API returns no matching card, **then** the system shall show a not-found message and shall not create an Estante item.
7. **When** an authenticated user confirms a valid code in Scanner, **if** the OCR result is accepted, **then** the system shall require explicit user confirmation before querying the catalog.

---

### User Story 3 - Gerenciar uma Wishlist única (Priority: P2)

Como usuário autenticado, quero manter uma única Wishlist para organizar cartas que ainda não foram adicionadas à minha Estante.

**Why this priority**: This supports planning and collection goals after the discovery flow.

**Independent Test**: Can be tested by adding, editing, and removing a Wishlist item from Explorar or from the card detail screen and verifying that Scanner cannot add items to Wishlist.

**Acceptance Scenarios**:

1. **When** an authenticated user opens Wishlist, **if** the user already has saved items, **then** the system shall display exactly one Wishlist containing only that user's items.
2. **When** an authenticated user adds a card to Wishlist from Explorar or from the card detail screen, **if** the card is not already present, **then** the system shall create a new item with the selected card reference.
3. **When** an authenticated user adds a card to Wishlist from Explorar or from the card detail screen, **if** the card is already present, **then** the system shall update the existing item instead of creating a duplicate.
4. **When** an authenticated user edits a Wishlist item, **if** the new save has a later updatedAt timestamp, **then** the system shall keep the latest version as the stored value.
5. **When** an authenticated user removes a Wishlist item, **if** the item exists, **then** the system shall delete that item from the Wishlist.
6. **When** an authenticated user completes a Scanner flow, **if** the scan succeeds, **then** the system shall not add the scanned card to Wishlist.
7. **When** an authenticated user attempts to add a card to Wishlist from Scanner, **if** the action is triggered from Scanner, **then** the system shall block the action and direct the user to Explorar or card detail.

---

### User Story 4 - Gerenciar perfil e publicar fotos (Priority: P2)

Como usuário autenticado, quero editar meu nick, avatar e bio e publicar fotos no feed do meu perfil para personalizar minha conta.

**Why this priority**: Profile personalization is a core identity feature and is required by the MVP scope.

**Independent Test**: Can be tested by editing nick/avatar/bio, uploading a photo, and verifying that the changes and photo URL are persisted for the same user only.

**Acceptance Scenarios**:

1. **When** an authenticated user opens the Profile screen, **if** the user has saved profile data, **then** the system shall display the user's own nick, avatar, bio, and photo feed.
2. **When** an authenticated user updates nick, avatar, or bio, **if** the save operation succeeds, **then** the system shall persist the new values for that same user only.
3. **When** an authenticated user uploads a photo to the Profile feed, **if** the upload succeeds, **then** the system shall store the returned image URL in db.json and show the photo in the user's feed.
4. **When** an authenticated user opens another user's profile, **if** the route or link targets a different user, **then** the system shall deny access and show only the authenticated user's own profile.
5. **When** an authenticated user publishes a profile photo, **if** the upload succeeds, **then** the system shall not create a duplicate photo entry outside the user's own feed.

---

### User Story 5 - Navegar pela Home sem duplicar fotos (Priority: P3)

Como usuário autenticado, quero acessar a Home com apenas Estante e Coleções para navegar sem telas redundantes.

**Why this priority**: Home must reflect the new information architecture and avoid duplicated photo entry points.

**Independent Test**: Can be tested by opening Home and verifying that only Estante and Coleções are shown and that no "Minhas Fotos" entry exists.

**Acceptance Scenarios**:

1. **When** an authenticated user opens Home, **if** the navigation renders successfully, **then** the system shall display only Estante and Coleções.
2. **When** an authenticated user opens Home, **if** the UI renders navigation entries, **then** the system shall not display a "Minhas Fotos" tab or equivalent shortcut.
3. **When** an authenticated user selects Estante from Home, **if** the Estante screen is available, **then** the system shall navigate to the user's collection view.
4. **When** an authenticated user selects Coleções from Home, **if** the Coleções screen is available, **then** the system shall navigate to the collection browsing view.

### Edge Cases

- What happens when the OCR API returns multiple candidate codes? The system shall require the user to select one explicit code before continuing.
- How does the system handle a scan image with low confidence OCR? The system shall require manual code entry and shall not auto-add any card.
- What happens when the catalog API is unavailable during Explore or Scanner confirmation? The system shall show a failure message and shall not create or update any card entry.
- How does the system handle a profile photo upload that returns no URL? The system shall reject the save and shall not display the photo in the feed.
- What happens when the user has no Wishlist items? The system shall display an empty state and shall not show placeholder items.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: When an authenticated user opens Explorar and enters a search term, the system MUST return only cards whose name or code matches that term.
- **FR-002**: When a user applies collection, Pokémon, or type filters in Explorar, the system MUST exclude any card that does not satisfy every selected filter.
- **FR-003**: When a user taps "Adicionar à Wishlist" from Explorar or from card detail, the system MUST create or update a single Wishlist item for that card.
- **FR-004**: When an authenticated user uploads a card image in Scanner, the system MUST send the image to the OCR API and MUST wait for the OCR response.
- **FR-005**: When the OCR API returns a code, the system MUST display the code in an editable confirmation field and MUST wait for explicit user confirmation.
- **FR-006**: When a user confirms a valid code in Scanner, the system MUST query the catalog API and MUST add the matching card to the user's Estante only.
- **FR-007**: When the OCR API returns an invalid code or no code, the system MUST require manual correction or manual entry before continuing.
- **FR-008**: When a user adds or edits a Wishlist item, the system MUST persist the latest version using updatedAt as the conflict resolution field.
- **FR-009**: When an authenticated user opens Profile, the system MUST show only that user's own nick, avatar, bio, and photo feed.
- **FR-010**: When an authenticated user uploads a profile photo, the system MUST store the returned image URL in db.json and MUST display that photo in the user's feed.
- **FR-011**: When an authenticated user opens Home, the system MUST display only Estante and Coleções.
- **FR-012**: When a user attempts to add a scanned card to Wishlist from Scanner, the system MUST block the action.
- **FR-013**: When any protected feature is accessed, the system MUST require an authenticated email/password session.

### Key Entities _(include if feature involves data)_

- **User**: Represents the authenticated account owner; key attributes are id, email, password reference, nick, avatar URL, bio, and visibility scope limited to self.
- **Card**: Represents a Pokémon TCG card; key attributes are code, name, collection, Pokémon reference, type, and image URL.
- **EstanteItem**: Represents one card added to the user's collection; key attributes are userId, cardId, quantity, and createdAt.
- **WishlistItem**: Represents one card saved for later; key attributes are userId, cardId, quantity, note, status, updatedAt, and createdAt.
- **ProfilePhoto**: Represents a photo published by the user in the profile feed; key attributes are userId, imageUrl, caption, and createdAt.
- **ScanResult**: Represents one OCR scan attempt; key attributes are imageUrl, detectedCode, confirmationStatus, and resultState.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In automated tests, 100% of valid card search results returned by Explorar satisfy every active filter selected by the user.
- **SC-002**: In automated tests, 100% of Scanner flows require explicit user confirmation before catalog lookup.
- **SC-003**: In automated tests, 100% of confirmed Scanner successes create an EstanteItem and 0% create a WishlistItem.
- **SC-004**: In automated tests, 100% of profile photo uploads persist a URL and render that photo in the authenticated user's feed.
- **SC-005**: In automated tests, Home renders exactly two main navigation entries: Estante and Coleções.
- **SC-006**: In automated tests, the authenticated user's Profile screen never exposes another user's data.
- **SC-007**: In automated tests, Wishlist conflict resolution always keeps the item with the latest updatedAt value.

## Assumptions

- Users authenticate with email/password before accessing any protected feature.
- OCR is provided by an external API and is consumed through an abstraction layer.
- The catalog source is an external API or a local development backend exposed through the API service layer.
- Image uploads return a URL that can be persisted in db.json.
- The app remains a single-user-per-session experience on the Profile screen, and users cannot browse other users' profiles.
- The MVP does not include automatic OCR confirmation, offline sync, or multiple Wishlists.
