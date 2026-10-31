import { useState, useEffect } from 'react';
import { useAppStore } from '../../../store';
import { getDashboardViewForRole, subscribeParametrageChange } from '../../../shared/store/parametrageStore';
import type { DashboardViewType } from '../../../shared/config/rolesPermissionsConfig';

function normalizeRole(role: unknown): string {
  if (role == null) return '';
  if (typeof role === 'string') return role.trim();
  if (typeof (role as { authority?: string })?.authority === 'string') {
    return String((role as { authority: string }).authority).trim();
  }
  return String(role).trim();
}

/**
 * Retourne la vue du tableau de bord pour l'utilisateur connecté : 'admin' (AdminDashboardView)
 * ou 'autoEcole' (AutoEcoleDashboardView). Basé sur le paramétrage par rôle.
 */
export function useDashboardView(): DashboardViewType {
  const { user } = useAppStore();
  const [view, setView] = useState<DashboardViewType>(() => {
    const role = normalizeRole(user?.role);
    return role ? getDashboardViewForRole(role) : 'autoEcole';
  });

  useEffect(() => {
    const role = normalizeRole(user?.role);
    const update = () => {
      setView(role ? getDashboardViewForRole(role) : 'autoEcole');
    };
    update();
    const unsubscribe = subscribeParametrageChange(update);
    return unsubscribe;
  }, [user?.role]);

  return view;
}
