import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../../store';
import { getDashboardViewForRole } from '../../../shared/store/parametrageStore';
import { getAutoEcoleStats, getAdminStats } from '../services';
import type { AutoEcoleStats, AdminStats } from '../types';

const DASHBOARD_EVENTS = ['dossierUpdated', 'dossierValidated', 'dossierTransmis'] as const;

function normalizeRole(role: unknown): string {
  if (role == null) return '';
  if (typeof role === 'string') return role.trim();
  if (typeof (role as { authority?: string })?.authority === 'string') {
    return String((role as { authority: string }).authority).trim();
  }
  return String(role).trim();
}

const initialAutoEcoleStats: AutoEcoleStats = {
  totalEleves: 0,
  dossiersValides: 0,
  transmisCNEPC: 0,
  dossiersValidationDossier: 0,
};

const initialAdminStats: AdminStats = {
  totalAutoEcoles: 0,
  autoEcolesActives: 0,
  autoEcolesInactives: 0,
};

export function useDashboardStats() {
  const { user } = useAppStore();
  const [stats, setStats] = useState<AutoEcoleStats>(initialAutoEcoleStats);
  const [adminStats, setAdminStats] = useState<AdminStats>(initialAdminStats);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);

  const role = normalizeRole(user?.role);
  const dashboardView = role ? getDashboardViewForRole(role) : 'autoEcole';
  const isAdminView = dashboardView === 'admin';

  const loadAdminStats = useCallback(async () => {
    if (!isAdminView) return;
    try {
      setAdminLoading(true);
      const data = await getAdminStats();
      setAdminStats(data);
    } catch {
      setAdminStats(initialAdminStats);
    } finally {
      setAdminLoading(false);
    }
  }, [isAdminView]);

  const loadAutoEcoleStats = useCallback(async () => {
    if (isAdminView) return;
    try {
      setLoading(true);
      const data = await getAutoEcoleStats();
      setStats(data);
    } catch {
      setStats(initialAutoEcoleStats);
    } finally {
      setLoading(false);
    }
  }, [isAdminView]);

  useEffect(() => {
    if (isAdminView) {
      loadAdminStats();
      return;
    }
    loadAutoEcoleStats();
  }, [isAdminView, loadAdminStats, loadAutoEcoleStats]);

  useEffect(() => {
    if (isAdminView) return;
    const refresh = () => loadAutoEcoleStats();
    DASHBOARD_EVENTS.forEach((ev) => window.addEventListener(ev, refresh));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh();
    });
    return () => {
      DASHBOARD_EVENTS.forEach((ev) => window.removeEventListener(ev, refresh));
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [isAdminView, loadAutoEcoleStats]);

  return {
    isAdmin: isAdminView,
    stats,
    adminStats,
    loading,
    adminLoading,
  };
}
