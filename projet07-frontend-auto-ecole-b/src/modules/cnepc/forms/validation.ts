import React from 'react';
import { PersonneData, CandidatData, NumeroPermisParts, PermisData } from './types';
import { buildNumeroPermis, buildNumeroOriginePermis, validateNumeroPermisFormat, extractCategorieFromNumeroPermis } from './utils';

export interface ValidationContext {
  setError: (error: string | null) => void;
  typeDemandeId: string;
  isNouveauPermis: boolean;
  isFicheEnregistre: boolean;
  autoEcoleId: string;
  formationId: string;
  numeroPermis: string;
  numeroPermisParts: NumeroPermisParts;
  numeroOriginePermisParts: NumeroPermisParts;
  permisData: PermisData;
  personneData: PersonneData;
  candidatData: CandidatData;
  setNumeroPermis: (value: string) => void;
  setPermisData: React.Dispatch<React.SetStateAction<PermisData>>;
  permisFormat?: 'standard' | 'op';
  permisOrigineFormat?: 'standard' | 'op';
}

export const validateStep0 = (context: Pick<ValidationContext, 'typeDemandeId' | 'setError'>): boolean => {
  if (!context.typeDemandeId) {
    context.setError('Veuillez sélectionner un type de demande');
    return false;
  }
  return true;
};

export const validateStepNumeroPermis = (context: Pick<ValidationContext, 'setError' | 'isFicheEnregistre' | 'numeroPermisParts' | 'setNumeroPermis' | 'permisFormat'>): boolean => {
  const format = context.permisFormat || 'standard';
  
  // Pour le format PERM, vérifier seulement que le numéro n'est pas vide
  if (format === 'op') {
    if (!context.numeroPermisParts.numero || context.numeroPermisParts.numero.trim() === '') {
      const label = context.isFicheEnregistre ? 'numéro de permis d\'origine' : 'numéro de permis';
      context.setError(`Veuillez remplir le numéro pour le ${label}. Saisissez le numéro exact tel qu'il apparaît (ex: PERM-12345678, PERM12345678, ou 12345678)`);
      return false;
    }
    const numPermisComplet = buildNumeroPermis(context.numeroPermisParts, format);
    if (!validateNumeroPermisFormat(numPermisComplet)) {
      context.setError('Format du numéro de permis invalide. Le numéro doit commencer par PERM suivi de lettres et chiffres (ex: PERM-12345678, PERM12345678)');
      return false;
    }
    context.setNumeroPermis(numPermisComplet);
    return true;
  }
  
  // Pour le format standard, vérifier tous les champs
  const numPermisComplet = buildNumeroPermis(context.numeroPermisParts, format);
  
  if (!numPermisComplet) {
    const label = context.isFicheEnregistre ? 'numéro de permis d\'origine' : 'numéro de permis';
    context.setError(`Veuillez remplir tous les champs du ${label} (année, province, catégorie et numéro)`);
    return false;
  }

  if (!validateNumeroPermisFormat(numPermisComplet)) {
    context.setError('Format du numéro de permis invalide. Format attendu: AAAA-P-C-NNNN (ex: 2024-1-A-1234) - Minimum 4 chiffres pour le numéro');
    return false;
  }

  context.setNumeroPermis(numPermisComplet);
  return true;
};

