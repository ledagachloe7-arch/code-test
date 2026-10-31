// Configuration API.
// En dev : appel via proxy Vite (/api → backend) pour éviter les erreurs CORS.
// En prod : VITE_API_URL ou, par défaut, DEFAULT_BACKEND.
const isDev = (import.meta as any).env?.DEV === true;
const DEFAULT_BACKEND = 'https://backend.permis.transports.gouv.ga/api';
export const API_CONFIG = {
  BASE_URL: isDev
    ? '/api'
    : ((import.meta as any).env?.VITE_API_URL || DEFAULT_BACKEND),
  TIMEOUT: 30000, // 30 secondes (dashboard et listes lourdes dépassaient 10s)
  /** Timeout plus long pour les appels dashboard (agrégations multi auto-écoles). */
  DASHBOARD_TIMEOUT: 60000, // 60 secondes
  RETRY_ATTEMPTS: 3,
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },
  STUDENTS: {
    LIST: '/students',
    CREATE: '/students',
    UPDATE: (id: string) => `/students/${id}`,
    DELETE: (id: string) => `/students/${id}`,
    DOCUMENTS: (id: string) => `/students/${id}/documents`,
  },
  VALIDATION: {
    LIST: '/validation/students',
    VALIDATE: '/validation/validate',
    REJECT: '/validation/reject',
    HISTORY: '/validation/history',
  },
  CNEPC: {
    BATCHES: '/cnepc/batches',
    SEND: '/cnepc/send-batch',
    STATUS: '/cnepc/status',
    HISTORY: '/cnepc/history',
  },
  RECEPTION: {
    INCOMING: '/reception/dossiers',
    DETAILS: (id: string) => `/reception/dossiers/${id}`,
    RECEIVE: (id: string) => `/reception/dossiers/${id}/receive`,
  },
  // Gestion des utilisateurs (Admin)
  USERS: {
    LIST: '/admin/operators',
    CREATE: '/admin/operators',
    UPDATE: (id: string) => `/admin/operators/${id}`,
    DELETE: (id: string) => `/admin/operators/${id}`,
    TOGGLE_STATUS: (id: string) => `/admin/operators/${id}/toggle-status`,
  },
  HEALTH: '/health',
  /** Rôles et permissions (sidebar). POST = créer, PUT = modifier. */
  ROLE_PERMISSIONS: '/role-has-permissions',
  /** GET = liste des permissions pour un rôle donné. */
  ROLE_PERMISSIONS_BY_ROLE: (role: string) => `/role-has-permissions/by-role/${encodeURIComponent(role)}`,
  /** PUT = modifier les permissions pour un rôle donné : /role-has-permissions/{role_has_permission} */
  ROLE_PERMISSIONS_UPDATE: (roleHasPermission: string) => `/role-has-permissions/${encodeURIComponent(roleHasPermission)}`,
  /** Pièces justificatives : GET/POST liste/création, GET/PUT/DELETE /pieces-justificatives/{pieces_justificative} */
  PIECES_JUSTIFICATIVES: {
    LIST: '/pieces-justificatives',
    CREATE: '/pieces-justificatives',
    GET: (id: string) => `/pieces-justificatives/${encodeURIComponent(String(id))}`,
    UPDATE: (id: string) => `/pieces-justificatives/${encodeURIComponent(String(id))}`,
    DELETE: (id: string) => `/pieces-justificatives/${encodeURIComponent(String(id))}`,
    /** Mettre à true quand le backend expose DELETE /pieces-justificatives/{id} */
    DELETE_ENABLED: true,
  },
} as const;
