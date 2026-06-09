# Requirements — Explorar Cartas

**Feature**: Explorar Cartas

**Spec Source**: `.specify/specs/003-explorar-cartas/spec.md`

**Status**: Ready for Implementation

## 1. Escopo funcional

Este documento consolida os requisitos de Explorar:

- Busca por nome/código
- Filtros por coleção, Pokémon e tipo
- Acesso ao detalhe da carta
- Adição à Wishlist somente via Explorar/detalhe

Todas as ações protegidas exigem autenticação por email/senha.

---

## 2. Requisitos funcionais em padrão EARS

### RF-EARS-001 — Busca por texto e código

- **Condição**: quando um usuário autenticado estiver na tela Explorar.
- **Gatilho**: quando o usuário informar termo de busca.
- **Resposta**: o sistema deve retornar somente cartas cujo nome ou código corresponda ao termo.

### RF-EARS-002 — Normalização da consulta

- **Condição**: quando o usuário informar consulta com variação de caixa e espaços.
- **Gatilho**: quando a busca for executada.
- **Resposta**: o sistema deve normalizar a consulta antes de filtrar resultados.

### RF-EARS-003 — Filtro por coleção

- **Condição**: quando um usuário autenticado estiver em Explorar.
- **Gatilho**: quando o usuário selecionar filtro de coleção.
- **Resposta**: o sistema deve exibir apenas cartas da coleção selecionada.

### RF-EARS-004 — Filtro por Pokémon

- **Condição**: quando um usuário autenticado estiver em Explorar.
- **Gatilho**: quando o usuário selecionar filtro de Pokémon.
- **Resposta**: o sistema deve exibir apenas cartas do Pokémon selecionado.

### RF-EARS-005 — Filtro por tipo

- **Condição**: quando um usuário autenticado estiver em Explorar.
- **Gatilho**: quando o usuário selecionar filtro de tipo.
- **Resposta**: o sistema deve exibir apenas cartas do tipo selecionado.

### RF-EARS-006 — Combinação de filtros

- **Condição**: quando múltiplos filtros estiverem ativos.
- **Gatilho**: quando resultados forem renderizados.
- **Resposta**: o sistema deve exibir somente cartas que satisfaçam todos os filtros ativos simultaneamente.

### RF-EARS-007 — Abertura de detalhe

- **Condição**: quando resultados estiverem visíveis em Explorar.
- **Gatilho**: quando o usuário tocar em uma carta.
- **Resposta**: o sistema deve abrir detalhe com imagem e metadados da carta selecionada.

### RF-EARS-008 — Adição à Wishlist por Explorar

- **Condição**: quando uma carta estiver visível em Explorar.
- **Gatilho**: quando o usuário acionar "Adicionar à Wishlist".
- **Resposta**: o sistema deve criar item na Wishlist se o cardId ainda não existir para o usuário.

### RF-EARS-009 — Não duplicar item na Wishlist

- **Condição**: quando o usuário adicionar carta já presente na Wishlist.
- **Gatilho**: quando a ação de adicionar for acionada novamente.
- **Resposta**: o sistema deve atualizar o item existente e não deve criar duplicata.

### RF-EARS-010 — Adição à Wishlist por detalhe

- **Condição**: quando o usuário estiver no detalhe de uma carta vindo de Explorar.
- **Gatilho**: quando o usuário acionar "Adicionar à Wishlist" no detalhe.
- **Resposta**: o sistema deve persistir a carta na Wishlist do usuário.

### RF-EARS-011 — Scanner não escreve Wishlist neste recorte

- **Condição**: quando ocorrer evento originado exclusivamente do Scanner.
- **Gatilho**: quando não houver ação explícita do usuário em Explorar/detalhe.
- **Resposta**: o sistema não deve criar item de Wishlist por esse evento.

### RF-EARS-012 — Estado vazio

- **Condição**: quando nenhum resultado corresponder à busca/filtros.
- **Gatilho**: quando a listagem for atualizada.
- **Resposta**: o sistema deve exibir estado vazio explícito.

### RF-EARS-013 — Falha de catálogo

- **Condição**: quando a API de catálogo estiver indisponível.
- **Gatilho**: quando a tela Explorar solicitar dados.
- **Resposta**: o sistema deve exibir erro amigável e não deve executar mutações na Wishlist.

### RF-EARS-014 — Autenticação obrigatória

- **Condição**: quando funcionalidade protegida de Explorar for acessada.
- **Gatilho**: quando não houver sessão válida.
- **Resposta**: o sistema deve bloquear acesso e exigir login.

---

## 3. Requisitos não funcionais em padrão EARS

### RNF-EARS-001 — Determinismo de filtro

- **Condição**: quando os mesmos filtros e consulta forem reaplicados.
- **Gatilho**: quando a busca for repetida.
- **Resposta**: o sistema deve retornar o mesmo conjunto de resultados para o mesmo estado de entrada.

### RNF-EARS-002 — Isolamento de mutação

- **Condição**: quando ocorrer erro de leitura de catálogo.
- **Gatilho**: quando o backend responder com falha.
- **Resposta**: o sistema deve impedir alterações na Wishlist para aquela operação.

### RNF-EARS-003 — Privacidade de usuário

- **Condição**: quando a Wishlist for alterada em Explorar.
- **Gatilho**: quando operação de escrita for enviada.
- **Resposta**: o sistema deve escrever apenas no contexto do usuário autenticado.

---

## 4. Entidades de dados

### Card

- `id`
- `nome`
- `codigo`
- `colecao`
- `pokemon`
- `tipo`
- `imageUrl`

### ExploreFilter

- `query`
- `colecao`
- `pokemon`
- `tipo`

### WishlistItem

- `userId`
- `cardId`
- `createdAt`
- `updatedAt`

---

## 5. Critérios mensuráveis de aceitação

### CA-001

100% dos resultados exibidos devem cumprir todos os filtros ativos.

### CA-002

100% das adições de Wishlist em Explorar/detalhe devem persistir exatamente um item por `cardId`.

### CA-003

100% das buscas com variação de caixa/espaços devem produzir correspondência normalizada.

### CA-004

100% dos cenários sem resultado devem exibir estado vazio explícito.

### CA-005

0% dos eventos exclusivamente do Scanner devem criar item na Wishlist neste recorte.

---

## 6. Dependências explícitas

- Sessão autenticada disponível.
- Fonte de catálogo disponível por `apiService/api.ts`.
- Persistência de Wishlist disponível no backend de desenvolvimento.
- Tela de detalhe acessível a partir de Explorar.
