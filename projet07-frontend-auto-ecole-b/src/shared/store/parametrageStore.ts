/**
 * Store de paramétrage des rôles et permissions (persistance localStorage).
 * Les valeurs sont fusionnées avec les défauts de rolesPermissionsConfig.
 */

import {
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_MENU_PERMISSIONS,
  DEFAULT_ROLE_VISIBLE_MENU_KEYS,
  DEFAULT_ROLE_VISIBLE_DASHBOARD_WIDGET_KEYS,
  DEFAULT_ROLE_DASHBOARD_VIEW,
  toCanonicalRole,
  type PermissionId,
  type MenuKey,
  type DashboardViewType,
} from '../config/rolesPermissionsConfig';

const STORAGE_KEY_ROLE_PERMISSIONS = 'parametrage_role_permissions';
const STORAGE_KEY_MENU_PERMISSIONS = 'parametrage_menu_permissions';
const STORAGE_KEY_ROLE_VISIBLE_MENUS = 'parametrage_role_visible_menus';
const STORAGE_KEY_ROLE_VISIBLE_DASHBOARD_WIDGETS = 'parametrage_role_visible_dashboard_widgets';
const STORAGE_KEY_ROLE_DASHBOARD_VIEW = 'parametrage_role_dashboard_view';

export type RolePermissionsOverride = Record<string, PermissionId[]>;
export type MenuPermissionsOverride = Record<string, PermissionId | null>;
export type RoleVisibleMenusOverride = Record<string, string[]>;
export type RoleVisibleDashboardWidgetsOverride = Record<string, string[]>;
export type RoleDashboardViewOverride = Record<string, DashboardViewType>;

function loadRolePermissions(): RolePermissionsOverride | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROLE_PERMISSIONS);
    if (!raw) return null;
    return JSON.parse(raw) as RolePermissionsOverride;
  } catch {
    return null;
  }
}

function loadMenuPermissions(): MenuPermissionsOverride | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MENU_PERMISSIONS);
    if (!raw) return null;
    return JSON.parse(raw) as MenuPermissionsOverride;
  } catch {
    return null;
  }
}

function loadRoleVisibleMenus(): RoleVisibleMenusOverride | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROLE_VISIBLE_MENUS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoleVisibleMenusOverride;
    const normalized: RoleVisibleMenusOverride = {};
    for (const [k, v] of Object.entries(parsed)) {
      const key = typeof k === 'string' ? k.trim() : String(k).trim();
      if (key && Array.isArray(v)) normalized[key] = v;
    }
    return Object.keys(normalized).length ? normalized : null;
  } catch {
    return null;
  }
}

function loadRoleVisibleDashboardWidgets(): RoleVisibleDashboardWidgetsOverride | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROLE_VISIBLE_DASHBOARD_WIDGETS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoleVisibleDashboardWidgetsOverride;
    const normalized: RoleVisibleDashboardWidgetsOverride = {};
    for (const [k, v] of Object.entries(parsed)) {
      const key = typeof k === 'string' ? k.trim() : String(k).trim();
      if (key && Array.isArray(v)) normalized[key] = v;
    }
    return Object.keys(normalized).length ? normalized : null;
  } catch {
    return null;
  }
}

function loadRoleDashboardView(): RoleDashboardViewOverride | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROLE_DASHBOARD_VIEW);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoleDashboardViewOverride;
    const normalized: RoleDashboardViewOverride = {};
    for (const [k, v] of Object.entries(parsed)) {
      const key = typeof k === 'string' ? k.trim() : String(k).trim();
      if (key && (v === 'admin' || v === 'autoEcole')) normalized[key] = v;
    }
    return Object.keys(normalized).length ? normalized : null;
  } catch {
    return null;
  }
}

/** Permissions effectives pour un rôle (défaut + override). */
export function getRolePermissions(role: string): PermissionId[] {
  const override = loadRolePermissions();
  if (override && override[role]) return override[role];
  return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}

/** Permission requise pour afficher un menu (défaut + override). null = visible par tous. */
export function getMenuPermission(menuKey: string): PermissionId | null {
  const override = loadMenuPermissions();
  if (override && menuKey in override) return override[menuKey];
  return DEFAULT_MENU_PERMISSIONS[menuKey] ?? null;
}

