/**
 * Configuration centralisée des rôles, permissions et visibilité des menus (sidebar).
 * Utilisée par permissions.ts, AppSidebar et le module Paramétrage.
 */

export const PERMISSIONS_LIST = [
  { id: 'view_dashboard', label: 'Voir le tableau de bord' },
  { id: 'manage_users', label: 'Gestion des utilisateurs' },
  { id: 'manage_settings', label: 'Gestion des paramètres' },
  { id: 'view_all_data', label: 'Voir toutes les données' },
  { id: 'manage_referentiel', label: 'Gestion du référentiel' },
  { id: 'manage_candidates', label: 'Gestion des candidats' },
  { id: 'validate_dossiers', label: 'Valider les dossiers' },
  { id: 'send_cnepc', label: 'Envoyer au CNEPC' },
  { id: 'update_info', label: 'Modifier les informations' },
] as const;

export type PermissionId = (typeof PERMISSIONS_LIST)[number]['id'];

export const ROLES_LIST = [
  { id: 'ROLE_ADMIN', label: 'Administrateur' },
  { id: 'Admin', label: 'Admin (alias)' },
  { id: 'admin', label: 'admin (alias)' },
  { id: 'ROLE_AUTO_ECOLE', label: 'Auto-école' },
  { id: 'ROLE_CNEPC', label: 'CNEPC' },
  { id: 'ROLE_SEV', label: 'SEV' },
  { id: 'instructor', label: 'Instructeur' },
  { id: 'student', label: 'Étudiant' },
  { id: 'candidat', label: 'Candidat' },
] as const;

export type RoleId = (typeof ROLES_LIST)[number]['id'];

/** Permissions par rôle (valeurs par défaut, modifiables dans Paramétrage). */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionId[]> = {
  ROLE_ADMIN: [
    'view_dashboard', 'manage_users', 'manage_settings', 'view_all_data',
    'manage_candidates', 'validate_dossiers', 'send_cnepc', 'update_info', 'manage_referentiel',
  ],
  Admin: [
    'view_dashboard', 'manage_users', 'manage_settings', 'view_all_data',
    'manage_candidates', 'validate_dossiers', 'send_cnepc', 'update_info', 'manage_referentiel',
  ],
  admin: [
    'view_dashboard', 'manage_users', 'manage_settings', 'view_all_data',
    'manage_candidates', 'validate_dossiers', 'send_cnepc', 'update_info', 'manage_referentiel',
  ],
  ROLE_AUTO_ECOLE: [
    'view_dashboard', 'manage_candidates', 'validate_dossiers', 'send_cnepc', 'update_info',
  ],
  ROLE_CNEPC: [
    'view_dashboard', 'manage_users', 'manage_settings', 'view_all_data',
    'manage_candidates', 'validate_dossiers', 'send_cnepc', 'update_info', 'manage_referentiel',
  ],
  ROLE_SEV: ['view_dashboard'],
  instructor: [],
  student: [],
  candidat: [],
};

/**
 * Entrées de menu (sidebar) avec une clé utilisée pour la visibilité.
 * Doit être aligné avec les items dans AppSidebar qui ont un `key`.
 */
export const MENU_ITEMS_CONFIG = [
  { key: 'dashboard', title: 'Tableau de bord' },
  { key: 'referentiel', title: 'Referentiel' },
  { key: 'autoEcoles', title: 'Gestion des Auto-Écoles' },
  { key: 'candidatsExamen', title: 'Candidats aux Examens' },
  { key: 'reception', title: 'Reception au CNEPC' },
  { key: 'finance', title: 'Finance' },
  { key: 'typeDemandes', title: 'Typage de Dossier' },
  { key: 'gestionDossier', title: 'Gestion de Dossier' },
  { key: 'piecesJustificatives', title: 'Pièces Justificatives et Referentiels' },
  { key: 'userManagement', title: 'Gestion d\'utilisateur' },
  { key: 'candidates', title: 'Gestion des Candidats' },
  {
    key: 'nouvelleDemande',
    title: 'Nouvelle demande',
    subtitle: 'Assistant de création de dossier. Reste visible si « Gestion des candidats » est coché sans cette entrée (comportement existant).',
  },
  { key: 'formations', title: 'Nos formations' },
  { key: 'cnepc', title: 'CNEPC' },
  { key: 'settings', title: 'Paramètres' },
  { key: 'ajoutPermis', title: 'Ajout de permis' },
  { key: 'workflows', title: 'Workflows' },
] as const;

export type MenuKey = (typeof MENU_ITEMS_CONFIG)[number]['key'];

/** Permission requise pour voir chaque menu (par défaut). null = visible par tous. */
export const DEFAULT_MENU_PERMISSIONS: Record<string, PermissionId | null> = {
  dashboard: 'view_dashboard',
  referentiel: 'manage_referentiel',
  autoEcoles: null,
  candidatsExamen: null,
  reception: null,
  finance: null,
  typeDemandes: null,
  gestionDossier: null,
  piecesJustificatives: null,
  userManagement: 'manage_users',
  candidates: 'manage_candidates',
  nouvelleDemande: 'manage_candidates',
  formations: null,
  cnepc: 'send_cnepc',
  settings: 'manage_settings',
  ajoutPermis: 'manage_settings',
  workflows: null,
};

