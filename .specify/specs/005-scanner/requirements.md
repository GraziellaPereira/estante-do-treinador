# Requirements — Scanner

**Feature**: Scanner

**Spec Source**: `.specify/specs/005-scanner/spec.md`

**Status**: Ready for Implementation

## 1. Escopo funcional

O Scanner deve:

- permitir upload de imagem da carta
- processar a imagem com OCR para detectar código
- deixar o usuário editar/confirmar o código
- consultar o catálogo somente após confirmação explícita
- adicionar cartas encontradas à Estante do usuário
- bloquear qualquer adição automática ou direta à Wishlist
- exibir mensagens de erro claras

## 2. Requisitos funcionais em padrão EARS

### RF-EARS-001 — Upload de imagem no Scanner

- **Condição**: quando um usuário autenticado estiver na tela Scanner.
- **Gatilho**: quando o usuário tocar em carregar imagem.
- **Resposta**: o sistema deve permitir selecionar uma imagem e deve enviar a imagem ao OCR.

### RF-EARS-002 — Exibir código detectado pelo OCR

- **Condição**: quando a imagem for processada pelo OCR.
- **Gatilho**: quando o OCR retornar um resultado.
- **Resposta**: o sistema deve exibir o código num campo editável.

### RF-EARS-003 — Validar formato do código

- **Condição**: quando o usuário inserir ou confirmar o código.
- **Gatilho**: ao acionar confirmar.
- **Resposta**: o sistema deve aceitar apenas o formato `LETRAS-NÚMERO` e rejeitar outros formatos.

### RF-EARS-004 — Confirmação antes da busca

- **Condição**: quando o código estiver visível na tela Scanner.
- **Gatilho**: quando o usuário tocar em confirmar.
- **Resposta**: o sistema deve consultar o catálogo apenas após confirmação explícita.

### RF-EARS-005 — Adicionar carta à Estante

- **Condição**: quando o código confirmado corresponder a uma carta no catálogo.
- **Gatilho**: após consulta bem-sucedida.
- **Resposta**: o sistema deve criar um item na Estante do usuário.

### RF-EARS-006 — Tratar carta não encontrada

- **Condição**: quando o catálogo não retornar carta correspondente.
- **Gatilho**: após consulta de catálogo.
- **Resposta**: o sistema deve exibir mensagem de não encontrado e não criar item.

### RF-EARS-007 — Proibir adição à Wishlist

- **Condição**: quando o Scanner completar o fluxo.
- **Gatilho**: ao processar o resultado do OCR.
- **Resposta**: o sistema não deve criar nenhum item em `wishlist`.

### RF-EARS-008 — Cancelamento seguro

- **Condição**: quando o usuário cancelar o processo.
- **Gatilho**: ao tocar em cancelar.
- **Resposta**: o sistema deve voltar à tela anterior sem mutar dados.

## 3. Requisitos não funcionais em padrão EARS

### RNF-EARS-001 — Consistência de código

- **Condição**: quando o mesmo código confirmado for reprocessado.
- **Gatilho**: ao recarregar o fluxo Scanner.
- **Resposta**: o sistema deve apresentar o mesmo comportamento determinístico.

### RNF-EARS-002 — Privacidade de usuário

- **Condição**: quando o usuário usar o Scanner.
- **Gatilho**: ao adicionar carta à Estante.
- **Resposta**: o sistema deve associar o item ao `userId` autenticado.

### RNF-EARS-003 — Resiliência de OCR

- **Condição**: quando o OCR falhar ou retornar texto parcial.
- **Gatilho**: após o processamento da imagem.
- **Resposta**: o sistema deve permitir entrada manual de código e não depender exclusivamente do OCR.

## 4. Entidades de dados

### ScannerResult

- `imageUrl`
- `codigoDetectado`
- `codigoConfirmado`
- `status`

### EstanteItem

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

- **CA-001**: 100% dos uploads exibem código detectado ou campo manual.
- **CA-002**: 100% das confirmações de código disparam consulta apenas após confirmação do usuário.
- **CA-003**: 100% dos resultados válidos adicionam apenas à Estante.
- **CA-004**: 0% dos fluxos Scanner criam item na Wishlist.
- **CA-005**: 100% das falhas de catálogo mostram mensagem de não encontrado.

## 6. Dependências explícitas

- Serviço OCR disponível ou simulável.
- `json-server` expõe o recurso de Estante ou `cards` do usuário.
- `apiService/api.ts` fornece URL base para backend.
- Autenticação existente no app.
