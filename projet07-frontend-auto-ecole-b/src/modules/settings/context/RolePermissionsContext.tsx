import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useLocation } from 'react-router-dom';
import { useAppStore } from '../../../store';

import {
  toCanonicalRole,
  MENU_ITEMS_CONFIG,
} from '../../../shared/config/rolesPermissionsConfig';

import { roleService } from '../../circuit/services/role.service';
import { rolePermissionsService } from '../services/rolePermissionsService';

/** Toutes les clés de menu disponibles (fallback pour ROLE_ADMIN). */
const ALL_MENU_KEYS = MENU_ITEMS_CONFIG.map((i) => i.key as string);

/** Map rôle → liste des permissions (clés des items de la sidebar). */
export type RolePermissionsMap = Record<string, string[]>;

/** Map rôle → id du record. */
export type RolePermissionIdsMap = Record<string, number | string>;

interface RolePermissionsContextValue {
  roles: string[];
  rolePermissions: RolePermissionsMap;
  rolePermissionIds: RolePermissionIdsMap;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  updateRolePermissions: (
    role: string,
    permission: string[]
  ) => Promise<void>;
}

const RolePermissionsContext =
  createContext<RolePermissionsContextValue | null>(null);

/**
 * Normalise les rôles retournés par l'API.
 * L'API retourne des objets { code, libelle }.
 * On récupère donc prioritairement la propriété code.
 */
function normalizeRolesFromApi(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [];

  return arr
    .map((role) => {
      if (typeof role === 'string') {
        return role.trim();
      }

      if (role && typeof role === 'object') {
        const obj = role as Record<string, unknown>;

        return String(
          obj.code ?? obj.authority ?? obj.name ?? ''
        ).trim();
      }

      return '';
    })
    .filter(Boolean);
}

export const RolePermissionsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAppStore();

  const isLoginPage = pathname === '/login';

  const [roles, setRoles] = useState<string[]>([]);
  const [rolePermissions, setRolePermissions] =
    useState<RolePermissionsMap>({});
  const [rolePermissionIds, setRolePermissionIds] =
    useState<RolePermissionIdsMap>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Récupération des rôles
      const rolesData = await roleService.getAll();

      const rolesList = normalizeRolesFromApi(rolesData);

      console.log('[RBAC] Rôles récupérés :', rolesList);

      if (rolesList.length === 0) {
        console.warn('[RBAC] Aucun rôle retourné par l’API.');

        setRoles([]);
        setRolePermissions({});
        setRolePermissionIds({});

        return;
      }

      // 2. Récupération des permissions de chaque rôle
      const records = await Promise.all(
        rolesList.map(async (role) => {
          try {
            const record =
              await rolePermissionsService.getRolePermissionRecord(role);

            console.log(
              `[RBAC] Permissions du rôle ${role} :`,
              record?.permissions ?? []
            );

            return record;
          } catch (err) {
            console.error(
              `[RBAC] Erreur de récupération des permissions pour ${role} :`,
              err
            );

            return { permissions: [] };
          }
        })
      );

      // 3. Construction des maps
      const permissionsMap: RolePermissionsMap = {};
      const idsMap: RolePermissionIdsMap = {};

      rolesList.forEach((role, index) => {
        permissionsMap[role] = records[index]?.permissions ?? [];

        if (records[index]?.id !== undefined) {
          idsMap[role] = records[index].id as number | string;
        }
      });

      setRoles(rolesList);
      setRolePermissions(permissionsMap);
      setRolePermissionIds(idsMap);

      console.log('[RBAC] Chargement terminé :', permissionsMap);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erreur chargement rôles / permissions';

      console.error('[RBAC] Erreur générale :', err);

      setError(message);
      setRoles([]);
      setRolePermissions({});
      setRolePermissionIds({});
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Mise à jour des permissions d'un rôle.
   */
  const updateRolePermissions = useCallback(
    async (role: string, permission: string[]) => {
      const roleKey = role.trim();

      if (!roleKey) return;

      const id = rolePermissionIds[roleKey];

      const result =
        await rolePermissionsService.saveRolePermissions(
          roleKey,
          permission,
          id
        );

      setRolePermissions((prev) => ({
        ...prev,
        [roleKey]: permission,
      }));

      if (
        result &&
        typeof result === 'object' &&
        'id' in result &&
        result.id != null
      ) {
        setRolePermissionIds((prev) => ({
          ...prev,
          [roleKey]: result.id as number | string,
        }));
      }
    },
    [rolePermissionIds]
  );

  /**
   * Chargement initial et rechargement après authentification.
   */
  useEffect(() => {
    if (isLoginPage || !isAuthenticated) {
      setRoles([]);
      setRolePermissions({});
      setRolePermissionIds({});
      return;
    }

    load();
  }, [isLoginPage, isAuthenticated, load]);

  const value = useMemo<RolePermissionsContextValue>(
    () => ({
      roles,
      rolePermissions,
      rolePermissionIds,
      loading,
      error,
      load,
      updateRolePermissions,
    }),
    [
      roles,
      rolePermissions,
      rolePermissionIds,
      loading,
      error,
      load,
      updateRolePermissions,
    ]
  );

  return (
    <RolePermissionsContext.Provider value={value}>
      {children}
    </RolePermissionsContext.Provider>
  );
};

/**
 * Hook permettant d'accéder au contexte des rôles et permissions.
 */
export function useRolePermissions(): RolePermissionsContextValue {
  const ctx = useContext(RolePermissionsContext);

  if (!ctx) {
    throw new Error(
      'useRolePermissions must be used within RolePermissionsProvider'
    );
  }

  return ctx;
}

/**
 * Retourne les permissions (clés sidebar) pour un rôle.
 * Retourne null si le rôle n'est pas défini.
 */
export function useVisibleMenuKeysForRole(
  role: string | undefined
): string[] | null {
  const ctx = useContext(RolePermissionsContext);

  if (!ctx || !role) return null;

  const key = role.trim();

  if (!key) return null;

  const canonical = toCanonicalRole(key);
  const isAdmin = canonical === 'ROLE_ADMIN';

  // Recherche directe
  if (key in ctx.rolePermissions) {
    const permissions = ctx.rolePermissions[key];

    if (isAdmin && permissions.length === 0) {
      return ALL_MENU_KEYS;
    }

    return permissions;
  }

  // Recherche avec le rôle canonique
  if (canonical in ctx.rolePermissions) {
    const permissions = ctx.rolePermissions[canonical];

    if (isAdmin && permissions.length === 0) {
      return ALL_MENU_KEYS;
    }

    return permissions;
  }

  // Recherche avec les alias de rôles
  const foundKey = Object.keys(ctx.rolePermissions).find(
    (roleKey) =>
      roleKey === canonical ||
      toCanonicalRole(roleKey) === canonical
  );

  if (foundKey) {
    const permissions = ctx.rolePermissions[foundKey];

    if (isAdmin && permissions.length === 0) {
      return ALL_MENU_KEYS;
    }

    return permissions;
  }

  // Fallback administrateur
  if (isAdmin) {
    return ALL_MENU_KEYS;
  }

  return null;
}
