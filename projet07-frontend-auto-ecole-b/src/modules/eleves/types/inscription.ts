// Types pour les demandes d'inscription

export interface DemandeInscription {
  id: string;
  numero: string;
  eleve: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    birthDate: string;
    nationality: string;
    lieuNaissance: string;
    nationaliteEtrangere?: string;
  };
  autoEcole: {
    id: string;
    name: string;
    email: string;
  };
  dateDemande: string;
  statut: 'en_attente' | 'en_cours' | 'validee' | 'rejetee';
  /** Statut réel du dossier (API), comme affiché en réception (ex. libellé d'étape, "Transmis", "EN_ATTENTE_PAIEMENT"). */
  statut_dossier?: string;
  documents: DocumentInscription[];
  commentaires?: string;
  traiteePar?: string;
  dateTraitement?: string;
}

export interface DocumentInscription {
  id: string;
  type: 'carte_identite' | 'photo' | 'certificat_medical' | 'attestation_aptitude';
  nom: string;
  url: string;
  taille: string;
  dateUpload: string;
  statut: 'en_attente' | 'valide' | 'rejete';
  commentaires?: string;
}

export interface NouvelleDemande {
  eleve: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    birthDate: string;
    nationality: string;
    lieuNaissance: string;
    nationaliteEtrangere?: string;
  };
  documents: File[];
  commentaires?: string;
  pieceIdentite: {
    type: string;
    numero: string;
  };
}

export interface FiltresDemandes {
  statut?: string;
  autoEcole?: string;
  dateDebut?: string;
  dateFin?: string;
  recherche?: string;
}

export interface StatistiquesDemandes {
  total: number;
  enAttente: number;
  enCours: number;
  validees: number;
  rejetees: number;
  parAutoEcole: Record<string, number>;
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