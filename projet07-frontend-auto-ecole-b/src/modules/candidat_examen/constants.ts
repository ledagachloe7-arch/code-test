// Constantes pour le module candidat_examen
export const CANDIDAT_EXAMEN_ROUTES = {
  BASE: '/candidats-examen',
  CANDIDATS: '/candidats-examen/candidats',
  SESSIONS: '/candidats-examen/sessions',
  PLANIFICATION: '/candidats-examen/planification',
  DEMO: '/candidats-examen/demo',
} as const;

export const CANDIDAT_EXAMEN_STATUTS = {
  INSCRIT: 'inscrit',
  EN_ATTENTE: 'en_attente',
  PROGRAMME: 'programme',
  PRESENT: 'present',
  ABSENT: 'absent',
  REUSSI: 'reussi',
  ECHOUE: 'echoue',
  ANNULE: 'annule',
} as const;

export const SESSION_EXAMEN_STATUTS = {
  PLANIFIEE: 'planifiee',
  OUVERTE: 'ouverte',
  FERMEE: 'fermee',
  EN_COURS: 'en_cours',
  TERMINEE: 'terminee',
  ANNULEE: 'annulee',
} as const;

export const TYPES_EPREUVE = {
  THEORIQUE: 'theorique',
  PRATIQUE: 'pratique',
  ORALE: 'orale',
} as const;

export const JOURS_SEMAINE = {
  DIMANCHE: 0,
  LUNDI: 1,
  MARDI: 2,
  MERCREDI: 3,
  JEUDI: 4,
  VENDREDI: 5,
  SAMEDI: 6,
} as const;
