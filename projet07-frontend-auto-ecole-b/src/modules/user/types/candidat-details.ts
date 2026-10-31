// Types pour les détails d'un candidat

export interface CandidatDetails {
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
  personne: PersonneDetails;
  dossiers: DossierDetails[];
  created_at: string;
  updated_at: string;
}

export interface PersonneDetails {
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
}

export interface DossierDetails {
  id: string;
  candidat_id: string;
  auto_ecole_id: string;
  formation_id: string;
  type_demande_id: string;
  statut: string;
  date_creation: string;
  date_modification: string;
  commentaires: any[];
  referenciel_id: string;
  numero_permis: string;
  numero_origine_permis: string;
  candidat: any;
  auto_ecole: AutoEcoleDetails;
  formation: FormationDetails;
  type_demande: TypeDemandeDetails;
  documents: DocumentDetails[];
  programme_sessions: ProgrammeSessionDetails[];
  created_at: string;
  updated_at: string;
}

export interface AutoEcoleDetails {
  id: string;
  nom_auto_ecole: string;
  adresse: string;
  email: string;
  responsable_id: string;
  contact: string;
  statut: boolean;
  statut_libelle: string;
  responsable: PersonneDetails;
  province: ProvinceDetails;
  formations: any[];
  dossiers: any[];
  created_at: string;
  updated_at: string;
}

export interface FormationDetails {
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
  type_permis: ReferentielDetails;
  session: ReferentielDetails;
  dossiers: any[];
  created_at: string;
  updated_at: string;
}

export interface TypeDemandeDetails {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentDetails {
  id: string;
  documentable_id: string;
  documentable_type: string;
  nom_fichier: string;
  chemin_fichier: string;
  type_mime: string;
  taille_fichier: number;
  taille_fichier_formate: string;
  valide: boolean;
  valide_libelle: string;
  commentaires: string;
  piece_justification_id: string;
  documentable: any;
  created_at: string;
  updated_at: string;
}

export interface ProgrammeSessionDetails {
  id: string;
  dossier_id: string;
  date_examen: string;
  created_at: string;
  updated_at: string;
  dossier: any;
}

export interface ProvinceDetails {
  id: string;
  libelle: string;
  code: string;
  type_ref: string;
  description: string;
  statut: boolean;
  statut_libelle: string;
  created_at: string;
  updated_at: string;
}

export interface ReferentielDetails {
  id: string;
  libelle: string;
  code: string;
  type_ref: string;
  description: string;
  statut: boolean;
  statut_libelle: string;
  created_at: string;
  updated_at: string;
}

export interface CandidatDetailsResponse {
  success: boolean;
  data: CandidatDetails;
}

