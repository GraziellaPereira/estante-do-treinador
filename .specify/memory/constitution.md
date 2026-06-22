# Constitution — Estante do Treinador

Este documento define regras, padrões e a "constituição" técnica do projeto. Deve ser seguido por todos os agentes e desenvolvedores. Qualquer exceção exige aprovação explícita do time.

**Data:** 2026-06-08

---

## 1. Stack e versões (NÃO NEGOCIÁVEIS)

- Plataforma: React Native (Expo)
  - `expo`: ^54.0.33
  - `react-native`: 0.81.5
  - `react`: 19.1.0
- Linguagem e tipagem:
  - `typescript`: ~5.9.2
- Backend de desenvolvimento/local:
  - `json-server`: ^1.0.0-beta.3 (uso local para `db.json`)
- Storage local no app:
  - `@react-native-async-storage/async-storage`: 2.2.0
- Ferramentas (recomendadas): Node.js >= 18.x LTS

Observação: versões acima são o padrão e não devem ser alteradas sem aprovação do time. Se for necessário atualizar, registrar RFC no repositório e executar testes de integração completos.

---

## 2. Estrutura de pastas (onde cada tipo de arquivo vai)

Use esta estrutura como convensão. Novos arquivos devem seguir estes diretórios:

- `App.tsx` — ponto de entrada do app (não mover sem aprovação).
- `app.json` / `index.ts` — configuração / bootstrap.
- `apiService/` — adaptadores HTTP e clientes de integração com APIs externas:
  - `api.ts` — cliente HTTP principal (fetch/axios wrapper).
- `json-server/` — dados de desenvolvimento:
  - `db.json` — catálogo local, usuários, wishlist, URLs de imagens.
- `src/` — código fonte do app:
  - `src/app/` — telas/rotas do Expo Router
    - `_layout.tsx` — layout e navegação inferior
    - `home.tsx` — tela inicial (exibe `Estante` e `Coleções`; **remover** aba "Minhas Fotos")
    - `explore.tsx` — tela Explorar
    - `scanner.tsx` — tela Scanner (upload + confirmação OCR)
    - `wishlist.tsx` — tela Wishlist
    - `profile.tsx` — tela Perfil
  - `src/components/` — componentes reutilizáveis (ex.: `CardItem.tsx`, `PhotoUpload.tsx`)
  - `src/services/` — serviços de domínio/integrações
    - `CatalogService.ts` — chamadas para API de catálogo
    - `OCRService.ts` — integração com serviço OCR (abstração)
    - `UploadService.ts` — upload de imagens para backend/json-server
  - `src/store/` — estado local/sincronização (ex.: `WishlistStore.ts`)
  - `src/screens/` — telas compostas, se necessário
  - `src/utils/` — utilitários (normalização de código, formatação)
  - `src/styles/` — temas e tokens (Dark/Gold theme)
- `assets/` — imagens estáticas e recursos visuais
- `.specify/` — documentos de especificação e memória (aqui fica esta `constitution.md`)

Observação: nomes de arquivos de componentes devem usar PascalCase, extensões `.tsx` para componentes React.

---

## 3. Padrões de código (Naming, imports, exports)

Regras obrigatórias:

- Identificadores (Componentes, Funções e Variáveis): usar **PascalCase** e nomes em **Português**.
  - Exemplos: `CardItem`, `PesquisarCarta`, `UsuarioLogado`, `UploadFoto`.
- Componentes React: Nome do arquivo = Nome do componente (ex.: `CardItem.tsx` exporta `CardItem`).
- Funções e métodos: PascalCase (mesma regra) — apesar de incomum, é a convenção do projeto.
- Constantes exportadas (quando representando tipos/enum): PascalCase.
- Imports:
  - Preferir imports nomeados (`named exports`) sempre que possível.
  - Evitar `default export` salvo quando for um componente único por arquivo **e** aprovado pelo time.
  - Ordem de imports: 1) bibliotecas externas, 2) `src/` absolutos (se configurado), 3) relativos (`./`, `../`).
- Exports:
  - Biblioteca interna: exportar via `index.ts` nos diretórios quando fizer sentido (barrel files).
- Formatação: seguir Prettier (config do repositório) e regras de lint aprovadas. Commit só com code formatado.

Observação técnica: a escolha de usar PascalCase para funções/variáveis foi definida pelo time e é uma regra do projeto.

---

## 4. Padrões arquiteturais

- Princípios: SOLID e Clean Code devem guiar todas as decisões de arquitetura e implementação.
- Separação de responsabilidades:
  - UI (componentes) apenas layout e eventos.
  - Serviços (`src/services/*`) encapsulam chamadas HTTP, lógica de integração e transformações de dados.
  - Store (`src/store/*`) controla estado de domínio e regras de sincronização (LWW: Last Write Wins no MVP).
  - Utils (`src/utils/*`) para helpers puros (normalização de código da carta, formatação de strings).
- Injeção de dependências e abstrações:
  - Não acoplar serviços diretamente a componentes; injetar via props ou hooks (ex.: `useCatalogService`).

---

## 5. Tratamento de erros (formato padrão)

