export interface Document {
  id: string;
  nom_fichier: string;
  chemin_fichier?: string;
  type_document_id?: string;
  type_document?: any;
  piece_justification_id?: string;
  documentable_id?: string; // ID du dossier auquel le document appartient
  valide?: boolean;
  statut?: string;
  date_upload?: string;
  taille_fichier?: number;
}

export interface PieceJustificative {
  id: string;
  libelle: string;
  code?: string;
  type_document_id?: string;
}

