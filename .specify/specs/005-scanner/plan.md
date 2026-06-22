# Implementation Plan: Scanner

**Branch**: `[005-scanner]` | **Date**: 2026-06-09 | **Spec**: [.specify/specs/005-scanner/spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-scanner/spec.md`

## Summary

Implementar o fluxo de Scanner com upload de imagem, OCR, edição/validação de código, confirmação explícita e adição de carta à Estante. O fluxo deve respeitar a regra de que Scanner não adiciona itens à Wishlist.

## Technical Context

- Stack: Expo React Native + TypeScript
- Backend: `json-server` local com endpoint de catálogo e estante
- Sessão: AsyncStorage (`estante:authUser:v1`)
- Serviços existentes: `CatalogService`, `WishlistService`
- Novos serviços previstos: `ScannerService`, `EstanteService`
- Navegação: Expo Router

## Files a criar/alterar

- `src/app/scanner.tsx` (novo)
- `src/services/ScannerService.ts` (novo)
- `src/services/EstanteService.ts` (novo ou extensão de serviço existente)
- `src/types/scanner.ts` (novo)
- `src/app/_layout.tsx` (registrar rota `scanner`)
- `src/app/home.tsx` (navegação do menu inferior para Scanner)
- `json-server/db.json` (garantir suporte a recurso `estante` ou `cards` para persistência)
- `apiService/api.ts` (garantir URL base válida)

## Delivery Plan

### Phase 1 — Contracts e tipos

1. Definir tipos:
   - `ScannerResult`
   - `EstanteItem`
2. Definir contrato de serviço OCR:
   - enviar `imageUri`
   - receber `codigoDetectado`
3. Definir contrato de serviço de Estante:
   - buscar carta por `codigo`
   - criar `EstanteItem`

### Phase 2 — Tela Scanner

1. Criar `src/app/scanner.tsx` com estados:
   - `imagemSelecionada`
   - `codigoDetectado`
   - `codigoConfirmado`
   - `status` e `erro`
2. Adicionar botão de upload de imagem usando Expo Image Picker.
3. Exibir campo editável para código detectado e permitir entrada manual.
4. Implementar botão `Confirmar` que valida o padrão `LETRAS-NÚMERO`.
5. Implementar botão `Cancelar` que retorna sem mutar dados.

### Phase 3 — Processamento e persistência

1. Enviar imagem para OCR assim que for carregada.
2. Exibir resultado OCR em campo editável.
3. Ao confirmar código válido:
   - consultar `CatalogService`
   - se uma carta for encontrada, criar item de Estante
   - se nenhuma carta for encontrada, exibir mensagem de não encontrado
4. Garantir que nenhum item de Wishlist seja criado aqui.

### Phase 4 — Navegação e UX

1. Registrar rota `scanner` em `_layout.tsx`.
2. Atualizar `home.tsx` para navegar para `/scanner` no menu.
3. Exibir instruções claras na tela Scanner para confirmar o código.
4. Oferecer feedback de sucesso e retorno à tela anterior.

## Quality Gates

- O Scanner aceita imagens e exibe código detectado.
- A confirmação de código só acontece após validação manual.
- Cartas válidas são adicionadas à Estante do usuário.
- Nenhuma Wishlist é gravada via Scanner.
- Estados de erro e ausência de correspondência são tratados.

## Risks

1. OCR pode devolver código inválido ou parcial.
2. O catálogo pode devolver múltiplas correspondências para o mesmo código.
3. Não existe ainda uma tela de Estante dedicada, exigindo cuidado na persistência do item.
4. A rota `scanner` precisa estar sincronizada com o menu do `Home`.

## Notes

- Evitar acoplamento de Scanner com Wishlist.
- Prefira um serviço de OCR que retorne apenas o código reconhecido, deixando a validação para a UI.
- Se `json-server` não suportar `estante`, reutilizar `cards` do usuário para persistência de itens scanner.
