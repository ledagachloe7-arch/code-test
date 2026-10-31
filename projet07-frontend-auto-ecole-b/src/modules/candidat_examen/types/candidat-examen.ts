// Types pour les candidats aux examens
export interface CandidatExamen {
  id: string;
  candidat_id: string;
  session_examen_id: string;
  auto_ecole_id: string;
  formation_id: string;
  statut: CandidatExamenStatut;
  statut_libelle: string;
  date_inscription: string;
  date_examen?: string;
  commentaires?: string;
  resultat?: ResultatExamen;
  candidat: CandidatInfo;
  session_examen: SessionExamen;
  auto_ecole: AutoEcoleInfo;
  formation: FormationInfo;
  epreuves: EpreuveCandidat[];
  created_at: string;
  updated_at: string;
}

export interface CandidatInfo {
  id: string;
  numero_candidat: string;
  personne: {
    id: string;
    nom: string;
    prenom: string;
    nom_complet: string;
    email: string;
    contact: string;
    adresse: string;
  };
  date_naissance: string;
  lieu_naissance: string;
  nationalite: string;
  genre: 'M' | 'F';
  nip: string;
  type_piece: string;
  numero_piece: string;
}

export interface AutoEcoleInfo {
  id: string;
  nom_auto_ecole: string;
  adresse: string;
  email: string;
  contact: string;
}

export interface FormationInfo {
  id: string;
  nom: string;
  description: string;
  type_permis: {
    id: string;
    libelle: string;
    code: string;
  };
  montant: number;
  montant_formate: string;
}

export type CandidatExamenStatut = 
  | 'inscrit'
  | 'en_attente'
  | 'programme'
  | 'present'
  | 'absent'
  | 'reussi'
  | 'echoue'
  | 'annule';

export interface ResultatExamen {
  id: string;
  candidat_examen_id: string;
  note_finale: number;
  note_minimale: number;
  statut: 'reussi' | 'echoue';
  commentaires?: string;
  date_resultat: string;
  epreuves_resultats: EpreuveResultat[];
}

export interface EpreuveResultat {
  id: string;
  epreuve_id: string;
  note: number;
  note_maximale: number;
  statut: 'reussi' | 'echoue';
  commentaires?: string;
  correcteur_id?: string;
  correcteur?: {
    id: string;
    nom: string;
    prenom: string;
  };
}

// Types pour les formulaires
export interface CandidatExamenFormData {
  candidat_id: string;
  session_examen_id: string;
  auto_ecole_id: string;
  formation_id: string;
  commentaires?: string;
}

export interface CandidatExamenFilters {
  session_examen_id?: string;
  auto_ecole_id?: string;
  statut?: CandidatExamenStatut;
  search?: string;
  date_debut?: string;
  date_fin?: string;
}

// Types pour les réponses API
export interface CandidatExamenResponse {
  success: boolean;
  message: string;
  data?: CandidatExamen;
  errors?: Record<string, string[]>;
}

export interface CandidatExamenListResponse {
  data: CandidatExamen[];
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
export interface CandidatExamenStats {
  total: number;
  inscrits: number;
  programmes: number;
  presents: number;
  absents: number;
  reussis: number;
  echoues: number;
  annules: number;
  taux_reussite: number;
  taux_presence: number;
}
