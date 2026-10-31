import { useState, useEffect } from 'react';
import { useAppStore } from '../../../store';
import { getVisibleDashboardWidgetKeysForRole } from '../../../shared/store/parametrageStore';
import { subscribeParametrageChange } from '../../../shared/store/parametrageStore';

/**
 * Retourne les clés des widgets du tableau de bord visibles pour le rôle de l'utilisateur connecté.
 * null = pas de paramétrage (afficher tous les widgets par défaut).
 */
export function useVisibleDashboardWidgets(): string[] | null {
  const { user } = useAppStore();
  const [visibleKeys, setVisibleKeys] = useState<string[] | null>(() => {
    const role = normalizeRole(user?.role);
    return role ? getVisibleDashboardWidgetKeysForRole(role) : null;
  });

  useEffect(() => {
    const role = normalizeRole(user?.role);
    const update = () => {
      const keys = role ? getVisibleDashboardWidgetKeysForRole(role) : null;
      setVisibleKeys(keys);
    };
    update();
    const unsubscribe = subscribeParametrageChange(update);
    return unsubscribe;
  }, [user?.role]);

  return visibleKeys;
}

function normalizeRole(role: unknown): string {
  if (role == null) return '';
  if (typeof role === 'string') return role.trim();
  if (typeof (role as { authority?: string })?.authority === 'string') {
    return String((role as { authority: string }).authority).trim();
  }
  return String(role).trim();
}

/** Helper : le widget est-il visible ? (si visibleKeys === null, tout est visible) */
export function isWidgetVisible(visibleKeys: string[] | null, widgetKey: string): boolean {
  if (visibleKeys === null) return true;
  return visibleKeys.includes(widgetKey);
}
