// Constantes globales
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  VALIDATION: '/validation',
  ELEVES: '/eleves',
  /** Assistance à la création de dossier (wizard) — même espace élèves. */
  NOUVELLE_DEMANDE: '/eleves/nouvelle-demande',
  DEMANDE_MES_DOSSIERS: '/eleves/mes-dossiers',
  DEMANDE_MES_RECLAMATIONS: '/eleves/mes-reclamations',
  DEMANDE_DETAILS: '/eleves/demandes/:id',
  ELEVE_INSCRIT_DETAILS: '/eleves/inscrits/:id',
  FORMATIONS: '/formations',
  CNEPC: '/cnepc',
  RECEPTION: '/reception',
  RECEPTION_DETAILS: '/reception/:id',
  /** Traitement guidé par le circuit (étapes) depuis la réception — layout ; sous-routes documents / circuit */
  RECEPTION_TRAITEMENT_DOSSIER: '/reception/traitement/:id',
  RECEPTION_TRAITEMENT_DOSSIER_DOCUMENTS: '/reception/traitement/:id/documents',
  RECEPTION_TRAITEMENT_DOSSIER_CIRCUIT: '/reception/traitement/:id/circuit',
  RECEPTION_CANDIDAT_DETAILS: '/reception/candidat/:id',
  FINANCE: '/finance',
  SUPPORT_DOSSIERS: '/support/dossiers',
  /** Historique des paiements (/paiements) — frais de dossier */
  FINANCE_FRAIS_DOSSIER: '/finance/frais-dossier',
  AUTO_ECOLES: '/auto-ecoles',
  INSCRIPTION_FORMATION: '/auto-ecoles/:autoEcoleId/inscrire',
  TYPE_DEMANDES: '/type-demandes',
  GESTION_DOSSIER: '/gestion-dossier',
  GESTION_DOSSIER_ARCHIVES: '/gestion-dossier/archives',
  CREATE_DOSSIER: '/gestion-dossier/create/:step',
  USAGER_DOSSIER: '/cnepc/dossiers/:id',
  PIECES_JUSTIFICATIVES: '/pieces-justificatives',
  CANDIDAT_DETAILS: '/candidat/:id',
  SETTINGS: '/settings',
  PARAMETRAGE: '/settings/parametrage',
  SETTINGS_PERMIS_CREATE: '/settings/permis/create',
  USER_MANAGEMENT: '/user-management',
  UPDATE: '/updateinfo',
  PROFILE: '/profile',

  REF: '/referentiel',
  CPW: '/change-password',
  RPW: '/reset-password',
  WORKFLOW: 't',
  WORKFLOW_CIRCUIT: '/workflow/circuits',
  WORKFLOW_STATUT: '/workflow/statuts',

  // Routes pour le module candidat_examen
  CANDIDATS_EXAMEN: '/candidats-examen',
  CANDIDATS_EXAMEN_CANDIDATS: '/candidats-examen/candidats',
  CANDIDATS_EXAMEN_SESSIONS: '/candidats-examen/sessions',
  CANDIDATS_EXAMEN_PLANIFICATION: '/candidats-examen/planification',
  CANDIDATS_EXAMEN_EPREUVES: '/candidats-examen/epreuves/:id',
  CANDIDATS_EXAMEN_DEMO: '/candidats-examen/demo',

  // SETTINGS: '/settings',
  //USER_MANAGEMENT: '/settings/users',
  //WORKFLOW: '/workflow',
 // WORKFLOW_CIRCUIT: '/workflow/circuits',
  WORKFLOW_CIRCUIT_DETAIL: '/workflow/circuits/detail/:id',
 // WORKFLOW_STATUT: '/workflow/statuts',
 
} as const;

export const STATUS = {
  PENDING: 'pending',
  VALIDATED: 'validated',
  REJECTED: 'rejected',
  INCOMPLETE: 'incomplete',
  COMPLETE: 'complete',
} as const;

export const DOCUMENT_TYPES = {
  IDENTITY: 'identity',
  PHOTO: 'photo',
  MEDICAL: 'medical',
  APTITUDE: 'aptitude',
} as const;

export const USER_ROLES = {
  ADMIN: 'ROLE_ADMIN',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
} as const;
