import axiosClient from '../../../shared/utils/axiosConfig';

/** Support du permis : ROSE = permis de conduire national, VERT = fiche d'enregistrement. */
export type SupportPermis = 'ROSE' | 'VERT';

/** Type de demande du dossier créé, par support. */
export const TYPES_DEMANDE_DUPLICATA: Record<SupportPermis, string> = {
  ROSE: 'DUPLICATA',
  VERT: 'DUPLICATAFICHEENREGISTREMENT',
};

/** Type métier du duplicata du permis rose (distinct de DUPLICATAFICHEENREGISTREMENT, fiche verte). */
export const TYPE_DEMANDE_DUPLICATA_ROSE = TYPES_DEMANDE_DUPLICATA.ROSE;

/** Permis tel que retourné par la recherche h_permis (une ligne = un permis / une catégorie). */
export interface PermisSource {
  id: string;
  numero_identite: string | null;
  nom: string;
  prenom: string | null;
  sexe: string | null;
  nationalite: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  numero_permis: string | null;
  type_permis: string | null;
  categorie: string | null;
  date_obtention: string | null;
  lieu_obtention: string | null;
  date_validite: string | null;
}

/** type_permis normalisés désignant une fiche d'enregistrement (même liste que SupportPermis::TYPES_FICHE côté serveur). */
const TYPES_FICHE = ['FICHEENREGISTREMENT', 'DUPLICATAFE'];

