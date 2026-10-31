export type CandidatMode = 'search' | 'create';
export type GenreType = 'M' | 'F' | '';

export interface PersonneForm {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  password: string;
  password_confirmation: string;
}

export interface CandidatForm {
  date_naissance: string;
  lieu_naissance: string;
  nip: string;
  type_piece: string;
  numero_piece: string;
  nationalite: string;
  genre: GenreType;
}

export interface PermisForm {
  numero_permis: string;
  numero_origine_permis: string;
  lieu_de_dobtention_du_permis: string;
  date_de_dobtention_du_permis: string;
  date_de_delivrance_du_permis: string;
}

export interface DemandeFormState {
  /* Section 1 — Type de demande */
  type_demande_id: string;
  type_demande_name: string;
  is_nouveau_permis: boolean;

  /* Section 2 — Candidat */
  candidat_mode: CandidatMode;
  candidat_id: string;
  candidat_display: string;
  personne: PersonneForm;
  candidat: CandidatForm;

  /* Section 3 — Permis (si !is_nouveau_permis) */
  permis: PermisForm;

  /* Section 4 — Auto-école / Formation (si is_nouveau_permis) */
  auto_ecole_id: string;
  formation_id: string;
  referenciel_id: string;

  /* Section 5 — Finalisation */
  province_id: string;
  centre_id: string;
  commentaires: string;
}

export type DemandeAction =
  | { type: 'SET_TYPE_DEMANDE'; id: string; name: string; is_nouveau_permis: boolean }
  | { type: 'SET_CANDIDAT_MODE'; mode: CandidatMode }
  | { type: 'SET_CANDIDAT_EXISTING'; id: string; display: string }
  | { type: 'SET_PERSONNE'; field: keyof PersonneForm; value: string }
  | { type: 'SET_CANDIDAT_FIELD'; field: keyof CandidatForm; value: string }
  | { type: 'SET_PERMIS_FIELD'; field: keyof PermisForm; value: string }
  | { type: 'SET_AUTO_ECOLE'; id: string }
  | { type: 'SET_FORMATION'; id: string }
  | { type: 'SET_REFERENCIEL'; id: string }
  | { type: 'SET_PROVINCE'; id: string }
  | { type: 'SET_CENTRE'; id: string }
  | { type: 'SET_COMMENTAIRES'; value: string }
  | { type: 'RESET' };

export const initialDemandeState: DemandeFormState = {
  type_demande_id: '',
  type_demande_name: '',
  is_nouveau_permis: false,
  candidat_mode: 'search',
  candidat_id: '',
  candidat_display: '',
  personne: { nom: '', prenom: '', email: '', telephone: '', adresse: '', password: '', password_confirmation: '' },
  candidat: { date_naissance: '', lieu_naissance: '', nip: '', type_piece: 'CNI', numero_piece: '', nationalite: 'Gabonaise', genre: '' },
  permis: {
    numero_permis: '',
    numero_origine_permis: '',
    lieu_de_dobtention_du_permis: '',
    date_de_dobtention_du_permis: '',
    date_de_delivrance_du_permis: '',
  },
  auto_ecole_id: '',
  formation_id: '',
  referenciel_id: '',
  province_id: '',
  centre_id: '',
  commentaires: '',
};

export function demandeReducer(state: DemandeFormState, action: DemandeAction): DemandeFormState {
  switch (action.type) {
    case 'SET_TYPE_DEMANDE':
      return { ...state, type_demande_id: action.id, type_demande_name: action.name, is_nouveau_permis: action.is_nouveau_permis };
    case 'SET_CANDIDAT_MODE':
      return { ...state, candidat_mode: action.mode, candidat_id: '', candidat_display: '' };
    case 'SET_CANDIDAT_EXISTING':
      return { ...state, candidat_id: action.id, candidat_display: action.display };
    case 'SET_PERSONNE':
      return { ...state, personne: { ...state.personne, [action.field]: action.value } };
    case 'SET_CANDIDAT_FIELD':
      return { ...state, candidat: { ...state.candidat, [action.field]: action.value } };
    case 'SET_PERMIS_FIELD':
      return { ...state, permis: { ...state.permis, [action.field]: action.value } };
    case 'SET_AUTO_ECOLE':
      return {
        ...state,
        auto_ecole_id: action.id,
        formation_id: action.id !== state.auto_ecole_id ? '' : state.formation_id,
      };
    case 'SET_FORMATION':
      return { ...state, formation_id: action.id };
    case 'SET_REFERENCIEL':
      return { ...state, referenciel_id: action.id };
    case 'SET_PROVINCE':
      return { ...state, province_id: action.id };
    case 'SET_CENTRE':
      return { ...state, centre_id: action.id };
    case 'SET_COMMENTAIRES':
      return { ...state, commentaires: action.value };
    case 'RESET':
      return initialDemandeState;
    default:
      return state;
  }
}
