# Analyze Report: Explorar Cartas

**Date**: 2026-06-08

**Scope checked**:

- `.specify/specs/003-explorar-cartas/spec.md`
- `.specify/specs/003-explorar-cartas/requirements.md`
- `.specify/specs/003-explorar-cartas/plan.md`
- `.specify/specs/003-explorar-cartas/tasks.md`
- `.specify/memory/constitution.md`

## Findings (ordered by severity)

### CRITICAL

None found.

The core artifacts exist, the feature scope is coherent, and no requirement directly violates the constitution.

### HIGH

1. **Open questions in plan are not represented as blocking tasks**

- Evidence:
  - `plan.md` keeps open questions about whether the Pokemon filter comes from a dedicated field or name parsing, whether detail supports next/previous navigation, and whether wishlist has quantity/note in this step.
  - `tasks.md` starts implementation tasks without an explicit decision checkpoint.
- Why high:
  - The Pokemon filter source affects catalog schema and filter behavior, which are central to US2.
- Impact:
  - Risk of rework in `json-server/db.json`, `CatalogService.ts`, and `explore.tsx`.
- Recommendation:
  - Treat MVP decisions as locked before implementation: use a dedicated `pokemon` field, static detail view without previous/next, and no quantity/note in this Explore increment.

2. **Success criteria mention tests, but tasks currently define manual validation only**

- Evidence:
  - `spec.md` SC-001..SC-005 are written as "In tests".
  - `plan.md` says testing is manual for now.
  - `tasks.md` explicitly states no mandatory suite and includes manual validation tasks.
- Why high:
  - Done criteria may be interpreted as automated test coverage even though no test infrastructure is planned.
- Impact:
  - Completion may be hard to verify objectively after implementation.
- Recommendation:
  - Either add lightweight unit tests for filter/upsert utilities in a later test setup, or accept manual validation as the MVP verification method for this feature.

### MEDIUM

3. **Task T025 may overreach by referencing scanner events in WishlistService**

- Evidence:
  - `tasks.md` T025 asks `WishlistService.ts` to guarantee scanner-only events do not write wishlist.
  - The feature scope says Scanner is out of scope except for non-regression.
- Why medium:
  - A service dedicated to wishlist upsert may not naturally know event origin unless the contract includes source context.
- Impact:
  - Could introduce unnecessary coupling between Scanner and Wishlist.
- Recommendation:
  - Keep the protection as an API/service contract: only expose explicit Explore/detail wishlist actions in this recorte and do not add scanner call sites.

4. **Constitution recommends `CardItem.tsx`, but plan omits it**

- Evidence:
  - Constitution section 7.1 lists `src/components/CardItem.tsx` among affected Explore files.
  - `plan.md` and `tasks.md` implement card rows directly in `src/app/explore.tsx`.
- Why medium:
  - Not a blocker, but the implementation may become UI-heavy in the route file.
- Impact:
  - Reduced reuse if Wishlist or detail need the same card presentation later.
- Recommendation:
  - Accept inline rendering for MVP only if compact; otherwise create `src/components/CardItem.tsx` during implementation.

### LOW

5. **Optional quickstart is mentioned but not planned as required**

- Evidence:
  - `tasks.md` T027 says update `quickstart.md` only if necessary.
  - `plan.md` lists only the four core documents.
- Why low:
  - The current feature is still implementable without quickstart.
- Recommendation:
  - Leave quickstart optional unless manual validation steps become long enough to document separately.

## Constitution Compliance Summary

- Stack/version constraints: **PASS**
- Explore scope and affected layers: **PASS**
- Wishlist not written by Scanner: **PASS** at spec/plan/tasks level
- Privacy rule for user-owned wishlist: **PASS**
- Naming/style rule: **PASS** at planning level, to verify during implementation
- Error handling standard: **PARTIAL** because tasks mention friendly errors but do not explicitly require the constitution error payload shape

## Coverage Summary

- Spec -> Requirements alignment: **Good**
- Requirements -> Plan alignment: **Good**
- Plan -> Tasks alignment: **Good with decisions pending**
- Constitution alignment: **Good**
- Testability alignment: **Partial** due manual validation emphasis

## Decision Notes For Implementation

Use these decisions to remove ambiguity before coding:

1. `pokemon` should be a dedicated catalog field in `json-server/db.json`.
2. Card detail should be a static detail screen for the selected card; no next/previous navigation in this increment.
3. Wishlist item should use only `userId`, `cardId`, `createdAt`, and `updatedAt` for this Explore increment.
4. Scanner non-regression should be enforced by avoiding scanner-to-wishlist call sites, not by coupling scanner logic into Explore UI.

## Suggested Next Commands

1. Run `/speckit.implement` for `.specify/specs/003-explorar-cartas/tasks.md`.
2. During implementation, mark completed tasks in `tasks.md`.
3. After implementation, run the app manually and validate search, filters, detail, wishlist upsert, and scanner non-regression.
