import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  getAutoEcoleStats,
  getAdminStats,
  getDossiersCountByAutoEcole,
  getDossiersAggregationsByStatutAndTypeAdmin,
  getDossiersByTypeDemandeWithWeeklyAdmin,
  getDossiersEnAttenteByStatutsAdmin,
} from '../services';
import type {
  AutoEcoleStats,
  AdminStats,
  DossiersParAutoEcoleItem,
  DossiersParTypeDemandeWithWeeklyResponse,
  DossierStatutListEntry,
} from '../types';
import type { DossiersAggregationsAdmin } from '../services/dashboard.service';
import { getDossiersAvecCodePaiement, getDossiersAEtapePaiement } from '../../finance/services';

/** Données finance pour le widget dashboard (déjà agrégées). */
export interface DashboardFinanceData {
  aTraiterCount: number;
  dejaTraitesCount: number;
  byStatut: { label: string; value: number }[];
}

export interface AdminDashboardData {
  adminStats: AdminStats;
  weekly: DossiersParTypeDemandeWithWeeklyResponse;
  dossiersParAutoEcole: DossiersParAutoEcoleItem[];
  aggregations: DossiersAggregationsAdmin;
  dossiersEnAttente: DossierStatutListEntry[];
  finance: DashboardFinanceData;
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

const initialFinanceData: DashboardFinanceData = {
  aTraiterCount: 0,
  dejaTraitesCount: 0,
  byStatut: [],
};

export interface DashboardDataState {
  /** Vue auto-école : stats (null = pas encore chargé). */
  autoEcoleStats: AutoEcoleStats | null;
  loadingAutoEcole: boolean;
  /** Vue admin : toutes les données en un bloc (null = pas encore chargé). */
  adminData: AdminDashboardData | null;
  loadingAdmin: boolean;
}

export interface DashboardDataContextValue extends DashboardDataState {
  /** Charge les stats auto-école si pas en cache. Ne refait pas de requête si déjà en cache. */
  loadAutoEcoleStatsIfNeeded: () => Promise<void>;
  /** Force le rechargement des stats auto-école. */
  refreshAutoEcoleStats: () => Promise<void>;
  /** Charge toutes les données admin si pas en cache. */
  loadAdminDataIfNeeded: () => Promise<void>;
  /** Force le rechargement des données admin. */
  refreshAdminData: () => Promise<void>;
}

const defaultState: DashboardDataState = {
  autoEcoleStats: null,
  loadingAutoEcole: false,
  adminData: null,
  loadingAdmin: false,
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

async function loadFinanceData(): Promise<DashboardFinanceData> {
  try {
    const [traites, aTraiter] = await Promise.all([
      getDossiersAvecCodePaiement(),
      getDossiersAEtapePaiement(),
    ]);
    const map = new Map<string, number>();
    traites.forEach((d: { statut?: string }) => {
      const label = (d.statut ?? '').trim() || '—';
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    const byStatut = Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
    return {
      dejaTraitesCount: traites.length,
      aTraiterCount: aTraiter.length,
      byStatut,
    };
  } catch {
    return initialFinanceData;
  }
}

export const DashboardDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DashboardDataState>(defaultState);
  const loadingAutoEcoleRef = useRef(false);
  const loadingAdminRef = useRef(false);

  const loadAutoEcoleStatsIfNeeded = useCallback(async () => {
    if (state.autoEcoleStats !== null) return;
    if (loadingAutoEcoleRef.current) return;
    loadingAutoEcoleRef.current = true;
    setState((s) => ({ ...s, loadingAutoEcole: true }));
    try {
      const data = await getAutoEcoleStats();
      setState((s) => ({ ...s, autoEcoleStats: data, loadingAutoEcole: false }));
    } catch {
      setState((s) => ({
        ...s,
        autoEcoleStats: initialAutoEcoleStats,
        loadingAutoEcole: false,
      }));
    } finally {
      loadingAutoEcoleRef.current = false;
    }
  }, [state.autoEcoleStats]);

  const refreshAutoEcoleStats = useCallback(async () => {
    loadingAutoEcoleRef.current = true;
    setState((s) => ({ ...s, loadingAutoEcole: true }));
    try {
      const data = await getAutoEcoleStats();
      setState((s) => ({ ...s, autoEcoleStats: data, loadingAutoEcole: false }));
    } catch {
      setState((s) => ({
        ...s,
        autoEcoleStats: initialAutoEcoleStats,
        loadingAutoEcole: false,
      }));
    } finally {
      loadingAutoEcoleRef.current = false;
    }
  }, []);

  const loadAdminDataIfNeeded = useCallback(async () => {
    if (state.adminData !== null) return;
    if (loadingAdminRef.current) return;
    loadingAdminRef.current = true;
    setState((s) => ({ ...s, loadingAdmin: true }));
    try {
      const [adminStats, weekly, dossiersParAutoEcole, aggregations, dossiersEnAttente, finance] =
        await Promise.all([
          getAdminStats(),
          getDossiersByTypeDemandeWithWeeklyAdmin(30),
          getDossiersCountByAutoEcole(30),
          getDossiersAggregationsByStatutAndTypeAdmin(25),
          getDossiersEnAttenteByStatutsAdmin(50),
          loadFinanceData(),
        ]);
      setState((s) => ({
        ...s,
        adminData: {
          adminStats,
          weekly,
          dossiersParAutoEcole,
          aggregations,
          dossiersEnAttente,
          finance,
        },
        loadingAdmin: false,
      }));
    } catch {
      setState((s) => ({
        ...s,
        adminData: {
          adminStats: initialAdminStats,
          weekly: { weekLabels: [], items: [] },
          dossiersParAutoEcole: [],
          aggregations: { byStatut: [], byTypeDemande: [] },
          dossiersEnAttente: [],
          finance: initialFinanceData,
        },
        loadingAdmin: false,
      }));
    } finally {
      loadingAdminRef.current = false;
    }
  }, [state.adminData]);

  const refreshAdminData = useCallback(async () => {
    loadingAdminRef.current = true;
    setState((s) => ({ ...s, loadingAdmin: true }));
    try {
      const [adminStats, weekly, dossiersParAutoEcole, aggregations, dossiersEnAttente, finance] =
        await Promise.all([
          getAdminStats(),
          getDossiersByTypeDemandeWithWeeklyAdmin(30),
          getDossiersCountByAutoEcole(30),
          getDossiersAggregationsByStatutAndTypeAdmin(25),
          getDossiersEnAttenteByStatutsAdmin(50),
          loadFinanceData(),
        ]);
      setState((s) => ({
        ...s,
        adminData: {
          adminStats,
          weekly,
          dossiersParAutoEcole,
          aggregations,
          dossiersEnAttente,
          finance,
        },
        loadingAdmin: false,
      }));
    } catch {
      setState((s) => ({
        ...s,
        loadingAdmin: false,
      }));
    } finally {
      loadingAdminRef.current = false;
    }
  }, []);

  const value: DashboardDataContextValue = {
    ...state,
    loadAutoEcoleStatsIfNeeded,
    refreshAutoEcoleStats,
    loadAdminDataIfNeeded,
    refreshAdminData,
  };

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
};

export function useDashboardData(): DashboardDataContextValue {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider');
  }
  return ctx;
}
