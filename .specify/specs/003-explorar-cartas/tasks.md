---
description: "Task list for Explorar Cartas"
---

# Tasks: Explorar Cartas

**Input**: Design documents from `/specs/003-explorar-cartas/`

**Prerequisites**: plan.md, spec.md, requirements.md

**Tests**: Sem suíte obrigatória no momento; incluir validações manuais por story.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 [P] Criar `src/types/explore.ts` com `Card`, `ExploreFilter`, `WishlistItem`
- [ ] T002 [P] Criar `src/services/CatalogService.ts` com consulta de catálogo e aplicação de filtros
- [ ] T003 [P] Criar `src/services/WishlistService.ts` com upsert por `cardId`
- [ ] T004 [P] Criar `src/utils/BuscaUtils.ts` para normalização de consulta e utilitários de filtro
- [ ] T005 Ajustar `src/app/_layout.tsx` para registrar `explore` e `card-detail`

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T006 Ajustar `json-server/db.json` para garantir campos de `colecao`, `pokemon`, `tipo` no catálogo
- [ ] T007 Ajustar `json-server/db.json` para estrutura de Wishlist por `userId` + `cardId`
- [ ] T008 Ajustar `src/app/home.tsx` para abrir Explorar sem alerta “Em breve” no item correspondente

## Phase 3: User Story 1 - Buscar cartas por texto e código (Priority: P1)

- [ ] T009 [P] [US1] Criar tela `src/app/explore.tsx` com campo de busca
- [ ] T010 [US1] Implementar listagem de resultados em `src/app/explore.tsx`
- [ ] T011 [US1] Aplicar normalização (trim/case-insensitive) via `src/utils/BuscaUtils.ts`
- [ ] T012 [US1] Validar manualmente busca por nome/código e estado vazio

## Phase 4: User Story 2 - Filtrar por coleção, Pokémon e tipo (Priority: P1)

- [ ] T013 [P] [US2] Implementar controles de filtro em `src/app/explore.tsx`
- [ ] T014 [US2] Aplicar filtros combináveis no fluxo do `src/services/CatalogService.ts`
- [ ] T015 [US2] Garantir estado vazio consistente para combinações sem resultado
- [ ] T016 [US2] Validar manualmente filtros isolados e combinados

## Phase 5: User Story 3 - Adicionar à Wishlist via Explorar (Priority: P2)

- [ ] T017 [P] [US3] Adicionar ação “Adicionar à Wishlist” na lista de `src/app/explore.tsx`
- [ ] T018 [P] [US3] Implementar detalhe de carta em `src/app/card-detail.tsx` com ação de Wishlist
- [ ] T019 [US3] Implementar upsert de wishlist no `src/services/WishlistService.ts`
- [ ] T020 [US3] Garantir não duplicação de item por `cardId`
- [ ] T021 [US3] Validar manualmente add via lista e via detalhe

## Phase 6: User Story 4 - Acessar detalhe da carta (Priority: P2)

- [ ] T022 [US4] Exibir metadados mínimos no `src/app/card-detail.tsx`
- [ ] T023 [US4] Implementar fallback para metadados ausentes no detalhe
- [ ] T024 [US4] Validar manualmente abertura de detalhe a partir de Explorar

## Phase 7: Non-regression and polish

- [ ] T025 [P] Garantir em `src/services/WishlistService.ts` que evento exclusivamente de scanner não escreva wishlist neste recorte
- [ ] T026 [P] Revisar mensagens de erro amigáveis em `src/app/explore.tsx` e `src/app/card-detail.tsx`
- [ ] T027 Atualizar documentação local desta feature em `.specify/specs/003-explorar-cartas/quickstart.md` (se necessário)
- [ ] T028 Revisar consistência final com constitution (naming e estrutura)

## Dependencies & Execution Order

- T001-T005 devem preceder implementação por story.
- T006-T008 bloqueiam stories (dados + navegação).
- US1 e US2 podem avançar juntos após foundational.
- US3 depende de US1 (lista) e de rota de detalhe.
- US4 pode rodar em paralelo com US3 após T005.

## Notes

- Seguir nomenclatura em Português + PascalCase.
- Evitar acoplamento de lógica de scanner neste recorte.
- Manter aderência ao contrato de erros definido na constitution.