/** Liste des clés de menu visibles pour un rôle (défaut + override). null = pas de liste (comportement par défaut sidebar). */
export function getVisibleMenuKeysForRole(role: string): string[] | null {
  const roleKey = typeof role === 'string' ? role.trim() : String(role || '').trim();
  if (!roleKey) return null;
  const override = loadRoleVisibleMenus();
  if (!override) return DEFAULT_ROLE_VISIBLE_MENU_KEYS[roleKey] ?? DEFAULT_ROLE_VISIBLE_MENU_KEYS[role] ?? null;
  if (override[roleKey]) return override[roleKey];
  const canonical = toCanonicalRole(roleKey);
  if (canonical !== roleKey && override[canonical]) return override[canonical];
  const foundKey = Object.keys(override).find((k) => k.trim() === roleKey || toCanonicalRole(k.trim()) === canonical);
  if (foundKey) return override[foundKey];
  return DEFAULT_ROLE_VISIBLE_MENU_KEYS[roleKey] ?? DEFAULT_ROLE_VISIBLE_MENU_KEYS[canonical] ?? DEFAULT_ROLE_VISIBLE_MENU_KEYS[role] ?? null;
}

/** Liste des clés de widgets du tableau de bord visibles pour un rôle (défaut + override). null = afficher tous les widgets (comportement par défaut). */
export function getVisibleDashboardWidgetKeysForRole(role: string): string[] | null {
  const roleKey = typeof role === 'string' ? role.trim() : String(role || '').trim();
  if (!roleKey) return null;
  const override = loadRoleVisibleDashboardWidgets();
  if (!override) return DEFAULT_ROLE_VISIBLE_DASHBOARD_WIDGET_KEYS[roleKey] ?? DEFAULT_ROLE_VISIBLE_DASHBOARD_WIDGET_KEYS[role] ?? null;
  if (override[roleKey]) return override[roleKey];
  const canonical = toCanonicalRole(roleKey);
  if (canonical !== roleKey && override[canonical]) return override[canonical];
  const foundKey = Object.keys(override).find((k) => k.trim() === roleKey || toCanonicalRole(k.trim()) === canonical);
  if (foundKey) return override[foundKey];
  return DEFAULT_ROLE_VISIBLE_DASHBOARD_WIDGET_KEYS[roleKey] ?? DEFAULT_ROLE_VISIBLE_DASHBOARD_WIDGET_KEYS[canonical] ?? DEFAULT_ROLE_VISIBLE_DASHBOARD_WIDGET_KEYS[role] ?? null;
}

/** Vue du tableau de bord pour un rôle (défaut + override). 'admin' = AdminDashboardView, 'autoEcole' = AutoEcoleDashboardView. */
export function getDashboardViewForRole(role: string): DashboardViewType {
  const roleKey = typeof role === 'string' ? role.trim() : String(role || '').trim();
  if (!roleKey) return 'autoEcole';
  const override = loadRoleDashboardView();
  if (override?.[roleKey]) return override[roleKey];
  const canonical = toCanonicalRole(roleKey);
  if (canonical !== roleKey && override?.[canonical]) return override[canonical];
  const foundKey = Object.keys(override ?? {}).find((k) => k.trim() === roleKey || toCanonicalRole(k.trim()) === canonical);
  if (foundKey && override) return override[foundKey];
  return DEFAULT_ROLE_DASHBOARD_VIEW[roleKey] ?? DEFAULT_ROLE_DASHBOARD_VIEW[canonical] ?? DEFAULT_ROLE_DASHBOARD_VIEW[role] ?? 'autoEcole';
}

/** Sauvegarder les permissions par rôle (partiel: seulement les clés fournies sont écrasées). */
export function saveRolePermissions(overrides: RolePermissionsOverride): void {
  const current = loadRolePermissions() ?? {};
  const merged = { ...current, ...overrides };
  localStorage.setItem(STORAGE_KEY_ROLE_PERMISSIONS, JSON.stringify(merged));
  dispatchParametrageChange();
}

/** Sauvegarder la permission requise par menu (partiel). */
export function saveMenuPermissions(overrides: MenuPermissionsOverride): void {
  const current = loadMenuPermissions() ?? {};
  const merged = { ...current, ...overrides };
  localStorage.setItem(STORAGE_KEY_MENU_PERMISSIONS, JSON.stringify(merged));
  dispatchParametrageChange();
}

