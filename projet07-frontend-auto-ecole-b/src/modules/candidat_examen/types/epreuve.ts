// Types pour les épreuves d'examen
export interface Epreuve {
  id: string;
  nom: string;
  code: string;
  description?: string;
  type_epreuve: TypeEpreuve;
  duree_minutes: number;
  note_maximale: number;
  note_minimale: number;
  ordre: number;
  statut: boolean;
  statut_libelle: string;
  created_at: string;
  updated_at: string;
}

export type TypeEpreuve = 
  | 'theorique'
  | 'pratique'
  | 'orale';

export interface EpreuveSession {
  id: string;
  session_examen_id: string;
  epreuve_id: string;
  epreuve: Epreuve;
  date_epreuve: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  capacite_maximale: number;
  capacite_utilisee: number;
  correcteur_id?: string;
  correcteur?: CorrecteurInfo;
  statut: EpreuveSessionStatut;
  statut_libelle: string;
  candidats: CandidatEpreuve[];
  created_at: string;
  updated_at: string;
}

export interface CorrecteurInfo {
  id: string;
  nom: string;
  prenom: string;
  nom_complet: string;
  email: string;
  contact: string;
  specialite: string;
  numero_agrement: string;
}

export type EpreuveSessionStatut = 
  | 'planifiee'
  | 'en_cours'
  | 'terminee'
  | 'annulee';

export interface CandidatEpreuve {
  id: string;
  candidat_examen_id: string;
  epreuve_session_id: string;
  statut: CandidatEpreuveStatut;
  statut_libelle: string;
  note?: number;
  commentaires?: string;
  date_presence?: string;
  candidat_examen: CandidatExamenInfo;
  epreuve_session: EpreuveSessionInfo;
  created_at: string;
  updated_at: string;
}

export interface CandidatExamenInfo {
  id: string;
  candidat: {
    id: string;
    numero_candidat: string;
    personne: {
      nom: string;
      prenom: string;
      nom_complet: string;
    };
  };
}

export interface EpreuveSessionInfo {
  id: string;
  epreuve: {
    id: string;
    nom: string;
    code: string;
    type_epreuve: TypeEpreuve;
  };
  date_epreuve: string;
  heure_debut: string;
  heure_fin: string;
}

export type CandidatEpreuveStatut = 
  | 'inscrit'
  | 'present'
  | 'absent'
  | 'reussi'
  | 'echoue'
  | 'annule';

// Types pour les formulaires
export interface EpreuveFormData {
  nom: string;
  code: string;
  description?: string;
  type_epreuve: TypeEpreuve;
  duree_minutes: number;
  note_maximale: number;
  note_minimale: number;
  ordre: number;
  statut: boolean;
}

export interface EpreuveSessionFormData {
  session_examen_id: string;
  epreuve_id: string;
  date_epreuve: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  capacite_maximale: number;
  correcteur_id?: string;
}

// Types pour les réponses API
export interface EpreuveResponse {
  success: boolean;
  message: string;
  data?: Epreuve;
  errors?: Record<string, string[]>;
}

export interface EpreuveListResponse {
  data: Epreuve[];
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
