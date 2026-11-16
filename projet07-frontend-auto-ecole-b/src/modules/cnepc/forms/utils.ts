import { NumeroPermisParts, PermisFormatType } from './types';
import type { Referentiel } from '../types/auto-ecole';

/**
 * Construit le numéro de permis complet selon le format choisi
 * Format standard: AAAA-P-C-NNNN
 * Format OP: PERM-XXXXXX (lettres et chiffres)
 */
export const buildNumeroPermis = (parts: NumeroPermisParts, format: PermisFormatType = 'standard'): string => {
  if (format === 'op') {
    // Format OP: L'utilisateur saisit le numéro complet exactement comme il le souhaite
    if (!parts.numero || parts.numero.trim() === '') {
      return '';
    }
    // Retourner le numéro tel quel, sans ajouter de préfixe
    // L'utilisateur peut saisir "PERM-12345678", "PERM12345678", "12345678", etc.
    return parts.numero.trim();
  }
  
  // Format standard: AAAA-P-C-NNNN
  if (!parts.annee || !parts.province || !parts.categorie || !parts.numero || parts.numero.length < 4) {
    return '';
  }
  return `${parts.annee}-${parts.province}-${parts.categorie.toUpperCase()}-${parts.numero}`;
};

/**
 * Construit le numéro de permis d'origine complet selon le format choisi
 */
export const buildNumeroOriginePermis = (parts: NumeroPermisParts, format: PermisFormatType = 'standard'): string => {
  if (format === 'op') {
    // Format OP: L'utilisateur saisit le numéro complet exactement comme il le souhaite
    if (!parts.numero || parts.numero.trim() === '') {
      return '';
    }
    // Retourner le numéro tel quel, sans ajouter de préfixe
    // L'utilisateur peut saisir "PERM-12345678", "PERM12345678", "12345678", etc.
    return parts.numero.trim();
  }
  
  // Format standard: AAAA-P-C-NNNN
  if (!parts.annee || !parts.province || !parts.categorie || !parts.numero || parts.numero.length < 4) {
    return '';
  }
  return `${parts.annee}-${parts.province}-${parts.categorie.toUpperCase()}-${parts.numero}`;
};

/**
 * Normalise un numéro de permis pour comparaison (sans tirets, majuscules, trim)
 */
export const normalizeNumeroPermis = (num: string): string => {
  if (!num || typeof num !== 'string') return '';
  return num.replace(/-/g, '').toUpperCase().trim();
};

/**
 * Jeton de catégorie (B, BE, C, CE, D, E…) à partir du champ `classe` d’une ligne data_categorie.
 */
export function permisClasseTokenFromClasseField(classe: string): string {
  const compact = (classe || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!compact) return '';
  if (compact.startsWith('BE')) return 'BE';
  if (compact.startsWith('CE') || compact.startsWith('EC')) return 'CE';
  const c0 = compact.charAt(0);
  if (/[BCDEG]/.test(c0)) return c0;
  return compact.slice(0, 2);
}

/**
 * Référentiel « type de permis » dont le libellé / code correspond à la catégorie des permis sélectionnés.
 */
export function findReferentielForPermisClasse(
  referentiels: Referentiel[],
  classeField: string
): Referentiel | undefined {
  const token = permisClasseTokenFromClasseField(classeField);
  if (!token) return undefined;

  const norm = (s: string) =>
    (s || '').toUpperCase().normalize('NFD').replace(/\p{M}/gu, '');

  const scoreRef = (r: Referentiel): number => {
    const text = norm(`${r.libelle ?? ''} ${r.code ?? ''}`);
    if (token === 'BE') {
      return /\bBE\b|PERMIS\s*BE|CAT\.?\s*BE|TYPE\s*BE/i.test(text) ? 100 : 0;
    }
    if (token === 'CE') {
      return /\bCE\b|PERMIS\s*CE|CAT\.?\s*CE|TYPE\s*CE/i.test(text) ? 100 : 0;
    }
    const L = token;
    if (L === 'C') {
      if (/\bCE\b|PERMIS\s*CE\b|CAT\.?\s*CE\b|TYPE\s*CE\b/i.test(text)) return 0;
      if (
        /\bPERMIS\s*C\b|\bCAT(?:E|É)?GORIE\s*C\b|\bCLASSE\s*C\b|\bTYPE\s*C\b/i.test(text)
      )
        return 100;
      if (/\bC\b/.test(text) && text.length < 48) return 35;
      return 0;
    }
    if (/^[BDEG]$/i.test(L)) {
      if (
        new RegExp(
          `\\bPERMIS\\s*${L}\\b|\\bCAT(?:E|É)?GORIE\\s*${L}\\b|\\bCLASSE\\s*${L}\\b|\\bTYPE\\s*${L}\\b`,
          'i'
        ).test(text)
      )
        return 100;
      if (new RegExp(`\\b${L}\\b`).test(text)) return 40;
    }
    return 0;
  };

  let best: Referentiel | undefined;
  let bestScore = -1;
  for (const r of referentiels) {
    const s = scoreRef(r);
    const len = r.libelle?.length ?? 0;
    if (s > bestScore || (s === bestScore && s > 0 && len > (best?.libelle?.length ?? 0))) {
      bestScore = s;
      best = r;
    }
  }
  return bestScore > 0 ? best : undefined;
}

