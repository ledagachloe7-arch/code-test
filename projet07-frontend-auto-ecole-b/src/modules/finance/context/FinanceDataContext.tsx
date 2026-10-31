import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';
import { getDossiersAvecCodePaiement, getDossiersAEtapePaiement } from '../services';
import type { DossierFinance } from '../types';

export interface FinanceDataState {
  aTraiter: DossierFinance[];
  dejaTraites: DossierFinance[];
  loading: boolean;
  error: string | null;
}

export interface FinanceDataContextValue extends FinanceDataState {
  /** Charge les données si pas déjà en cache. */
  loadFinanceDataIfNeeded: (force?: boolean) => Promise<void>;
  /** Force le rechargement. */
  refreshFinanceData: () => Promise<void>;
  hasLoadedOnce: boolean;
}

const defaultState: FinanceDataState = {
  aTraiter: [],
  dejaTraites: [],
  loading: false,
  error: null,
};

const FinanceDataContext = createContext<FinanceDataContextValue | null>(null);

export const FinanceDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FinanceDataState>(defaultState);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const loadingRef = useRef(false);

  const loadFinanceDataIfNeeded = useCallback(async (force?: boolean) => {
    if (!force && hasLoadedOnce) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [avecCode, aEtapePaiement] = await Promise.all([
        getDossiersAvecCodePaiement(),
        getDossiersAEtapePaiement(),
      ]);
      const EN_ATTENTE = 'EN_ATTENTE_PAIEMENT';
      const avecCodeVerifies = avecCode.filter(
        (d) => (d.statut ?? '').toString().toUpperCase().trim() !== EN_ATTENTE
      );
      const avecCodeNonVerifies = avecCode.filter(
        (d) => (d.statut ?? '').toString().toUpperCase().trim() === EN_ATTENTE
      );
      setState({
        aTraiter: [...aEtapePaiement, ...avecCodeNonVerifies],
        dejaTraites: avecCodeVerifies,
        loading: false,
        error: null,
      });
      setHasLoadedOnce(true);
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : 'Erreur lors du chargement',
        aTraiter: [],
        dejaTraites: [],
      }));
    } finally {
      loadingRef.current = false;
    }
  }, [hasLoadedOnce]);

  const refreshFinanceData = useCallback(async () => {
    loadingRef.current = false;
    await loadFinanceDataIfNeeded(true);
  }, [loadFinanceDataIfNeeded]);

  const value: FinanceDataContextValue = {
    ...state,
    loadFinanceDataIfNeeded,
    refreshFinanceData,
    hasLoadedOnce,
  };

  return (
    <FinanceDataContext.Provider value={value}>
      {children}
    </FinanceDataContext.Provider>
  );
};

export function useFinanceData(): FinanceDataContextValue {
  const ctx = useContext(FinanceDataContext);
  if (!ctx) {
    throw new Error('useFinanceData must be used within a FinanceDataProvider');
  }
  return ctx;
}
