import React, { createContext, useCallback, useContext, useState } from 'react';
import type { CircuitSuivi } from '../services/circuit-suivi.api';
import type { ReceptionDossier, EpreuveStatut } from '../types';

/** État mis en cache pour la page traitement dossier (par id dossier). */
export interface TraitementDossierCacheEntry {
  loading: boolean;
  loadingDocuments: boolean;
  loadingCircuit: boolean;
  loadingTypeDocuments: boolean;
  loadingEpreuves: boolean;
  loadingPiecesJustificatives: boolean;
  dossierComplet: any | null;
  dossier: ReceptionDossier | null;
  circuit: CircuitSuivi | null;
  typeDocuments: any[];
  documentsFromApi: any[];
  pieceJustificationTypeMap: Map<string, { libelle: string }>;
  piecesJustificativesMap: Map<string, any>;
  epreuvesStatus: EpreuveStatut | null;
}

export interface TraitementDossierDataContextValue {
  get: (id: string) => TraitementDossierCacheEntry | undefined;
  set: (id: string, entry: TraitementDossierCacheEntry) => void;
  invalidate: (id: string) => void;
}

const TraitementDossierDataContext = createContext<TraitementDossierDataContextValue | null>(null);

export const TraitementDossierDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cache, setCache] = useState<Map<string, TraitementDossierCacheEntry>>(new Map());

  const get = useCallback((id: string) => cache.get(id), [cache]);
  const set = useCallback((id: string, entry: TraitementDossierCacheEntry) => {
    setCache((prev) => {
      const next = new Map(prev);
      next.set(id, entry);
      return next;
    });
  }, []);
  const invalidate = useCallback((id: string) => {
    setCache((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const value: TraitementDossierDataContextValue = { get, set, invalidate };

  return (
    <TraitementDossierDataContext.Provider value={value}>
      {children}
    </TraitementDossierDataContext.Provider>
  );
};

export function useTraitementDossierData(): TraitementDossierDataContextValue {
  const ctx = useContext(TraitementDossierDataContext);
  if (!ctx) {
    return {
      get: () => undefined,
      set: () => {},
      invalidate: () => {},
    };
  }
  return ctx;
}
