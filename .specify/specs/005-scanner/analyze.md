# Analysis: Scanner

**Feature**: Scanner

**Spec Source**: `.specify/specs/005-scanner/spec.md`

**Status**: Ready for Implementation

## Summary

A análise do Scanner confirma que o fluxo é bem definido e que o projeto já possui as bases necessárias para avançar. O maior trabalho técnico será criar a tela de Scanner, suportar upload de imagem, integrar OCR simulado ou real, validar o código antes de confirmar e persistir a carta na Estante sem tocar na Wishlist.

## Findings

- A Constituição do projeto já definiu Scanner como upload + OCR, com confirmação de código e adição exclusiva à Estante.
- Não existe atualmente uma tela `src/app/scanner.tsx`, nem um serviço de OCR ou de Estante dedicado.
- A navegação do `Home` ainda trata `Scanner` como placeholder “Em breve”, portanto a rota precisará ser exposta no menu.
- O recurso `wishlist` já existe, mas não há ainda um recurso de `estante` ou serviço específico para persistir itens de scanner.
- O backend `json-server/db.json` contém `cards`, `catalogCards`, `collections` e `wishlist`, mas não há endpoint documentado para `estante`; será necessário definir se o fluxo de Scanner deve persistir em `cards` ou criar explicitamente `estante`.
- `CatalogService` e `WishlistService` já existem e podem ser reutilizados para busca de carta e garantia de não criação de wishlist.

## Risks

- Dependência de OCR: o serviço pode não estar pronto, exigindo uso de simulação ou de código manual.
- Persistência da Estante indefinida: é necessário decidir se a Estante do Scanner usa `cards`, `estante` ou outro recurso no backend.
- Navegação e estado de `Home` precisam ser atualizados para não deixar Scanner como placeholder após implementação.
- Um código confirmado que encontra múltiplas correspondências precisa de tratamento explícito para evitar comportamento incerto.

## Consistency Check

- A especificação respeita a Constituição do projeto: naming em Português, autenticação obrigatória, uso de `json-server`, e separação clara de Scanner e Wishlist.
- O Scanner não deve gravar na Wishlist, o que está consistente com os requisitos existentes de Explorar e Wishlist.
- O processo de confirmar antes de buscar está alinhado com os requisito RF-EARS-004 e SC-001.

## Recommendations

1. Antes de implementar, definir claramente o modelo de persistência da Estante no backend (`cards` vs `estante`).
2. Criar tipos e serviços auxiliares para o Scanner: `ScannerService` e `EstanteService`.
3. Atualizar `src/app/_layout.tsx` e `src/app/home.tsx` para expor a rota `scanner`.
4. Reusar `CatalogService` para consulta de `cardId` por `codigo` e manter `WishlistService` fora do fluxo de Scanner.
5. Planejar um fallback de OCR para entrada manual de código.

## Next Step

- Implementar `src/app/scanner.tsx`, `src/services/ScannerService.ts` e `src/services/EstanteService.ts`.
- Validar se `json-server/db.json` precisa receber recurso `estante` ou se o Scanner pode reaproveitar `cards` do usuário.
