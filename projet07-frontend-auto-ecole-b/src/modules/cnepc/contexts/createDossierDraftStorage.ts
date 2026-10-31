import {
  NumeroPermisParts,
  PermisData,
  PersonneData,
  CandidatData,
  FormationData,
  LieuExamenData,
} from '../forms/types';
import type { AutoEcole, TypeDemande } from '../services';
import type { DataCategorieItem } from '../forms/steps';

export const CREATE_DOSSIER_DRAFT_STORAGE_KEY = 'cnepc.create-dossier-draft';
const DRAFT_VERSION = 1;

const emptyNumeroParts = (): NumeroPermisParts => ({
  annee: '',
  province: '',
  categorie: '',
  numero: '',
});

const defaultPermisData = (): PermisData => ({
  numero_permis: '',
  numero_origine_permis: '',
  lieu_de_dobtention_du_permis: '',
  date_de_dobtention_du_permis: '',
  date_de_delivrance_du_permis: '',
});

const defaultPersonneData = (): PersonneData => ({
  nom: '',
  prenom: '',
  email: '',
  contact: '',
  telephone: '',
  adresse: '',
  password: '',
  password_confirmation: '',
});

const defaultCandidatData = (): CandidatData => ({
  date_naissance: '',
  lieu_naissance: '',
  nip: '',
  type_piece: 'CNI',
  numero_piece: '',
  nationalite: 'Sénégalaise',
  genre: 'M',
});

const defaultFormationData = (): FormationData => ({
  formation_id: '',
  referenciel_id: '',
  commentaires: '',
});

const defaultLieuExamen = (): LieuExamenData => ({
  province_id: '',
  centre_id: '',
});

/** Champs sérialisés pour survivre à un rechargement (pas de mots de passe). */
export interface CreateDossierDraftSnapshot {
  v: number;
  selectedTypeDemande: TypeDemande | null;
  typeDemandeId: string;
  isNouveauPermis: boolean;
  isFicheEnregistre: boolean;
  numeroPermis: string;
  permisFormat: 'standard' | 'op';
  permisOrigineFormat: 'standard' | 'op';
  numeroPermisParts: NumeroPermisParts;
  numeroOriginePermisParts: NumeroPermisParts;
  availableCategories: string[];
  permisData: PermisData;
  numeroBOriginePermisParts: NumeroPermisParts;
  permisBOrigineFormat: 'standard' | 'op';
  permisBOrigineData: PermisData;
  selectedAutoEcole: AutoEcole | null;
  autoEcoleId: string;
  personneData: PersonneData;
  personneId: string | null;
  candidatData: CandidatData;
  candidatId: string | null;
  selectedCandidat: unknown | null;
  candidatMode: 'new' | 'existing' | null;
  formationData: FormationData;
  lieuExamenData: LieuExamenData;
  captchaId: string;
  captchaCode: string;
  permisVerified: boolean;
  verificationError: string | null;
  candidatTrouveFromPermis: unknown | null;
  candidatNonTrouve: boolean;
  permisPrincipalVerified: boolean;
  verificationErrorPrincipal: string | null;
  candidatTrouveFromPermisPrincipal: unknown | null;
  candidatNonTrouvePrincipal: boolean;
  permisOrigineVerified: boolean;
  verificationErrorOrigine: string | null;
  candidatTrouveFromPermisOrigine: unknown | null;
  candidatNonTrouveOrigine: boolean;
  dataCategorie: DataCategorieItem[];
  identitySearchNomForRefinement: string | null;
  /** Pièce DGDI validée ou contournée (étape numéro de permis) — évite de tout refaire au retour sur l’étape */
  numeroPermisDgdiVerified: boolean;
  numeroPermisDgdiBypass: boolean;
}

