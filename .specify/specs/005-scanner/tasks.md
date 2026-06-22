---
description: "Task list for Scanner"
---

# Tasks: Scanner

**Input**: Design documents from `/specs/005-scanner/`

**Prerequisites**: spec.md, requirements.md, plan.md

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 [P] Criar pasta de spec `/specs/005-scanner/`
- [ ] T002 [P] Registrar rota `scanner` em `src/app/_layout.tsx`
- [ ] T003 [P] Atualizar `src/app/home.tsx` para navegar para `/scanner`
- [ ] T004 [P] Criar tipos em `src/types/scanner.ts`
- [ ] T005 [P] Criar `src/services/ScannerService.ts` para OCR e validação de código
- [ ] T006 [P] Criar `src/services/EstanteService.ts` para persistência da Estante

## Phase 2: Upload e OCR

- [ ] T007 [P] Criar tela `src/app/scanner.tsx` com upload de imagem
- [ ] T008 [P] Implementar requisição de OCR após seleção de imagem
- [ ] T009 [P] Exibir código detectado e permitir edição manual
- [ ] T010 [P] Validar formato do código antes da confirmação

## Phase 3: Confirmação e busca de catálogo

- [ ] T011 [P] Implementar botão `Confirmar` para consultar catálogo
- [ ] T012 [P] Tratar caso de código não encontrado
- [ ] T013 [P] Tratar caso de múltiplas correspondências
- [ ] T014 [P] Implementar botão `Cancelar` que retorna sem alterar dados

## Phase 4: Adição à Estante

- [ ] T015 [P] Adicionar carta encontrada à Estante do usuário
- [ ] T016 [P] Garantir que Scanner não cria item em Wishlist
- [ ] T017 [P] Exibir sucesso e atualizar estado local ou navegar de volta

## Phase 5: Validação Manual

- [ ] T018 [P] Validar upload e OCR em imagem de carta real
- [ ] T019 [P] Validar edição manual de código e confirmação
- [ ] T020 [P] Validar ausência de criação de item em Wishlist
- [ ] T021 [P] Validar cancelamento sem mudanças

## Dependencies & Execution Order

- T002-T006 devem ser concluídos antes da interface final.
- T007-T010 podem ser implementados antes de persistência de Estante.
- T011-T017 devem ser entregues em sequência para fechar o fluxo.

## Notes

- Prefira consistência com o estilo e as mensagens já usadas em Explorar e Perfil.
- Mantenha o Scanner simples: upload, OCR, confirmar, adicionar Estante.
