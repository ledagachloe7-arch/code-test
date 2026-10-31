import type { NumeroPermisParts, PermisData, PersonneData, CandidatData, FormationData } from '../types';
import type { TypeDemande } from '../../services';

export interface RecuperationExistantFormProps {
  onSuccess: () => void;
}

export const RECUPERATION_STEPS = [
  'Type de demande',
  'Numéro de permis',
  'Récupération des données',
  'Informations du permis',
  'Informations personnelles',
  'Informations du candidat',
  'Finalisation',
] as const;

export const initialNumeroPermisParts: NumeroPermisParts = {
  annee: '',
  province: '',
  categorie: '',
  numero: '',
};

export const initialPermisData: PermisData = {
  numero_permis: '',
  numero_origine_permis: '',
  lieu_de_dobtention_du_permis: '',
  date_de_dobtention_du_permis: '',
  date_de_delivrance_du_permis: '',
};

export const initialPersonneData: PersonneData = {
  nom: '',
  prenom: '',
  email: '',
  contact: '',
  telephone: '',
  adresse: '',
  password: '',
  password_confirmation: '',
};

export const initialCandidatData: CandidatData = {
  date_naissance: '',
  lieu_naissance: '',
  nip: '',
  type_piece: 'CNI',
  numero_piece: '',
  nationalite: 'Sénégalaise',
  genre: 'M',
};

export const initialFormationData: FormationData = {
  formation_id: '',
  referenciel_id: '',
  commentaires: '',
};

export type { NumeroPermisParts, PermisData, PersonneData, CandidatData, FormationData, TypeDemande };
