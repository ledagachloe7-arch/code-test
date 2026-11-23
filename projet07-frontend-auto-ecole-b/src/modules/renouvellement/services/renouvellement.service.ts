import axiosClient from '../../../shared/utils/axiosConfig';

/** Support du permis : ROSE = permis de conduire national, VERT = fiche d'enregistrement. */
export type SupportPermis = 'ROSE' | 'VERT';

export type StatutRenouvellement = 'EN_ATTENTE_PAIEMENT' | 'CONFIRME' | 'ECHOUE' | 'ANNULE';
export type Operateur = 'MOOV' | 'AIRTEL';

/** Ligne h_permis (une catégorie d'un titulaire). */
export interface PermisResultat {
  id: string;
  numero_identite: string | null;
  numero_permis: string | null;
  nom: string;
  prenom: string | null;
  date_naissance: string | null;
  categorie: string | null;
  date_validite: string | null;
}

/** Titulaire regroupant toutes ses catégories. */
export interface TitulaireResultat {
  cle: string;
  /** Id d'une ligne h_permis du titulaire (sert de point d'entrée à l'API). */
  hPermisId: string;
  nom: string;
  prenom: string | null;
  date_naissance: string | null;
  categories: PermisResultat[];
}

export interface RenouvellementCategorie {
  id: string;
  h_permis_id: string;
  numero_permis: string | null;
  categorie: string;
  statut: StatutRenouvellement;
  ancienne_date_expiration: string;
  nouvelle_date_delivrance: string | null;
  nouvelle_date_expiration: string | null;
  duree_validite_annees: number | null;
  age_au_renouvellement: number | null;
}

export interface Renouvellement {
  id: string;
  numero: string;
  numero_identite: string;
  statut: StatutRenouvellement;
  operateur: Operateur;
  code_paiement: string;
  reference_paiement: string | null;
  montant: string;
  date_confirmation_paiement: string | null;
  motif_echec: string | null;
  nouvelle_date_delivrance: string | null;
  agent_email: string | null;
  created_at: string;
  categories: RenouvellementCategorie[];
}

export interface EtatCategorie {
  h_permis_id: string;
  numero_permis: string | null;
  categorie: string;
  date_obtention: string | null;
  date_expiration: string | null;
  date_ouverture_renouvellement: string | null;
  renouvelable: boolean;
  message: string;
}

export interface EtatRenouvellement {
  support?: SupportPermis;
  titulaire: {
    numero_identite: string | null;
    nom: string;
    prenom: string | null;
    sexe: string | null;
    date_naissance: string | null;
    lieu_naissance: string | null;
    nationalite: string | null;
  };
  categories: EtatCategorie[];
  categories_a_renouveler: string[];
  renouvelable: boolean;
  message: string;
  renouvellement_en_attente: Renouvellement | null;
  montant_par_categorie: number;
  montant_total: number;
  devise: string;
}

export interface CriteresRecherche {
  numero_permis?: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
}

function messageErreur(error: unknown, defaut: string): string {
  const e = error as { response?: { data?: { message?: string } }; message?: string } | undefined;
  return e?.response?.data?.message || e?.message || defaut;
}

