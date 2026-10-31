// Types pour la gestion des auto-écoles
export interface AutoEcole {
  id: string;
  nom_auto_ecole: string;
  adresse: string;
  email: string;
  contact: string;
  statut: boolean;
  statut_libelle: string;
  responsable_id: string;
  responsable: Personne;
  formations?: Formation[];
  dossiers?: Dossier[];
  created_at: string;
  updated_at: string;
}

export interface Personne {
  id: string;
  utilisateur_id?: string;
  nom: string;
  prenom: string;
  nom_complet?: string;
  email: string;
  contact: string;
  adresse: string;
  created_at: string;
  updated_at: string;
}

export interface AutoEcoleFormData {
  nom_auto_ecole: string;
  adresse: string;
  email: string;
  contact: string;
  statut: boolean;
  responsable_id: string;
  province_id?: string;
}

export interface Candidat {
  id: string;
  personne_id: string;
  numero_candidat: string;
  date_naissance: string;
  lieu_naissance: string;
  nip: string;
  type_piece: string;
  numero_piece: string;
  nationalite: string;
  genre: string;
  age?: number | string;
  personne: Personne;
  dossiers?: Dossier[];
  created_at: string;
  updated_at: string;
}

export interface Formation {
  id: string;
  auto_ecole_id: string;
  type_permis_id: string;
  montant?: number;
  montant_formate?: string;
  nom?: string;
  description?: string;
  prix?: number;
  duree_jours?: number;
  session_id?: string;
  statut: boolean;
  statut_libelle?: string;
  auto_ecole?: AutoEcole;
  typePermis?: TypePermis | Referentiel;
  type_permis?: TypePermis | Referentiel;
  session?: Referentiel;
  dossiers?: Dossier[];
  created_at: string;
  updated_at: string;
}

