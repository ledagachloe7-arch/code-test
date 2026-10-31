// Types pour la gestion de dossier
import { Dossier, DossierFormData } from './auto-ecole';

export interface GestionDossierFilters {
  search?: string;
  statut?: 'en_attente' | 'en_cours' | 'valide' | 'rejete' | 'transmis' | 'Cnepc';
  auto_ecole_id?: string;
  formation_id?: string;
  type_demande_id?: string;
  date_debut?: string;
  date_fin?: string;
}

export interface GestionDossierListResponse {
  data: Dossier[];
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

export interface GestionDossierResponse {
  success: boolean;
  message: string;
  data?: Dossier;
  errors?: Record<string, string[]>;
}

export interface GestionDossierStats {
  total: number;
  en_attente: number;
  en_cours: number;
  valide: number;
  rejete: number;
  transmis: number;
  cnepc: number;
}

// Réexporter les types de dossier existants
export type { Dossier, DossierFormData };