/**
 * Trouve dans un tableau de permis celui dont le numero_permis correspond au numéro recherché.
 * Utilisé quand l'API renvoie plusieurs permis : on sélectionne celui qui correspond au numéro saisi.
 */
export const findPermisByNumero = (response: unknown, numPermisComplet: string): Record<string, unknown> | null => {
  if (!numPermisComplet || !response) return null;
  if (!Array.isArray(response) || response.length === 0) return null;
  const normalizedSearch = normalizeNumeroPermis(numPermisComplet);
  const found = response.find((item: { numero_permis?: string }) => {
    const itemNum = normalizeNumeroPermis((item?.numero_permis ?? '').toString());
    return itemNum === normalizedSearch;
  });
  return (found != null && typeof found === 'object') ? (found as Record<string, unknown>) : null;
};

/**
 * Valide le format du numéro de permis
 * Formats acceptés:
 * - Standard: AAAA-P-C-NNNN où:
 *   - AAAA = année (4 chiffres)
 *   - P = province (1 chiffre de 1 à 9)
 *   - C = catégorie (1 lettre)
 *   - NNNN = numéro (minimum 4 chiffres)
 * - OP: PERM-XXXXXX où XXXXXX peut contenir lettres et chiffres
 */
export const validateNumeroPermisFormat = (numPermis: string): boolean => {
  // Format standard: AAAA-P-C-NNNN
  const standardPattern = /^(\d{4})-([1-9])-([A-Z])-(\d{4,})$/i;
  // Format OP: PERM-XXXXXX ou PERMXXXXXX (lettres et chiffres acceptés après PERM)
  const opPattern = /^PERM-?([A-Z0-9]+)$/i;
  
  return standardPattern.test(numPermis) || opPattern.test(numPermis);
};

/**
 * Extrait la catégorie d'un numéro de permis complet
 * Fonctionne uniquement pour le format standard (AAAA-P-C-NNNN)
 */
export const extractCategorieFromNumeroPermis = (numPermis: string): string => {
  if (!numPermis) return '';
  
  // Format OP n'a pas de catégorie
  if (numPermis.toUpperCase().startsWith('PERM')) {
    return '';
  }
  
  // Format standard: AAAA-P-C-NNNNN
  const parts = numPermis.split('-');
  if (parts.length >= 3) {
    return parts[2].toUpperCase();
  }
  return '';
};

/**
 * Vérifie si un type de demande est un "nouveau permis"
 */
export const checkIsNouveauPermis = (typeDemandeName: string): boolean => {
  const nameLower = typeDemandeName.toLowerCase();
  return nameLower.includes('nouveau permis') || 
         (nameLower.includes('nouveau') && nameLower.includes('permis')) ||
         nameLower === 'nouveau permis';
};

/**
 * Vérifie si un type de demande est une "fiche d'enregistrement".
 * Gère les codes API sans espace (ex. FICHEENREGISTREMENT) et variantes / fautes (ex. FICHEENREGISTRMENT).
 */
