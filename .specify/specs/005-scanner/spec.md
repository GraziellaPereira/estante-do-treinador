# Feature Specification: Scanner

**Feature Branch**: `[005-scanner]`

**Created**: 2026-06-09

**Status**: Ready for Implementation

**Input**: Requisitos do MVP, Constituição do projeto e resultados dos recursos já implementados de Perfil, Explorar e Wishlist.

## Visão geral

Scanner deve permitir que o treinador carregue a imagem de uma carta física, receba o código identificado por OCR, corrija ou confirme o código manualmente e adicione a carta correspondente à sua Estante. O fluxo deve ser protegido por autenticação e deve impedir qualquer adição direta à Wishlist.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Upload e detecção de código (Priority: P1)

Como usuário autenticado, quero carregar a imagem de uma carta para que o app identifique automaticamente o código e acelere o registro.

**Independent Test**: Fazer upload de uma imagem de carta válida e verificar se o sistema exibe o código detectado.

**Acceptance Scenarios**:

1. **When** o usuário carrega a imagem no Scanner, **if** o OCR detecta um código no formato `LETRAS-NÚMERO`, **then** o sistema deve exibir o código identificado em um campo editável.
2. **When** o OCR detecta um texto que não bate com o padrão, **then** o sistema deve exibir mensagem de código inválido e permitir correção manual.
3. **When** o OCR não encontra nenhum código, **then** o sistema deve exibir um campo de entrada manual para o usuário digitar o código.

---

### User Story 2 - Confirmação explícita antes da busca (Priority: P1)

Como usuário autenticado, quero confirmar o código detectado antes de buscar na base para evitar lançamentos incorretos.

**Independent Test**: Ajustar o código no campo, confirmar e verificar que a consulta só ocorre depois da confirmação.

**Acceptance Scenarios**:

1. **When** o usuário vê o código detectado, **then** o sistema não deve consultar o catálogo até que ele confirme explicitamente.
2. **When** o código for editado manualmente, **then** o sistema deve validar o padrão antes de permitir a confirmação.
3. **When** o usuário cancelar o fluxo, **then** o sistema deve voltar à tela anterior sem fazer nenhuma alteração na Estante.

---

### User Story 3 - Adicionar carta à Estante (Priority: P2)

Como usuário autenticado, quero que, ao confirmar um código válido, o app adicione a carta correspondente à minha Estante.

**Independent Test**: Confirmar um código válido e verificar que a carta aparece na Estante do usuário.

**Acceptance Scenarios**:

1. **When** o usuário confirma um código válido e o catálogo retorna exatamente uma carta correspondente, **then** o sistema deve criar um novo item na Estante do usuário.
2. **When** o catálogo retorna nenhuma carta correspondente, **then** o sistema deve exibir mensagem de não encontrado e não criar item nenhum.
3. **When** o catálogo retorna mais de uma correspondência, **then** o sistema deve exibir um estado de ambiguidades ou pedir nova confirmação detalhada.

---

### User Story 4 - Proibir adição à Wishlist via Scanner (Priority: P2)

Como usuário autenticado, quero que o Scanner adicione apenas à Estante e não acrescente nada à minha Wishlist.

**Independent Test**: Executar um fluxo Scanner completo e confirmar que nenhum item é criado em `wishlist`.

**Acceptance Scenarios**:

1. **When** o Scanner tem sucesso, **then** o sistema não deve criar item de Wishlist.
2. **When** o usuário tenta usar Scanner para adicionar à Wishlist, **then** o sistema deve bloquear essa opção e redirecionar para Explorar ou Detalhe.

## Edge Cases

- Upload de imagem sem código detectável.
- OCR identifica texto parcial ou corrompido.
- Código confirmado corresponde a várias cartas no catálogo.
- Estante já contém o mesmo `cardId`.
- Backend de OCR ou catálogo indisponível.

## Success Criteria

- **SC-001**: 100% dos fluxos Scanner exigem confirmação explícita antes de consultar o catálogo.
- **SC-002**: 100% das confirmações válidas criam item na Estante e 0% criam item na Wishlist.
- **SC-003**: 100% dos códigos inválidos ou ausentes levam à correção manual ou mensagem de erro.
- **SC-004**: 100% dos fluxos cancelados não alteram a Estante.

## Assumptions

- `json-server` expõe recurso `estante` ou `cards` para persistência local.
- Serviço OCR pode ser simulado ou chamado via API local.
- Autenticação por email/senha já está funcional.
- A Estante é o destino correto para resultado de Scanner, não a Wishlist.
