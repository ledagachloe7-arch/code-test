/**
 * Types du module Dashboard.
 */

export interface AutoEcoleStats {
  totalEleves: number;
  dossiersValides: number;
  transmisCNEPC: number;
  /** Nombre de dossiers dont le statut est "VALIDATION DE DOSSIER" */
  dossiersValidationDossier: number;
}

export interface AdminStats {
  totalAutoEcoles: number;
  autoEcolesActives: number;
  autoEcolesInactives: number;
}

export interface AutoEcoleApiItem {
  id: string;
  statut?: boolean | number | string;
  statut_libelle?: string;
  [key: string]: unknown;
}

export interface DossierApiItem {
  id?: string;
  statut?: string;
  [key: string]: unknown;
}

/** Dossier avec infos affichables pour la liste "En attente paiement / Envoi impression". */
export interface DossierStatutListEntry {
  id: string;
  statut: string;
  autoEcoleNom?: string;
  candidat?: { personne?: { nom?: string; prenom?: string }; numero_candidat?: string };
  type_demande?: { id?: string; name?: string };
  formation?: { type_permis?: { libelle?: string; code?: string }; nom?: string };
  referentiel?: { libelle?: string; code?: string };
  [key: string]: unknown;
}

/** Une auto-école avec son nombre de dossiers candidats (pour la stat dashboard). */
export interface DossiersParAutoEcoleItem {
  autoEcoleId: string;
  nom: string;
  count: number;
}

/** Un type de demande avec le nombre de dossiers (vue auto-école). */
export interface DossiersParTypeDemandeItem {
  typeDemandeId: string;
  libelle: string;
  count: number;
}

/** Une étape de traitement (statut) avec le nombre de dossiers (pour chart par circuit/étape). */
export interface DossiersParStatutItem {
  statut: string;
  libelle: string;
  count: number;
}

/** Même chose avec série hebdomadaire (créations par semaine). */
export interface DossiersParTypeDemandeWithWeeklyItem extends DossiersParTypeDemandeItem {
  /** Nombre de dossiers créés par semaine (ordre = weekLabels). */
  weeklyCounts: number[];
}

/** Réponse avec libellés des semaines pour les sparklines. */
export interface DossiersParTypeDemandeWithWeeklyResponse {
  weekLabels: string[];
  items: DossiersParTypeDemandeWithWeeklyItem[];
}

/** Donnée statique : nombre de demandes par type de document (pour StatCard + Sparkline). */
export interface DemandeParTypeDocumentItem {
  id: string;
  label: string;
  count: number;
  /** Série pour la sparkline (ex. valeurs par semaine/mois). */
  sparkData: number[];
}
