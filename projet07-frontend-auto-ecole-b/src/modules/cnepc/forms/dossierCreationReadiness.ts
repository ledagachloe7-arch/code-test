import type {
  FormationData,
  LieuExamenData,
  NumeroPermisParts,
  PermisData,
} from './types';
import {
  buildNumeroPermis,
  buildNumeroOriginePermis,
  validateNumeroPermisFormat,
  checkIsFicheEnregistre,
  checkIsDuplicata,
} from './utils';
import { isFormationTypeC } from '../contexts/CreateDossierUtils';
import type { Formation } from '../services';

/**
 * Entrées nécessaires pour vérifier que le futur payload dossier contient
 * uniquement les champs exigés par le métier (hors candidat_id / date_creation gérés à la soumission).
 */
export interface DossierCreationReadinessInput {
  candidatId: string | null;
  typeDemandeId: string;
  isNouveauPermis: boolean;
  /** Fiche d'enregistrement : seul ce type de demande impose le numéro de permis d'origine */
  isFicheEnregistre: boolean;
  /** Nom du type de demande (ex. FICHEENREGISTREMENT) — utilisé pour confirmer la fiche si le booléen contexte est faux */
  typeDemandeName?: string | null;
  formationData: FormationData;
  selectedAutoEcole: { id: string } | null;
  permisData: PermisData;
  numeroPermis: string;
  permisFormat: 'standard' | 'op';
  numeroPermisParts: NumeroPermisParts;
  numeroOriginePermisParts: NumeroPermisParts;
  permisOrigineFormat: 'standard' | 'op';
  permisBOrigineData: PermisData;
  numeroBOriginePermisParts: NumeroPermisParts;
  permisBOrigineFormat: 'standard' | 'op';
  formations: Formation[];
  lieuExamenData: LieuExamenData;
  /** Lignes data_categorie (au moins une requise) */
  dataCategorie: unknown[];
  /** Référentiel « type de permis » sélectionné en finalisation (libellé + code) */
  selectedReferentiel?: { libelle: string; code: string } | null;
}

/** Détecte si un texte (libellé ou code référentiel) évoque une demande permis C, D, E ou F */
export function textImpliesPermisCDE(text: string): boolean {
  const u = text
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (/\bPERMIS\s*[-_]?\s*(C|D|E|F)\b/.test(u)) return true;
  if (/\b(CAT|CATÉGORIE|CATEGORIE|CLASSE|TYPE)\s*\.?\s*(C|D|E|F)\b/.test(u)) return true;
  const tokens = u.split(/[^A-Z0-9]+/).filter(Boolean);
  for (const t of tokens) {
    if (t === 'C' || t === 'D' || t === 'E' || t === 'F') return true;
    if (/^(C|D|E|F)\d$/.test(t)) return true;
    if (t === 'CE' || t === 'EC') return true;
  }
  return false;
}

function principalCategorieImpliesCDE(categorieRaw: string): boolean {
  const s = (categorieRaw || '').trim();
  if (!s) return false;
  return textImpliesPermisCDE(s);
}

export function dataCategorieIncludesPermisB(rows: unknown[]): boolean {
  if (!Array.isArray(rows)) return false;
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const classe = String((row as { classe?: unknown }).classe ?? '').toUpperCase();
    const tokens = classe.split(/[^A-Z0-9]+/).filter(Boolean);
    for (const t of tokens) {
      if (t === 'B') return true;
      if (/^B\d+$/.test(t)) return true;
      if (t.startsWith('BE')) return true;
    }
  }
  return false;
}

const trim = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

function permisPassesFormatCheck(raw: string, format: 'standard' | 'op'): boolean {
  if (!raw) return false;
  const s = raw.trim();
  if (validateNumeroPermisFormat(s)) return true;
  if (format === 'standard') {
    const compact = s.replace(/-/g, '');
    const m = compact.match(/^(\d{4})([1-9])([A-Za-z])(\d{4,})$/);
    if (m) {
      const dashed = `${m[1]}-${m[2]}-${m[3].toUpperCase()}-${m[4]}`;
      return validateNumeroPermisFormat(dashed);
    }
  }
  return false;
}

function resolveNumeroPermisPrincipal(input: DossierCreationReadinessInput): string {
  return (
    trim(input.permisData.numero_permis) ||
    trim(input.numeroPermis) ||
    trim(buildNumeroPermis(input.numeroPermisParts, input.permisFormat))
  );
}

