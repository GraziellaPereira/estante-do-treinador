# Requirements — Perfil do Usuário

**Feature**: Perfil do Usuário

**Spec Source**: `.specify/specs/002-perfil-do-usuario/spec.md`

**Status**: Draft

## 1. Escopo funcional

Este documento consolida os requisitos do MVP para o perfil do usuário:

- Visualizar apenas o próprio perfil
- Editar nick, avatar e bio
- Publicar fotos no feed do perfil
- Garantir que a Home não exponha um atalho de fotos duplicado

O MVP pressupõe autenticação obrigatória por email/senha para qualquer funcionalidade protegida.

---

## 2. Requisitos funcionais em padrão EARS

### RF-EARS-001 — Exibição do próprio perfil

- **Condição**: quando um usuário autenticado abrir a tela Perfil.
- **Gatilho**: quando o perfil do usuário for carregado.
- **Resposta**: o sistema deve exibir somente o nick, avatar, bio e feed de fotos do próprio usuário autenticado.

### RF-EARS-002 — Bloqueio de perfil de terceiros

- **Condição**: quando um usuário autenticado tentar acessar um perfil de outro usuário.
- **Gatilho**: quando a rota, link ou identificador de destino for diferente do usuário autenticado.
- **Resposta**: o sistema deve negar o acesso e não deve exibir dados de outro usuário.

### RF-EARS-003 — Edição de nick

- **Condição**: quando um usuário autenticado editar o nick.
- **Gatilho**: quando o usuário confirmar a alteração.
- **Resposta**: o sistema deve persistir o novo nick somente para a conta do usuário autenticado.

### RF-EARS-004 — Edição de avatar

- **Condição**: quando um usuário autenticado enviar um novo avatar.
- **Gatilho**: quando o upload for concluído com URL válida.
- **Resposta**: o sistema deve persistir a nova URL do avatar somente para a conta do usuário autenticado.

### RF-EARS-005 — Edição de bio

- **Condição**: quando um usuário autenticado editar a bio.
- **Gatilho**: quando o usuário confirmar a alteração.
- **Resposta**: o sistema deve persistir a nova bio somente para a conta do usuário autenticado.

### RF-EARS-006 — Publicação de foto no feed

- **Condição**: quando um usuário autenticado estiver na tela Perfil.
- **Gatilho**: quando o usuário enviar uma foto para o feed.
- **Resposta**: o sistema deve salvar a URL retornada pelo upload no backend de desenvolvimento e deve exibir a foto no feed do próprio usuário.

### RF-EARS-007 — Falha de upload de foto

- **Condição**: quando um usuário autenticado enviar uma foto para o feed do perfil.
- **Gatilho**: quando o upload falhar ou não retornar URL válida.
- **Resposta**: o sistema deve rejeitar a publicação e não deve criar entrada no feed.

### RF-EARS-008 — Home sem atalho de fotos

- **Condição**: quando um usuário autenticado abrir a Home.
- **Gatilho**: quando a navegação principal for renderizada.
- **Resposta**: o sistema deve exibir somente Estante e Coleções e não deve exibir "Minhas Fotos" nem equivalente.

### RF-EARS-009 — Controle de acesso por autenticação

- **Condição**: quando qualquer funcionalidade de Perfil for acessada.
- **Gatilho**: quando não houver sessão autenticada válida.
- **Resposta**: o sistema deve impedir o acesso e deve exigir autenticação por email/senha.

---

## 3. Requisitos não funcionais em padrão EARS

### RNF-EARS-001 — Visibilidade restrita do perfil

- **Condição**: quando a tela Perfil for carregada.
- **Gatilho**: quando a visualização do perfil for renderizada.
- **Resposta**: o sistema deve limitar a exibição aos dados do próprio usuário autenticado.

### RNF-EARS-002 — Persistência de URL de upload

- **Condição**: quando o upload de avatar ou foto for bem-sucedido.
- **Gatilho**: quando o backend retornar uma URL válida.
- **Resposta**: o sistema deve persistir somente a URL retornada no armazenamento do backend de desenvolvimento.

### RNF-EARS-003 — Home reduzida

- **Condição**: quando a Home for renderizada.
- **Gatilho**: quando a navegação principal for exibida.
- **Resposta**: o sistema deve manter apenas Estante e Coleções como entradas principais.

### RNF-EARS-004 — OCR fora do escopo deste recorte

- **Condição**: quando o recorte de Perfil for avaliado isoladamente.
- **Gatilho**: quando for solicitado escopo de perfil.
- **Resposta**: o sistema não deve incluir OCR, scanner ou busca de catálogo neste requisito.

---

## 4. Entidades de dados

### User

- Representa a conta autenticada do usuário.
- Atributos mínimos: `id`, `email`, `passwordRef`, `nick`, `avatarUrl`, `bio`.

### ProfilePhoto

- Representa uma foto publicada pelo usuário no feed.
- Atributos mínimos: `userId`, `imageUrl`, `caption`, `createdAt`.

### AuthSession

- Representa a sessão autenticada.
- Atributos mínimos: `userId`, `sessionToken`, `expiresAt`.

---

## 5. Critérios mensuráveis de aceitação

### CA-001

100% das telas de Perfil devem exibir somente os dados do usuário autenticado.

### CA-002

100% das tentativas de abrir o perfil de outro usuário devem ser bloqueadas.

### CA-003

100% dos saves de nick, avatar e bio devem afetar apenas a conta autenticada.

### CA-004

100% dos uploads de foto bem-sucedidos devem persistir uma URL e renderizar a foto no feed do usuário.

### CA-005

100% das renderizações da Home devem exibir somente Estante e Coleções.

### CA-006

0% das renderizações da Home devem exibir "Minhas Fotos" ou atalho equivalente.

### CA-007

100% das funcionalidades protegidas de Perfil devem exigir sessão autenticada válida.

---

## 6. Dependências explícitas

- Autenticação por email/senha deve estar disponível.
- O backend de desenvolvimento deve aceitar upload de imagens e retornar URLs persistíveis em `db.json`.
- A Home deve manter o layout reduzido com apenas Estante e Coleções.
- O perfil do usuário deve ser privado e inacessível para visualização de terceiros.
