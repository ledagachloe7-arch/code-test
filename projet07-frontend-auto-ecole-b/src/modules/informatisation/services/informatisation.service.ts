import axiosClient from '../../../shared/utils/axiosConfig';

export type StatutAncienPermis = 'A_INFORMATISER' | 'INFORMATISE' | 'ANOMALIE';

export interface NouveauNumero {
  categorie: string;
  numero: string;
  h_permis_id: string;
}

export interface AncienPermis {
  id: string;
  lot_import: string;
  fichier_source: string | null;
  ligne_excel: number | null;
  ancien_numero: string;
  province_code: number | null;
  annee: number | null;
  ancien_ordre: string | null;
  ancien_lettres: string | null;
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  categories: string | null;
  date_obtention: string | null;
  date_validite: string | null;
  statut: StatutAncienPermis;
  anomalies: string | null;
  nouveaux_numeros: NouveauNumero[] | null;
  informatise_par_email: string | null;
  informatise_le: string | null;
  // Ajoutés par la recherche
  province_libelle?: string | null;
  ancien_numero_partage?: boolean;
  apercu_format?: string[];
}

export interface Parametres {
  provinces: Record<string, string>;
  categories: string[];
  longueur_ordre: number;
  lignes_par_envoi: number;
  peut_importer: boolean;
  peut_informatiser: boolean;
  stats: Partial<Record<StatutAncienPermis, number>>;
}

/** Ligne envoyée à l'import (valeurs lues dans le fichier Excel par le navigateur). */
export interface LigneImport {
  ligne_excel: number;
  ancien_numero?: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  categories?: string;
  date_obtention?: string;
  date_validite?: string;
  brut?: Record<string, unknown>;
}

export interface BilanImport {
  lot: string;
  recues: number;
  importees: number;
  deja_importees: number;
  en_anomalie: number;
  anomalies: { ligne_excel: number | null; ancien_numero: string; anomalies: string[] }[];
  anciens_numeros_partages: { ancien_numero_normalise: string; nb: number }[];
}

function messageErreur(error: unknown, defaut: string): string {
  const e = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } }; message?: string } | undefined;
  const premiere = e?.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : undefined;
  return premiere || e?.response?.data?.message || e?.message || defaut;
}

export const informatisationService = {
  async parametres(): Promise<Parametres> {
    try {
      const { data } = await axiosClient.get('/informatisation/parametres');
      return data.data;
    } catch (error) {
      throw new Error(messageErreur(error, 'Impossible de charger les paramètres.'));
    }
  },

  async rechercher(ancienNumero: string): Promise<AncienPermis[]> {
    try {
      const { data } = await axiosClient.get('/informatisation/recherche', { params: { ancien_numero: ancienNumero } });
      return data.data ?? [];
    } catch (error) {
      throw new Error(messageErreur(error, 'La recherche a échoué.'));
    }
  },

  async informatiser(id: string): Promise<{ message: string; data: AncienPermis }> {
    try {
      const { data } = await axiosClient.post(`/informatisation/anciens/${id}/informatiser`);
      return data;
    } catch (error) {
      throw new Error(messageErreur(error, "L'informatisation a échoué."));
    }
  },

  async importer(fichier: string, lot: string | null, lignes: LigneImport[]): Promise<BilanImport> {
    try {
      const { data } = await axiosClient.post('/informatisation/import', { fichier, lot, lignes });
      return data.data;
    } catch (error) {
      throw new Error(messageErreur(error, "L'import a échoué."));
    }
  },
};