export interface TypePermis {
  id: string;
  nom: string;
  categorie: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Referentiel {
  id: string;
  libelle: string;
  code: string;
  type_ref: string;
  description?: string;
  statut: boolean;
  statut_libelle: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  dossier_id: string;
  type_document_id?: string;
  nom?: string;
  nom_fichier?: string;
  type?: string;
  chemin_fichier: string;
  type_mime?: string;
  taille_fichier?: number;
  taille_fichier_formate?: string;
  statut?: string;
  valide?: boolean;
  valide_libelle?: string;
  date_upload?: string;
  commentaires?: string;
  dossier?: Dossier;
  type_document?: Referentiel;
  created_at: string;
  updated_at: string;
}

export interface Dossier {
  id: string;
  candidat_id: string;
  auto_ecole_id?: string;
  formation_id?: string;
  type_demande_id?: string;
  referenciel_id?: string;
  type_demande?: {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  };
  referentiel?: Referentiel;
  statut: 'en_attente' | 'en_cours' | 'valide' | 'rejete' | 'transmis' | 'Cnepc';
  date_creation: string;
  date_modification: string;
  commentaires?: string;
  candidat: Candidat;
  formation?: Formation;
  documents: Document[];
  created_at: string;
  updated_at: string;
}

export interface MesDossiersResponse {
  success: boolean;
  auto_ecole: AutoEcole;
  dossiers: Dossier[];
  statistiques: {
    total: number;
    en_attente: number;
    en_cours: number;
    valide: number;
    rejete: number;
  };
}

export interface AutoEcoleResponse {
  success: boolean;
  message: string;
  data?: AutoEcole;
  errors?: Record<string, string[]>;
}

export interface AutoEcoleListResponse {
  data: AutoEcole[];
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

export interface CandidatListResponse {
  data: Candidat[];
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

export interface FormationFormData {
  auto_ecole_id: string;
  type_permis_id: string;
  montant: number;
  description?: string;
  session_id: string;
  statut: boolean;
  // Champs optionnels pour compatibilité
  nom?: string;
  prix?: number;
  duree_jours?: number;
}

export interface DossierFormData {
  candidat_id: string;
  auto_ecole_id?: string;
  formation_id?: string;
  type_demande_id: string;
  referenciel_id?: string;
  numero_dossier?: string;
  statut: 'en_attente' | 'en_cours' | 'valide' | 'rejete' | 'transmis' | 'Cnepc';
  date_creation: string;
  commentaires?: string;
  numero_permis?: string;
  numero_origine_permis?: string;
  lieu_de_dobtention_du_permis?: string;
  date_de_dobtention_du_permis?: string;
  date_de_delivrance_du_permis?: string;
  province_id?: string;
  centre_id?: string;
  expired?: boolean;
  expiration_date?: string;
  suspended?: boolean;
  suspended_date?: string;
  data_categorie?: unknown[];
  [key: string]: unknown;
}

export interface CandidatFormData {
  personne_id: string;
  numero_candidat: string;
  date_naissance: string;
  lieu_naissance: string;
  nip: string;
  type_piece: string;
  numero_piece: string;
  nationalite: string;
  genre: string;
}

export interface PersonneFormData {
  nom: string;
  prenom: string;
  email: string;
  contact: string;
  adresse: string;
}

// Types pour les filtres et recherches
export interface AutoEcoleFilters {
  statut?: boolean;
  responsable_id?: string;
  search?: string;
}

export interface DossierFilters {
  statut?: 'en_attente' | 'en_cours' | 'valide' | 'rejete';
  formation_id?: string;
  candidat_id?: string;
}

export interface CandidatFilters {
  nationalite?: string;
  genre?: string;
  statut?: string;
  search?: string;
}

// Type pour les candidats inscrits à des formations
export interface CandidatInscription {
  id: string;
  candidat_id: string;
  auto_ecole_id: string;
  formation_id: string;
  statut: string;
  date_creation: string;
  date_modification: string;
  commentaires: string[] | null;
  candidat: {
    id: string;
    personne_id: string;
    numero_candidat: string;
    date_naissance: string;
    lieu_naissance: string;
    nip: string;
    type_piece: string;
    numero_piece: string;
    nationalite: string;
    genre: string;
    age: string;
    personne: {
      id: string;
      utilisateur_id: string;
      nom: string;
      prenom: string;
      nom_complet: string;
      email: string;
      contact: string;
      adresse: string;
      created_at: string;
      updated_at: string;
    };
    dossiers: any[];
  };
  formation?: {
    id: string;
    nom: string;
    type_permis_id: string;
    montant?: number;
    description?: string;
  };
}

// Types pour les nouvelles réponses API
export interface AutoEcoleDetailResponse {
  success: boolean;
  data: {
    id: string;
    nom_auto_ecole: string;
    adresse: string;
    email: string;
    responsable_id: string;
    contact: string;
    statut: boolean;
    statut_libelle: string;
    responsable: {
      id: string;
      utilisateur_id: string;
      nom: string;
      prenom: string;
      nom_complet: string;
      email: string;
      contact: string;
      adresse: string;
      created_at: string;
      updated_at: string;
    };
    formations: FormationDetail[];
    dossiers: DossierDetail[];
    created_at: string;
    updated_at: string;
  };
}

export interface AutoEcoleListApiResponse {
  data: AutoEcoleApiItem[];
  links: {
    first: string;
    last: string;
    prev: string;
    next: string;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    links: Array<{
      url: string;
      label: string;
      active: boolean;
    }>;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface AutoEcoleApiItem {
  id: string;
  nom_auto_ecole: string;
  adresse: string;
  email: string;
  responsable_id: string;
  contact: string;
  statut: boolean;
  statut_libelle: string;
  responsable: {
    id: string;
    utilisateur_id: string;
    nom: string;
    prenom: string;
    nom_complet: string;
    email: string;
    contact: string;
    adresse: string;
    created_at: string;
    updated_at: string;
  };
  formations: FormationDetail[];
  dossiers: DossierDetail[];
  created_at: string;
  updated_at: string;
}

export interface FormationDetail {
  id: string;
  auto_ecole_id: string;
  type_permis_id: string;
  montant: number;
  montant_formate: string;
  description: string;
  session_id: string;
  statut: boolean;
  statut_libelle: string;
  auto_ecole: any;
  type_permis: {
    id: string;
    libelle: string;
    code: string;
    type_ref: string;
    description: string;
    statut: boolean;
    statut_libelle: string;
    created_at: string;
    updated_at: string;
  };
  session: {
    id: string;
    libelle: string;
    code: string;
    type_ref: string;
    description: string;
    statut: boolean;
    statut_libelle: string;
    created_at: string;
    updated_at: string;
  };
  dossiers: DossierDetail[];
  created_at: string;
  updated_at: string;
}

export interface DossierDetail {
  id: string;
  candidat_id: string;
  auto_ecole_id: string;
  formation_id: string;
  statut: string;
  date_creation: string;
  date_modification: string;
  commentaires: string;
  candidat: {
    id: string;
    personne_id: string;
    numero_candidat: string;
    date_naissance: string;
    lieu_naissance: string;
    nip: string;
    type_piece: string;
    numero_piece: string;
    nationalite: string;
    genre: string;
    age: string;
    personne: {
      id: string;
      utilisateur_id: string;
      nom: string;
      prenom: string;
      nom_complet: string;
      email: string;
      contact: string;
      adresse: string;
      created_at: string;
      updated_at: string;
    };
    dossiers: any[];
    created_at: string;
    updated_at: string;
  };
  auto_ecole: any;
  formation: FormationDetail;
  documents: DocumentDetail[];
  etape: {
    id: string;
    code: string;
    libelle: string;
    ordre: number;
    auto_advance: boolean;
    statut_systeme: string;
    circuit_id: string;
    statut_id: string;
    created_at: string;
    updated_at: string;
  };
  created_at: string;
  updated_at: string;
}

export interface DocumentDetail {
  id: string;
  dossier_id: string;
  type_document_id: string;
  nom_fichier: string;
  chemin_fichier: string;
  type_mime: string;
  taille_fichier: number;
  taille_fichier_formate: string;
  valide: boolean;
  valide_libelle: string;
  commentaires: string;
  dossier: any;
  type_document: {
    id: string;
    libelle: string;
    code: string;
    type_ref: string;
    description: string;
    statut: boolean;
    statut_libelle: string;
    created_at: string;
    updated_at: string;
  };
  created_at: string;
  updated_at: string;
}