// Types pour les sessions d'examen
export interface SessionExamen {
  id: string;
  nom: string;
  description?: string;
  type_permis_id: string;
  type_permis: TypePermisInfo;
  date_debut: string;
  date_fin: string;
  statut: SessionExamenStatut;
  statut_libelle: string;
  capacite_maximale: number;
  capacite_utilisee: number;
  lieu: string;
  adresse: string;
  responsable_id: string;
  responsable: ResponsableInfo;
  epreuves: EpreuveSession[];
  candidats: CandidatExamen[];
  type_epreuve?: 'tour_ville' | 'creneaux' | 'code_route';
  created_at: string;
  updated_at: string;
}

export interface TypePermisInfo {
  id: string;
  libelle: string;
  code: string;
  categorie: string;
  description: string;
}

export interface ResponsableInfo {
  id: string;
  nom: string;
  prenom: string;
  nom_complet: string;
  email: string;
  contact: string;
  fonction: string;
}

export type SessionExamenStatut = 
  | 'planifiee'
  | 'ouverte'
  | 'fermee'
  | 'en_cours'
  | 'terminee'
  | 'annulee';

// Types pour les formulaires
export interface SessionExamenFormData {
  nom: string;
  description?: string;
  type_permis_id: string;
  date_debut: string;
  date_fin: string;
  capacite_maximale: number;
  lieu: string;
  adresse: string;
  responsable_id: string;
}

export interface SessionExamenFilters {
  type_permis_id?: string;
  statut?: SessionExamenStatut;
  date_debut?: string;
  date_fin?: string;
  search?: string;
  responsable_id?: string;
}

// Types pour les réponses API
export interface SessionExamenResponse {
  success: boolean;
  message: string;
  data?: SessionExamen;
  errors?: Record<string, string[]>;
}

export interface SessionExamenListResponse {
  data: SessionExamen[];
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

// Types pour les statistiques
export interface SessionExamenStats {
  total: number;
  planifiees: number;
  ouvertes: number;
  fermees: number;
  en_cours: number;
  terminees: number;
  annulees: number;
  capacite_totale: number;
  capacite_utilisee: number;
  taux_occupation: number;
}
