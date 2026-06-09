# Implementation Plan: Perfil do Usuário

**Branch**: `[002-perfil-do-usuario]` | **Date**: 2026-06-08 | **Spec**: [.specify/specs/002-perfil-do-usuario/spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-perfil-do-usuario/spec.md`

## Summary

Implementar uma área de Perfil privada, acessível somente ao usuário autenticado, com edição de nick, avatar e bio, publicação de fotos no feed do próprio perfil e remoção de qualquer atalho de fotos duplicado na Home. O MVP deve reutilizar a stack atual do app Expo/React Native com json-server local, preservando a constituição do projeto e concentrando a lógica de persistência em serviços dedicados.

## Caminhos encontrados antes da geração do plano

Arquivos e pontos de contato já identificados no código atual para este recorte:

- `src/app/home.tsx` — hoje concentra navegação, sessão, fotos, folders e alertas de "Em breve" para Perfil.
- `src/app/index.tsx` — login/cadastro e persistência da sessão atual.
- `src/app/_layout.tsx` — stack de rotas do Expo Router.
- `apiService/api.ts` — base URL do backend local.
- `json-server/db.json` — estado local do desenvolvimento.
- `json-server/db.backup.json` — backup de estado local com variação de esquema.
- `.specify/memory/constitution.md` — restrições não negociáveis de stack, naming e arquitetura.
- `.specify/specs/002-perfil-do-usuario/spec.md` — spec do recorte de Perfil.
- `.specify/specs/002-perfil-do-usuario/requirements.md` — requisitos EARS do recorte de Perfil.

Arquivos que o plano prevê criar ou alterar para entregar o Perfil:

- `src/app/profile.tsx` — nova tela do perfil do usuário.
- `src/services/ProfileService.ts` — serviço de domínio do perfil.
- `src/services/UploadService.ts` — encapsular upload de avatar e fotos.
- `src/types/profile.ts` — tipos compartilhados do perfil.
- `src/utils/session.ts` — helpers de sessão autenticada e resolução do usuário atual.
- `src/components/ProfilePhotoCard.tsx` — componente para feed de fotos.
- `src/components/ProfileHeader.tsx` — componente para cabeçalho do perfil.
- `src/app/home.tsx` — remover/ocultar `Minhas fotos` e apontar navegação para Perfil.
- `src/app/_layout.tsx` — registrar opções da nova rota de perfil, se necessário.
- `apiService/api.ts` — consolidar chamadas e contratos para perfil/upload.
- `json-server/db.json` — ajustar o schema local para `profile`, `profilePhotos` e sessão de usuário.

## Technical Context

**Language/Version**: TypeScript ~5.9.2

**Primary Dependencies**: Expo ^54.0.33, React Native 0.81.5, React 19.1.0, Expo Router ~6.0.23, AsyncStorage 2.2.0, json-server ^1.0.0-beta.3, expo-image-picker ~17.0.10

**Storage**: json-server local com `db.json` como persistência de desenvolvimento; AsyncStorage somente para sessão local de login

**Testing**: Validação manual da navegação e persistência no app; testes unitários/integração a definir na fase de tasks com foco em serviços e normalização de dados

**Target Platform**: Mobile Expo (Android/iOS) com backend local de desenvolvimento via json-server

**Project Type**: Mobile app com backend local de desenvolvimento

**Performance Goals**: Carregamento do perfil e feed em uma única ida ao backend local; evitar chamadas redundantes para o mesmo usuário; upload de imagem deve permanecer responsivo no fluxo móvel

**Constraints**: Stack e versões da constitution são não negociáveis; usuário autenticado só pode ver o próprio perfil; OCR e scanner não pertencem a este recorte; a Home não pode exibir `Minhas Fotos`

**Scale/Scope**: MVP de app mobile com perfil privado, feed de fotos do próprio usuário e uma navegação reduzida na Home

## Constitution Check

**Status**: PASS

A constituição não foi violada neste recorte. O plano respeita:

- Expo/React Native/TypeScript nas versões atuais
- JSON Server como backend local de desenvolvimento
- PascalCase e nomes em português para componentes, funções e variáveis
- Clean Code e SOLID via separação de UI, serviços e utilitários
- Regra de privacidade: um usuário só vê o próprio perfil
- Regra de erro: uploads sem URL e acesso indevido devem ser tratados explicitamente

## Risks not present in the spec

1. **Sessão baseada em username em vez de userId**: o app atual grava o usuário autenticado como string em AsyncStorage; isso pode fragilizar a identificação do dono do perfil quando houver refino de cadastro, mudança de nickname ou consistência entre telas.
2. **Perfil ainda não existe como rota dedicada**: hoje o Perfil é apenas um item de navegação "Em breve" dentro de `home.tsx`, então a criação da tela exigirá refatoração de navegação e remoção de dependências hoje acopladas à Home.
3. **Home concentra fotos e folders**: a tela Home atualmente possui lógica de criação, edição e exclusão de pastas/fotos; o recorte de Perfil exige remover a duplicação de fotos e separar responsabilidades para não quebrar a Home.
4. **Esquema do json-server é inconsistente**: `db.json` e `db.backup.json` têm estruturas diferentes para usuários, cards, collections, folders e photos; isso pode exigir normalização antes de estabilizar o perfil.
5. **Uploads usam caminhos locais `file://` em dados de dev**: o MVP do perfil precisa persistir URLs válidas retornadas pelo upload, não caminhos locais do dispositivo.
6. **Autenticação atual guarda somente nome de usuário**: o fluxo de login/cadastro precisa ser revisado para suportar leitura segura do perfil privado sem depender de dados de UI.

## Project Structure

### Documentation (this feature)

```text
specs/002-perfil-do-usuario/
├── plan.md
├── research.md           # a ser criado na fase de pesquisa, se necessário
├── data-model.md         # a ser criado na fase de design, se necessário
├── quickstart.md         # a ser criado na fase de design, se necessário
└── contracts/            # opcional, apenas se surgirem contratos formais
```

### Source Code (repository root)

```text
App.tsx
app.json
index.ts
apiService/
└── api.ts
json-server/
├── db.json
└── db.backup.json
src/
├── app/
│   ├── _layout.tsx
│   ├── home.tsx
│   ├── index.tsx
│   └── profile.tsx              # novo
├── components/
│   ├── ProfileHeader.tsx        # novo
│   └── ProfilePhotoCard.tsx     # novo
├── services/
│   ├── ProfileService.ts        # novo
│   └── UploadService.ts         # novo
├── types/
│   └── profile.ts               # novo
└── utils/
    └── session.ts               # novo
```

**Structure Decision**: Projeto mobile Expo com persistência local em json-server. O recorte de Perfil exige criar uma rota dedicada em `src/app/profile.tsx`, deslocar a responsabilidade de fotos do fluxo Home para o Perfil e centralizar o acesso ao backend em serviços em `src/services/*`.

## Delivery Plan

### Phase 0 — Research and alignment

1. Validar o contrato real de usuário atualmente salvo em AsyncStorage.
2. Confirmar como o json-server representa `users`, `photos` e possíveis novos recursos do perfil.
3. Confirmar se o fluxo de upload vai retornar URL diretamente ou se o app vai simular um endpoint local no MVP.
4. Validar a navegação do Expo Router para inclusão de `profile.tsx`.

### Phase 1 — Design and contracts

1. Definir o modelo de dados do Perfil, incluindo `User`, `ProfilePhoto` e `AuthSession`.
2. Definir o contrato de persistência de avatar e fotos em `db.json`.
3. Definir o contrato de leitura do usuário autenticado e de bloqueio de terceiros.
4. Definir o comportamento da Home para remover `Minhas Fotos` e manter apenas `Estante` e `Coleções`.

### Phase 2 — Implementation order

1. Criar `src/utils/session.ts` para resolver a sessão autenticada de forma reutilizável.
2. Criar `src/services/ProfileService.ts` para leitura e escrita do perfil.
3. Criar `src/services/UploadService.ts` para upload de avatar e fotos.
4. Criar `src/app/profile.tsx` com tela de visualização e edição.
5. Criar `src/components/ProfileHeader.tsx` e `src/components/ProfilePhotoCard.tsx`.
6. Refatorar `src/app/home.tsx` para remover `Minhas fotos` e redirecionar a experiência de fotos para o Perfil.
7. Ajustar `apiService/api.ts` e `json-server/db.json` para suportar o novo schema do perfil.
8. Ajustar `src/app/_layout.tsx` se for necessário registrar a rota com opções específicas.

## Data Model

### User

- `id`
- `email`
- `passwordRef`
- `nick`
- `avatarUrl`
- `bio`

### ProfilePhoto

- `id`
- `userId`
- `imageUrl`
- `caption`
- `createdAt`

### AuthSession

- `userId`
- `sessionToken`
- `expiresAt`

## API and Integration Notes

- O perfil deve ser carregado somente para o usuário autenticado.
- O backend local precisa aceitar upload de imagem e devolver URL persistível.
- A foto publicada deve ser persistida como URL, não como caminho local do dispositivo.
- O acesso a outro usuário deve ser bloqueado no nível de UI e de leitura de dados.

## Quality Gates

- O Perfil deve renderizar somente dados do usuário autenticado.
- O upload de avatar ou foto sem URL válida deve falhar.
- A Home deve continuar exibindo apenas `Estante` e `Coleções`.
- Não pode existir navegação duplicada para fotos fora do Perfil.
- O plano não pode introduzir OCR, Scanner ou Wishlist neste recorte.

## Non-Functional Considerations

- Separação de responsabilidades entre UI, serviço e utilitários.
- Reutilização do fluxo de sessão já existente, com endurecimento da identificação do usuário atual.
- Estrutura de código em PascalCase e nomes em português, conforme constitution.
- Erros de upload, perfil inexistente ou acesso indevido devem retornar mensagens amigáveis e verificáveis.

## Open Questions

1. A autenticação continuará guardando apenas o nome do usuário ou será migrada para guardar `id` + nome de exibição?
2. O upload de foto do perfil será simulado localmente no `json-server` ou haverá endpoint externo desde o início?
3. A exibição de fotos do perfil será apenas em lista simples ou já terá agrupamento/ordenação adicional no MVP?
4. O nome de exibição (`nick`) será distinto do login (`usuario`) em todas as telas?
