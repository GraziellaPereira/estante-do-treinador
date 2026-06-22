# Requirements — Wishlist

**Feature**: Wishlist

**Spec Source**: `.specify/specs/004-wishlist/spec.md`

**Status**: Ready for Implementation

## 1. Escopo funcional

A Wishlist deve oferecer:

- listagem persistente de cartas desejadas do usuário autenticado
- remoção de cartas da lista
- navegação para detalhe de carta a partir de cada item
- estado vazio e tratamento de erros de carga

## 2. Requisitos funcionais em padrão EARS

### RF-EARS-001 — Listar itens da Wishlist

- **Condição**: quando um usuário autenticado abrir a tela Wishlist.
- **Gatilho**: ao carregar a tela.
- **Resposta**: o sistema deve mostrar somente os itens de wishlist do usuário atual.

### RF-EARS-002 — Exibir estado vazio

- **Condição**: quando o usuário não tiver itens de wishlist.
- **Gatilho**: ao processar a resposta do backend.
- **Resposta**: o sistema deve exibir uma mensagem de vazio clara e amigável.

### RF-EARS-003 — Remover item da Wishlist

- **Condição**: quando um item estiver visível na Wishlist.
- **Gatilho**: quando o usuário acionar remover.
- **Resposta**: o sistema deve excluir o item associado ao `cardId` daquele usuário.

### RF-EARS-004 — Confirmar remoção com atualizaçao de lista

- **Condição**: após uma remoção bem-sucedida.
- **Gatilho**: quando o backend confirmar a exclusão.
- **Resposta**: o sistema deve atualizar imediatamente a interface para não apresentar o item removido.

### RF-EARS-005 — Navegar ao detalhe da carta

- **Condição**: quando o usuário tocar em um item de wishlist.
- **Gatilho**: ao selecionar o item.
- **Resposta**: o sistema deve abrir a tela de detalhe da carta correspondente.

### RF-EARS-006 — Privacidade por usuário

- **Condição**: quando a wishlist for carregada.
- **Gatilho**: ao solicitar a lista do backend.
- **Resposta**: o sistema deve filtrar por `userId` do usuário autenticado.

### RF-EARS-007 — Tratamento de falha

- **Condição**: quando a requisição de wishlist ou remoção falhar.
- **Gatilho**: ao receber status de erro do backend.
- **Resposta**: o sistema deve exibir mensagem de erro e deve permitir nova tentativa sem travar a UI.

## 3. Requisitos não funcionais em padrão EARS

### RNF-EARS-001 — Determinismo de visualização

- **Condição**: quando o mesmo usuário recarregar a wishlist.
- **Gatilho**: ao abrir a tela novamente.
- **Resposta**: o sistema deve exibir a mesma lista desde que nenhum dado tenha mudado.

### RNF-EARS-002 — Integridade de remoção

- **Condição**: quando um item for removido.
- **Gatilho**: após confirmação de exclusão no backend.
- **Resposta**: o sistema deve manter a lista consistente sem item residual.

### RNF-EARS-003 — Resposta resiliente a catálogo ausente

- **Condição**: quando um item não existir mais no catálogo.
- **Gatilho**: ao renderizar item de wishlist.
- **Resposta**: o sistema deve exibir fallback para metadados ausentes sem bloquear a remoção.

## 4. Entidades de dados

### WishlistItem

- `id`
- `userId`
- `cardId`
- `createdAt`
- `updatedAt`

### Card

- `id`
- `nome`
- `codigo`
- `colecao`
- `pokemon`
- `tipo`
- `imageUrl`
- `raridade`

## 5. Critérios mensuráveis de aceitação

- **CA-001**: 100% dos itens exibidos pertencem ao usuário autenticado.
- **CA-002**: 100% das remoções removem o item da interface e do backend.
- **CA-003**: 100% dos estados vazios apresentam mensagem clara.
- **CA-004**: 0% dos itens de outro usuário aparecem na lista.

## 6. Dependências explícitas

- Sessão autenticada disponível.
- `WishlistService` disponível para leitura e exclusão.
- `CardDetail` acessível por `cardId`.
- `json-server/db.json` expõe o recurso `wishlist`.
