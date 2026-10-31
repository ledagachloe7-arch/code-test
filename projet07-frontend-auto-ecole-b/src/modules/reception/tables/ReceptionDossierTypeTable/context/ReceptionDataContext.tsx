import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import axiosClient from '../../../../../shared/utils/axiosConfig';
import { circuitSuiviService, type CircuitSuivi } from '../../../services/circuit-suivi.service';
import { typeDemandeService } from '../../../../cnepc/services';
import { TypeDemande } from '../../../../cnepc/types/type-demande';
import type { ReceptionDossier } from '../../../types';
import { useAppStore } from '../../../../../store';
import { normalizeRole } from '../../../utils/roleHelpers';

/** Taille fixe de page pour `GET /dossiers` (alignée sur l’API). */
export const RECEPTION_DOSSIERS_PER_PAGE = 15;

/** Métadonnées de pagination Laravel renvoyées par `GET /dossiers`. */
export interface ReceptionDossiersPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

function parseDossiersPaginationMeta(raw: unknown): ReceptionDossiersPaginationMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  return {
    current_page: Math.max(1, Number(m.current_page) || 1),
    last_page: Math.max(1, Number(m.last_page) || 1),
    per_page: Math.max(1, Number(m.per_page) || 15),
    total: Math.max(0, Number(m.total) || 0),
    from: m.from != null && m.from !== '' ? Number(m.from) : null,
    to: m.to != null && m.to !== '' ? Number(m.to) : null,
  };
}

export interface ReceptionDataState {
  dossiers: ReceptionDossier[];
  circuits: CircuitSuivi[];
  circuitCache: Map<string, CircuitSuivi>;
  typeDemandeCache: Map<string, TypeDemande>;
  circuitsWithEtapesLoaded: Set<string>;
  loading: boolean;
  error: string | null;
  dossiersPagination: ReceptionDossiersPaginationMeta | null;
}

export interface ReceptionDataContextValue extends ReceptionDataState {
  /** Charge circuits puis dossiers si pas déjà chargés. @param force si true, recharge même si déjà en cache. */
  loadReceptionDataIfNeeded: (force?: boolean) => Promise<void>;
  /** Force le rechargement des circuits et dossiers. */
  refreshReceptionData: () => Promise<void>;
  /** Charge les étapes d'un circuit à la demande. */
  loadCircuitEtapes: (circuitId: string) => Promise<void>;
  /** Indique si les données ont déjà été chargées au moins une fois (cache valide). */
  hasLoadedOnce: boolean;
  /** Page courante (1-based), alignée sur l’API après chargement. */
  dossiersListPage: number;
  changeDossiersListPage: (page: number) => void;
}

const defaultState: ReceptionDataState = {
  dossiers: [],
  circuits: [],
  circuitCache: new Map(),
  typeDemandeCache: new Map(),
  circuitsWithEtapesLoaded: new Set(),
  loading: false,
  error: null,
  dossiersPagination: null,
};

const ReceptionDataContext = createContext<ReceptionDataContextValue | null>(null);

type LoadDossiersOptions = {
  includeCircuits: boolean;
  page: number;
};

