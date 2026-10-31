// Types pour la gestion des types de demande
export interface TypeDemande {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TypeDemandeFormData {
  name: string;
}

export interface TypeDemandeResponse {
  success: boolean;
  message: string;
  data?: TypeDemande;
  errors?: Record<string, string[]>;
}

export interface TypeDemandeListResponse {
  data: TypeDemande[];
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

export interface TypeDemandeFilters {
  search?: string;
}

