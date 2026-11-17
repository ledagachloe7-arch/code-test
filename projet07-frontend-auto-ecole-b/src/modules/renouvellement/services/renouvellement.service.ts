import axiosClient from '../../../shared/utils/axiosConfig';

export type StatutRenouvellement = 'EN_ATTENTE_PAIEMENT' | 'CONFIRME' | 'ECHOUE' | 'ANNULE';
export type Operateur = 'MOOV' | 'AIRTEL';

export interface PermisResultat {
  id: string;
  numero_permis: string | null;
  nom: string;
  prenom: string | null;
  date_naissance: string | null;
  categorie: string | null;
  date_validite: string | null;
}

export interface Renouvellement {
  id: string;
  numero: string;
  h_permis_id: string;
  numero_permis: string | null;
  categorie: string;
  statut: StatutRenouvellement;
  operateur: Operateur;
  code_paiement: string;
  reference_paiement: string | null;
  montant: string;
  date_confirmation_paiement: string | null;
  motif_echec: string | null;
  ancienne_date_expiration: string;
  nouvelle_date_delivrance: string | null;
  nouvelle_date_expiration: string | null;
  duree_validite_annees: number | null;
  age_au_renouvellement: number | null;
  agent_email: string | null;
  created_at: string;
}

export interface EtatRenouvellement {
  h_permis_id: string;
  numero_permis: string | null;
  nom: string;
  prenom: string | null;
  date_naissance: string | null;
  categorie: string | null;
  date_expiration: string | null;
  date_ouverture_renouvellement: string | null;
  expire: boolean;
  renouvelable: boolean;
  message: string;
  renouvellement_en_attente: Renouvellement | null;
  montant: number;
  devise: string;
}

export interface CriteresRecherche {
  numero_permis?: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
}

function messageErreur(error: any, defaut: string): string {
  return error?.response?.data?.message || error?.message || defaut;
}

export const renouvellementService = {
  async rechercherPermis(criteres: CriteresRecherche): Promise<PermisResultat[]> {
    const params = Object.fromEntries(
      Object.entries(criteres).filter(([, v]) => typeof v === 'string' && v.trim() !== '').map(([k, v]) => [k, (v as string).trim()]),
    );
    if (Object.keys(params).length === 0) {
      throw new Error('Saisissez au moins un critère : numéro de permis, nom, prénom ou date de naissance.');
    }
    try {
      const { data } = await axiosClient.get('/h-permis/recherche', { params: { ...params, per_page: 50 } });
      return (data?.data ?? []) as PermisResultat[];
    } catch (error) {
      throw new Error(messageErreur(error, 'Erreur lors de la recherche.'));
    }
  },

  async etat(hPermisId: string): Promise<{ etat: EtatRenouvellement; historique: Renouvellement[] }> {
    try {
      const { data } = await axiosClient.get(`/renouvellements/permis/${hPermisId}`);
      return { etat: data.data, historique: data.historique ?? [] };
    } catch (error) {
      throw new Error(messageErreur(error, "Impossible de charger l'état du permis."));
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
