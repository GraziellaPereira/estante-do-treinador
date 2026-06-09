---
description: "Task list for Perfil do Usuário"
---

# Tasks: Perfil do Usuário

**Input**: Design documents from `/specs/002-perfil-do-usuario/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), requirements.md

**Tests**: Não há suíte automática definida para este recorte; as tarefas abaixo incluem validações manuais e de persistência alinhadas aos outcomes EARS.

**Organization**: Tasks grouped by user story so the Perfil possa ser entregue, validado e demonstrado de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar a base compartilhada do Perfil e normalizar os pontos de integração que todas as histórias usarão.

- [ ] T001 [P] Criar a pasta de tipos `src/types/` e adicionar `src/types/profile.ts` com os contratos `User`, `ProfilePhoto` e `AuthSession`
- [ ] T002 [P] Criar a pasta de utilitários `src/utils/` e adicionar `src/utils/session.ts` para resolver a sessão autenticada e o usuário atual
- [ ] T003 [P] Criar a pasta de serviços `src/services/` e adicionar `src/services/ProfileService.ts` para leitura e escrita do perfil
- [ ] T004 [P] Criar `src/services/UploadService.ts` para centralizar upload de avatar e fotos do perfil
- [ ] T005 [P] Criar a pasta de componentes `src/components/` e adicionar `src/components/ProfileHeader.tsx` e `src/components/ProfilePhotoCard.tsx`
- [ ] T006 Normalizar `json-server/db.json` e `json-server/db.backup.json` para o esquema compartilhado de perfil, fotos e sessão
- [ ] T007 Atualizar `apiService/api.ts` para suportar os contratos do perfil e dos uploads, mantendo a base URL única
- [ ] T008 Atualizar `src/app/_layout.tsx` para registrar a rota `profile` no Expo Router, sem alterar as rotas existentes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Base crítica que precisa existir antes de qualquer user story do Perfil ser entregue.

**⚠️ CRITICAL**: Nenhuma história de usuário do Perfil deve começar antes desta fase estar completa.

- [ ] T009 [P] Ajustar `src/app/index.tsx` para persistir a sessão com identificador confiável do usuário autenticado, além do nome de exibição
- [ ] T010 [P] Ajustar `src/app/home.tsx` para remover dependências diretas do bloco "Minhas fotos" e preparar a navegação para o Perfil dedicado
- [ ] T011 [P] Estruturar `src/app/profile.tsx` como tela dedicada, com esqueleto de carregamento e proteção de acesso
- [ ] T012 Garantir que `src/utils/session.ts` rejeite sessão ausente ou inválida antes de qualquer leitura do Perfil

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Visualizar meu próprio perfil (Priority: P1) 🎯 MVP

**Goal**: Exibir apenas o perfil do próprio usuário autenticado, com nick, avatar, bio e feed de fotos.

**Independent Test**: Abrir `src/app/profile.tsx` com uma sessão válida e verificar que somente os dados do usuário autenticado aparecem; tentar carregar outro usuário e confirmar bloqueio.

### Implementation for User Story 1

- [ ] T013 [P] [US1] Implementar a leitura do usuário atual em `src/services/ProfileService.ts` a partir da sessão resolvida
- [ ] T014 [P] [US1] Implementar o cabeçalho do perfil em `src/components/ProfileHeader.tsx` para exibir nick, avatar e bio do usuário autenticado
- [ ] T015 [US1] Implementar a tela `src/app/profile.tsx` para carregar e renderizar apenas o perfil do usuário autenticado
- [ ] T016 [US1] Bloquear acesso a perfis de terceiros em `src/app/profile.tsx` usando a sessão e o identificador do usuário atual
- [ ] T017 [US1] Integrar `src/components/ProfilePhotoCard.tsx` na tela `src/app/profile.tsx` para exibir o feed do próprio usuário
- [ ] T018 [US1] Validar manualmente que a tela `src/app/profile.tsx` não mostra dados de outro usuário quando a rota recebe um identificador diferente

**Checkpoint**: User Story 1 deve ficar funcional e testável de forma independente.

---

## Phase 4: User Story 2 - Editar nick, avatar e bio (Priority: P1)

**Goal**: Permitir que o usuário autenticado edite nick, avatar e bio e tenha essas mudanças persistidas apenas para a própria conta.

**Independent Test**: Alterar nick, avatar e bio em `src/app/profile.tsx`, salvar e reabrir o perfil para confirmar persistência.

### Implementation for User Story 2

- [ ] T019 [P] [US2] Implementar os métodos de atualização de nick, avatar e bio em `src/services/ProfileService.ts`
- [ ] T020 [P] [US2] Implementar o fluxo de upload de avatar em `src/services/UploadService.ts` com retorno de URL válida
- [ ] T021 [US2] Adicionar o formulário de edição em `src/app/profile.tsx` para nick, avatar e bio
- [ ] T022 [US2] Persistir as alterações de perfil em `json-server/db.json` somente para o usuário autenticado
- [ ] T023 [US2] Garantir que `src/app/profile.tsx` recarregue os dados salvos após a confirmação da edição
- [ ] T024 [US2] Validar manualmente que editar o perfil não altera dados de outro usuário

**Checkpoint**: User Stories 1 e 2 devem funcionar de forma independente.

---

## Phase 5: User Story 3 - Publicar fotos no feed do perfil (Priority: P2)

**Goal**: Permitir upload de fotos no feed do Perfil, com persistência da URL retornada e exibição somente para o próprio usuário.

**Independent Test**: Enviar uma foto pelo Perfil, confirmar que a URL é persistida em `json-server/db.json` e verificar que a foto aparece no feed do mesmo usuário.

### Implementation for User Story 3

- [ ] T025 [P] [US3] Implementar a seleção e envio de foto do feed em `src/app/profile.tsx` usando `src/services/UploadService.ts`
- [ ] T026 [P] [US3] Implementar a persistência de `ProfilePhoto` em `src/services/ProfileService.ts` com `imageUrl`, `caption` e `createdAt`
- [ ] T027 [P] [US3] Renderizar as fotos publicadas em `src/components/ProfilePhotoCard.tsx`
- [ ] T028 [US3] Atualizar `json-server/db.json` para armazenar as fotos publicadas pelo usuário autenticado
- [ ] T029 [US3] Tratar falha de upload em `src/app/profile.tsx` mostrando mensagem amigável e sem criar item no feed
- [ ] T030 [US3] Validar manualmente que uma foto publicada aparece apenas no feed do usuário autenticado

**Checkpoint**: User Story 3 deve ficar funcional sem depender da Story 4.

---

## Phase 6: User Story 4 - Navegar na Home sem atalho de fotos (Priority: P3)

**Goal**: Remover a entrada duplicada de fotos da Home e manter apenas Estante e Coleções como entradas principais.

**Independent Test**: Abrir `src/app/home.tsx` e verificar que somente Estante e Coleções são exibidas, sem aba, botão ou atalho de "Minhas fotos".

### Implementation for User Story 4

- [ ] T031 [P] [US4] Remover a seção "Minhas fotos" de `src/app/home.tsx`
- [ ] T032 [US4] Garantir que `src/app/home.tsx` exiba somente as entradas `Estante` e `Coleções` na navegação principal
- [ ] T033 [US4] Atualizar textos, alertas e atalhos em `src/app/home.tsx` para não sugerirem navegação duplicada de fotos
- [ ] T034 [US4] Validar manualmente que a Home não renderiza nenhum atalho equivalente a "Minhas fotos"

**Checkpoint**: A Home deve refletir a nova arquitetura sem duplicação de fotos.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Ajustes que atravessam mais de uma user story e garantem consistência de entrega.

- [ ] T035 [P] Revisar `src/app/home.tsx` e `src/app/profile.tsx` para reduzir duplicação de lógica de fotos e sessão
- [ ] T036 [P] Revisar `apiService/api.ts`, `src/services/ProfileService.ts` e `src/services/UploadService.ts` para padronizar erros e respostas do backend
- [ ] T037 Atualizar a documentação de execução local, se necessário, em `.specify/specs/002-perfil-do-usuario/quickstart.md`
- [ ] T038 Confirmar que `json-server/db.json` e `json-server/db.backup.json` permanecem coerentes após as mudanças do Perfil

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - May reuse Story 1 services, but remains independently testable.
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - May reuse Story 1 profile shell, but remains independently testable.
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Independent of the profile editing and photo publishing flow.

### Within Each User Story

- Models/types before services
- Services before screen composition
- Screen composition before final validation
- Story complete before moving to the next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- All Foundational tasks marked [P] can run in parallel.
- Once Foundation is complete, Story 1, Story 2, Story 3 and Story 4 can start in parallel if the team has capacity.
- All tasks marked [P] within the same story can run in parallel when they touch different files.

---

## Parallel Example: User Story 1

```bash
Task: "Implementar a leitura do usuário atual em src/services/ProfileService.ts"
Task: "Implementar o cabeçalho do perfil em src/components/ProfileHeader.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. STOP and VALIDATE: confirm that only the authenticated user's profile is displayed

### Incremental Delivery

1. Complete Setup + Foundational
2. Add User Story 1 and validate access restriction
3. Add User Story 2 and validate persistence
4. Add User Story 3 and validate photo publishing
5. Add User Story 4 and validate Home simplification

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together.
2. Once Foundation is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
   - Developer D: User Story 4
3. Polish tasks are executed after the user stories stabilize.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Each user story is independently completable and testable.
- Avoid reintroducing a duplicate photo entry in Home; the Profile screen is the single photo surface for the user.
- Keep all new identifiers and component names in Portuguese and PascalCase, per constitution.