/** Regroupe les lignes h_permis par titulaire (numéro d'identité, sinon nom + prénom + date de naissance). */
/** Numéro de permis comparable : sans tirets ni espaces, en majuscules. */
export const normaliserNumero = (n?: string | null) => String(n ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

/** Identifie un titulaire : numéro de pièce d'identité, sinon nom + prénom + date de naissance. */
const cleTitulaire = (l: PermisResultat) => l.numero_identite || `${l.nom}|${l.prenom ?? ''}|${l.date_naissance ?? ''}`;

function regrouperParTitulaire(lignes: PermisResultat[]): TitulaireResultat[] {
  const groupes = new Map<string, TitulaireResultat>();
  for (const l of lignes) {
    const cle = cleTitulaire(l);
    const g = groupes.get(cle);
    if (g) {
      g.categories.push(l);
    } else {
      groupes.set(cle, { cle, hPermisId: l.id, nom: l.nom, prenom: l.prenom, date_naissance: l.date_naissance, categories: [l] });
    }
  }
  for (const g of groupes.values()) g.categories.sort((a, b) => (a.categorie ?? '').localeCompare(b.categorie ?? ''));
  return [...groupes.values()];
}

export const renouvellementService = {
  /**
   * Recherche par numéro de permis : le permis dont le numéro correspond EXACTEMENT (sans tirets) désigne le titulaire.
   * On ramène alors toutes ses catégories et les personnes portant le même nom (affichées, non sélectionnées).
   * Le titulaire exact est placé en tête et retourné dans `exact`.
   */
  async rechercherParNumero(
    numeroSaisi: string,
    support?: SupportPermis,
  ): Promise<{ titulaires: TitulaireResultat[]; exact: TitulaireResultat | null }> {
    const numero = normaliserNumero(numeroSaisi);
    if (!numero) throw new Error('Saisissez le numéro du permis.');
    const filtre = support ? { support } : {};
    try {
      const { data } = await axiosClient.get('/h-permis/recherche', { params: { numero_permis: numero, per_page: 100, ...filtre } });
      let lignes = (data?.data ?? []) as PermisResultat[];
      const ligneExacte = lignes.find((l) => normaliserNumero(l.numero_permis) === numero);
      if (!ligneExacte) return { titulaires: regrouperParTitulaire(lignes), exact: null };

      const parNom = await axiosClient.get('/h-permis/recherche', {
        params: { nom: ligneExacte.nom, ...(ligneExacte.prenom ? { prenom: ligneExacte.prenom } : {}), per_page: 100, ...filtre },
      });
      const autres = ((parNom.data?.data ?? []) as PermisResultat[]).filter((l) => !lignes.some((x) => x.id === l.id));
      lignes = [...lignes, ...autres];

      const titulaires = regrouperParTitulaire(lignes);
      const cleExacte = cleTitulaire(ligneExacte);
      const exact = titulaires.find((t) => t.cle === cleExacte) ?? null;
      if (exact) exact.hPermisId = ligneExacte.id;
      return { titulaires: exact ? [exact, ...titulaires.filter((t) => t !== exact)] : titulaires, exact };
    } catch (error) {
      throw new Error(messageErreur(error, 'Erreur lors de la recherche.'));
    }
  },

  async rechercherTitulaires(criteres: CriteresRecherche, support?: SupportPermis): Promise<TitulaireResultat[]> {
    const params = Object.fromEntries(
      Object.entries(criteres).filter(([, v]) => typeof v === 'string' && v.trim() !== '').map(([k, v]) => [k, (v as string).trim()]),
    );
    if (Object.keys(params).length === 0) {
      throw new Error('Saisissez au moins un critère : numéro de permis, nom, prénom ou date de naissance.');
    }
    try {
      const { data } = await axiosClient.get('/h-permis/recherche', {
        params: { ...params, per_page: 100, ...(support ? { support } : {}) },
      });
      return regrouperParTitulaire((data?.data ?? []) as PermisResultat[]);
    } catch (error) {
      throw new Error(messageErreur(error, 'Erreur lors de la recherche.'));
    }
  },

  async etat(hPermisId: string): Promise<{ etat: EtatRenouvellement; historique: Renouvellement[] }> {
    try {
      const { data } = await axiosClient.get(`/renouvellements/permis/${hPermisId}`);
      return { etat: data.data, historique: data.historique ?? [] };
    } catch (error) {
      throw new Error(messageErreur(error, "Impossible de charger l'état du titulaire."));
    }
  },

  async initier(hPermisId: string, operateur: Operateur, telephone?: string) {
    try {
      const { data } = await axiosClient.post(`/renouvellements/permis/${hPermisId}/initier`, { operateur, telephone });
      return data as { success: boolean; message: string; data: Renouvellement; paiement: { message?: string } };
    } catch (error) {
      throw new Error(messageErreur(error, "Impossible d'initier le renouvellement."));
    }
  },

  async statut(renouvellementId: string) {
    try {
      const { data } = await axiosClient.get(`/renouvellements/${renouvellementId}`);
      return data as { success: boolean; message: string; data: Renouvellement };
    } catch (error) {
      throw new Error(messageErreur(error, 'Impossible de vérifier le paiement.'));
    }
  },
};
