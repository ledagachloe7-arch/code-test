import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CircuitSuivi } from '../../services/circuit-suivi.service';
import type { ReceptionDossier, EpreuveStatut } from '../../types';

/** État mis en cache pour la page Détails candidat (par dossier id). */
export interface CandidatDetailsCacheEntry {
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
  /** Map piece_justification_id -> données pièce (évite les appels répétés GET /pieces-justificatives). */
  piecesJustificativesMap: Map<string, any>;
  epreuvesStatus: EpreuveStatut | null;
}

export interface ReceptionCandidatDetailsDataContextValue {
  get: (id: string) => CandidatDetailsCacheEntry | undefined;
  set: (id: string, entry: CandidatDetailsCacheEntry) => void;
  invalidate: (id: string) => void;
}

const ReceptionCandidatDetailsDataContext = createContext<ReceptionCandidatDetailsDataContextValue | null>(null);

export const ReceptionCandidatDetailsDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cache, setCache] = useState<Map<string, CandidatDetailsCacheEntry>>(new Map());

  const get = useCallback((id: string) => cache.get(id), [cache]);
  const set = useCallback((id: string, entry: CandidatDetailsCacheEntry) => {
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

  const value: ReceptionCandidatDetailsDataContextValue = { get, set, invalidate };

  return (
    <ReceptionCandidatDetailsDataContext.Provider value={value}>
      {children}
    </ReceptionCandidatDetailsDataContext.Provider>
  );
};

export function useReceptionCandidatDetailsData(): ReceptionCandidatDetailsDataContextValue {
  const ctx = useContext(ReceptionCandidatDetailsDataContext);
  if (!ctx) {
    return {
      get: () => undefined,
      set: () => {},
      invalidate: () => {},
    };
  }
  return ctx;
}
