# Implementation Plan: Wishlist

**Branch**: `[004-wishlist]` | **Date**: 2026-06-09 | **Spec**: [.specify/specs/004-wishlist/spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-wishlist/spec.md`

## Summary

Implementar a tela Wishlist com listagem de itens do usuário autenticado, remoção de cartas e navegação ao detalhe. A Wishlist deve ser persistente, com feedback de erro e estado vazio.

## Technical Context

- Stack: Expo React Native + TypeScript
- Backend: `json-server` local via `apiService/api.ts`
- Sessão: AsyncStorage com chave `estante:authUser:v1`
- Serviços existentes: `src/services/WishlistService.ts`, `src/services/CatalogService.ts`
- Tipos existentes: `src/types/explore.ts`

## Files a criar/alterar

- `src/app/wishlist.tsx` (novo)
- `src/app/_layout.tsx` (adicionar rota `wishlist`)
- `src/app/home.tsx` (navegação para `wishlist` no menu inferior)
- `src/services/WishlistService.ts` (adicionar método `RemoverWishlistItem` se necessário)
- `json-server/db.json` (garantir recurso `wishlist` presente)
- `src/types/explore.ts` (tipos `WishlistItem`, `Card` já suportam o recurso)

## Delivery Plan

### Phase 1 — Contracts

1. Confirmar que `WishlistService` expõe:
   - `BuscarWishlist(userId)`
   - `UpsertWishlistItem(userId, cardId)`
   - `RemoverWishlistItem(itemId)` ou `RemoverWishlistItem(userId, cardId)`
2. Confirmar que `CardDetail` aceita navegação por `cardId`.
3. Confirmar título e acessibilidade da rota `wishlist` em `_layout.tsx`.

### Phase 2 — UI e fluxo

1. Criar `src/app/wishlist.tsx` com:
   - carregamento de itens por `userId`
   - estado `loading`, `empty`, `error`
   - lista de cartas com imagem, nome, código, coleção e tipo
   - botão `Remover`
   - navegação para `/card-detail?cardId=` ao tocar no item
2. Reusar `BuscaUtils` e `CatalogService` para fallback de metadados se necessário.
3. Adicionar botão de refresh para recarregar a lista.
4. Atualizar `home.tsx` para redirecionar `item.key === 'wishlist'` para `/wishlist`.

### Phase 3 — Serviço e integridade

1. Adicionar `RemoverWishlistItem` em `src/services/WishlistService.ts`:
   - consulta o item por `userId` + `cardId`, ou usa `id`
   - envia `DELETE` para backend
   - retorna confirmação de exclusão
2. Validar que `UpsertWishlistItem` e `RemoverWishlistItem` mantêm a lista pessoal.
3. Garantir fallback de UI quando item existir em wishlist mas não no catálogo.

### Phase 4 — Testes manuais

1. Login como usuário A e adicionar cartas via Explorar.
2. Abrir Wishlist e validar itens.
3. Remover item e verificar exclusão imediata.
4. Validar estado vazio.
5. Trocar para outro usuário e verificar isolamento de dados.

## Constitution Check

Regras do projeto:

- manter nomes em Português e PascalCase
- não implementar offline sync
- manter autenticação obrigatória
- usar `json-server` para persistência de backend
- preservar isolamento do usuário

## Risks

1. `WishlistService` pode precisar de método de remoção ainda não criado.
2. Rota `wishlist` pode não estar registrada em `_layout.tsx`.
3. O item em wishlist pode referenciar `cardId` inexistente no catálogo atual.
4. A lista atual do `Home` ainda faz tratamento de placeholders que pode gerar conflito de navegação.

## Notes

- Priorizar feedback imediato após remoção para evitar sensação de inconsistência.
- Manter mensagens de erro claras e sem termos técnicos.
- Reusar a tela de detalhe existente para consistência de navegação.
