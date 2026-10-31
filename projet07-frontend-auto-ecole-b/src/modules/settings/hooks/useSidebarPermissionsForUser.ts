import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { rolePermissionsService } from '../services/rolePermissionsService';

/**
 * Pour chaque utilisateur connecté, appelle GET /role-has-permissions/by-role/{role}
 * et retourne la liste des permissions (clés sidebar) stockées dans la réponse (data).
 */
export function useSidebarPermissionsForUser(role: string | undefined): {
  permissions: string[] | null;
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const { pathname } = useLocation();
  const isLoginPage = pathname === '/login';

  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(!isLoginPage && !!role);

  const fetchPermissions = useCallback(async () => {
    const roleKey = role?.trim();
    if (!roleKey || isLoginPage) {
      setPermissions(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const record = await rolePermissionsService.getRolePermissionRecord(roleKey);
      setPermissions(record.permissions ?? []);
    } catch {
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [role, isLoginPage]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, loading, refetch: fetchPermissions };
}
