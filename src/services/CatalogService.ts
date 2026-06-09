import BASE_URL from "../../apiService/api";
import type { Card, ExploreFilter } from "../types/explore";
import { CartaAtendeFiltros } from "../utils/BuscaUtils";

type CatalogCardApi = Partial<Card> & {
  numero?: string;
  set?: string;
};

function MapearCarta(item: CatalogCardApi): Card | null {
  const id = String(item.id || "").trim();
  const nome = String(item.nome || "").trim();
  const codigo = String(item.codigo || item.numero || "").trim();

  if (!id || !nome || !codigo) {
    return null;
  }

  return {
    id,
    nome,
    codigo,
    colecao: String(item.colecao || item.set || "Sem colecao").trim(),
    pokemon: String(item.pokemon || nome.split(" ")[0] || "Desconhecido").trim(),
    tipo: String(item.tipo || item.raridade || "Carta").trim(),
    imageUrl: String(item.imageUrl || "").trim(),
    raridade: item.raridade,
  };
}

async function BuscarRecurso(caminho: "catalogCards" | "cards") {
  const resposta = await fetch(`${BASE_URL}/${caminho}`);

  if (!resposta.ok) {
    throw new Error("Falha ao carregar catalogo");
  }

  return (await resposta.json()) as CatalogCardApi[];
}

export async function ListarCatalogo(): Promise<Card[]> {
  try {
    const catalogo = await BuscarRecurso("catalogCards");
    return catalogo.map(MapearCarta).filter(Boolean) as Card[];
  } catch {
    const cardsUsuario = await BuscarRecurso("cards");
    return cardsUsuario.map(MapearCarta).filter(Boolean) as Card[];
  }
}

export async function BuscarCartaPorId(cardId: string): Promise<Card | null> {
  const catalogo = await ListarCatalogo();
  return catalogo.find((card) => card.id === cardId) || null;
}

export async function BuscarCartas(filtros: ExploreFilter): Promise<Card[]> {
  const catalogo = await ListarCatalogo();
  return catalogo.filter((card) => CartaAtendeFiltros(card, filtros));
}