- Dentro do app, erros seguem a estrutura padrão:

```json
{
  "codigo": "ERR_<MODULO>_<TIPO>",
  "mensagem": "Mensagem amigável para o usuário",
  "detalhes": {
    "info": "informações técnicas (opcional)"
  }
}
```

- Respostas HTTP (API) esperadas no formato:

```json
{ "sucesso": true, "dados": {...} }
{ "sucesso": false, "erro": { "codigo":"...","mensagem":"..." } }
```

- Padrões de tratamento:
  - Serviços lançam `Error` com payload padronizado; componentes consomem e convertem para mensagens amigáveis.
  - Logging: erros técnicos (stack, payload) devem ser registrados em console durante dev e enviados a sistema de logs em produção (quando houver).
  - Erros de validação do OCR ou de correspondência de código devem gerar um fluxo de confirmação manual (mensagem + campo editável para o código detectado).

---

## 6. Regras que o agente NUNCA deve violar

- NUNCA comitar credenciais (API keys, segredos) no repositório.
- NUNCA alterar o tema escuro/dourado global sem aprovação explícita do produto/design.
- NUNCA mudar as versões listadas em "Stack e versões" sem RFC e testes de regressão aprovados.
- NUNCA renomear arquivos ou mover `App.tsx` sem coordenação com o time.
- NUNCA expor dados de outros usuários; por especificação, um usuário só vê o seu próprio `profile` e conteúdo associado.
- NUNCA ignorar as convenções de nomeação (Português + PascalCase).
- NUNCA implementar OCR on-device sem antes avaliar custos/privacidade e aprovar a mudança (MVP é via API).

---

## 7. Tasks por funcionalidade (Spec-driven)

Cada bloco abaixo descreve responsabilidades, arquivos afetados e notas importantes.

### 7.1 Explorar

- Objetivo: busca e descoberta de cartas; filtros básicos; detalhe da carta.
- Arquivos/locais afetados:
  - `src/app/explore.tsx`
  - `src/components/CardItem.tsx`
  - `src/services/CatalogService.ts`
  - `apiService/api.ts`
  - `json-server/db.json` (dados de desenvolvimento)
- Notas:
  - Implementar busca por nome, código e filtros combináveis: coleção, Pokémon e tipo; normalizar código antes da consulta.
  - Ação de adicionar à `Wishlist` deve estar disponível a partir da lista e do detalhe.

### 7.2 Scanner

- Objetivo: upload de foto, OCR via API, extração do código (letras-hífen-número) e confirmação manual.
- Arquivos/locais afetados:
  - `src/app/scanner.tsx`
  - `src/services/OCRService.ts`
  - `src/services/UploadService.ts`
  - `apiService/api.ts`
- Notas:
  - Sempre perguntar ao usuário para confirmar o código extraído; não autoconfirmar.
  - Após confirmação do código, o fluxo do MVP **adiciona a carta à `Estante` do usuário** (POST em `estante`), e **NÃO** adiciona à `Wishlist`.
  - Abstrair provedor OCR para facilitar troca futura.

### 7.3 Wishlist

- Objetivo: CRUD de uma wishlist única por usuário; sincronização LWW.
- Arquivos/locais afetados:
  - `src/app/wishlist.tsx`
  - `src/store/WishlistStore.ts`
  - `src/services/UploadService.ts` (se itens incluírem fotos)
  - `apiService/api.ts` (endpoints de usuário/wishlist)
  - `json-server/db.json`
- Notas:
  - Estratégia de conflito: Last Write Wins com timestamps; gravar `updatedAt` em cada item.
  - **Importante:** a `Wishlist` **não** recebe adições via Scanner — itens só podem ser adicionados a partir de `Explorar` ou da tela de detalhe da carta.

### 7.4 Perfil

- Objetivo: gerenciar `nick`, `avatar`, `bio`, `fotos` (feed privado do usuário).
- Arquivos/locais afetados:
  - `src/app/profile.tsx`
  - `src/services/UploadService.ts`
  - `apiService/api.ts`
  - `json-server/db.json`
- Notas:
  - Upload de avatar e fotos deve enviar arquivo ao backend (json-server simulado) e persistir URL em `db.json`.
  - As fotos publicadas pelo usuário aparecem no `feed` do `profile`. A aba "Minhas Fotos" deve ser removida da `home` e não existir duplicação de telas para fotos.

### 7.5 Infra / Serviços Compartilhados

- `apiService/api.ts` — centralizar headers de autenticação (email/senha flow), tratamento de erros e retries básicos.
- `src/services/*` — encapsular integrações com catálogo, OCR e upload.

---

## 8. Observabilidade e Telemetria (mínimos)

- Registrar eventos: `BuscaCarta`, `ScanCarta`, `AdicionarWishlist`, `EditarProfile`.
- Registrar falhas críticas do OCR com `detalhes` para priorizar melhorias.

---

## 9. Change management

- Qualquer mudança nas regras acima precisa de RFC simples no repositório e aprovação do responsável técnico.

---

Fim do documento. Salve este arquivo em `.specify/memory/constitution.md` e referencie-o em PRs relacionados a arquitetura, naming ou infra.
