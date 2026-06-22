import BASE_URL from "../../apiService/api";
import type { Card } from "../types/explore";
import type { EstanteItem } from "../types/scanner";

export async function BuscarCartaNaEstante(userId: string, itemId: string): Promise<EstanteItem | null> {
  const resposta = await fetch(
    `${BASE_URL}/cards?userId=${encodeURIComponent(userId)}&id=${encodeURIComponent(itemId)}`,
  );

  if (!resposta.ok) {
    throw new Error("Falha ao verificar Estante");
  }

  const itens = (await resposta.json()) as EstanteItem[];
  return itens[0] || null;
}

export async function AdicionarCartaAEstante(userId: string, card: Card): Promise<EstanteItem> {
  const itemId = `estante-${userId}-${card.id}`;
  const existente = await BuscarCartaNaEstante(userId, itemId);

  if (existente) {
    throw new Error("Carta ja existe na Estante");
  }

  const agora = new Date().toISOString();
  const novoItem: EstanteItem = {
    id: itemId,
    userId,
    nome: card.nome,
    numero: card.codigo,
    set: card.colecao,
    raridade: card.raridade,
    imageUrl: card.imageUrl,
    capturadaEm: agora,
    updatedAt: agora,
  };

  const resposta = await fetch(`${BASE_URL}/cards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(novoItem),
  });

  if (!resposta.ok) {
    throw new Error("Falha ao adicionar carta na Estante");
  }

  return (await resposta.json()) as EstanteItem;
}
