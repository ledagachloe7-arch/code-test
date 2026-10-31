import type { CircuitSuivi, EtapeCircuit, PieceEtape } from '../services/circuit-suivi.api';

export interface CircuitEtapesCardProps {
  circuit: CircuitSuivi | null;
  loadingCircuit: boolean;
  loadingTypeDocuments: boolean;
  typeDocuments: any[];
  documentsFromApi: any[];
  getDocumentsByType: (typeDocumentId: string) => any[];
  getDocumentsForPiece?: (piece: any) => any[];
  isDocumentValidated: (typeDocumentId: string) => boolean;
  isDocumentValidatedForPiece?: (piece: any) => boolean;
  dossierId?: string;
  dossierComplet?: any; // Données complètes du dossier avec candidat.personne.email
  /** Statut du dossier (source de vérité pour marquer les étapes complétées : si égal au libelle d'une étape, cette étape et les précédentes sont terminées). */
  dossierStatut?: string;
  onDocumentUploaded?: () => void;
  uploading?: boolean;
  onUpdateDocument?: (documentId: string, data: { valide: boolean; commentaires?: string }) => Promise<void>;
  onAllEtapesCompletedChange?: (allCompleted: boolean) => void;
  epreuvesStatus?: string;
  loadingEpreuves?: boolean;
  onSendToCNEDDT?: () => void;
  pieceJustificationTypeMap?: Map<string, { libelle: string }>; // Map piece_justification_id -> { libelle }
  /** Map partagée depuis le contexte (évite les appels répétés GET /pieces-justificatives). Si fournie, le composant ne charge pas les pièces en local. */
  piecesJustificativesMap?: Map<string, any>;
  loadingPiecesJustificatives?: boolean;
  /** Réception : accordion | timeline. Page traitement : `TraitementCircuitPanel` (props sans displayMode). */
  displayMode?: 'accordion' | 'timeline';
  /** En mode timeline, notifie le parent de l'étape active (pour afficher/masquer DocumentsCard selon les pièces). */
  onActiveStepChange?: (etape: EtapeCircuit | null) => void;
  /** En mode timeline, fournit le noeud React de la timeline à afficher en header (sous le titre/chip). */
  renderTimelineHeader?: (timelineNode: React.ReactNode) => void;
  /** Appelé quand le statut du dossier est mis à jour (ex. après transmission d’étape ou EN_ATTENTE_PAIEMENT) pour rafraîchir le dossier et le circuit. */
  onDossierStatutUpdated?: () => void | Promise<void>;
  /** Quand true, ouvre directement sur la prochaine étape à traiter (première non complétée) au chargement. */
  openToNextStep?: boolean;
  /** Infos dossier pour l'impression du code de paiement (même source que CandidatInfoCard si fourni par la page). */
  dossierInfoPourImpression?: { reference?: string; candidatNom?: string; candidatPrenom?: string; categoriePermis?: string };
}

export interface ValidationDialogState {
  open: boolean;
  document: any | null;
  /** Pièce justificative correspondant au document vérifié (libelle, obligatoire, etc.) */
  piece?: { libelle?: string; obligatoire?: boolean; type_document?: string } | null;
  valide: boolean;
  commentaires: string;
}

export interface EtapeStatus {
  status: 'pending' | 'in_progress' | 'completed';
  label: string;
  color: 'default' | 'warning' | 'success';
}

export type { CircuitSuivi, EtapeCircuit, PieceEtape };