/** Support d'une ligne du registre : FICHE_ENREGISTREMENT ou DUPLICATA FE (quelle que soit l'écriture) = fiche verte. */
export const supportDe = (p: Pick<PermisSource, 'type_permis'>): SupportPermis =>
  TYPES_FICHE.includes(String(p.type_permis ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')) ? 'VERT' : 'ROSE';

/** La fiche d'enregistrement (permis vert) n'est pas éligible au duplicata rose. */
export const estPermisRose = (p: Pick<PermisSource, 'type_permis'>): boolean => supportDe(p) === 'ROSE';

export const LIBELLES_SUPPORT: Record<SupportPermis, string> = {
  ROSE: 'Permis rose',
  VERT: "Fiche d'enregistrement",
};

export type ModeRecherche = 'numero' | 'identite';

export interface CriteresRecherchePermis {
  numero_permis?: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
}

/**
 * États du contrôle shortcode (cadrage §2 et §4-étape 4).
 * Contrôle effectué par le serveur ; seul ACTIF autorise la soumission.
 */
export type StatutShortcode = 'ACTIF' | 'ABSENT' | 'NON_VERIFIE' | 'A_REGULARISER';

export const MESSAGES_SHORTCODE: Record<StatutShortcode, { titre: string; message: string; severite: 'success' | 'info' | 'warning' | 'error' }> = {
  ACTIF: { titre: 'Shortcode vérifié', message: 'Shortcode vérifié. Vous pouvez poursuivre la demande.', severite: 'success' },
  ABSENT: {
    titre: 'Aucun shortcode',
    message: "Aucun shortcode associé à ce titulaire. L'enrôlement et le paiement sont nécessaires avant de poursuivre.",
    severite: 'warning',
  },
  NON_VERIFIE: { titre: 'Vérification impossible', message: "Le statut du shortcode n'a pas pu être vérifié. Réessayez.", severite: 'error' },
  A_REGULARISER: {
    titre: 'Shortcode à régulariser',
    message: 'Le shortcode du titulaire est présent mais son statut ne permet pas de poursuivre. Une régularisation est nécessaire.',
    severite: 'warning',
  },
};

export interface ResultatShortcode {
  statut: StatutShortcode;
  message: string;
  /** Renvoyé par le serveur uniquement si le shortcode est confirmé actif. */
  shortcode: string | null;
}

export interface SaisieDuplicata {
  /** Catégories (lignes h_permis) d'un même titulaire ; la première est le permis principal. */
  permisIds: string[];
  /** Circuit de l'écran : le serveur refuse un permis d'un autre support. */
  support?: SupportPermis;
  motif: MotifDuplicata;
  precision: string;
  observations: string;
  justificatif: File | null;
}

export interface DuplicataCree {
  message: string;
  duplicata_id: string;
  dossier_id: string;
  numero_dossier: string;
  statut_dossier: string;
  numero_permis_source: string;
  categories: string[];
}

/** Seul un shortcode confirmé ACTIF par le serveur autorise la soumission. */
export const shortcodeAutoriseSoumission = (s: StatutShortcode) => s === 'ACTIF';

export type MotifDuplicata = 'PERTE' | 'VOL' | 'DETERIORATION' | 'AUTRE';

/** Motifs proposés — liste à valider par le responsable métier (cadrage §4-étape 5). */
export const MOTIFS_DUPLICATA: { valeur: MotifDuplicata; libelle: string }[] = [
  { valeur: 'PERTE', libelle: 'Perte' },
  { valeur: 'VOL', libelle: 'Vol' },
  { valeur: 'DETERIORATION', libelle: 'Détérioration / document illisible' },
  { valeur: 'AUTRE', libelle: 'Autre' },
];

export const OBSERVATIONS_MAX = 1000;
export const PRECISION_MAX = 255;

function messageErreur(error: unknown, defaut: string): string {
  const e = error as { response?: { data?: { message?: string } }; message?: string } | undefined;
  return e?.response?.data?.message || e?.message || defaut;
}

export const duplicataService = {
  /** Recherche du permis source (réutilise GET /h-permis/recherche). */
  async rechercherPermis(mode: ModeRecherche, criteres: CriteresRecherchePermis): Promise<PermisSource[]> {
    const brut: CriteresRecherchePermis =
      mode === 'numero'
        ? { numero_permis: criteres.numero_permis }
        : { nom: criteres.nom, prenom: criteres.prenom, date_naissance: criteres.date_naissance };
    const params = Object.fromEntries(
      Object.entries(brut).filter(([, v]) => typeof v === 'string' && v.trim() !== '').map(([k, v]) => [k, (v as string).trim()]),
    );
    if (Object.keys(params).length === 0) {
      throw new Error(mode === 'numero' ? 'Saisissez le numéro du permis.' : 'Saisissez au moins le nom, le prénom ou la date de naissance.');
    }
    try {
      const { data } = await axiosClient.get('/h-permis/recherche', { params: { ...params, per_page: 50 } });
      return (data?.data ?? []) as PermisSource[];
    } catch (error) {
      throw new Error(messageErreur(error, 'La recherche a échoué. Vérifiez la connexion puis relancez.'));
    }
  },

  /**
   * Contrôle du shortcode du titulaire, fait par le serveur (codes CNEDDT conservés lors des transferts).
   * Erreur réseau / service indisponible → NON_VERIFIE (jamais considéré comme réussi).
   */
  async verifierShortcode(permis: PermisSource, support?: SupportPermis): Promise<ResultatShortcode> {
    try {
      const { data } = await axiosClient.get(`/duplicata-rose/permis/${permis.id}/shortcode`, { params: support ? { support } : {} });
      return { statut: data.statut as StatutShortcode, message: data.message, shortcode: data.shortcode ?? null };
    } catch (error) {
      const e = error as { response?: { data?: { statut?: StatutShortcode; message?: string } } };
      return {
        statut: e?.response?.data?.statut ?? 'NON_VERIFIE',
        message: messageErreur(error, "Le statut du shortcode n'a pas pu être vérifié. Réessayez."),
        shortcode: null,
      };
    }
  },

  /** Crée le dossier de duplicata (contrôles refaits côté serveur). */
  async soumettre(saisie: SaisieDuplicata): Promise<DuplicataCree> {
    const fd = new FormData();
    saisie.permisIds.forEach((id) => fd.append('h_permis_ids[]', id));
    if (saisie.support) fd.append('support', saisie.support);
    fd.append('motif', saisie.motif);
    if (saisie.motif === 'AUTRE') fd.append('motif_precision', saisie.precision);
    if (saisie.observations.trim()) fd.append('observations', saisie.observations.trim());
    if (saisie.justificatif) fd.append('justificatif', saisie.justificatif);
    try {
      const { data } = await axiosClient.post('/duplicata-rose', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return { message: data.message, ...data.data } as DuplicataCree;
    } catch (error) {
      const e = error as { response?: { data?: { errors?: Record<string, string[]> } } };
      const premiere = e?.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : undefined;
      throw new Error(premiere || messageErreur(error, 'La demande de duplicata n’a pas pu être créée.'));
    }
  },
};
