# Implementation Plan: Explorar Cartas

**Branch**: `[003-explorar-cartas]` | **Date**: 2026-06-08 | **Spec**: [.specify/specs/003-explorar-cartas/spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-explorar-cartas/spec.md`

## Summary

Implementar a etapa de Explorar com busca por nome/código, filtros combináveis (coleção, Pokémon e tipo), detalhe da carta e adição à Wishlist somente por Explorar/detalhe. O recorte deve manter autenticação obrigatória e não introduzir escrita de Wishlist via Scanner.

## Caminhos encontrados antes da geração do plano

Arquivos existentes encontrados e relevantes:

- `src/app/home.tsx`
- `src/app/_layout.tsx`
- `src/app/index.tsx`
- `src/app/profile.tsx`
- `apiService/api.ts`
- `json-server/db.json`
- `json-server/db.backup.json`

Arquivos previstos para criar/alterar no recorte de Explorar:

- `src/app/explore.tsx` (novo)
- `src/app/card-detail.tsx` (novo, detalhe da carta)
- `src/services/CatalogService.ts` (novo)
- `src/services/WishlistService.ts` (novo)
- `src/types/explore.ts` (novo)
- `src/utils/BuscaUtils.ts` (novo)
- `src/app/home.tsx` (ajuste de navegação de Explorar e Wishlist)
- `src/app/_layout.tsx` (registro de novas rotas)
- `apiService/api.ts` (ajuste de cliente base se necessário)
- `json-server/db.json` (dados de catálogo e wishlist)

## Technical Context

**Language/Version**: TypeScript ~5.9.2

**Primary Dependencies**: Expo ^54.0.33, React Native 0.81.5, React 19.1.0, Expo Router ~6.0.23, AsyncStorage 2.2.0, json-server ^1.0.0-beta.3

**Storage**: json-server (`db.json`) para catálogo e wishlist; AsyncStorage para sessão de login

**Testing**: validação manual de busca/filtros/detalhe/escrita em wishlist; automação pode ser adicionada em etapa seguinte

**Target Platform**: Expo mobile Android/iOS

**Project Type**: app mobile com backend local de desenvolvimento

**Performance Goals**: renderização fluida da lista filtrada e detalhe de carta sem travamento perceptível no fluxo padrão

**Constraints**: autenticação obrigatória; Explorar não deve depender de Scanner; Scanner não pode adicionar Wishlist neste recorte

**Scale/Scope**: MVP do fluxo Explorar com descoberta e conversão para Wishlist

## Constitution Check

**Status**: PASS

Regras respeitadas:

- stack e versões atuais
- privacidade de usuário
- convenções de naming (Português + PascalCase)
- separação de responsabilidades (UI, serviço, utilitários)

## Risks not present in the spec

1. Estrutura atual ainda centraliza grande parte do comportamento em `home.tsx`, podendo gerar acoplamento se o recorte não separar responsabilidades cedo.
2. `db.json` e `db.backup.json` apresentam variação de schema, o que pode impactar filtros e persistência de wishlist.
3. A regra de non-regression de scanner→wishlist depende de pontos de integração ainda não isolados por serviço.
4. Critérios de sucesso falam em testes objetivos, mas a suíte automatizada não está estabelecida no projeto.

## Project Structure

### Documentation (this feature)

```text
specs/003-explorar-cartas/
├── plan.md
├── requirements.md
├── tasks.md
└── analyze.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── home.tsx
│   ├── _layout.tsx
│   ├── explore.tsx          # novo
│   └── card-detail.tsx      # novo
├── services/
│   ├── CatalogService.ts    # novo
│   └── WishlistService.ts   # novo
├── types/
│   └── explore.ts           # novo
└── utils/
    └── BuscaUtils.ts        # novo
apiService/
└── api.ts
json-server/
└── db.json
```

**Structure Decision**: criar rota dedicada para Explorar e detalhe, manter Home como ponto de entrada e mover leitura/escrita de catálogo/wishlist para serviços específicos.

## Delivery Plan

### Phase 0 — Research and alignment

1. Confirmar schema do catálogo em `db.json` para campos de filtro.
2. Confirmar schema da wishlist para evitar duplicidade por `cardId`.
3. Confirmar navegação de Home para rota Explorar.

### Phase 1 — Design and contracts

1. Definir tipo `Card` e tipo `ExploreFilter`.
2. Definir contrato do serviço de catálogo para busca + filtros combináveis.
3. Definir contrato do serviço de wishlist para upsert por `cardId`.

### Phase 2 — Implementation order

1. Criar `src/types/explore.ts`.
2. Criar `src/services/CatalogService.ts`.
3. Criar `src/services/WishlistService.ts`.
4. Criar `src/app/explore.tsx` (busca, filtros, lista).
5. Criar `src/app/card-detail.tsx`.
6. Ajustar `src/app/_layout.tsx` com as novas rotas.
7. Ajustar `src/app/home.tsx` para abrir Explorar e não exibir alertas “Em breve” para esse item.
8. Ajustar `json-server/db.json` para suportar filtros e wishlist.

## Quality Gates

- Explorar aplica filtros combináveis corretamente.
- Detalhe abre com metadados mínimos válidos.
- Add-to-wishlist cria/atualiza item sem duplicação por `cardId`.
- Nenhum evento exclusivamente de scanner grava na wishlist neste recorte.

## Open Questions

1. O filtro por Pokémon virá de campo dedicado no card ou parsing de nome no MVP?
2. O detalhe da carta precisa de paginação entre cartas (próxima/anterior) ou apenas tela estática?
3. A wishlist no MVP terá quantidade/nota já nesta etapa de Explorar?
