import { ReceptionDossier } from '../../types';
import { CircuitSuivi } from '../../services/circuit-suivi.service';

export interface ReceptionDossierTypeTableProps {
  dossiers: ReceptionDossier[];
  typeDemandeName: string;
  typeDemandeId?: string;
  circuit?: CircuitSuivi | null;
  onReceive: (id: string) => void;
  onOpenDocuments?: (dossier: ReceptionDossier) => void;
  onDelete?: (id: string) => void | Promise<void>;
}

export interface DossierSuivi {
  dossierId: string;
  circuit: CircuitSuivi | null;
  currentEtape: string | null;
  progress: number;
  documentsCount: number;
  documentsValides: number;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

