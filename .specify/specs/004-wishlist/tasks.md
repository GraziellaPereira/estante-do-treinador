---
description: "Task list for Wishlist"
---

# Tasks: Wishlist

**Input**: Design documents from `/specs/004-wishlist/`

**Prerequisites**: spec.md, requirements.md, plan.md

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 [P] Adicionar rota `wishlist` em `src/app/_layout.tsx`
- [ ] T002 [P] Atualizar `src/app/home.tsx` para navegar para `/wishlist` ao tocar em Wishlist
- [ ] T003 [P] Verificar e estender `src/services/WishlistService.ts` com método de remoção

## Phase 2: Lista de Wishlist

- [ ] T004 [P] Criar `src/app/wishlist.tsx` com carregamento de wishlist do usuário autenticado
- [ ] T005 [P] Exibir estado de loading e mensagem de erro na tela
- [ ] T006 [P] Exibir estado vazio quando não houver itens
- [ ] T007 [P] Exibir lista de itens com nome, código, coleção, tipo e imagem

## Phase 3: Ação de remoção

- [ ] T008 [P] Implementar botão `Remover` em cada item de wishlist
- [ ] T009 [P] Atualizar a lista local após remoção sem exigir reload manual
- [ ] T010 [P] Tratar falha de remoção com alerta e sem remover o item da UI

## Phase 4: Detalhes da carta

- [ ] T011 [P] Navegar para `card-detail` ao tocar em um item
- [ ] T012 [P] Garantir fallback quando o cardId não existir no catálogo

## Phase 5: Validação manual

- [ ] T013 [P] Validar que somente itens do usuário autenticado são exibidos
- [ ] T014 [P] Validar remoção e atualização imediata da lista
- [ ] T015 [P] Validar estado vazio após remoção do último item
- [ ] T016 [P] Validar isolamento entre usuários diferentes

## Dependencies & Execution Order

- T001-T003 devem ser concluídos antes da criação da interface.
- T004-T007 são o núcleo da experiência Wishlist.
- T008-T010 garantem o fluxo de gerenciamento de itens.
- T011-T012 devem ocorrer após a listagem estar funcional.

## Notes

- Reusar `Consulta` de sessão de `src/app/explore.tsx` para manter consistência.
- Evitar novos serviços quando `WishlistService` já cobre leitura e escrita.
