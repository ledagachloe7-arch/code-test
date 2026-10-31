// Types pour la gestion des créneaux d'examen
export interface Creneau {
  id: string;
  epreuve_session_id: string;
  epreuve_session: EpreuveSessionInfo;
  date: string;
  heure_debut: string;
  heure_fin: string;
  duree_minutes: number;
  capacite_maximale: number;
  capacite_utilisee: number;
  statut: CreneauStatut;
  statut_libelle: string;
  candidats: CandidatCreneau[];
  created_at: string;
  updated_at: string;
}

export interface EpreuveSessionInfo {
  id: string;
  epreuve: {
    id: string;
    nom: string;
    code: string;
    type_epreuve: 'theorique' | 'pratique' | 'orale';
  };
  session_examen: {
    id: string;
    nom: string;
    type_permis: {
      libelle: string;
      code: string;
    };
  };
}

export interface CandidatCreneau {
  id: string;
  candidat_examen_id: string;
  creneau_id: string;
  statut: CandidatCreneauStatut;
  statut_libelle: string;
  ordre_passage: number;
  commentaires?: string;
  candidat_examen: CandidatExamenCreneau;
  created_at: string;
  updated_at: string;
}

export interface CandidatExamenCreneau {
  id: string;
  candidat: {
    id: string;
    numero_candidat: string;
    personne: {
      nom: string;
      prenom: string;
      nom_complet: string;
      contact: string;
    };
  };
  auto_ecole: {
    id: string;
    nom_auto_ecole: string;
  };
  formation: {
    id: string;
    nom: string;
    type_permis: {
      libelle: string;
    };
  };
}

export type CreneauStatut = 
  | 'disponible'
  | 'complet'
  | 'en_cours'
  | 'termine'
  | 'annule';

export type CandidatCreneauStatut = 
  | 'inscrit'
  | 'present'
  | 'absent'
  | 'reussi'
  | 'echoue'
  | 'annule';

// Types pour les formulaires
export interface CreneauFormData {
  epreuve_session_id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  capacite_maximale: number;
}

export interface CandidatCreneauFormData {
  candidat_examen_id: string;
  creneau_id: string;
  ordre_passage: number;
  commentaires?: string;
}

export interface CreneauFilters {
  epreuve_session_id?: string;
  date?: string;
  statut?: CreneauStatut;
  search?: string;
}

// Types pour les réponses API
export interface CreneauResponse {
  success: boolean;
  message: string;
  data?: Creneau;
  errors?: Record<string, string[]>;
}

export interface CreneauListResponse {
  data: Creneau[];
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
export interface CreneauStats {
  total: number;
  disponibles: number;
  complets: number;
  en_cours: number;
  termines: number;
  annules: number;
  capacite_totale: number;
  capacite_utilisee: number;
  taux_occupation: number;
}

// Types pour la planification automatique
export interface PlanificationCreneaux {
  epreuve_session_id: string;
  date_debut: string;
  date_fin: string;
  duree_creneau_minutes: number;
  pause_entre_creneaux_minutes: number;
  heure_debut_journee: string;
  heure_fin_journee: string;
  capacite_par_creneau: number;
  jours_travailles: number[]; // 0=dimanche, 1=lundi, etc.
}

export interface PlanificationResult {
  creneaux_crees: Creneau[];
  candidats_affectes: CandidatCreneau[];
  statistiques: {
    nombre_creneaux: number;
    nombre_candidats_affectes: number;
    capacite_totale: number;
    taux_occupation_moyen: number;
  };
}
