import axiosClient from '../../../shared/utils/axiosConfig';

/** Actions payables dans le paiement groupé du guichet usager. */
export type TypeLigneGuichet = 'RENOUVELLEMENT' | 'DIGITALISATION' | 'MISE_A_JOUR';
export type OperateurGuichet = 'MOOV' | 'AIRTEL';
export type StatutCommande = 'EN_ATTENTE_PAIEMENT' | 'CONFIRME' | 'ECHOUE';

/** Élément du panier côté écran (avant paiement). */
export interface ElementPanier {
  type: TypeLigneGuichet;
  /** Dossier de digitalisation ou demande de mise à jour ; absent pour le renouvellement (créé au paiement). */
  objet_id?: string;
  /** Libellé affiché avant le devis. */
  libelle: string;
}

export interface LigneDevis {
  type: TypeLigneGuichet;
  objet_id: string | null;
  libelle: string;
  montant: number;
}

export interface Devis {
  support: 'ROSE' | 'VERT';
  lignes: LigneDevis[];
  montant_total: number;
  devise: string;
}

export interface LigneCommande {
  id: string;
  type: TypeLigneGuichet;
  objet_id: string;
  libelle: string;
  montant: string;
  statut: 'EN_ATTENTE_PAIEMENT' | 'PAYE' | 'ECHOUE';
}

export interface CommandeGuichet {
  id: string;
  numero: string;
  statut: StatutCommande;
  operateur: OperateurGuichet;
  code_paiement: string;
  reference_paiement: string | null;
  montant: string;
  motif_echec: string | null;
  devise: string;
  lignes: LigneCommande[];
}

function messageErreur(error: unknown, defaut: string): string {
  const e = error as { response?: { data?: { message?: string } }; message?: string } | undefined;
  return e?.response?.data?.message || e?.message || defaut;
}

const versLignes = (panier: ElementPanier[]) => panier.map(({ type, objet_id }) => ({ type, objet_id: objet_id ?? null }));

export const guichetService = {
  async devis(hPermisId: string, panier: ElementPanier[]): Promise<Devis> {
    try {
      const { data } = await axiosClient.post('/guichet/devis', { h_permis_id: hPermisId, lignes: versLignes(panier) });
      return data.data as Devis;
    } catch (error) {
      throw new Error(messageErreur(error, 'Impossible de calculer le montant.'));
    }
  },

  async payer(hPermisId: string, panier: ElementPanier[], operateur: OperateurGuichet, telephone?: string) {
    try {
      const { data } = await axiosClient.post('/guichet/commandes', {
        h_permis_id: hPermisId,
        lignes: versLignes(panier),
        operateur,
        telephone: telephone || null,
      });
      return data as { success: boolean; message: string; data: CommandeGuichet };
    } catch (error) {
      throw new Error(messageErreur(error, 'Impossible de lancer le paiement.'));
    }
  },

  async statut(commandeId: string) {
    try {
      const { data } = await axiosClient.get(`/guichet/commandes/${commandeId}`);
      return data as { success: boolean; message: string; data: CommandeGuichet };
    } catch (error) {
      throw new Error(messageErreur(error, 'Impossible de vérifier le paiement.'));
    }
  },
};
