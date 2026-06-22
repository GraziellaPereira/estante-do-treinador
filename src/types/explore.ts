export type Card = {
  id: string;
  nome: string;
  codigo: string;
  colecao: string;
  setId?: string;
  pokemon: string;
  tipo: string;
  serie?: string;
  imageUrl: string;
  raridade?: string;
  artista?: string;
  hp?: string;
  categoria?: string;
  estagio?: string;
  regulacao?: string;
  dataLancamento?: string | null;
  raridadeRank?: number;
  setLogoUrl?: string;
totalSetCards?: number;
capturada?: boolean;
  
};

export type ExploreFilter = {
  query: string;
  colecao: string;
  raridade: string;
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