export const validateStepPermis = (context: ValidationContext): boolean => {
  if (context.isNouveauPermis) return true;
  
  const champsManquants: string[] = [];
  
  const numPermis = context.permisData.numero_permis || context.numeroPermis;
  if (!numPermis || numPermis.trim() === '') {
    champsManquants.push('Numéro de permis');
  }

  const numPermisComplet = context.permisData.numero_permis || context.numeroPermis || buildNumeroPermis(context.numeroPermisParts);
  let categoriePermis = context.numeroPermisParts.categorie?.toUpperCase() || '';
  
  if (!categoriePermis && numPermisComplet) {
    categoriePermis = extractCategorieFromNumeroPermis(numPermisComplet);
  }
  
  // Le permis d'origine est obligatoire uniquement pour :
  // - Catégories C, D ou E (sauf FICHE d'enregistrement)
  // - FICHE d'enregistrement (toutes catégories)
  const numOriginePermisRequis = 
    context.isFicheEnregistre || 
    (categoriePermis && ['C', 'D', 'E'].includes(categoriePermis));
  
  const permisOrigineFormat = context.permisOrigineFormat || 'standard';
  
  if (numOriginePermisRequis) {
    const numOriginePermis = buildNumeroOriginePermis(context.numeroOriginePermisParts, permisOrigineFormat);
    if (!numOriginePermis) {
      if (context.isFicheEnregistre) {
        context.setError('Le numéro de permis d\'origine est obligatoire pour une fiche d\'enregistrement.');
      } else {
        context.setError('Le numéro de permis d\'origine est obligatoire pour les permis de catégorie C, D ou E.');
      }
      return false;
    }
    
    if (!validateNumeroPermisFormat(numOriginePermis)) {
      if (permisOrigineFormat === 'op') {
        context.setError('Format du numéro de permis d\'origine invalide. Le numéro doit commencer par PERM suivi de lettres et chiffres (ex: PERM-12345678, PERM12345678)');
      } else {
        context.setError('Format du numéro de permis d\'origine invalide. Format attendu: AAAA-P-C-NNNN (ex: 2024-1-A-1234) - Minimum 4 chiffres pour le numéro');
      }
      return false;
    }
    
    context.setPermisData(prev => ({ ...prev, numero_origine_permis: numOriginePermis }));
  } else {
    // Si non requis, on peut quand même l'enregistrer s'il est fourni
    const numOriginePermis = buildNumeroOriginePermis(context.numeroOriginePermisParts, permisOrigineFormat);
    if (numOriginePermis) {
      if (!validateNumeroPermisFormat(numOriginePermis)) {
        if (permisOrigineFormat === 'op') {
          context.setError('Format du numéro de permis d\'origine invalide. Le numéro doit commencer par PERM suivi de lettres et chiffres (ex: PERM-12345678, PERM12345678)');
        } else {
          context.setError('Format du numéro de permis d\'origine invalide. Format attendu: AAAA-P-C-NNNN (ex: 2024-1-A-1234) - Minimum 4 chiffres pour le numéro');
        }
        return false;
      }
      context.setPermisData(prev => ({ ...prev, numero_origine_permis: numOriginePermis }));
    }
  }
  
  if (!context.permisData.lieu_de_dobtention_du_permis || context.permisData.lieu_de_dobtention_du_permis.trim() === '') {
    champsManquants.push('Lieu d\'obtention du permis');
  }
  
  if (!context.permisData.date_de_dobtention_du_permis || context.permisData.date_de_dobtention_du_permis.trim() === '') {
    champsManquants.push('Date d\'obtention du permis');
  }
  
  if (!context.permisData.date_de_delivrance_du_permis || context.permisData.date_de_delivrance_du_permis.trim() === '') {
    champsManquants.push('Date de délivrance du permis');
  }
  
  if (champsManquants.length > 0) {
    context.setError(`Veuillez remplir les champs obligatoires suivants : ${champsManquants.join(', ')}`);
    return false;
  }
  
  return true;
};

export const validatePermisOrigine = (context: Pick<ValidationContext, 'setError' | 'numeroOriginePermisParts' | 'permisOrigineFormat' | 'setPermisData' | 'permisData'>): boolean => {
  const permisOrigineFormat = context.permisOrigineFormat || 'standard';
  const numOriginePermis = buildNumeroOriginePermis(context.numeroOriginePermisParts, permisOrigineFormat);
  
  if (!numOriginePermis) {
    context.setError('Le numéro de permis d\'origine est obligatoire pour les permis de catégorie C, D ou E.');
    return false;
  }
  
  // Retirer la validation de format - accepter n'importe quel format pour le permis d'origine
  // if (!validateNumeroPermisFormat(numOriginePermis)) {
  //   if (permisOrigineFormat === 'op') {
  //     context.setError('Format du numéro de permis d\'origine invalide. Le numéro doit commencer par PERM suivi de lettres et chiffres (ex: PERM-12345678, PERM12345678)');
  //   } else {
  //     context.setError('Format du numéro de permis d\'origine invalide. Format attendu: AAAA-P-C-NNNN (ex: 2024-1-A-1234) - Minimum 4 chiffres pour le numéro');
  //   }
  //   return false;
  // }
  
  context.setPermisData(prev => ({ ...prev, numero_origine_permis: numOriginePermis }));
  return true;
};

