import BASE_URL from "../../apiService/api";
import type { WishlistItem } from "../types/explore";

export async function BuscarWishlist(userId: string): Promise<WishlistItem[]> {
  const resposta = await fetch(`${BASE_URL}/wishlist?userId=${encodeURIComponent(userId)}`);

  if (!resposta.ok) {
    throw new Error("Falha ao carregar wishlist");
  }

  return (await resposta.json()) as WishlistItem[];
}

export async function UpsertWishlistItem(userId: string, cardId: string): Promise<WishlistItem> {
  const existentes = await BuscarWishlist(userId);
  const existente = existentes.find((item) => item.cardId === cardId);
  const agora = new Date().toISOString();

  if (existente) {
    const atualizado = {
      ...existente,
      updatedAt: agora,
    };

    const resposta = await fetch(`${BASE_URL}/wishlist/${encodeURIComponent(existente.id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(atualizado),
    });

    if (!resposta.ok) {
      throw new Error("Falha ao atualizar wishlist");
    }

    return (await resposta.json()) as WishlistItem;
  }

  const novoItem: WishlistItem = {
    id: `wishlist-${userId}-${cardId}`,
    userId,
    cardId,
    createdAt: agora,
    updatedAt: agora,
  };

  const resposta = await fetch(`${BASE_URL}/wishlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(novoItem),
  });

  if (!resposta.ok) {
    throw new Error("Falha ao salvar wishlist");
  }

  return (await resposta.json()) as WishlistItem;
}
