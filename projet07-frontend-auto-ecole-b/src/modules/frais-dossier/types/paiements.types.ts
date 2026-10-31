/**
 * Réponse paginée GET /paiements — historique des paiements.
 * Le champ `dossier` peut être fourni par l’API avec une structure riche ; on ne type ici que ce qui sert à l’affichage.
 */

export interface PaiementsPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** Sous-ensemble typé ; l’API peut renvoyer plus de champs (auto_ecole, formation, referentiel, data_categorie, etc.). */
export interface PaiementDossierSummary {
  id?: string;
  /** Souvent présent sur le dossier renvoyé avec /paiements — sert à charger le libellé via /referentiels/{id}. */
  centre_id?: string | null;
  formation_id?: string | null;
  statut?: string | null;
  numero_permis?: string | null;
  numero_origine_permis?: string | null;
  data_categorie?: unknown;
  type_demande?: { name?: string | null } | string | null;
  /** Catégorie de permis au niveau dossier (si l’API l’embarque). */
  type_permis?: { libelle?: string | null; code?: string | null } | null;
  formation?: {
    id?: string | null;
    type_permis?: { libelle?: string | null; code?: string | null } | null;
    description?: string | null;
    session?: { libelle?: string | null; type_permis?: unknown } | null;
    auto_ecole?: {
      nom_auto_ecole?: string | null;
      nom?: string | null;
      formations?: Array<{
        id?: string | null;
        type_permis?: { libelle?: string | null; code?: string | null } | null;
      }> | null;
    } | null;
  } | null;
  auto_ecole?: {
    nom_auto_ecole?: string | null;
    nom?: string | null;
    formations?: Array<{
      id?: string | null;
      type_permis?: { libelle?: string | null; code?: string | null } | null;
    }> | null;
  } | null;
  referentiel?: { libelle?: string | null; code?: string | null } | null;
}

export interface PaiementApiItem {
  id: string;
  /** Présent sur certaines réponses API à la racine du paiement. */
  dossier_id?: string | null;
  /** Parfois à la racine du paiement (équivalent dossier.centre_id). */
  centre_id?: string | null;
  montant?: string | null;
  code_paiement?: string | null;
  reference_paiement?: string | null;
  nom_complet?: string | null;
  nom?: string | null;
  prenom?: string | null;
  created_at?: string | null;
  /** Objet dossier tel que renvoyé par l’API (structure riche). */
  dossier?: PaiementDossierSummary | Record<string, unknown> | null;
}

export interface PaiementsApiResponse {
  data: PaiementApiItem[];
  meta: PaiementsPaginationMeta;
}
