import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Alert,
  Skeleton,
  Fade,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AcademicCapIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { EtapeCircuit } from '../services/circuit-suivi.api';
import type { CircuitEtapesCardProps, ValidationDialogState } from '../types/circuit-etapes.types';
import { useCircuitEtapes } from '../hooks/useCircuitEtapes';
import { useEtapeCompletion } from '../hooks/useEtapeCompletion';
import { useDocumentUploadForPiece } from '../hooks/useDocumentUploadForPiece';
import { useEtapeTransmission } from '../hooks/useEtapeTransmission';
import { useCNEDDTTransfer, isDossierStatutSentToCNEDDT } from '../hooks/useCNEDDTTransfer';
import { useDocumentPieceMapping } from '../hooks/useDocumentPieceMapping';
import { getEtapeStatus, areAllPiecesValidated, areAllMandatoryPiecesValidated, areAllMandatoryPiecesUploaded, getPreviousEtape, getNextEtape } from '../utils/etapeHelpers';
import { isUserAuthorized } from '../utils/roleHelpers';
import { useAppStore } from '../../../../store';
import { TraitementEtapeContenu } from './TraitementEtapeContenu';
import { TraitementValidationDialog } from './TraitementValidationDialog';
import { TraitementDateExamenDialog } from './TraitementDateExamenDialog';
import axiosClient from '../../../../shared/utils/axiosConfig';
import { computeOverall, computeGeneral } from '../utils/epreuveCompute';
import toast from 'react-hot-toast';

/** Order ID Moov côté dossier : order_id, sinon reference_paiement (champs souvent dans attributes / details). */
function pickMoovOrderRefFromDossier(d: unknown): string | null {
  if (d == null || typeof d !== 'object') return null;
  const root = d as Record<string, unknown>;
  const inner = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
  const attrs =
    inner.attributes && typeof inner.attributes === 'object' ? (inner.attributes as Record<string, unknown>) : null;
  const details = inner.details && typeof inner.details === 'object' ? (inner.details as Record<string, unknown>) : null;
  const nestedRaw = details?.dossier_complet ?? details?.dossier;
  const nested = nestedRaw && typeof nestedRaw === 'object' ? (nestedRaw as Record<string, unknown>) : null;
  const paiement =
    inner.paiement && typeof inner.paiement === 'object' ? (inner.paiement as Record<string, unknown>) : null;
  const candidates = [
    inner.order_id,
    inner.orderId,
    inner.OrderID,
    attrs?.order_id,
    attrs?.orderId,
    nested?.order_id,
    nested?.orderId,
    paiement?.order_id,
    paiement?.orderId,
    inner.reference_paiement,
    inner.referencePaiement,
    attrs?.reference_paiement,
    attrs?.referencePaiement,
    nested?.reference_paiement,
    nested?.referencePaiement,
    paiement?.reference_paiement,
    paiement?.referencePaiement,
  ];
  for (const c of candidates) {
    const s = String(c ?? '').trim();
    if (s) return s;
  }
  return null;
}

export type TraitementCircuitPanelProps = Omit<
  CircuitEtapesCardProps,
  'displayMode' | 'onActiveStepChange' | 'renderTimelineHeader'
>;