export const validateStepAutoEcole = (context: Pick<ValidationContext, 'isNouveauPermis' | 'autoEcoleId' | 'formationId' | 'setError'>): boolean => {
  if (!context.isNouveauPermis) return true;
  
  if (!context.autoEcoleId) {
    context.setError('Veuillez sélectionner une auto-école');
    return false;
  }
  if (!context.formationId) {
    context.setError('Veuillez sélectionner une formation');
    return false;
  }
  return true;
};

export const validatePersonne = (context: Pick<ValidationContext, 'personneData' | 'setError'>): boolean => {
  const champsManquants: string[] = [];
  
  if (!context.personneData.nom || context.personneData.nom.trim() === '') {
    champsManquants.push('Nom');
  }
  if (!context.personneData.prenom || context.personneData.prenom.trim() === '') {
    champsManquants.push('Prénom');
  }
  if (!context.personneData.adresse || context.personneData.adresse.trim() === '') {
    champsManquants.push('Adresse');
  }
  if (!context.personneData.password || context.personneData.password.trim() === '') {
    champsManquants.push('Mot de passe');
  }
  if (!context.personneData.password_confirmation || context.personneData.password_confirmation.trim() === '') {
    champsManquants.push('Confirmation du mot de passe');
  }
  
  if (champsManquants.length > 0) {
    context.setError(`Veuillez remplir les champs obligatoires suivants pour les informations personnelles : ${champsManquants.join(', ')}`);
    return false;
  }
  
  if (context.personneData.email && context.personneData.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(context.personneData.email)) {
      context.setError('Veuillez entrer un email valide (exemple : nom@email.com)');
      return false;
    }
  }

  if (context.personneData.password.length < 8) {
    context.setError('Le mot de passe doit contenir au moins 8 caractères');
    return false;
  }
  
  if (context.personneData.password !== context.personneData.password_confirmation) {
    context.setError('Les mots de passe ne correspondent pas. Veuillez vérifier votre saisie.');
    return false;
  }
  
  return true;
};

/** Chiffre + lettre majuscule + tiret + 4 chiffres + tiret + 8 chiffres (ex. fictif : 2B-0000-00000000) */
export const NIP_REGEX_FORMAT_A = /^\d[A-Z]-\d{4}-\d{8}$/;

/** 2 chiffres + tiret + 4 chiffres + tiret + 8 chiffres (ex. fictif : 00-0000-00000000) */
export const NIP_REGEX_FORMAT_B = /^\d{2}-\d{4}-\d{8}$/;

export const NIP_REGEX = /^(\d[A-Z]-\d{4}-\d{8}|\d{2}-\d{4}-\d{8})$/;

export const validateCandidat = (context: Pick<ValidationContext, 'candidatData' | 'setError'>): boolean => {
  const champsManquants: string[] = [];
  
  if (!context.candidatData.date_naissance || context.candidatData.date_naissance.trim() === '') {
    champsManquants.push('Date de naissance');
  }
  if (!context.candidatData.lieu_naissance || context.candidatData.lieu_naissance.trim() === '') {
    champsManquants.push('Lieu de naissance');
  }
  if (!context.candidatData.numero_piece || context.candidatData.numero_piece.trim() === '') {
    champsManquants.push('Numéro de pièce');
  }
  if (!context.candidatData.nationalite || context.candidatData.nationalite.trim() === '') {
    champsManquants.push('Nationalité');
  }
  
  if (champsManquants.length > 0) {
    context.setError(`Veuillez remplir les champs obligatoires suivants : ${champsManquants.join(', ')}`);
    return false;
  }
  
  if (context.candidatData.nip && context.candidatData.nip.trim() !== '') {
    const nipTrimmed = context.candidatData.nip.trim();
    if (!NIP_REGEX.test(nipTrimmed)) {
      context.setError(
        'Le NIP doit être au format 2B-0000-00000000 (chiffre + lettre + segments chiffrés) ou 00-0000-00000000 (deux chiffres + segments chiffrés) — exemples fictifs.'
      );
      return false;
    }
  }

  return true;
};