function resolveNumeroOrigineHorsNouveau(input: DossierCreationReadinessInput): string {
  const fromPrincipal =
    trim(input.permisData.numero_origine_permis) ||
    trim(buildNumeroOriginePermis(input.numeroOriginePermisParts, input.permisOrigineFormat));
  if (fromPrincipal) return fromPrincipal;
  // Fiche d’enregistrement (C/D/E) : permis d’origine saisi à l’étape « Permis B d’origine », pas dans permisData
  if (input.isFicheEnregistre) {
    return resolveNumeroOrigineNouveauC(input);
  }
  return '';
}

function resolveNumeroOrigineNouveauC(input: DossierCreationReadinessInput): string {
  const bo = input.permisBOrigineData;
  return (
    trim(bo.numero_origine_permis) ||
    trim(buildNumeroOriginePermis(input.numeroBOriginePermisParts, input.permisBOrigineFormat))
  );
}

/** Permis d'origine saisi (étape « Permis d'origine » ou « Permis B d'origine » / fiche) — suffit pour ne pas exiger une ligne B dans data_categorie pour C/D/E */
function hasOrigineDocumentaireSaisi(input: DossierCreationReadinessInput): boolean {
  const fromPrincipal =
    trim(input.permisData.numero_origine_permis) ||
    trim(buildNumeroOriginePermis(input.numeroOriginePermisParts, input.permisOrigineFormat));
  if (fromPrincipal) return true;
  const fromB =
    trim(input.permisBOrigineData.numero_origine_permis) ||
    trim(buildNumeroOriginePermis(input.numeroBOriginePermisParts, input.permisBOrigineFormat));
  return Boolean(fromB);
}

function isCdeContext(input: DossierCreationReadinessInput): boolean {
  const ref = input.selectedReferentiel;
  const referentielCde =
    !!ref &&
    (textImpliesPermisCDE(ref.libelle || '') || textImpliesPermisCDE(ref.code || ''));
  const principalCde = principalCategorieImpliesCDE(trim(input.numeroPermisParts?.categorie));
  return referentielCde || principalCde;
}

/** Fiche reconnue, ou demande C/D/E avec permis d'origine renseigné : pas de format strict sur le n° principal (équivalent ancienne règle fiche) */
function shouldRelaxPrincipalNumeroPermisCheck(input: DossierCreationReadinessInput): boolean {
  if (input.isFicheEnregistre) return true;
  return isCdeContext(input) && hasOrigineDocumentaireSaisi(input);
}

/**
 * Si le libellé du type de demande n'est pas reconnu par checkIsFicheEnregistre mais que le parcours
 * « fiche d'enregistrement » C/D/E a bien rempli le permis B d'origine (étape dédiée, pas le flux duplicata),
 * on considère la fiche comme active pour assouplir les contrôles (ligne B dans data_categorie, format du n° principal).
 */
function inferFicheEnregistrementFromWorkflowSignals(raw: DossierCreationReadinessInput): boolean {
  if (raw.isNouveauPermis) return false;
  const name = (raw.typeDemandeName ?? '').trim();
  if (checkIsDuplicata(name)) return false;
  const ref = raw.selectedReferentiel;
  const referentielCde =
    !!ref &&
    (textImpliesPermisCDE(ref.libelle || '') || textImpliesPermisCDE(ref.code || ''));
  const principalCde = principalCategorieImpliesCDE(trim(raw.numeroPermisParts?.categorie));
  if (!referentielCde && !principalCde) return false;
  const bLine =
    trim(raw.permisBOrigineData.numero_origine_permis) ||
    trim(buildNumeroOriginePermis(raw.numeroBOriginePermisParts, raw.permisBOrigineFormat));
  return Boolean(bLine);
}

/**
 * Contrôle uniquement les champs dossier requis pour la création (liste métier).
 * Ne vérifie pas candidat / personne. statut et date_modification sont posés au moment de l’envoi.
 */