export const checkIsFicheEnregistre = (typeDemandeName: string): boolean => {
  if (!typeDemandeName || typeof typeDemandeName !== 'string') return false;
  /** Libellés API : tirets, underscores, points, espaces — tout compacter pour comparaison */
  const normalized = typeDemandeName
    .trim()
    .replace(/\s+/g, '')
    .replace(/['\u2019]/g, '')
    .replace(/[-_.]/g, '')
    .toUpperCase();
  if (normalized === 'FICHEENREGISTREMENT' || normalized === 'FICHEENREGISTRMENT') return true;
  if (/^FICHE.*ENREGISTR/i.test(normalized)) return true;
  if (normalized.startsWith('FICHE') && normalized.includes('ENREG')) return true;
  const nameLower = typeDemandeName.toLowerCase();
  if (nameLower.includes('fiche') && (nameLower.includes('enregistre') || nameLower.includes('enregistr'))) {
    return true;
  }
  return nameLower.includes('fiche d\'enregistre');
};

/**
 * Vérifie si un type de demande est un "duplicata"
 */
export const checkIsDuplicata = (typeDemandeName: string): boolean => {
  const nameLower = typeDemandeName.toLowerCase();
  return nameLower.includes('duplicata') || nameLower.includes('duplicate');
};

/**
 * Détecte le format du numéro de permis d'origine (numero_origine_permis) renvoyé par l'API :
 * - "op" (PERM) : uniquement des chiffres (ex: "80852")
 * - "standard" : structure type AAAA-P-C-NNNN avec ou sans tirets (ex: "20051C00014" ou "2005-1-C-00014")
 */
export const getNumeroOriginePermisFormat = (num: string): PermisFormatType => {
  if (!num || typeof num !== 'string') return 'op';
  const trimmed = num.trim();
  if (!trimmed) return 'op';
  // Avec tirets : AAAA-P-C-NNNN
  const parts = trimmed.split('-');
  if (parts.length === 4) return 'standard';
  // Sans tirets : 4 chiffres + 1 chiffre (1-9) + 1 lettre + chiffres (ex: 20051C00014)
  if (/^\d{4}[1-9][A-Za-z]\d+$/.test(trimmed)) return 'standard';
  // Uniquement des chiffres → PERM
  if (/^\d+$/.test(trimmed)) return 'op';
  return 'op';
};

/**
 * Parse numero_origine_permis et retourne le format + les parts pour pré-remplir PermisBOrigineStep.
 * Utilisé quand les données viennent de la vérification (NumeroPermisStep).
 */
export const parseNumeroOriginePermisToParts = (
  num: string
): { format: PermisFormatType; parts: NumeroPermisParts } => {
  const emptyParts: NumeroPermisParts = { annee: '', province: '', categorie: '', numero: '' };
  if (!num || typeof num !== 'string') return { format: 'op', parts: emptyParts };
  const trimmed = num.trim();
  if (!trimmed) return { format: 'op', parts: emptyParts };

  const parts = trimmed.split('-');
  if (parts.length === 4) {
    return {
      format: 'standard',
      parts: {
        annee: parts[0] || '',
        province: parts[1] || '',
        categorie: (parts[2] || '').toUpperCase(),
        numero: parts[3] || '',
      },
    };
  }
  const standardMatch = trimmed.match(/^(\d{4})([1-9])([A-Za-z])(\d+)$/);
  if (standardMatch) {
    return {
      format: 'standard',
      parts: {
        annee: standardMatch[1] || '',
        province: standardMatch[2] || '',
        categorie: (standardMatch[3] || '').toUpperCase(),
        numero: standardMatch[4] || '',
      },
    };
  }
  return {
    format: 'op',
    parts: { ...emptyParts, numero: trimmed },
  };
};

/**
 * Obtient le libellé d'un champ pour les messages d'erreur
 */
export const getFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    nom: 'Nom',
    prenom: 'Prénom',
    email: 'Email',
    contact: 'Contact',
    telephone: 'Téléphone',
    adresse: 'Adresse',
    password: 'Mot de passe',
    password_confirmation: 'Confirmation du mot de passe',
    date_naissance: 'Date de naissance',
    lieu_naissance: 'Lieu de naissance',
    nip: 'NIP (Numéro d\'Identification Personnel)',
    type_piece: 'Type de pièce',
    numero_piece: 'Numéro de pièce',
    nationalite: 'Nationalité',
    genre: 'Genre',
    personne_id: 'Personne',
  };
  return labels[field.toLowerCase()] || field;
};

