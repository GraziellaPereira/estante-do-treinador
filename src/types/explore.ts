export type Card = {
  id: string;
  nome: string;
  codigo: string;
  colecao: string;
  pokemon: string;
  tipo: string;
  imageUrl: string;
  raridade?: string;
};

export type ExploreFilter = {
  query: string;
  colecao: string;
  pokemon: string;
  tipo: string;
};

export type WishlistItem = {
  id: string;
  userId: string;
  cardId: string;
  createdAt: string;
  updatedAt: string;
};

export type UsuarioApi = {
  id?: string | number;
  usuario: string;
  senha?: string;
};