export function getEmptyCreateDossierDraftSnapshot(): CreateDossierDraftSnapshot {
  return {
    v: DRAFT_VERSION,
    selectedTypeDemande: null,
    typeDemandeId: '',
    isNouveauPermis: false,
    isFicheEnregistre: false,
    numeroPermis: '',
    permisFormat: 'standard',
    permisOrigineFormat: 'standard',
    numeroPermisParts: emptyNumeroParts(),
    numeroOriginePermisParts: emptyNumeroParts(),
    availableCategories: [],
    permisData: defaultPermisData(),
    numeroBOriginePermisParts: emptyNumeroParts(),
    permisBOrigineFormat: 'standard',
    permisBOrigineData: defaultPermisData(),
    selectedAutoEcole: null,
    autoEcoleId: '',
    personneData: defaultPersonneData(),
    personneId: null,
    candidatData: defaultCandidatData(),
    candidatId: null,
    selectedCandidat: null,
    candidatMode: null,
    formationData: defaultFormationData(),
    lieuExamenData: defaultLieuExamen(),
    captchaId: '',
    captchaCode: '',
    permisVerified: false,
    verificationError: null,
    candidatTrouveFromPermis: null,
    candidatNonTrouve: false,
    permisPrincipalVerified: false,
    verificationErrorPrincipal: null,
    candidatTrouveFromPermisPrincipal: null,
    candidatNonTrouvePrincipal: false,
    permisOrigineVerified: false,
    verificationErrorOrigine: null,
    candidatTrouveFromPermisOrigine: null,
    candidatNonTrouveOrigine: false,
    dataCategorie: [],
    identitySearchNomForRefinement: null,
    numeroPermisDgdiVerified: false,
    numeroPermisDgdiBypass: false,
  };
}

function mergeSnapshot(raw: Partial<CreateDossierDraftSnapshot> | null): CreateDossierDraftSnapshot {
  const base = getEmptyCreateDossierDraftSnapshot();
  if (!raw || typeof raw !== 'object') return base;
  if (raw.v != null && raw.v !== DRAFT_VERSION) return base;

  return {
    ...base,
    ...raw,
    numeroPermisParts: { ...base.numeroPermisParts, ...raw.numeroPermisParts },
    numeroOriginePermisParts: { ...base.numeroOriginePermisParts, ...raw.numeroOriginePermisParts },
    numeroBOriginePermisParts: { ...base.numeroBOriginePermisParts, ...raw.numeroBOriginePermisParts },
    permisData: { ...base.permisData, ...raw.permisData },
    permisBOrigineData: { ...base.permisBOrigineData, ...raw.permisBOrigineData },
    personneData: {
      ...base.personneData,
      ...raw.personneData,
      password: '',
      password_confirmation: '',
    },
    candidatData: { ...base.candidatData, ...raw.candidatData },
    formationData: { ...base.formationData, ...raw.formationData },
    lieuExamenData: { ...base.lieuExamenData, ...raw.lieuExamenData },
    availableCategories: Array.isArray(raw.availableCategories) ? raw.availableCategories : base.availableCategories,
    dataCategorie: Array.isArray(raw.dataCategorie) ? raw.dataCategorie : base.dataCategorie,
    numeroPermisDgdiVerified: Boolean(raw.numeroPermisDgdiVerified),
    numeroPermisDgdiBypass: Boolean(raw.numeroPermisDgdiBypass),
  };
}

export function loadCreateDossierDraft(): CreateDossierDraftSnapshot | null {
  try {
    const raw = sessionStorage.getItem(CREATE_DOSSIER_DRAFT_STORAGE_KEY);
    if (!raw || raw.trim() === '') return null;
    const parsed = JSON.parse(raw) as Partial<CreateDossierDraftSnapshot>;
    return mergeSnapshot(parsed);
  } catch {
    return null;
  }
}

function stripPasswords(personne: PersonneData): PersonneData {
  return { ...personne, password: '', password_confirmation: '' };
}

export function saveCreateDossierDraft(snapshot: CreateDossierDraftSnapshot): void {
  try {
    const toStore: CreateDossierDraftSnapshot = {
      ...snapshot,
      v: DRAFT_VERSION,
      personneData: stripPasswords(snapshot.personneData),
    };
    sessionStorage.setItem(CREATE_DOSSIER_DRAFT_STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // quota ou mode privé
  }
}

export function clearCreateDossierDraft(): void {
  try {
    sessionStorage.removeItem(CREATE_DOSSIER_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
