// Types pour la gestion des pièces justificatives
export interface PieceJustificative {
  id: string;
  /** UUID utilisé par l'API pour DELETE/PUT (pieces_justificative). */
  pieces_justificative?: string;
  etape_id: string;
  type_document_id: string;
  code: string;
  libelle: string;
  format_attendu: string;
  obligatoire: boolean;
  delivery_date: string;
  expiration_date: string;
  created_at: string;
  updated_at: string;
}

export interface PieceJustificativeFormData {
  etape_id: string;
  type_document_id: string;
  code: string;
  libelle: string;
  format_attendu: string;
  obligatoire: boolean;
  delivery_date: string;
  expiration_date: string;
}

export interface PieceJustificativeResponse {
  success: boolean;
  message: string;
  data?: PieceJustificative;
  errors?: Record<string, string[]>;
}

export interface PieceJustificativeListResponse {
  data: PieceJustificative[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface PieceJustificativeFilters {
  search?: string;
  etape_id?: string;
  type_document_id?: string;
  obligatoire?: boolean;
}

