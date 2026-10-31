import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ComponentType,
} from 'react';

export interface ReceptionCacheValue {
  ReceptionDossierTypeTable: ComponentType<any> | null;
  CircuitEtapesView: ComponentType<any> | null;
  CandidatInfoCard: ComponentType<any> | null;
  AutoEcoleInfoCard: ComponentType<any> | null;
  CircuitEtapesCard: ComponentType<any> | null;
  DocumentsCard: ComponentType<any> | null;
  isReady: boolean;
  isCandidatDetailsReady: boolean;
}

const defaultValue: ReceptionCacheValue = {
  ReceptionDossierTypeTable: null,
  CircuitEtapesView: null,
  CandidatInfoCard: null,
  AutoEcoleInfoCard: null,
  CircuitEtapesCard: null,
  DocumentsCard: null,
  isReady: false,
  isCandidatDetailsReady: false,
};

const ReceptionCacheContext = createContext<ReceptionCacheValue>(defaultValue);

const loadTable = () => import('../ReceptionDossierTypeTable').then((m) => m.default);
const loadCircuitEtapes = () => import('../../../components/CircuitEtapesView').then((m) => m.default);
const loadCandidatInfoCard = () => import('../../../components/CandidatInfoCard').then((m) => m.default);
const loadAutoEcoleInfoCard = () => import('../../../components/AutoEcoleInfoCard').then((m) => m.default);
const loadCircuitEtapesCard = () => import('../../../components/CircuitEtapesCard').then((m) => m.default);
const loadDocumentsCard = () => import('../../../components/DocumentsCard').then((m) => m.default);

export const ReceptionCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cache, setCache] = useState<ReceptionCacheValue>(defaultValue);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadTable(),
      loadCircuitEtapes(),
      loadCandidatInfoCard(),
      loadAutoEcoleInfoCard(),
      loadCircuitEtapesCard(),
      loadDocumentsCard(),
    ]).then(
      ([
        ReceptionDossierTypeTable,
        CircuitEtapesView,
        CandidatInfoCard,
        AutoEcoleInfoCard,
        CircuitEtapesCard,
        DocumentsCard,
      ]) => {
        if (!cancelled) {
          setCache({
            ReceptionDossierTypeTable,
            CircuitEtapesView,
            CandidatInfoCard,
            AutoEcoleInfoCard,
            CircuitEtapesCard,
            DocumentsCard,
            isReady: true,
            isCandidatDetailsReady: true,
          });
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ReceptionCacheContext.Provider value={cache}>
      {children}
    </ReceptionCacheContext.Provider>
  );
};

export function useReceptionCache(): ReceptionCacheValue {
  return useContext(ReceptionCacheContext);
}
