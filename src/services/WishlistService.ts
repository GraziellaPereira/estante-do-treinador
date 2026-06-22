import BASE_URL from "../../apiService/api";
import type { WishlistItem } from "../types/explore";

function limparId(valor: string) {
  return String(valor || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-");
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const resposta = await fetch(url, options);
  const texto = await resposta.text().catch(() => "");

  if (!resposta.ok) {
    throw new Error(texto || `Erro HTTP ${resposta.status}`);
  }

  if (!texto) return (null as T);
  try {
    return JSON.parse(texto) as T;
  } catch (e) {
    throw new Error('Resposta JSON inválida do servidor');
  }
}

export async function BuscarWishlist(userId: string): Promise<WishlistItem[]> {
  const idUsuario = String(userId || "").trim();

  if (!idUsuario) {
    return [];
  }

  const endpoints = ["wishlist", "wishlistItems", "wishlists"];

  for (const endpoint of endpoints) {
    try {
      const itens = await fetchJson<WishlistItem[]>(
        `${BASE_URL}/${endpoint}?userId=${encodeURIComponent(idUsuario)}`,
      );

      return Array.isArray(itens) ? itens : [];
    } catch {
      // tenta o próximo endpoint para manter compatibilidade com db.json antigo
    }
  }

  return [];
}

export async function UpsertWishlistItem(
  userId: string,
  cardId: string,
): Promise<WishlistItem> {
  const idUsuario = String(userId || "").trim();
  const idCarta = String(cardId || "").trim();

  if (!idUsuario || !idCarta) {
    throw new Error("userId e cardId são obrigatórios para atualizar a Wishlist.");
  }

  const existente = await BuscarWishlist(idUsuario);
  const itemExistente = existente.find(
    (item) => String(item.cardId) === idCarta,
  );

  if (itemExistente) {
    return itemExistente;
  }

  const agora = new Date().toISOString();
  const novoItem: WishlistItem = {
    id: `wishlist-${limparId(idUsuario)}-${limparId(idCarta)}`,
    userId: idUsuario,
    cardId: idCarta,
    createdAt: agora,
    updatedAt: agora,
  };

  try {
    return await fetchJson<WishlistItem>(`${BASE_URL}/wishlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(novoItem),
    });
  } catch (error) {
    const depoisDoErro = await BuscarWishlist(idUsuario);
    const itemCriadoMesmoAssim = depoisDoErro.find(
      (item) => String(item.cardId) === idCarta,
    );

    if (itemCriadoMesmoAssim) {
      return itemCriadoMesmoAssim;
    }

    throw error;
  }
}

export async function RemoverWishlistItem(itemId: string): Promise<void> {
  const idItem = String(itemId || "").trim();

  if (!idItem) {
    return;
  }

  const endpoints = ["wishlist", "wishlistItems", "wishlists"];

  for (const endpoint of endpoints) {
    try {
      await fetchJson(`${BASE_URL}/${endpoint}/${encodeURIComponent(idItem)}`, {
        method: "DELETE",
      });
      return;
    } catch {
      // tenta o próximo endpoint para compatibilidade
    }
  }
}
