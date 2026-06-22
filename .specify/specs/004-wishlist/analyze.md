# Analysis: Wishlist

**Feature**: Wishlist

**Spec Source**: `.specify/specs/004-wishlist/spec.md`

**Status**: Ready for Implementation

## Summary

A análise confirma que a Wishlist é um recurso bem definido e que já conta com parte do suporte técnico existente no repositório. A maior parte do trabalho necessário é estruturar a tela dedicada, registrar a rota e adicionar a remoção de itens ao serviço de wishlist.

## Findings

- `src/services/WishlistService.ts` já implementa leitura (`BuscarWishlist`) e upsert (`UpsertWishlistItem`) para `wishlist`.
- O tipo `WishlistItem` existe em `src/types/explore.ts`, alinhado com o modelo exposto pelo backend.
- O backend de desenvolvimento em `json-server/db.json` já contém o recurso `wishlist`, o que facilita a implementação sem necessidade de alteração imediata.
- O fluxo de adição à wishlist já está parcialmente inserido em `src/app/explore.tsx` e `src/app/card-detail.tsx`, garantindo que a integração de leitura/escrita esteja alinhada com a próxima tela.
- A rota `wishlist` ainda não está registrada em `src/app/_layout.tsx`.
- O `Home` ainda trata o item `Wishlist` como placeholder “Em breve”, então a navegação precisa ser atualizada.
- O serviço atual não possui método de remoção de itens (`DELETE`) para `wishlist`.
- A tela de detalhe por `cardId` já existe em `src/app/card-detail.tsx`, o que facilita a navegação a partir da lista de wishlist.

## Risks

- Se não houver um método de remoção explícito em `WishlistService`, a implementação da UI ficará incompleta.
- A navegação de `Home` para `Wishlist` ainda não está instalada, o que pode gerar inconsistência caso a rota seja criada sem atualizar o menu.
- Itens de wishlist referenciando `cardId` que não exista mais no catálogo precisam de fallback para evitar crashes.
- A definição de dados em `db.json` pode variar de outros registros no projeto, portanto é importante testar o filtro `userId` de forma isolada.

## Consistency Check

- O recurso respeita a Constituição do projeto: autenticação obrigatória, backend `json-server`, naming em Português e foco em usabilidade móvel.
- A wishlist permanece pessoal ao usar `userId` no serviço, portanto está alinhada com o requisito de privacidade.
- A existência de `Card` e `WishlistItem` nos tipos já fornece base para validação e filtragem.
- A análise identifica uma dependência técnica clara: adicionar `RemoverWishlistItem` no serviço antes da tela estar funcional.

## Recommendations

1. Estabelecer primeiro o contrato do serviço de remoção em `src/services/WishlistService.ts`.
2. Criar `src/app/wishlist.tsx` com estados `loading`, `empty`, `error`, listagem e remoção.
3. Registrar a rota `wishlist` em `src/app/_layout.tsx` e ajustar `src/app/home.tsx` para navegar corretamente.
4. Reusar `card-detail` para manter fluxo consistente de acesso à carta a partir da wishlist.
5. Testar com dois usuários diferentes para assegurar isolamento de dados.

## Next Step

- Implementar `wishlist.tsx` e `RemoverWishlistItem` como próximo passo imediato.
