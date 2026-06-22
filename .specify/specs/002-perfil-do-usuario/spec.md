# Feature Specification: Perfil do Usuário

**Feature Branch**: `[002-perfil-do-usuario]`

**Created**: 2026-06-08

**Status**: Draft

**Input**: Conclusions from analysis: the user can only view their own profile; profile includes nick, avatar, bio, and photo feed; photos are uploaded from the profile and stored as URLs; the Home screen must not contain a "Minhas Fotos" entry.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Visualizar meu próprio perfil (Priority: P1)

Como usuário autenticado, quero acessar apenas o meu próprio perfil para ver meus dados pessoais e meu feed de fotos.

**Why this priority**: The profile is the identity surface for the MVP and must always be private to the authenticated user.

**Independent Test**: Can be tested by opening the profile screen with one authenticated user and verifying that only that user's nick, avatar, bio, and photos are displayed.

**Acceptance Scenarios**:

1. **When** an authenticated user opens the Profile screen, **if** the session is valid, **then** the system shall display only that user's own nick, avatar, bio, and photo feed.
2. **When** an authenticated user opens a profile route or link that targets another user, **if** the target user is different from the authenticated user, **then** the system shall deny access and shall not expose the other user's data.
3. **When** an authenticated user has no saved profile data, **if** the Profile screen is opened, **then** the system shall show the user's own empty profile state and shall not show data from any other account.

---

### User Story 2 - Editar nick, avatar e bio (Priority: P1)

Como usuário autenticado, quero editar meu nick, avatar e bio para personalizar meu perfil.

**Why this priority**: Profile editing is a core MVP identity action and is required for account personalization.

**Independent Test**: Can be tested by changing nick, avatar, and bio, saving them, and reopening the profile to verify persistence for the same authenticated user.

**Acceptance Scenarios**:

1. **When** an authenticated user edits the nick, **if** the user confirms the change, **then** the system shall persist the new nick for that same user only.
2. **When** an authenticated user edits the avatar, **if** the upload succeeds and returns a URL, **then** the system shall persist that URL for that same user only.
3. **When** an authenticated user edits the bio, **if** the user confirms the change, **then** the system shall persist the new bio for that same user only.
4. **When** an authenticated user saves profile changes, **if** the persistence succeeds, **then** the system shall reflect the saved values on the next profile load.

---

### User Story 3 - Publicar fotos no feed do perfil (Priority: P2)

Como usuário autenticado, quero publicar fotos no feed do meu perfil para registrar conteúdo pessoal dentro da minha conta.

**Why this priority**: The photo feed is part of the personalized profile experience and depends on the profile area.

**Independent Test**: Can be tested by uploading a photo from the profile screen and verifying that the photo appears in the user's own feed after persistence.

**Acceptance Scenarios**:

1. **When** an authenticated user uploads a photo from the Profile screen, **if** the upload succeeds, **then** the system shall persist the returned image URL in the backend data store.
2. **When** an authenticated user uploads a photo from the Profile screen, **if** the upload succeeds, **then** the system shall display the uploaded photo in the authenticated user's feed.
3. **When** an authenticated user uploads a photo from the Profile screen, **if** the upload fails or returns no URL, **then** the system shall reject the publish action and shall not show the photo in the feed.

---

### User Story 4 - Navegar na Home sem atalho de fotos (Priority: P3)

Como usuário autenticado, quero acessar a Home com apenas Estante e Coleções para evitar navegação duplicada para fotos.

**Why this priority**: The information architecture must remain simple and must not duplicate the profile photo entry point.

**Independent Test**: Can be tested by opening Home and verifying that only Estante and Coleções are shown and that no "Minhas Fotos" entry exists.

**Acceptance Scenarios**:

1. **When** an authenticated user opens Home, **if** the navigation renders successfully, **then** the system shall display only Estante and Coleções.
2. **When** an authenticated user opens Home, **if** the navigation entries render, **then** the system shall not display a "Minhas Fotos" tab, button, or shortcut.

### Edge Cases

- What happens when the user tries to open another user's profile? The system shall deny access and show only the authenticated user's own profile.
- What happens when an avatar upload returns no URL? The system shall reject the save and shall not update the stored avatar.
- What happens when a profile photo upload fails after the file is selected? The system shall not create a feed entry and shall keep the existing feed unchanged.
- What happens when the user has no photos in the feed? The system shall show an empty state and shall not show placeholder photos.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: When an authenticated user opens the Profile screen, the system MUST display only that user's own nick, avatar, bio, and photo feed.
- **FR-002**: When an authenticated user opens a profile route or link that targets another user, the system MUST deny access and MUST not expose the other user's data.
- **FR-003**: When an authenticated user edits nick, avatar, or bio and confirms the change, the system MUST persist the updated values for that same user only.
- **FR-004**: When an authenticated user uploads a profile photo and the upload succeeds, the system MUST store the returned image URL in the backend data store.
- **FR-005**: When an authenticated user uploads a profile photo and the upload succeeds, the system MUST display the photo in the authenticated user's feed.
- **FR-006**: When a profile photo upload fails or returns no URL, the system MUST reject the publish action and MUST not display the photo in the feed.
- **FR-007**: When an authenticated user opens Home, the system MUST display only Estante and Coleções.
- **FR-008**: When an authenticated user opens Home, the system MUST not display a "Minhas Fotos" tab, button, or shortcut.
- **FR-009**: When any protected profile action is accessed, the system MUST require an authenticated email/password session.

### Key Entities _(include if feature involves data)_

- **User**: Represents the authenticated account owner; key attributes are id, email, password reference, nick, avatar URL, and bio.
- **ProfilePhoto**: Represents a photo published by the user in the profile feed; key attributes are userId, imageUrl, caption, and createdAt.
- **AuthSession**: Represents the authenticated session; key attributes are userId, token or session marker, and expiration state.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In automated tests, 100% of profile screen renders display only the authenticated user's own data.
- **SC-002**: In automated tests, 100% of attempts to open another user's profile are denied.
- **SC-003**: In automated tests, 100% of successful profile photo uploads persist a URL and render the photo in the feed.
- **SC-004**: In automated tests, 100% of Home renders display exactly two main navigation entries: Estante and Coleções.
- **SC-005**: In automated tests, 0% of Home renders display a "Minhas Fotos" entry.
- **SC-006**: In automated tests, 100% of profile save operations affect only the authenticated user's record.

## Assumptions

- Authentication by email/password is already available.
- The profile feed is private and visible only to the authenticated user.
- Profile photo uploads return a URL that can be persisted in `db.json`.
- The MVP does not include viewing other users' profiles or a public photo feed.
- The Home screen must remain reduced to Estante and Coleções only.
