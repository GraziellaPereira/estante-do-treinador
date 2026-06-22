export type EstanteItem = {
  id: string;
  userId: string;
  cardId?: string;
  nome?: string;
  numero?: string;
  set?: string;
  raridade?: string;
  imageUrl?: string;
  capturadaEm?: string; // data ISO quando foi adicionada
  createdAt?: string;
  updatedAt?: string;
};

export type ScannerResult = {
  imageUrl?: string;
  codigoDetectado?: string;
  codigoConfirmado?: string;
  status?: string;
};
