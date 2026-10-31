/** Type d'affichage dans le tableau finance (même logique que le bouton "Mettre en attente de paiement"). */
export type TypeDossierFinance = 'avec_code_paiement' | 'a_mettre_en_attente';

/**
 * Statut de circuit d'un dossier, calqué sur EtapeAccordion.tsx :
 * - pending   → aucune étape commencée (gris)
 * - in_progress → dossier en cours de traitement (orange/warning)
 * - completed  → dossier envoyé CNEDDT / toutes étapes terminées (vert/success)
 */
export type StatutCircuit = 'pending' | 'in_progress' | 'completed';

/** Dossier pour le rapport par centre d'enrollment (toutes étapes confondues). */
export interface DossierRapport {
  id: string;
  centreLabel: string;
  centre_id: string | null;
  statut: string;
  statutCircuit: StatutCircuit;
  created_at: string | null;
  updated_at: string | null;
  candidatLabel: string;
  typeDemandeName: string;
  /**
   * Nom brut du type de demande tel que retourné par l'API (avant formatage).
   * Utilisé pour associer le dossier à son circuit via circuit.nom_entite.
   * Ex: "FICHEENREGISTREMENT", "DUPLICATA", "NOUVEAUPERMIS"
   */
  typeDemandeRawName: string;
  formationLabel: string;
  autoEcoleNom: string;
  /** Code de paiement généré pour ce dossier (null si pas encore généré). */
  code_paiement: string | null;

  // ── Détails complets du dossier ──────────────────────────────────────────
  commentaires: string | null;
  referentielLabel: string | null;
  numero_permis: string | null;
  numero_origine_permis: string | null;
  lieu_obtention_permis: string | null;
  date_obtention_permis: string | null;
  date_delivrance_permis: string | null;
  expired: boolean | null;
  expiration_date: string | null;
  suspended: boolean | null;
  suspended_date: string | null;
  provinceLabel: string | null;
  data_categorie: string[];
}

/** Dossier affiché dans le module finance (avec code paiement ou à l'étape paiement). */
export interface DossierFinance {
  id: string;
  candidat_id: string | null;
  auto_ecole_id: string | null;
  formation_id: string | null;
  type_demande_id: string | null;
  statut: string;
  code_paiement: string | null;
  commentaires?: string;
  /** Discriminant : avec code paiement renseigné, ou à l'étape paiement (à mettre en attente). */
  typeDossier: TypeDossierFinance;
  /** Libellé candidat (prénom + nom ou numéro candidat). */
  candidatLabel?: string;
  /** Nom du type de demande. */
  typeDemandeName?: string;
  /** Nom de l'auto-école. */
  autoEcoleNom?: string;
  /** Libellé formation / catégorie de permis. */
  formationLabel?: string;
  /** Date de création du dossier (pour rapports par date). */
  created_at?: string | null;
  /** Date de mise à jour du dossier (pour rapports par date). */
  updated_at?: string | null;
  /** Numéro / référence du dossier (affichage liste). */
  reference?: string | null;
  /** ID du centre (table dossier). */
  centre_id?: string | null;
  /** Libellé du centre pour affichage. */
  centreLabel?: string;
}

/** Entrée d'historique de paiement (endpoint /historic-paiement) — dossiers dont le paiement a été réellement vérifié. */
export interface HistoricPaiementEntry {
  id: string;
  code_paiement: string | null;
  candidatLabel?: string;
  typeDemandeName?: string;
  formationLabel?: string;
  centreLabel?: string;
  created_at?: string | null;
  updated_at?: string | null;
}
