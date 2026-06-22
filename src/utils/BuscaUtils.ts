import type { Card, ExploreFilter } from "../types/explore";

export const FILTRO_TODOS = "Todos";

export function NormalizarTexto(valor: string | undefined | null) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function NormalizarCodigo(valor: string | undefined | null) {
  return NormalizarTexto(valor).replace(/\s+/g, "");
}

export function CartaAtendeFiltros(card: Card, filtros: ExploreFilter) {
  const query = NormalizarTexto(filtros.query);
  const queryCodigo = NormalizarCodigo(filtros.query);

  const atendeQuery =
    !query ||
    NormalizarTexto(card.nome).includes(query) ||
    NormalizarCodigo(card.codigo).includes(queryCodigo);

  const atendeColecao =
    filtros.colecao === FILTRO_TODOS ||
    // filtros.colecao pode ser o id da coleção (quando vindo do TCGdex) ou o nome
    (card.setId && card.setId === filtros.colecao) ||
    NormalizarTexto(card.colecao) === NormalizarTexto(filtros.colecao);

  const atendeRaridade =
    filtros.raridade === FILTRO_TODOS ||
    NormalizarTexto(card.raridade) === NormalizarTexto(filtros.raridade);

  const atendeTipo =
    filtros.tipo === FILTRO_TODOS ||
    NormalizarTexto(card.tipo) === NormalizarTexto(filtros.tipo);

  return atendeQuery && atendeColecao && atendeRaridade && atendeTipo;
}

export function OpcoesUnicas(cards: Card[], campo: keyof Pick<Card, "colecao" | "pokemon" | "tipo" | "raridade">) {
  const valores = cards
    .map((card) => String(card[campo] || ""))
    .map((v) => v.trim())
    .filter((valor) => valor.length > 0);

  return [FILTRO_TODOS, ...Array.from(new Set(valores)).sort((a, b) => a.localeCompare(b))];
}