export function validateDossierCreationReadiness(rawInput: DossierCreationReadinessInput): string[] {
  const effectiveFiche =
    rawInput.isFicheEnregistre ||
    checkIsFicheEnregistre(rawInput.typeDemandeName ?? '') ||
    inferFicheEnregistrementFromWorkflowSignals(rawInput);
  const input: DossierCreationReadinessInput = {
    ...rawInput,
    isFicheEnregistre: effectiveFiche,
  };

  const errors: string[] = [];

  if (!trim(input.candidatId)) {
    errors.push('candidat : identifiant manquant (candidat non créé ou non sélectionné)');
  }
  if (!trim(input.typeDemandeId)) {
    errors.push('type_demande_id manquant');
  }
  if (!trim(input.formationData.referenciel_id)) {
    errors.push('referenciel_id manquant');
  }
  if (input.isNouveauPermis) {
    if (!input.selectedAutoEcole?.id) {
      errors.push('auto_ecole_id manquant');
    }
    if (!trim(input.formationData.formation_id)) {
      errors.push('formation_id manquant');
    }
  } else {
    if (!input.selectedAutoEcole?.id) {
      errors.push('auto_ecole_id manquant (sélectionnez l’auto-école CNEPC à la finalisation)');
    }
    if (!trim(input.formationData.formation_id)) {
      errors.push('formation_id manquant (sélectionnez la formation à la finalisation)');
    }
  }
  if (input.formationData.commentaires === undefined || input.formationData.commentaires === null) {
    errors.push('commentaires manquant');
  }

  if (!trim(input.lieuExamenData.province_id)) {
    errors.push('province_id manquant');
  }
  // centre_id n’est pas envoyé à l’API (champ interdit sur création) — le centre est résolu côté backend

  if (!Array.isArray(input.dataCategorie) || input.dataCategorie.length === 0) {
    errors.push('data_categorie : au moins une ligne requise');
  } else if (!input.isNouveauPermis) {
    const ref = input.selectedReferentiel;
    const referentielCde =
      !!ref &&
      (textImpliesPermisCDE(ref.libelle || '') || textImpliesPermisCDE(ref.code || ''));
    const principalCde = principalCategorieImpliesCDE(trim(input.numeroPermisParts?.categorie));
    const cde = referentielCde || principalCde;
    /** Avec permis d'origine renseigné, le « B » attendu est documenté par ce numéro — pas besoin d’une ligne B distincte dans le modal */
    const origineCouvreExigenceB = hasOrigineDocumentaireSaisi(input);
    if (cde && !dataCategorieIncludesPermisB(input.dataCategorie) && !origineCouvreExigenceB) {
      errors.push(
        'Permis B manquant dans la sélection des permis (étape « Numéro de permis »). Pour une demande en catégorie C, D, E ou F, vous devez cocher la ligne du permis B dans le modal de sélection ou renseigner le numéro de permis d’origine (permis B). Si vous ne disposez pas du permis B, rendez-vous au CNEPC ou rapprochez-vous des services des transports compétents pour l’obtenir.'
      );
    }
  }

  if (input.permisData.expired === true && !trim(input.permisData.expiration_date)) {
    errors.push('expiration_date requis lorsque expired est vrai');
  }
  if (input.permisData.suspended === true && !trim(input.permisData.suspended_date)) {
    errors.push('suspended_date requis lorsque suspended est vrai');
  }

  const formationTypeC = isFormationTypeC(
    input.isNouveauPermis,
    input.formationData,
    input.formations
  );

  if (!input.isNouveauPermis) {
    const num = resolveNumeroPermisPrincipal(input);
    if (!num) {
      errors.push('numero_permis manquant');
    } else if (!shouldRelaxPrincipalNumeroPermisCheck(input) && !permisPassesFormatCheck(num, input.permisFormat)) {
      errors.push('numero_permis : format invalide');
    }

    const orig = resolveNumeroOrigineHorsNouveau(input);
    if (input.isFicheEnregistre) {
      if (!orig) {
        errors.push(
          'Le numéro de permis d’origine est manquant : veuillez le compléter (obligatoire pour une fiche d’enregistrement).'
        );
      }
    }

    if (!trim(input.permisData.lieu_de_dobtention_du_permis)) {
      errors.push('lieu_de_dobtention_du_permis manquant');
    }
    if (!trim(input.permisData.date_de_dobtention_du_permis)) {
      errors.push('date_de_dobtention_du_permis manquant');
    }
    if (!trim(input.permisData.date_de_delivrance_du_permis)) {
      errors.push('date_de_delivrance_du_permis manquant');
    }
  } else if (formationTypeC) {
    const orig = resolveNumeroOrigineNouveauC(input);
    if (!orig) {
      errors.push('numero_origine_permis manquant (permis B d’origine, formation C)');
    }
    const bo = input.permisBOrigineData;
    if (!trim(bo.lieu_de_dobtention_du_permis)) {
      errors.push('lieu_de_dobtention_du_permis manquant (permis B d’origine)');
    }
    if (!trim(bo.date_de_dobtention_du_permis)) {
      errors.push('date_de_dobtention_du_permis manquant (permis B d’origine)');
    }
    if (!trim(bo.date_de_delivrance_du_permis)) {
      errors.push('date_de_delivrance_du_permis manquant (permis B d’origine)');
    }
  }

  return errors;
}
