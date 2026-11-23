import axiosClient from '../../../shared/utils/axiosConfig';

export type ChampModifiable = 'nom' | 'prenom' | 'date_naissance' | 'lieu_naissance' | 'nationalite';
export type StatutModification = 'BROUILLON' | 'SOUMISE' | 'APPROUVEE' | 'REJETEE';

export interface LigneModification {
  id: string;
  champ: ChampModifiable;
  champ_libelle: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string;
  details: { ville?: string; province?: string | null; pays?: string } | null;
}

export interface ModificationDemande {
  id: string;
  numero: string;
  numero_identite: string;
  numero_permis: string | null;
  nom_titulaire: string;
  prenom_titulaire: string | null;
  /** Champs corrigés par la demande (un ou plusieurs). */
  lignes: LigneModification[];
  motif: string;
  a_justificatif: boolean;
  justificatif_nom: string | null;
  statut: StatutModification;
  demandeur_id: string | null;
  demandeur_email: string | null;
  date_soumission: string | null;
  validateur_email: string | null;
  date_decision: string | null;
  motif_decision: string | null;
  created_at: string;
  /** Uniquement dans la liste « à valider » : raison pour laquelle l'agent ne peut pas décider. */
  refus_decision?: string | null;
}

export interface FicheTitulaire {
  h_permis_id: string;
  titulaire: {
    numero_identite: string | null;
    nom: string;
    prenom: string | null;
    date_naissance: string | null;
    age: number | null;
    lieu_naissance: string | null;
    nationalite: string | null;
    sexe: string | null;
  };
  permis: { h_permis_id: string; numero_permis: string | null; categorie: string | null; date_validite: string | null }[];
  champs: Record<ChampModifiable, string>;
  demandes: ModificationDemande[];
  peut_valider: boolean;
}

export interface SaisieLigne {
  champ: ChampModifiable;
  nouvelle_valeur?: string;
  ville?: string;
  province?: string;
  pays?: string;
}

export interface SaisieModification {
  lignes: SaisieLigne[];
  motif: string;
  justificatif?: File | null;
  soumettre: boolean;
}

function messageErreur(error: unknown, defaut: string): string {
  const e = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } }; message?: string } | undefined;
  const data = e?.response?.data;
  if (data?.errors) {
    const premiere = Object.values(data.errors as Record<string, string[]>)[0]?.[0];
    if (premiere) return premiere;
  }
  return data?.message || e?.message || defaut;
}

function versFormData(s: SaisieModification): FormData {
  const fd = new FormData();
  s.lignes.forEach((l, i) => {
    fd.append(`lignes[${i}][champ]`, l.champ);
    if (l.champ === 'lieu_naissance') {
      fd.append(`lignes[${i}][ville]`, l.ville ?? '');
      fd.append(`lignes[${i}][province]`, l.province ?? '');
      fd.append(`lignes[${i}][pays]`, l.pays ?? '');
    } else {
      fd.append(`lignes[${i}][nouvelle_valeur]`, l.nouvelle_valeur ?? '');
    }
  });
  fd.append('motif', s.motif ?? '');
  if (s.justificatif) fd.append('justificatif', s.justificatif);
  fd.append('soumettre', s.soumettre ? '1' : '0');
  return fd;
}

export const modificationService = {
  async fiche(hPermisId: string): Promise<FicheTitulaire> {
    try {
      const { data } = await axiosClient.get(`/modifications/titulaire/${hPermisId}`);
      return data.data;
    } catch (error) {
      throw new Error(messageErreur(error, 'Impossible de charger la fiche du titulaire.'));
    }
  },

  async creer(hPermisId: string, saisie: SaisieModification) {
    try {
      const { data } = await axiosClient.post(`/modifications/titulaire/${hPermisId}`, versFormData(saisie), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as { message: string; data: ModificationDemande };
    } catch (error) {
      throw new Error(messageErreur(error, "Impossible d'enregistrer la demande."));
    }
  },

  async modifierBrouillon(id: string, saisie: SaisieModification) {
    try {
      const { data } = await axiosClient.post(`/modifications/${id}`, versFormData(saisie), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as { message: string; data: ModificationDemande };
    } catch (error) {
      throw new Error(messageErreur(error, "Impossible d'enregistrer le brouillon."));
    }
  },

  async soumettre(id: string) {
    try {
      const { data } = await axiosClient.post(`/modifications/${id}/soumettre`);
      return data as { message: string; data: ModificationDemande };
    } catch (error) {
      throw new Error(messageErreur(error, 'Impossible de soumettre la demande.'));
    }
  },

  async supprimerBrouillon(id: string) {
    try {
      await axiosClient.delete(`/modifications/${id}`);
    } catch (error) {
      throw new Error(messageErreur(error, 'Impossible de supprimer le brouillon.'));
    }
  },

  /** support : ROSE (permis rose) ou VERT (fiche d'enregistrement) ; absent = toutes les demandes. */
  async aValider(support?: 'ROSE' | 'VERT'): Promise<{ peut_valider: boolean; data: ModificationDemande[] }> {
    try {
      const { data } = await axiosClient.get('/modifications/a-valider', { params: support ? { support } : {} });
      return { peut_valider: !!data.peut_valider, data: data.data ?? [] };
    } catch (error) {
      throw new Error(messageErreur(error, 'Impossible de charger les demandes à valider.'));
    }
  },

  async approuver(id: string, commentaire?: string) {
    try {
      const { data } = await axiosClient.post(`/modifications/${id}/approuver`, { commentaire });
      return data as { message: string; data: ModificationDemande };
    } catch (error) {
      throw new Error(messageErreur(error, "Impossible d'approuver la demande."));
    }
  },

  async rejeter(id: string, motif: string) {
    try {
      const { data } = await axiosClient.post(`/modifications/${id}/rejeter`, { motif });
      return data as { message: string; data: ModificationDemande };
    } catch (error) {
      throw new Error(messageErreur(error, 'Impossible de rejeter la demande.'));
    }
  },

  /** Ouvre le justificatif dans un nouvel onglet (téléchargement authentifié). */
  async ouvrirJustificatif(id: string) {
    try {
      const res = await axiosClient.get(`/modifications/${id}/justificatif`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      let message = 'Impossible d’ouvrir le justificatif.';
      const blob = (error as { response?: { data?: unknown } })?.response?.data;
      if (blob instanceof Blob) {
        try {
          message = JSON.parse(await blob.text()).message || message;
        } catch {
          /* réponse non JSON */
        }
      }
      throw new Error(message);
    }
  },
};