const TraitementCircuitPanel: React.FC<TraitementCircuitPanelProps> = ({
  circuit,
  loadingCircuit,
  loadingTypeDocuments,
  typeDocuments,
  documentsFromApi,
  isDocumentValidatedForPiece,
  dossierId,
  dossierComplet,
  dossierStatut: dossierStatutProp,
  onDocumentUploaded,
  uploading = false,
  onUpdateDocument,
  onAllEtapesCompletedChange,
  epreuvesStatus: dossierEpreuvesStatus,
  loadingEpreuves: dossierEpreuvesLoading = false,
  onSendToCNEDDT,
  pieceJustificationTypeMap = new Map(),
  piecesJustificativesMap: piecesJustificativesMapFromContext,
  loadingPiecesJustificatives: loadingPiecesJustificativesFromContext = false,
  onDossierStatutUpdated,
  openToNextStep = false,
  dossierInfoPourImpression: dossierInfoPourImpressionProp
}) => {
  const [traitementVisibleIndex, setTraitementVisibleIndex] = useState(0);
  const openToNextStepAppliedRef = useRef(false);
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const { user } = useAppStore();
  const userRole = user?.role ?? (typeof localStorage !== 'undefined' ? (() => {
    try {
      const u = localStorage.getItem('user_data');
      return u ? (JSON.parse(u) as { role?: string })?.role : null;
    } catch { return null; }
  })() : null);
  const { documentPieceMapping } = useDocumentPieceMapping();

  // Utiliser la map du contexte si fournie, sinon état local (fetch dans l'effet ci-dessous)
  const [piecesJustificativesMapLocal, setPiecesJustificativesMapLocal] = useState<Map<string, any>>(new Map());
  const piecesJustificativesMap = piecesJustificativesMapFromContext !== undefined
    ? piecesJustificativesMapFromContext
    : piecesJustificativesMapLocal;

  // Filtrer et normaliser les documents pour ne garder que ceux du dossier actuel
  // IMPORTANT: Normaliser avec le mapping localStorage pour inclure les documents simulés
  const documentsForCurrentDossier = useMemo(() => {
    if (!dossierId) return documentsFromApi;

    const filtered = documentsFromApi.filter(doc => {
      return !doc.documentable_id || doc.documentable_id === dossierId;
    });

    return filtered.map(doc => {
      const apiPieceId = doc.piece_justification_id || null;
      const memoryMappedId = doc.id ? (documentPieceMapping.get(doc.id) ?? null) : null;
      const finalPieceId = apiPieceId || memoryMappedId;
      return {
        ...doc,
        piece_justification_id: finalPieceId,
        valide: doc.is_simulated ? (doc.valide !== undefined ? doc.valide : false) : doc.valide,
      };
    });
  }, [documentsFromApi, dossierId, documentPieceMapping]);

  // Hook pour gérer les étapes du circuit
  const { etapes, loadingEtapes, errorEtapes } = useCircuitEtapes(circuit, loadingCircuit, dossierId);

  // Étapes visibles : archivage = même logique que admin / superadmin (toutes les étapes autorisées par le circuit)
  const visibleEtapes = useMemo(
    () => etapes.filter((e) => isUserAuthorized(userRole, e.roles)),
    [etapes, userRole]
  );

  // État pour suivre les programmes sessions créés (pour l'étape ENVOI DOSSIER POUR EXAMEN)
  const [programmeSessionsMap, setProgrammeSessionsMap] = useState<Map<string, boolean>>(new Map());
  
  // État pour suivre les statuts des épreuves par étape
  const [epreuvesStatusMap, setEpreuvesStatusMap] = useState<Map<string, { status: string | null; loading: boolean }>>(new Map());

  const previousCompletedEtapesRef = useRef<Set<string>>(new Set());

  // Hook pour gérer la complétion des étapes : on écoute le statut du dossier en priorité ;
  // si le statut du dossier correspond au libellé/code d'une étape, cette étape et les précédentes sont marquées terminées.
  const dossierStatut = dossierStatutProp ?? dossierComplet?.statut;
  const {
    completedEtapes,
    computedCompletedEtapes,
    etapesCompletes,
    allEtapesCompleted,
    markEtapeAsCompleted
  } = useEtapeCompletion(etapes, circuit, documentsForCurrentDossier, dossierId, typeDocuments, piecesJustificativesMap, dossierStatut);

  // Hook pour gérer l'upload de documents
  const {
    uploadingForPiece,
    fileInputRefs,
    handleUploadForPiece,
    handleFileSelectForPiece
  } = useDocumentUploadForPiece(dossierId, onDocumentUploaded);


  // État pour le modal de date d'examen
  const [dateExamenDialogOpen, setDateExamenDialogOpen] = useState(false);
  const [dateExamenCallback, setDateExamenCallback] = useState<((dateExamen: string) => Promise<void>) | null>(null);
  const [dateExamenLoading, setDateExamenLoading] = useState(false);

  // Fonction pour ouvrir le modal de date d'examen
  const openDateExamenDialog = (callback: (dateExamen: string) => Promise<void>) => {
    setDateExamenCallback(() => callback);
    setDateExamenDialogOpen(true);
  };

  // Données candidat pour POST programme-sessions (évite "email on null" côté backend)
  const candidatForProgrammeSession = React.useMemo(() => {
    const candidat = dossierComplet?.candidat ?? dossierComplet?.data?.candidat ?? null;
    if (!candidat) return null;
    const personne = candidat.personne ?? null;
    return {
      email: personne?.email ?? undefined,
      personne_id: personne?.id ?? candidat.personne_id ?? undefined,
      candidat_id: candidat.id ?? undefined
    };
  }, [dossierComplet]);

  // Infos dossier pour l'impression du code de paiement : priorité au prop (même source que CandidatInfoCard), sinon fallback depuis dossierComplet
  const dossierInfoPourImpression = React.useMemo(() => {
    if (dossierInfoPourImpressionProp) return dossierInfoPourImpressionProp;
    const candidat = dossierComplet?.candidat ?? dossierComplet?.data?.candidat ?? null;
    const personne = candidat?.personne ?? null;
    const formation = dossierComplet?.formation ?? (dossierComplet as any)?.data?.formation ?? null;
    const reference = dossierComplet?.reference ?? (dossierComplet as any)?.data?.reference ?? undefined;
    return {
      reference,
      candidatNom: personne?.nom ?? undefined,
      candidatPrenom: personne?.prenom ?? undefined,
      categoriePermis: formation?.type_permis?.libelle ?? formation?.nom ?? formation?.type_permis?.code ?? undefined,
    };
  }, [dossierInfoPourImpressionProp, dossierComplet]);

  // Hook pour gérer la transmission entre étapes
  const {
    transmittingEtape,
    handleCompleteLastEtape,
    handleTransmitToNextEtape
  } = useEtapeTransmission(circuit, dossierId, onDocumentUploaded, markEtapeAsCompleted, openDateExamenDialog, candidatForProgrammeSession, onDossierStatutUpdated);

  // Hook pour gérer l'envoi à CNEDDT (dossierStatut = dernier statut validé, le message "envoyé pour impression" reste visible si le statut l'indique)
  const {
    sendingToCNEDDT,
    sentToCNEDDT,
    handleSendToCNEDDT
  } = useCNEDDTTransfer(dossierId, circuit, onSendToCNEDDT, dossierStatutProp);

  // À la dernière étape : finaliser l'étape puis lancer le transfert CNEDDT (un seul bouton "Finaliser et envoyer à la CNEDDT")
  const handleCompleteLastEtapeAndTransfer = React.useCallback(async (etape: EtapeCircuit) => {
    await handleCompleteLastEtape(etape);
    await handleSendToCNEDDT();
  }, [handleCompleteLastEtape, handleSendToCNEDDT]);

  // État pour le dialogue de validation
  const [validationDialog, setValidationDialog] = useState<ValidationDialogState>({
    open: false,
    document: null,
    valide: false,
    commentaires: ''
  });
  const [updatingDocument, setUpdatingDocument] = useState<string | null>(null);

  // Charger les pièces justificatives en local uniquement si non fournies par le contexte
  useEffect(() => {
    if (piecesJustificativesMapFromContext !== undefined) return;

    const fetchPiecesJustificatives = async () => {
      const pieceJustificationIds = new Set<string>();
      documentsForCurrentDossier.forEach(doc => {
        if (doc.piece_justification_id && doc.piece_justification_id !== 'N/A') {
          pieceJustificationIds.add(doc.piece_justification_id);
        }
      });

      if (pieceJustificationIds.size === 0) {
        setPiecesJustificativesMapLocal(new Map());
        return;
      }

      try {
        const response = await axiosClient.get('/pieces-justificatives');
        let allPieces: any[] = [];
        if (response.data) {
          if (Array.isArray(response.data)) allPieces = response.data;
          else if (response.data.data && Array.isArray(response.data.data)) allPieces = response.data.data;
          else if (response.data.data && !Array.isArray(response.data.data)) allPieces = [response.data.data];
          else allPieces = [response.data];
        }
        const filteredPieces = allPieces.filter((piece: any) => pieceJustificationIds.has(piece.id));
        const piecesMap = new Map<string, any>();
        filteredPieces.forEach((piece: any) => {
          piecesMap.set(piece.id, {
            id: piece.id || null,
            type_document_id: piece.type_document_id || null,
            code: piece.code || null,
            libelle: piece.libelle || null,
            format_attendu: piece.format_attendu || null,
            obligatoire: piece.obligatoire ?? null,
            delivery_date: piece.delivery_date || null,
            expiration_date: piece.expiration_date || null,
            created_at: piece.created_at || null,
            updated_at: piece.updated_at || null,
            etape_id: piece.etape_id || null
          });
        });
        setPiecesJustificativesMapLocal(piecesMap);
      } catch {
        setPiecesJustificativesMapLocal(new Map());
      }
    };

    if (documentsForCurrentDossier.length > 0) fetchPiecesJustificatives();
    else setPiecesJustificativesMapLocal(new Map());
  }, [documentsForCurrentDossier, piecesJustificativesMapFromContext]);

  // Vérifier si un programme session existe pour le dossier (pour l'étape ENVOI DOSSIER POUR EXAMEN)
  useEffect(() => {
    const checkProgrammeSessions = async () => {
      if (!dossierId) return;
      
      // Vérifier si une étape "ENVOI DU DOSSIER POUR EXAMEN" existe (accepter "DU" et "DE")
      const envoiEtape = etapes.find(etape =>
        etape.libelle?.toUpperCase().includes('ENVOI DU DOSSIER POUR EXAMEN') ||
        etape.libelle?.toUpperCase().includes('ENVOI DE DOSSIER POUR EXAMEN') ||
        etape.code?.toUpperCase().includes('ENVOI_DOSSIER_EXAMEN') ||
        etape.code?.toUpperCase().includes('DOSSIER_EXAMEN')
      );
      
      if (!envoiEtape) return;
      
      try {
        // Vérifier si un programme session existe pour ce dossier
        const response = await axiosClient.get('/programme-sessions', {
          params: { dossier_id: dossierId }
        });
        
        const sessions = Array.isArray(response.data?.data) 
          ? response.data.data 
          : (response.data?.data && Array.isArray(response.data.data.data) 
            ? response.data.data.data 
            : []);
        
        const hasSession = sessions.length > 0;
        setProgrammeSessionsMap(prev => {
          const newMap = new Map(prev);
          newMap.set(envoiEtape.id, hasSession);
          return newMap;
        });
        
        // Si un programme session existe : réutiliser le statut déjà chargé par le hook page (évite GET /resultats en doublon)
        if (hasSession) {
          if (!dossierEpreuvesLoading) {
            const status = dossierEpreuvesStatus ?? 'non_saisi';
            setEpreuvesStatusMap(prev => {
              const newMap = new Map(prev);
              newMap.set(envoiEtape.id, { status, loading: false });
              return newMap;
            });
          } else {
            setEpreuvesStatusMap(prev => {
              const newMap = new Map(prev);
              newMap.set(envoiEtape.id, { status: null, loading: true });
              return newMap;
            });
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du programme session:', error);
      }
    };
    
    if (etapes.length > 0 && dossierId) {
      checkProgrammeSessions();
    }
  }, [etapes, dossierId, dossierEpreuvesStatus, dossierEpreuvesLoading]);
  
  // Écouter l'événement de création de programme session
  useEffect(() => {
    const handleProgrammeSessionCreated = (event: CustomEvent) => {
      if (event.detail?.dossierId === dossierId) {
        const etapeId = event.detail?.etapeId;
        if (etapeId) {
          setProgrammeSessionsMap(prev => {
            const newMap = new Map(prev);
            newMap.set(etapeId, true);
            return newMap;
          });
          
          // Recharger le statut des épreuves après un délai
          setTimeout(() => {
            if (dossierId) {
              const envoiEtape = etapes.find(etape => etape.id === etapeId);
              if (envoiEtape) {
                // Recharger le statut (code similaire à celui ci-dessus)
                axiosClient.get('/resultats', {
                  params: { dossier_id: dossierId }
                }).then(resultatsResponse => {
                  const resultats = Array.isArray(resultatsResponse.data?.data) ? resultatsResponse.data.data : [];
                  
                  if (resultats.length === 0) {
                    setEpreuvesStatusMap(prev => {
                      const newMap = new Map(prev);
                      newMap.set(etapeId, { status: 'non_saisi', loading: false });
                      return newMap;
                    });
                    return;
                  }
                  
                  const creneauxAttempts: any[] = [];
                  const codeConduiteAttempts: any[] = [];
                  const tourVilleAttempts: any[] = [];
                  
                  resultats.forEach((resultat: any) => {
                    const attempt = {
                      result: resultat.statut,
                      date: resultat.date,
                      note: resultat.commentaire || ''
                    };
                    
                    const typeExamen = (resultat.typeExamen || '').toLowerCase().trim();
                    
                    if (typeExamen.includes('creneau') || typeExamen === 'creneaux') {
                      creneauxAttempts.push(attempt);
                    } else if (typeExamen.includes('code') || typeExamen === 'codeconduite' || typeExamen === 'code_conduite') {
                      codeConduiteAttempts.push(attempt);
                    } else if (typeExamen.includes('ville') || typeExamen === 'tourville' || typeExamen === 'tour_ville') {
                      tourVilleAttempts.push(attempt);
                    }
                  });
                  
                  const creneauxStatus = computeOverall(creneauxAttempts);
                  const codeStatus = computeOverall(codeConduiteAttempts);
                  const villeStatus = computeOverall(tourVilleAttempts);
                  const generalStatus = computeGeneral(creneauxStatus, codeStatus, villeStatus);
                  
                  setEpreuvesStatusMap(prev => {
                    const newMap = new Map(prev);
                    newMap.set(etapeId, { status: generalStatus, loading: false });
                    return newMap;
                  });
                }).catch(error => {
                  console.error('Erreur lors du rechargement du statut:', error);
                });
              }
            }
          }, 1000);
        }
      }
    };
    
    window.addEventListener('programmeSessionCreated', handleProgrammeSessionCreated as EventListener);
    return () => {
      window.removeEventListener('programmeSessionCreated', handleProgrammeSessionCreated as EventListener);
    };
  }, [dossierId, etapes]);

  // Notifier le parent si toutes les étapes sont complétées
  useEffect(() => {
    if (onAllEtapesCompletedChange) {
      onAllEtapesCompletedChange(allEtapesCompleted);
    }
  }, [allEtapesCompleted, onAllEtapesCompletedChange]);

  // Réinitialiser le flag quand le dossier change (pour réappliquer openToNextStep sur un autre dossier)
  useEffect(() => {
    openToNextStepAppliedRef.current = false;
  }, [dossierId]);

  // Ouvrir directement sur la prochaine étape à traiter quand on arrive depuis la liste (openToNextStep)
  useEffect(() => {
    if (!openToNextStep || openToNextStepAppliedRef.current || visibleEtapes.length === 0) return;
    const allCompleted = new Set<string>();
    computedCompletedEtapes.forEach(id => allCompleted.add(id));
    completedEtapes.forEach(id => allCompleted.add(id));
    const firstIncompleteVisible = visibleEtapes.findIndex((etape) => !allCompleted.has(etape.id));
    if (firstIncompleteVisible >= 0) {
      setTraitementVisibleIndex(firstIncompleteVisible);
      openToNextStepAppliedRef.current = true;
    }
  }, [openToNextStep, visibleEtapes, computedCompletedEtapes, completedEtapes]);

  // Garder l'index dans les bornes des étapes visibles
  useEffect(() => {
    if (visibleEtapes.length === 0) return;
    setTraitementVisibleIndex((i) => Math.min(Math.max(0, i), visibleEtapes.length - 1));
  }, [visibleEtapes.length, dossierId]);

  // Détecter quand une étape est complétée et ouvrir l'étape suivante
  useEffect(() => {
    if (etapes.length === 0 || !circuit) return;

    // Créer un Set combiné des étapes complétées
    const allCompletedEtapes = new Set<string>();
    computedCompletedEtapes.forEach(id => allCompletedEtapes.add(id));
    completedEtapes.forEach(id => allCompletedEtapes.add(id));

    // Trouver l'étape qui vient d'être complétée (était dans previousCompletedEtapesRef mais n'est plus, ou vice versa)
    // En fait, on cherche les étapes qui sont maintenant complétées mais qui ne l'étaient pas avant
    const newlyCompletedEtape = etapes.find(etape => {
      const isNowCompleted = allCompletedEtapes.has(etape.id);
      const wasPreviouslyCompleted = previousCompletedEtapesRef.current.has(etape.id);
      return isNowCompleted && !wasPreviouslyCompleted;
    });

    // Mettre à jour la référence
    previousCompletedEtapesRef.current = new Set(allCompletedEtapes);

    if (newlyCompletedEtape && visibleEtapes.length > 0) {
      const idx = visibleEtapes.findIndex((e) => e.id === newlyCompletedEtape.id);
      if (idx >= 0 && idx < visibleEtapes.length - 1) {
        setTraitementVisibleIndex(idx + 1);
      }
    }
  }, [computedCompletedEtapes, completedEtapes, etapes, circuit, visibleEtapes]);

  // Handlers pour le dialogue de validation
  const handleOpenValidationDialog = (doc: any, piece?: { libelle?: string; obligatoire?: boolean; type_document?: string } | null) => {
    setValidationDialog({
      open: true,
      document: doc,
      piece: piece ?? null,
      valide: doc.valide || false,
      commentaires: doc.commentaires || ''
    });
  };

  const handleCloseValidationDialog = () => {
    setValidationDialog({
      open: false,
      document: null,
      piece: null,
      valide: false,
      commentaires: ''
    });
  };

  const handleSaveValidation = async (overrides?: { valide?: boolean }) => {
    if (!validationDialog.document) return;
    const valide = overrides?.valide ?? validationDialog.valide;
    const commentaires = validationDialog.commentaires;
    const doc = validationDialog.document;
    const isRejection = valide === false;

    try {
      setUpdatingDocument(doc.id);

      // --- Document simulé (upload API échoué, stocké en localStorage) ---
      // Le Document n'existe pas sur le serveur mais la PieceJustificative a pu être créée
      if (doc.is_simulated || (doc.id && String(doc.id).startsWith('sim_'))) {
        if (isRejection) {
          // Supprimer le document des stores localStorage
          for (const key of ['simulated_documents', 'simulated_document_files', 'document_piece_mapping']) {
            try {
              const stored = localStorage.getItem(key);
              if (stored) {
                const parsed = JSON.parse(stored);
                delete parsed[doc.id];
                localStorage.setItem(key, JSON.stringify(parsed));
              }
            } catch { /* ignorer */ }
          }
          // La PieceJustificative a été créée côté API avant l'échec de l'upload → la supprimer
          if (doc.piece_justification_id) {
            try {
              await axiosClient.delete(`/pieces-justificatives/${doc.piece_justification_id}`);
            } catch { /* ignorer si déjà supprimée ou inexistante */ }
          }
          toast.success('Document rejeté et supprimé.');
        } else {
          // Mise à jour locale uniquement (validation d'un doc simulé)
          try {
            const stored = localStorage.getItem('simulated_documents');
            const parsed = stored ? JSON.parse(stored) : {};
            if (parsed[doc.id]) {
              parsed[doc.id] = {
                ...parsed[doc.id],
                valide,
                commentaires: commentaires || parsed[doc.id].commentaires,
                updated_at: new Date().toISOString()
              };
              localStorage.setItem('simulated_documents', JSON.stringify(parsed));
            }
          } catch { /* ignorer */ }
        }
        window.dispatchEvent(new CustomEvent('documentUploaded', {
          detail: {
            document_id: doc.id,
            documentable_id: doc.documentable_id || dossierId,
            documentable_type: doc.documentable_type || 'App\\Models\\Dossier',
            piece_justification_id_original: doc.piece_justification_id,
            etape_id: doc.etape_id
          }
        }));
        onDocumentUploaded?.();
        handleCloseValidationDialog();
        return;
      }

      // --- Document réel (API) ---
      if (isRejection) {
        // Supprimer le fichier document via l'API
        await axiosClient.delete(`/documents/${doc.id}`);
        toast.success('Document rejeté et supprimé. Vous pouvez en téléverser un nouveau.');
        handleCloseValidationDialog();
        onDocumentUploaded?.();
        return;
      }

      // Validation / invalidation sans suppression
      if (!onUpdateDocument) return;
      await onUpdateDocument(doc.id, { valide, commentaires });
      handleCloseValidationDialog();
    } catch (error: any) {
      console.error('❌ Erreur lors du traitement du document:', error);
      toast.error(error?.response?.data?.message || 'Erreur lors du traitement du document.');
    } finally {
      setUpdatingDocument(null);
    }
  };

  // Fonction pour vérifier si l'étape précédente est complétée
  // IMPORTANT: Ne marque PAS automatiquement les étapes comme complétées
  // Vérifie uniquement si l'étape précédente est complétée (via statut_libelle) pour autoriser l'accès à l'étape suivante
  const isPreviousEtapeCompleted = (etape: EtapeCircuit): boolean => {
    const previousEtape = getPreviousEtape(etape, circuit);
    if (!previousEtape) {
      return true; // Pas d'étape précédente
    }

    // Vérifier uniquement si l'étape précédente est marquée comme complétée via statut_libelle
    // (c'est-à-dire qu'elle a été validée manuellement via le bouton "Passer à l'étape suivante")
    if (computedCompletedEtapes.has(previousEtape.id) || completedEtapes.has(previousEtape.id)) {
      return true;
    }

    // Vérifier aussi le statut_libelle directement
    const isCompletedFromStatut = previousEtape.statut_libelle && (
      previousEtape.statut_libelle.toLowerCase().includes('complété') ||
      previousEtape.statut_libelle.toLowerCase().includes('complete') ||
      previousEtape.statut_libelle.toLowerCase().includes('terminé') ||
      previousEtape.statut_libelle.toLowerCase().includes('termine')
    );

    return isCompletedFromStatut || false;
  };

  // États de chargement
  if (loadingCircuit || loadingTypeDocuments) {
    return (
      <Fade in={true} timeout={300}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Skeleton variant="text" width="40%" height={32} />
              <Skeleton variant="rectangular" width={120} height={32} sx={{ borderRadius: 1 }} />
            </Box>
            <Skeleton variant="rectangular" height={8} sx={{ mb: 3, borderRadius: 1 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Fade>
    );
  }

  // Circuit invalide - Vérifier seulement après que le chargement soit terminé
  // Accepter le circuit s'il a au moins un libelle (l'API dossier peut renvoyer circuit_id / label au lieu de id / libelle après normalisation)
  const hasValidCircuit = circuit && (circuit.libelle || circuit.id);
  if (!hasValidCircuit) {
    console.log('⚠️ CircuitEtapesCard - Circuit invalide ou manquant:', {
      circuit: circuit,
      hasId: circuit?.id,
      hasLibelle: circuit?.libelle,
      loadingCircuit,
      loadingTypeDocuments,
      circuitType: typeof circuit,
      circuitKeys: circuit ? Object.keys(circuit) : []
    });
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Alert severity="info">
            Aucun circuit associé à ce dossier. Le circuit sera chargé automatiquement une fois le type de demande défini.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Chargement des étapes
  if (loadingEtapes) {
    return (
      <Fade in={true} timeout={300}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Skeleton variant="text" width="40%" height={32} />
              <Skeleton variant="rectangular" width={120} height={32} sx={{ borderRadius: 1 }} />
            </Box>
            <Skeleton variant="rectangular" height={8} sx={{ mb: 3, borderRadius: 1 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Fade>
    );
  }

  // Aucune étape trouvée
  if (etapes.length === 0) {
    // À ce point, circuit ne peut pas être null car on a déjà vérifié
    if (!circuit) return null;
    
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AcademicCapIcon className="w-5 h-5 mr-2 text-blue-600" />
            <Typography variant="h6" fontWeight="bold" className="font-display">
              Circuit: {circuit.libelle}
            </Typography>
          </Box>
          {errorEtapes ? (
            <Alert severity="warning">{errorEtapes}</Alert>
          ) : (
            <Alert severity="info">
              Aucune étape définie pour ce circuit.
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  const totalEtapes = etapes.length;

  // À ce point, circuit ne peut pas être null car on a déjà vérifié
  if (!circuit) return null;

  return (
    <Card
      elevation={0}
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        mb: 0,
        bgcolor: 'transparent',
        boxShadow: 'none',
      }}
    >
      <CardContent
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          px: 0,
          py: 0,
          '&:last-child': { pb: 0 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AcademicCapIcon className="w-5 h-5 mr-2 text-blue-600" />
            <Typography variant="h6" fontWeight="bold" className="font-display">
              Circuit: {circuit.libelle}
            </Typography>
          </Box>
          <Chip 
            label={`${etapesCompletes}/${totalEtapes} étapes complétées`}
            color="primary"
            variant="outlined"
          />
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {visibleEtapes.length === 0 ? (
              <Alert severity="info">
                Aucune étape de ce circuit n’est disponible pour votre rôle.
              </Alert>
            ) : (
              <>
                {!isMdUp && (
                  <FormControl fullWidth size="small" sx={{ mb: 2, flexShrink: 0 }}>
                    <InputLabel id="traitement-etape-select-label">Étape à traiter</InputLabel>
                    <Select
                      labelId="traitement-etape-select-label"
                      id="traitement-etape-select"
                      label="Étape à traiter"
                      value={traitementVisibleIndex}
                      onChange={(ev) => setTraitementVisibleIndex(Number(ev.target.value))}
                    >
                      {visibleEtapes.map((e, i) => {
                        const done = computedCompletedEtapes.has(e.id) || completedEtapes.has(e.id);
                        return (
                          <MenuItem key={e.id} value={i}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                              <Typography component="span" variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                                {i + 1}.
                              </Typography>
                              <Typography component="span" variant="body2" sx={{ flex: 1 }}>
                                {e.libelle}
                              </Typography>
                              {done && <CheckCircleIcon className="w-4 h-4 shrink-0" style={{ color: theme.palette.success.main }} />}
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                )}

                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { md: 'stretch' },
                    gap: 2,
                  }}
                >
                  {isMdUp && (
                    <Box
                      sx={{
                        width: { md: 280 },
                        flexShrink: 0,
                        display: { md: 'flex' },
                        flexDirection: { md: 'column' },
                        minHeight: { md: 0 },
                        alignSelf: { md: 'stretch' },
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: (t) => (t.palette.mode === 'dark' ? 'grey.900' : 'grey.50'),
                        p: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 1, py: 0.5, display: 'block', letterSpacing: 0.5, flexShrink: 0 }}>
                        ÉTAPES DU CIRCUIT
                      </Typography>
                      <Divider sx={{ my: 0.5, flexShrink: 0 }} />
                      <List dense disablePadding sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                        {visibleEtapes.map((e, i) => {
                          const done = computedCompletedEtapes.has(e.id) || completedEtapes.has(e.id);
                          const active = i === traitementVisibleIndex;
                          return (
                            <ListItemButton
                              key={e.id}
                              selected={active}
                              onClick={() => setTraitementVisibleIndex(i)}
                              sx={{
                                borderRadius: 1,
                                mb: 0.25,
                                alignItems: 'flex-start',
                                py: 1.25,
                                '&.Mui-selected': {
                                  bgcolor: 'action.selected',
                                  '&:hover': { bgcolor: 'action.selected' },
                                },
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 40, mt: 0.25 }}>
                                {done ? (
                                  <CheckCircleIcon className="w-6 h-6" style={{ color: theme.palette.success.main }} />
                                ) : (
                                  <Box
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 1,
                                      border: '1px solid',
                                      borderColor: active ? 'primary.main' : 'divider',
                                      bgcolor: active ? 'primary.main' : 'background.paper',
                                      color: active ? 'primary.contrastText' : 'text.secondary',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                    }}
                                  >
                                    {i + 1}
                                  </Box>
                                )}
                              </ListItemIcon>
                              <ListItemText
                                primary={e.libelle}
                                secondary={done ? 'Terminée' : active ? 'En cours' : 'À traiter'}
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  fontWeight: active ? 600 : 500,
                                  sx: { lineHeight: 1.35 },
                                }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItemButton>
                          );
                        })}
                      </List>
                    </Box>
                  )}

                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: { xs: 0, md: 0 },
                      overflow: 'auto',
                      borderRadius: 2,
                    }}
                  >
                  {(() => {
                    const etape = visibleEtapes[traitementVisibleIndex];
                    if (!etape) return null;
                    const previousEtape = getPreviousEtape(etape, circuit);
                    const nextEtape = getNextEtape(etape, circuit);
                    const previousCompleted = isPreviousEtapeCompleted(etape);
                    const isEtapeCompleted = computedCompletedEtapes.has(etape.id) || completedEtapes.has(etape.id);
                    const isEtapeWithoutPieces = !etape.pieces || etape.pieces.length === 0;
                    const isLastEtape = !nextEtape;
                    const isFirstEtape = !previousEtape;
                    const allValidated = areAllPiecesValidated(etape, documentsForCurrentDossier, completedEtapes, computedCompletedEtapes, typeDocuments, piecesJustificativesMap);
                    const allMandatoryValidated = areAllMandatoryPiecesValidated(etape, documentsForCurrentDossier, completedEtapes, computedCompletedEtapes, typeDocuments, piecesJustificativesMap);
                    const allMandatoryUploaded = areAllMandatoryPiecesUploaded(etape, documentsForCurrentDossier, completedEtapes, computedCompletedEtapes, typeDocuments, piecesJustificativesMap);
                    const isEnvoiDossierExamen =
                      etape.libelle?.toUpperCase().includes('ENVOI DU DOSSIER POUR EXAMEN') ||
                      etape.libelle?.toUpperCase().includes('ENVOI DE DOSSIER POUR EXAMEN') ||
                      etape.code?.toUpperCase().includes('ENVOI_DOSSIER_EXAMEN') ||
                      etape.code?.toUpperCase().includes('DOSSIER_EXAMEN');
                    const programmeSessionCreated = programmeSessionsMap.get(etape.id) || false;
                    const epreuvesStatusData = epreuvesStatusMap.get(etape.id) || { status: null, loading: false };
                    let etapeStatus = getEtapeStatus(etape, previousCompleted, computedCompletedEtapes, completedEtapes, documentsForCurrentDossier);
                    if (isEnvoiDossierExamen && programmeSessionCreated) {
                      etapeStatus =
                        epreuvesStatusData.status !== 'reussi'
                          ? { status: 'in_progress', label: 'En attente des résultats', color: 'warning' as const }
                          : { status: 'completed', label: 'Résultats validés - Prêt à passer à l\'étape suivante', color: 'success' as const };
                    }
                    const shouldShow =
                      (previousCompleted || isFirstEtape) &&
                      (!!nextEtape || isLastEtape) &&
                      (allValidated || isEtapeWithoutPieces || isEtapeCompleted || allMandatoryValidated || allMandatoryUploaded);
                    const isButtonEnabled =
                      (allValidated || isEtapeWithoutPieces || isEtapeCompleted || allMandatoryValidated) &&
                      (!isEnvoiDossierExamen || epreuvesStatusData.status === 'reussi');
                    const handleTransmitAndNextTraitement = async (e: EtapeCircuit) => {
                      await handleTransmitToNextEtape(e);
                      setTraitementVisibleIndex((i) => Math.min(visibleEtapes.length - 1, i + 1));
                    };
                    const handleCompleteTraitement = async (e: EtapeCircuit) => {
                      await handleCompleteLastEtapeAndTransfer(e);
                    };
                    return (
                      <TraitementEtapeContenu
                        presentation="wizard"
                        expanded
                        onChange={() => {}}
                        etape={etape}
                        index={traitementVisibleIndex}
                        wizardProgress={{ current: traitementVisibleIndex + 1, total: visibleEtapes.length }}
                        etapeStatus={etapeStatus}
                        circuit={circuit}
                        typeDocuments={typeDocuments}
                        documentsForCurrentDossier={documentsForCurrentDossier}
                        isDocumentValidatedForPiece={isDocumentValidatedForPiece}
                        isPreviousEtapeCompleted={previousCompleted}
                        computedCompletedEtapes={computedCompletedEtapes}
                        completedEtapes={completedEtapes}
                        areAllPiecesValidated={allValidated}
                        isEtapeCompleted={isEtapeCompleted}
                        isEtapeWithoutPieces={isEtapeWithoutPieces}
                        isLastEtape={isLastEtape}
                        isFirstEtape={isFirstEtape}
                        shouldShowButton={shouldShow}
                        isButtonEnabled={isButtonEnabled}
                        transmittingEtape={transmittingEtape}
                        dossierId={dossierId}
                        uploadingForPiece={uploadingForPiece}
                        uploading={uploading}
                        onUpdateDocument={onUpdateDocument}
                        onOpenValidationDialog={handleOpenValidationDialog}
                        onUploadForPiece={handleUploadForPiece}
                        onFileSelectForPiece={handleFileSelectForPiece}
                        fileInputRefs={fileInputRefs}
                        onCompleteLastEtape={handleCompleteTraitement}
                        onTransmitToNextEtape={isLastEtape ? handleCompleteTraitement : handleTransmitAndNextTraitement}
                        pieceJustificationTypeMap={pieceJustificationTypeMap}
                        piecesJustificativesMap={piecesJustificativesMap}
                        dossierStatut={dossierStatut}
                        codePaiement={dossierComplet?.code_paiement}
                        moovOrderIdHint={pickMoovOrderRefFromDossier(dossierComplet)}
                        onDossierStatutUpdated={onDossierStatutUpdated}
                        sendingToCNEDDT={sendingToCNEDDT}
                        dossierInfoPourImpression={dossierInfoPourImpression}
                        syncEpreuvesStatusFromDossier
                        dossierEpreuvesGeneralStatus={dossierEpreuvesStatus ?? null}
                        dossierEpreuvesStatusLoading={dossierEpreuvesLoading}
                      />
                    );
                  })()}
                  </Box>
                </Box>
              </>
            )}
        </Box>

        {/* Message "envoyé à la biométrie" uniquement quand le dossier a le statut "Dossier Envoyé" (API). */}
        {etapes.length > 0 && isDossierStatutSentToCNEDDT(dossierStatutProp) && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Dossier Envoyé à la biométrie.
          </Alert>
        )}
      </CardContent>

      {/* Dialogue de validation */}
      <TraitementValidationDialog
        open={validationDialog.open}
        validationDialog={validationDialog}
        updatingDocument={updatingDocument}
        onClose={handleCloseValidationDialog}
        onSave={handleSaveValidation}
        onValideChange={(valide) => setValidationDialog(prev => ({ ...prev, valide }))}
        onCommentairesChange={(commentaires) => setValidationDialog(prev => ({ ...prev, commentaires }))}
      />

      {/* Dialogue de sélection de date d'examen */}
      <TraitementDateExamenDialog
        open={dateExamenDialogOpen}
        onClose={() => {
          setDateExamenDialogOpen(false);
          setDateExamenCallback(null);
        }}
        onConfirm={async (dateExamen: string) => {
          if (dateExamenCallback) {
            setDateExamenLoading(true);
            try {
              await dateExamenCallback(dateExamen);
              setDateExamenDialogOpen(false);
              setDateExamenCallback(null);
            } catch (error: any) {
              // L'erreur est déjà gérée dans le callback avec alert
              // Mais on peut aussi afficher un message dans le modal si nécessaire
              console.error('Erreur lors de la confirmation de la date:', error);
              // Ne pas fermer le modal en cas d'erreur pour permettre à l'utilisateur de réessayer
              // Le modal restera ouvert pour permettre une nouvelle tentative
            } finally {
              setDateExamenLoading(false);
            }
          }
        }}
        loading={dateExamenLoading || !!transmittingEtape}
      />
    </Card>
  );
};

export default TraitementCircuitPanel;
