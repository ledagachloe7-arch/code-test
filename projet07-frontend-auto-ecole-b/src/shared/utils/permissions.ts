// Système de permissions basé sur les rôles (défauts + paramétrage dynamique)
import { User } from '../../modules/auth/types';
import { getRolePermissions, getMenuPermission } from '../store/parametrageStore';

// Définition des permissions (compatibilité avec le code existant)
export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_USERS: 'manage_users',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_ALL_DATA: 'view_all_data',
  MANAGE_REFERENTIEL: 'manage_referentiel',
  MANAGE_CANDIDATES: 'manage_candidates',
  VALIDATE_DOSSIERS: 'validate_dossiers',
  SEND_CNEPC: 'send_cnepc',
  UPDATE_INFO: 'update_info',
} as const;

// Référence statique pour compatibilité (les valeurs effectives viennent du paramétrage)
export const ROLE_PERMISSIONS = {
  ROLE_ADMIN: Object.values(PERMISSIONS),
  Admin: Object.values(PERMISSIONS),
  ROLE_AUTO_ECOLE: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.MANAGE_CANDIDATES, PERMISSIONS.VALIDATE_DOSSIERS, PERMISSIONS.SEND_CNEPC, PERMISSIONS.UPDATE_INFO],
  instructor: [],
  student: [],
  candidat: [],
} as const;

/** Vérifie si l'utilisateur a une permission (utilise le paramétrage dynamique). */
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  const userPermissions = getRolePermissions(user.role as string);
  return userPermissions.includes(permission as typeof userPermissions[number]);
}

/** Vérifie si l'utilisateur a accès à un menu (utilise le paramétrage dynamique). */
export function canAccessMenu(user: User | null, menuKey: string): boolean {
  if (!user) return false;
  const requiredPermission = getMenuPermission(menuKey);
  if (requiredPermission == null) return true;
  return hasPermission(user, requiredPermission);
}