/** Sauvegarder les pages visibles pour un rôle (écrase la config pour ce rôle). Stocke sous la clé choisie et la clé canonique pour que la sidebar retrouve la config quel que soit le format du rôle (Admin vs ROLE_ADMIN). */
export function saveRoleVisibleMenus(role: string, menuKeys: string[]): void {
  const roleKey = typeof role === 'string' ? role.trim() : String(role || '').trim();
  if (!roleKey) return;
  const canonical = toCanonicalRole(roleKey);
  const current = loadRoleVisibleMenus() ?? {};
  const next: RoleVisibleMenusOverride = { ...current, [roleKey]: menuKeys };
  if (canonical !== roleKey) (next as Record<string, string[]>)[canonical] = menuKeys;
  localStorage.setItem(STORAGE_KEY_ROLE_VISIBLE_MENUS, JSON.stringify(next));
  dispatchParametrageChange();
}

/** Sauvegarder les widgets du tableau de bord visibles pour un rôle. */
export function saveRoleVisibleDashboardWidgets(role: string, widgetKeys: string[]): void {
  const roleKey = typeof role === 'string' ? role.trim() : String(role || '').trim();
  if (!roleKey) return;
  const canonical = toCanonicalRole(roleKey);
  const current = loadRoleVisibleDashboardWidgets() ?? {};
  const next: RoleVisibleDashboardWidgetsOverride = { ...current, [roleKey]: widgetKeys };
  if (canonical !== roleKey) (next as Record<string, string[]>)[canonical] = widgetKeys;
  localStorage.setItem(STORAGE_KEY_ROLE_VISIBLE_DASHBOARD_WIDGETS, JSON.stringify(next));
  dispatchParametrageChange();
}

/** Sauvegarder la vue du tableau de bord pour un rôle. */
export function saveRoleDashboardView(role: string, view: DashboardViewType): void {
  const roleKey = typeof role === 'string' ? role.trim() : String(role || '').trim();
  if (!roleKey) return;
  const canonical = toCanonicalRole(roleKey);
  const current = loadRoleDashboardView() ?? {};
  const next: RoleDashboardViewOverride = { ...current, [roleKey]: view };
  if (canonical !== roleKey) (next as Record<string, DashboardViewType>)[canonical] = view;
  localStorage.setItem(STORAGE_KEY_ROLE_DASHBOARD_VIEW, JSON.stringify(next));
  dispatchParametrageChange();
}

/** Récupérer tout l'override des pages visibles par rôle (pour l'UI). */
export function getRoleVisibleMenusOverride(): RoleVisibleMenusOverride {
  return loadRoleVisibleMenus() ?? {};
}

/** Récupérer tout l'override des widgets du tableau de bord visibles par rôle (pour l'UI). */
export function getRoleVisibleDashboardWidgetsOverride(): RoleVisibleDashboardWidgetsOverride {
  return loadRoleVisibleDashboardWidgets() ?? {};
}

/** Récupérer tout l'override de la vue dashboard par rôle (pour l'UI). */
export function getRoleDashboardViewOverride(): RoleDashboardViewOverride {
  return loadRoleDashboardView() ?? {};
}

/** Réinitialiser les overrides (revenir aux valeurs par défaut). */
export function resetParametrage(): void {
  localStorage.removeItem(STORAGE_KEY_ROLE_PERMISSIONS);
  localStorage.removeItem(STORAGE_KEY_MENU_PERMISSIONS);
  localStorage.removeItem(STORAGE_KEY_ROLE_VISIBLE_MENUS);
  localStorage.removeItem(STORAGE_KEY_ROLE_VISIBLE_DASHBOARD_WIDGETS);
  localStorage.removeItem(STORAGE_KEY_ROLE_DASHBOARD_VIEW);
  dispatchParametrageChange();
}

/** Récupérer tout l'override des rôles (pour l'UI). */
export function getRolePermissionsOverride(): RolePermissionsOverride {
  return loadRolePermissions() ?? {};
}

/** Récupérer tout l'override des menus (pour l'UI). */
export function getMenuPermissionsOverride(): MenuPermissionsOverride {
  return loadMenuPermissions() ?? {};
}

const PARAMETRAGE_CHANGE_EVENT = 'parametrage-change';

function dispatchParametrageChange(): void {
  window.dispatchEvent(new CustomEvent(PARAMETRAGE_CHANGE_EVENT));
}

/** S'abonner aux changements (pour forcer un re-render de la sidebar après sauvegarde). */
export function subscribeParametrageChange(callback: () => void): () => void {
  window.addEventListener(PARAMETRAGE_CHANGE_EVENT, callback);
  return () => window.removeEventListener(PARAMETRAGE_CHANGE_EVENT, callback);
}