/** Pages visibles par rôle (par défaut). Ex. ROLE_AUTO_ECOLE ne voit que dashboard, candidates, formations. */
export const DEFAULT_ROLE_VISIBLE_MENU_KEYS: Record<string, string[]> = {
  ROLE_AUTO_ECOLE: ['dashboard', 'candidates', 'nouvelleDemande', 'formations'],
  ROLE_ADMIN: [
    'dashboard', 'referentiel', 'autoEcoles', 'candidatsExamen', 'reception',
    'finance', 'typeDemandes', 'gestionDossier', 'piecesJustificatives',
    'userManagement', 'candidates', 'nouvelleDemande', 'cnepc', 'settings', 'ajoutPermis', 'workflows',
  ],
  Admin: [
    'dashboard', 'referentiel', 'autoEcoles', 'candidatsExamen', 'reception',
    'finance', 'typeDemandes', 'gestionDossier', 'piecesJustificatives',
    'userManagement', 'candidates', 'nouvelleDemande', 'cnepc', 'settings', 'ajoutPermis', 'workflows',
  ],
  admin: [
    'dashboard', 'referentiel', 'autoEcoles', 'candidatsExamen', 'reception',
    'finance', 'typeDemandes', 'gestionDossier', 'piecesJustificatives',
    'userManagement', 'candidates', 'nouvelleDemande', 'cnepc', 'settings', 'ajoutPermis', 'workflows',
  ],
  ROLE_SEV: ['dashboard'],
};

/**
 * Widgets du tableau de bord (clés utilisées pour la visibilité par rôle).
 * Admin: lastUpdateHeader, adminStatsGrid, dossiersParAutoEcoleStats, dossiersParEtapeEtTypeDemandeStats, dossiersEnAttenteList, todoListByEtape.
 * Auto-école: lastUpdateHeader, autoEcoleStatsGrid.
 */
export const DASHBOARD_WIDGETS_CONFIG = [
  { key: 'lastUpdateHeader', title: 'En-tête dernière mise à jour', scope: 'both' as const },
  { key: 'adminStatsGrid', title: 'Statistiques admin (auto-écoles)', scope: 'admin' as const },
  { key: 'dossiersParAutoEcoleStats', title: 'Dossiers par auto-école', scope: 'admin' as const },
  { key: 'dossiersParEtapeEtTypeDemandeStats', title: 'Dossiers par étape et type de demande', scope: 'admin' as const },
  { key: 'dossiersEnAttenteList', title: 'Dossiers en attente (sidebar)', scope: 'admin' as const },
  { key: 'todoListByEtape', title: 'Liste des tâches par étape', scope: 'admin' as const },
  { key: 'financePaiementCharts', title: 'Vue d\'ensemble paiement (finance)', scope: 'admin' as const },
  { key: 'autoEcoleStatsGrid', title: 'Statistiques auto-école', scope: 'autoEcole' as const },
] as const;

export type DashboardWidgetKey = (typeof DASHBOARD_WIDGETS_CONFIG)[number]['key'];

/** Widgets du tableau de bord visibles par rôle (par défaut). */
export const DEFAULT_ROLE_VISIBLE_DASHBOARD_WIDGET_KEYS: Record<string, string[]> = {
  ROLE_AUTO_ECOLE: ['lastUpdateHeader', 'autoEcoleStatsGrid'],
  ROLE_ADMIN: [
    'lastUpdateHeader',
    'adminStatsGrid',
    'dossiersParAutoEcoleStats',
    'dossiersParEtapeEtTypeDemandeStats',
    'financePaiementCharts',
    'dossiersEnAttenteList',
    'todoListByEtape',
  ],
  Admin: [
    'lastUpdateHeader',
    'adminStatsGrid',
    'dossiersParAutoEcoleStats',
    'dossiersParEtapeEtTypeDemandeStats',
    'financePaiementCharts',
    'dossiersEnAttenteList',
    'todoListByEtape',
  ],
  admin: [
    'lastUpdateHeader',
    'adminStatsGrid',
    'dossiersParAutoEcoleStats',
    'dossiersParEtapeEtTypeDemandeStats',
    'financePaiementCharts',
    'dossiersEnAttenteList',
    'todoListByEtape',
  ],
  ROLE_CNEPC: [
    'lastUpdateHeader',
    'adminStatsGrid',
    'dossiersParAutoEcoleStats',
    'dossiersParEtapeEtTypeDemandeStats',
    'financePaiementCharts',
    'dossiersEnAttenteList',
    'todoListByEtape',
  ],
  ROLE_SEV: ['lastUpdateHeader', 'autoEcoleStatsGrid'],
};

/** Type de vue du tableau de bord : Admin (stats globales, dossiers, etc.) ou Auto-école (stats de l'auto-école). */
export type DashboardViewType = 'admin' | 'autoEcole';

/** Vue du tableau de bord par défaut par rôle. Détermine si l'utilisateur voit AdminDashboardView ou AutoEcoleDashboardView. */
export const DEFAULT_ROLE_DASHBOARD_VIEW: Record<string, DashboardViewType> = {
  ROLE_AUTO_ECOLE: 'autoEcole',
  ROLE_ADMIN: 'admin',
  Admin: 'admin',
  admin: 'admin',
  ROLE_CNEPC: 'admin',
  ROLE_SEV: 'admin',
};

/** Alias de rôles → clé canonique (pour faire correspondre /auth/me et paramétrage). */
const ROLE_CANONICAL: Record<string, string> = {
  Admin: 'ROLE_ADMIN',
  admin: 'ROLE_ADMIN',
  ROLE_ADMIN: 'ROLE_ADMIN',
  ROLE_AUTO_ECOLE: 'ROLE_AUTO_ECOLE',
  ROLE_CNEPC: 'ROLE_CNEPC',
  ROLE_SEV: 'ROLE_SEV',
  instructor: 'instructor',
  student: 'student',
  candidat: 'candidat',
};

/** Retourne la clé canonique du rôle pour stockage/lecture du paramétrage. */
export function toCanonicalRole(role: string): string {
  const r = typeof role === 'string' ? role.trim() : String(role || '').trim();
  return ROLE_CANONICAL[r] ?? r;
}
