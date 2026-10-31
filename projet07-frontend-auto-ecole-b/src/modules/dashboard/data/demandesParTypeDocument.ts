import type { DemandeParTypeDocumentItem } from '../types';

/**
 * Données statiques : nombre de demandes par type de document.
 * Chaque entrée contient un count (valeur affichée) et sparkData (série pour la sparkline).
 */
export const DEMANDES_PAR_TYPE_DOCUMENT: DemandeParTypeDocumentItem[] = [
  {
    id: 'carte-identite',
    label: 'Carte d’identité',
    count: 124,
    sparkData: [18, 22, 15, 28, 14, 12, 15],
  },
  {
    id: 'permis',
    label: 'Permis de conduire',
    count: 89,
    sparkData: [10, 14, 12, 11, 15, 13, 14],
  },
  {
    id: 'photo',
    label: 'Photo d’identité',
    count: 156,
    sparkData: [20, 22, 24, 18, 26, 22, 24],
  },
  {
    id: 'justificatif-domicile',
    label: 'Justificatif de domicile',
    count: 67,
    sparkData: [8, 10, 9, 11, 9, 10, 10],
  },
];