export const ReceptionDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAppStore();
  const [state, setState] = useState<ReceptionDataState>(defaultState);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [dossiersListPage, setDossiersListPage] = useState(1);
  const loadingRef = useRef(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const _normalizedRole = normalizeRole(String((user as any)?.role || ''));
  // Admin et CNEPC chargent tous les centres
  const isRoleCnepc = _normalizedRole === 'cnepc' || _normalizedRole === 'admin' || _normalizedRole === 'superadmin';

  const loadCircuitEtapes = useCallback(async (circuitId: string) => {
    if (state.circuitsWithEtapesLoaded.has(circuitId)) return;
    try {
      const etapes = await circuitSuiviService.getEtapesByCircuitId(circuitId);
      setState((prev) => {
        const nextCircuits = prev.circuits.map((c) =>
          c.id === circuitId ? { ...c, etapes } : c
        );
        const nextCache = new Map(prev.circuitCache);
        const circuit = nextCircuits.find((c) => c.id === circuitId);
        if (circuit) {
          if (circuit.id) nextCache.set(circuit.id, circuit);
          if (circuit.nom_entite) nextCache.set(circuit.nom_entite, circuit);
        }
        return {
          ...prev,
          circuits: nextCircuits,
          circuitCache: nextCache,
          circuitsWithEtapesLoaded: new Set(prev.circuitsWithEtapesLoaded).add(circuitId),
        };
      });
    } catch {
      // ignore
    }
  }, [state.circuitsWithEtapesLoaded]);

  const loadDossiersPage = useCallback(
    async (opts: LoadDossiersOptions) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setState((s) => ({ ...s, loading: true, error: null }));

      const prev = stateRef.current;
      let circuitsData: CircuitSuivi[];
      const circuitCacheRef = new Map<string, CircuitSuivi>();
      const typeDemandeCacheRef = new Map<string, TypeDemande>(prev.typeDemandeCache);

      try {
        if (opts.includeCircuits) {
          circuitsData = await circuitSuiviService.getCircuitsActifs();
          circuitsData.forEach((c) => {
            if (c.id) circuitCacheRef.set(c.id, c);
            if (c.nom_entite) circuitCacheRef.set(c.nom_entite, c);
          });
        } else {
          circuitsData = prev.circuits;
          prev.circuitCache.forEach((v, k) => circuitCacheRef.set(k, v));
        }

        const params: Record<string, string> = {
          page: String(Math.max(1, opts.page)),
          per_page: String(RECEPTION_DOSSIERS_PER_PAGE),
          all_statuts: 'true',
        };
        if (isRoleCnepc) params.all_centres = 'true';
        const response = await axiosClient.get('/dossiers', { params });
        let dossiersRaw: any[] = [];
        if (Array.isArray(response.data)) {
          dossiersRaw = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          dossiersRaw = response.data.data;
        } else if (response.data?.success && Array.isArray(response.data.data)) {
          dossiersRaw = response.data.data;
        }

        const meta = parseDossiersPaginationMeta(response.data?.meta);

        const typeDemandeIds = new Set<string>();
        dossiersRaw.forEach((d: any) => {
          if (d.type_demande_id) typeDemandeIds.add(d.type_demande_id);
        });

        await Promise.all(
          Array.from(typeDemandeIds).map(async (typeDemandeId) => {
            if (!typeDemandeCacheRef.has(typeDemandeId)) {
              try {
                const td = await typeDemandeService.getTypeDemandeById(typeDemandeId);
                typeDemandeCacheRef.set(typeDemandeId, td);
              } catch {
                // ignore
              }
            }
          })
        );

        const enrichedDossiers: ReceptionDossier[] = await Promise.all(
          dossiersRaw.map(async (dossierRaw: any) => {
            let circuitForDossier: CircuitSuivi | null = null;
            if (dossierRaw.type_demande_id) {
              const typeDemande = typeDemandeCacheRef.get(dossierRaw.type_demande_id);
              if (typeDemande?.name) {
                circuitForDossier =
                  circuitsData.find((c) => c.nom_entite === typeDemande.name) ||
                  circuitCacheRef.get(typeDemande.name) ||
                  null;
                if (!circuitForDossier) {
                  try {
                    circuitForDossier = await circuitSuiviService.getCircuitByNomEntite(typeDemande.name);
                    if (circuitForDossier) {
                      if (circuitForDossier.nom_entite) circuitCacheRef.set(circuitForDossier.nom_entite, circuitForDossier);
                      if (circuitForDossier.id) circuitCacheRef.set(circuitForDossier.id, circuitForDossier);
                    }
                  } catch {
                    // ignore
                  }
                }
              }
            }

            const receptionDossier: ReceptionDossier = {
              id: dossierRaw.id,
              reference: dossierRaw.reference || `DOS-${dossierRaw.id?.substring(0, 8)?.toUpperCase() ?? ''}`,
              candidatNom: dossierRaw.candidat?.personne?.nom || dossierRaw.candidat_nom || 'N/A',
              candidatPrenom: dossierRaw.candidat?.personne?.prenom || dossierRaw.candidat_prenom || 'N/A',
              autoEcoleNom: dossierRaw.auto_ecole?.nom_auto_ecole || dossierRaw.auto_ecole_nom || 'N/A',
              dateEnvoi: dossierRaw.date_creation || dossierRaw.created_at || new Date().toISOString(),
              statut: (dossierRaw.statut || 'en_attente') as ReceptionDossier['statut'],
              details: {
                dossier_complet: dossierRaw,
                formation_complete: dossierRaw.formation,
                candidat_complet: dossierRaw.candidat,
              },
              epreuves: dossierRaw.epreuves || { general: 'non_saisi' },
            };

            if (circuitForDossier && receptionDossier.details?.dossier_complet) {
              (receptionDossier.details.dossier_complet as any).circuit = circuitForDossier;
              (receptionDossier.details.dossier_complet as any).type_demande = typeDemandeCacheRef.get(
                dossierRaw.type_demande_id
              );
            }
            return receptionDossier;
          })
        );

        if (meta) {
          setDossiersListPage(meta.current_page);
        }

        setState({
          dossiers: enrichedDossiers,
          circuits: circuitsData,
          circuitCache: circuitCacheRef,
          typeDemandeCache: typeDemandeCacheRef,
          circuitsWithEtapesLoaded: opts.includeCircuits ? new Set() : prev.circuitsWithEtapesLoaded,
          loading: false,
          error: null,
          dossiersPagination: meta,
        });
        setHasLoadedOnce(true);
      } catch (e: any) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message || 'Erreur lors du chargement',
          dossiers: [],
          dossiersPagination: null,
        }));
      } finally {
        loadingRef.current = false;
      }
    },
    [isRoleCnepc]
  );

  const loadReceptionDataIfNeeded = useCallback(
    async (force?: boolean) => {
      if (!force && hasLoadedOnce) return;
      setDossiersListPage(1);
      await loadDossiersPage({
        includeCircuits: true,
        page: 1,
      });
    },
    [hasLoadedOnce, loadDossiersPage]
  );

  const refreshReceptionData = useCallback(async () => {
    loadingRef.current = false;
    setDossiersListPage(1);
    await loadDossiersPage({
      includeCircuits: true,
      page: 1,
    });
  }, [loadDossiersPage]);

  const changeDossiersListPage = useCallback(
    (page: number) => {
      const p = Math.max(1, page);
      setDossiersListPage(p);
      void loadDossiersPage({
        includeCircuits: false,
        page: p,
      });
    },
    [loadDossiersPage]
  );

  const value: ReceptionDataContextValue = {
    ...state,
    loadReceptionDataIfNeeded,
    refreshReceptionData,
    loadCircuitEtapes,
    hasLoadedOnce,
    dossiersListPage,
    changeDossiersListPage,
  };

  return (
    <ReceptionDataContext.Provider value={value}>
      {children}
    </ReceptionDataContext.Provider>
  );
};

export function useReceptionData(): ReceptionDataContextValue {
  const ctx = useContext(ReceptionDataContext);
  if (!ctx) {
    throw new Error('useReceptionData must be used within a ReceptionDataProvider');
  }
  return ctx;
}
