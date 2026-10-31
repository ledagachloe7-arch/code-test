import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  Box, 
  Typography, 
  Stack, 
  Chip,
  Alert,
  Skeleton,
  Fade,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Button
} from '@mui/material';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { EtapeCircuit } from '../services/circuit-suivi.service';
import { CircuitEtapesCardProps, ValidationDialogState } from '../types/circuit-etapes.types';
import { useCircuitEtapes } from '../hooks/useCircuitEtapes';
import { useEtapeCompletion } from '../hooks/useEtapeCompletion';
import { useDocumentUploadForPiece } from '../hooks/useDocumentUploadForPiece';
import { useEtapeTransmission } from '../hooks/useEtapeTransmission';
import { useCNEDDTTransfer, isDossierStatutSentToCNEDDT } from '../hooks/useCNEDDTTransfer';
import { useDocumentPieceMapping } from '../hooks/useDocumentPieceMapping';
import { getEtapeStatus, areAllPiecesValidated, areAllMandatoryPiecesValidated, areAllMandatoryPiecesUploaded, getPreviousEtape, getNextEtape, isEtapePaiementCircuit } from '../utils/etapeHelpers';
import { isUserAuthorized, isArchivageRole } from '../utils/roleHelpers';
import { useAppStore } from '../../../store';
import { EtapeAccordion } from './EtapeAccordion';
import { ValidationDialog } from './ValidationDialog';
import { DateExamenDialog } from './DateExamenDialog';
import axiosClient from '../../../shared/utils/axiosConfig';
import { computeOverall, computeGeneral } from '../tables/ReceptionDossierTypeTable/utils';
import toast from 'react-hot-toast';

const CircuitEtapesCard: React.FC<CircuitEtapesCardProps> = ({
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
  epreuvesStatus: _epreuvesStatus,
  loadingEpreuves: _loadingEpreuves = false,
  onSendToCNEDDT,
  pieceJustificationTypeMap = new Map(),
  piecesJustificativesMap: piecesJustificativesMapFromContext,
  loadingPiecesJustificatives: loadingPiecesJustificativesFromContext = false,
  displayMode = 'accordion',
  onActiveStepChange,
  renderTimelineHeader,
  onDossierStatutUpdated,
  openToNextStep = false,
  dossierInfoPourImpression: dossierInfoPourImpressionProp
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const openToNextStepAppliedRef = useRef(false);
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

  // Debug: Log du circuit reçu
  useEffect(() => {
    console.log('🔍 CircuitEtapesCard - Circuit reçu:', {
      circuit: circuit ? {
        id: circuit.id,
        libelle: circuit.libelle,
        nom_entite: circuit.nom_entite,
        hasId: !!circuit.id,
        hasLibelle: !!circuit.libelle,
        etapesCount: circuit.etapes?.length || 0
      } : null,
      loadingCircuit,
      loadingTypeDocuments
    });
  }, [circuit, loadingCircuit, loadingTypeDocuments]);

  // Hook pour gérer les étapes du circuit
  const { etapes, loadingEtapes, errorEtapes } = useCircuitEtapes(circuit, loadingCircuit, dossierId);

  // Étapes visibles : archivage = uniquement l’étape paiement
  const visibleEtapes = useMemo(() => {
    if (isArchivageRole(userRole)) {
      return etapes.filter((e) => isEtapePaiementCircuit(e));
    }
    return etapes.filter((e) => isUserAuthorized(userRole, e.roles));
  }, [etapes, userRole]);

  // Si l'étape active n'est pas dans les étapes visibles (ex. changement de rôle), passer à la première visible
  useEffect(() => {
    if (visibleEtapes.length === 0) return;
    const currentEtape = etapes[activeStepIndex];
    const isCurrentVisible = currentEtape && visibleEtapes.some((v) => v.id === currentEtape.id);
    if (!isCurrentVisible) {
      const firstVisibleIndex = etapes.findIndex((e) => visibleEtapes.some((v) => v.id === e.id));
      if (firstVisibleIndex >= 0) setActiveStepIndex(firstVisibleIndex);
    }
  }, [etapes, visibleEtapes, activeStepIndex]);

  // En mode timeline, notifier le parent de l'étape active (pour afficher DocumentsCard seulement si l'étape a des pièces).
  useEffect(() => {
    if (displayMode !== 'timeline' || !onActiveStepChange) return;
    const etape = etapes[activeStepIndex] ?? null;
    onActiveStepChange(etape);
  }, [displayMode, onActiveStepChange, etapes, activeStepIndex]);

  // État pour suivre les programmes sessions créés (pour l'étape ENVOI DOSSIER POUR EXAMEN)
  const [programmeSessionsMap, setProgrammeSessionsMap] = useState<Map<string, boolean>>(new Map());
  
  // État pour suivre les statuts des épreuves par étape
  const [epreuvesStatusMap, setEpreuvesStatusMap] = useState<Map<string, { status: string | null; loading: boolean }>>(new Map());

  // État pour gérer l'expansion des accordions
  const [expandedEtapeId, setExpandedEtapeId] = useState<string | null>(null);
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

  // En mode timeline + renderTimelineHeader : fournir la timeline au parent pour affichage en header (étapes filtrées par rôle).
  useEffect(() => {
    if (displayMode !== 'timeline' || !renderTimelineHeader || !circuit) return;
    if (visibleEtapes.length === 0) {
      renderTimelineHeader(null);
      return;
    }
    const currentEtape = etapes[activeStepIndex];
    const activeVisibleIndex = currentEtape ? visibleEtapes.findIndex((v) => v.id === currentEtape.id) : 0;
    const safeActiveVisible = activeVisibleIndex >= 0 ? activeVisibleIndex : 0;

    const goToPrevVisible = () => {
      if (safeActiveVisible <= 0) return;
      const prevEtape = visibleEtapes[safeActiveVisible - 1];
      const idx = etapes.findIndex((e) => e.id === prevEtape.id);
      if (idx >= 0) setActiveStepIndex(idx);
    };
    const goToNextVisible = () => {
      if (safeActiveVisible >= visibleEtapes.length - 1) return;
      const nextEtape = visibleEtapes[safeActiveVisible + 1];
      const idx = etapes.findIndex((e) => e.id === nextEtape.id);
      if (idx >= 0) setActiveStepIndex(idx);
    };

    const timelineNode = (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'nowrap',
          px: 2,
          py: 1.25,
          overflow: 'hidden',
        }}
      >
        <Stepper
          activeStep={safeActiveVisible}
          orientation="horizontal"
          sx={{
            flex: '1 1 auto',
            minWidth: 0,
            overflow: 'hidden',
            pb: 0,
            '& .MuiStep-root': { px: 0.5 },
            '& .MuiStepLabel-root': { py: 0 },
            '& .MuiStepLabel-label': { fontSize: 10, lineHeight: 1.3 },
            '& .MuiStepConnector-line': { borderColor: 'divider', borderTopWidth: 2 },
            '& .MuiStepIcon-root': { fontSize: 18 },
            '& .MuiStepIcon-root.Mui-active': { color: 'primary.main' },
            '& .MuiStepIcon-root.Mui-completed': { color: 'success.main' },
            '& .MuiStepButton-root': { borderRadius:0 , px: 5, py: 2 },
            '& .MuiStepButton-root:hover': { bgcolor: 'action.hover' },
            '& .MuiStepButton-root.Mui-selected .MuiStepLabel-label': { fontWeight: 600, color: 'primary.main' },
            '& .MuiStepButton-root .MuiStepLabel-label.Mui-completed': { color: 'text.secondary', fontWeight: 500 },
          }}
        >
          {visibleEtapes.map((etape) => {
            const fullIndex = etapes.findIndex((e) => e.id === etape.id);
            return (
              <Step key={etape.id} completed={computedCompletedEtapes.has(etape.id) || completedEtapes.has(etape.id)}>
                <StepButton onClick={() => setActiveStepIndex(fullIndex >= 0 ? fullIndex : 0)}>
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 120,
                      },
                    }}
                  >
                    {etape.libelle}
                  </StepLabel>
                </StepButton>
              </Step>
            );
          })}
        </Stepper>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexShrink: 0,
            pl: 0.5,
          }}
        >
          <Button
            size="small"
            disabled={safeActiveVisible <= 0}
            variant="outlined"
            sx={{
              minWidth: 32,
              height: 28,
              p: 0,
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover:not(:disabled)': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'primary.main', '& svg': { color: 'primary.contrastText' } },
              '&:disabled': { borderColor: 'action.disabledBackground', color: 'action.disabled' },
            }}
            onClick={goToPrevVisible}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <Typography
            variant="caption"
            sx={{
              fontSize: 15,
              minWidth: 36,
              textAlign: 'center',
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            {safeActiveVisible + 1}/{visibleEtapes.length}
          </Typography>
          <Button
            size="small"
            disabled={safeActiveVisible >= visibleEtapes.length - 1}
            variant="outlined"
            sx={{
              minWidth: 32,
              height: 28,
              p: 0,
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover:not(:disabled)': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'primary.main', '& svg': { color: 'primary.contrastText' } },
              '&:disabled': { borderColor: 'action.disabledBackground', color: 'action.disabled' },
            }}
            onClick={goToNextVisible}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </Box>
      </Box>
    );
    renderTimelineHeader(timelineNode);
  }, [displayMode, renderTimelineHeader, circuit, etapes, visibleEtapes, activeStepIndex, computedCompletedEtapes, completedEtapes]);

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

  // Après transmission réussie, ouvrir automatiquement l'étape suivante (mode accordéon)
  const handleTransmitAndExpandNext = React.useCallback(async (etape: EtapeCircuit) => {
    await handleTransmitToNextEtape(etape);
    if (circuit) {
      const nextEtape = getNextEtape(etape, circuit);
      setExpandedEtapeId(nextEtape ? nextEtape.id : etape.id);
    }
  }, [handleTransmitToNextEtape, circuit]);

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
        
        // Si un programme session existe, charger le statut des épreuves
        if (hasSession) {
          try {
            const resultatsResponse = await axiosClient.get('/resultats', {
              params: { dossier_id: dossierId }
            });
            
            const resultats = Array.isArray(resultatsResponse.data?.data) ? resultatsResponse.data.data : [];
            
            if (resultats.length === 0) {
              setEpreuvesStatusMap(prev => {
                const newMap = new Map(prev);
                newMap.set(envoiEtape.id, { status: 'non_saisi', loading: false });
                return newMap;
              });
              return;
            }
            
            // Organiser les résultats par type d'examen
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
            
            // Calculer les statuts
            const creneauxStatus = computeOverall(creneauxAttempts);
            const codeStatus = computeOverall(codeConduiteAttempts);
            const villeStatus = computeOverall(tourVilleAttempts);
            const generalStatus = computeGeneral(creneauxStatus, codeStatus, villeStatus);
            
            setEpreuvesStatusMap(prev => {
              const newMap = new Map(prev);
              newMap.set(envoiEtape.id, { status: generalStatus, loading: false });
              return newMap;
            });
          } catch (error) {
            console.error('Erreur lors du chargement du statut des épreuves:', error);
            setEpreuvesStatusMap(prev => {
              const newMap = new Map(prev);
              newMap.set(envoiEtape.id, { status: null, loading: false });
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
  }, [etapes, dossierId]);
  
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

  // Initialiser l'expansion sur la première étape non complétée (accordion)
  useEffect(() => {
    if (etapes.length === 0) return;
    if (expandedEtapeId === null) {
      const firstIncompleteEtape = etapes.find(etape => 
        !computedCompletedEtapes.has(etape.id) && !completedEtapes.has(etape.id)
      );
      if (firstIncompleteEtape) {
        setExpandedEtapeId(firstIncompleteEtape.id);
      } else if (etapes.length > 0) {
        setExpandedEtapeId(etapes[etapes.length - 1].id);
      }
    }
  }, [etapes, computedCompletedEtapes, completedEtapes, expandedEtapeId]);

  // Réinitialiser le flag quand le dossier change (pour réappliquer openToNextStep sur un autre dossier)
  useEffect(() => {
    openToNextStepAppliedRef.current = false;
  }, [dossierId]);

  // Ouvrir directement sur la prochaine étape à traiter quand on arrive depuis la liste (openToNextStep)
  useEffect(() => {
    if (!openToNextStep || openToNextStepAppliedRef.current) return;
    const allCompleted = new Set<string>();
    computedCompletedEtapes.forEach(id => allCompleted.add(id));
    completedEtapes.forEach(id => allCompleted.add(id));

    if (etapes.length === 0) return;
    const firstIncompleteIndex = etapes.findIndex((etape) => !allCompleted.has(etape.id));
    if (firstIncompleteIndex >= 0) {
      setActiveStepIndex(firstIncompleteIndex);
      setExpandedEtapeId(etapes[firstIncompleteIndex].id);
      openToNextStepAppliedRef.current = true;
    }
  }, [openToNextStep, etapes, computedCompletedEtapes, completedEtapes]);

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

    if (newlyCompletedEtape) {
      const nextEtape = getNextEtape(newlyCompletedEtape, circuit);
      if (nextEtape) {
        setExpandedEtapeId(nextEtape.id);
      } else {
        setExpandedEtapeId(newlyCompletedEtape.id);
      }
    }
  }, [computedCompletedEtapes, completedEtapes, etapes, circuit]);

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
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
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

        {displayMode === 'timeline' ? (
          <>
            {/* Timeline en header si renderTimelineHeader fourni ; sinon afficher ici (vertical) */}
            {!renderTimelineHeader && (
              <>
                <Stepper activeStep={activeStepIndex} orientation="vertical" sx={{ mb: 3 }}>
                  {etapes.map((etape, index) => (
                    <Step key={etape.id} completed={computedCompletedEtapes.has(etape.id) || completedEtapes.has(etape.id)}>
                      <StepButton onClick={() => setActiveStepIndex(index)}>
                        <StepLabel>
                          {etape.libelle}
                          {etape.statut_libelle && (
                            <Typography component="span" variant="caption" display="block" color="text.secondary">
                              {etape.statut_libelle}
                            </Typography>
                          )}
                        </StepLabel>
                      </StepButton>
                    </Step>
                  ))}
                </Stepper>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Button
                    disabled={activeStepIndex === 0}
                    startIcon={<ChevronLeftIcon className="w-5 h-5" />}
                    onClick={() => setActiveStepIndex((i) => Math.max(0, i - 1))}
                  >
                    Étape précédente
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {activeStepIndex + 1} / {etapes.length}
                  </Typography>
                  <Button
                    disabled={activeStepIndex === etapes.length - 1}
                    endIcon={<ChevronRightIcon className="w-5 h-5" />}
                    onClick={() => setActiveStepIndex((i) => Math.min(etapes.length - 1, i + 1))}
                  >
                    Étape suivante
                  </Button>
                </Box>
              </>
            )}

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, bgcolor: 'background.default' }}>
              {(() => {
                const etape = etapes[activeStepIndex];
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
                const isEnvoiDossierExamen = etape.libelle?.toUpperCase().includes('ENVOI DU DOSSIER POUR EXAMEN') || etape.libelle?.toUpperCase().includes('ENVOI DE DOSSIER POUR EXAMEN') || etape.code?.toUpperCase().includes('ENVOI_DOSSIER_EXAMEN') || etape.code?.toUpperCase().includes('DOSSIER_EXAMEN');
                const programmeSessionCreated = programmeSessionsMap.get(etape.id) || false;
                const epreuvesStatusData = epreuvesStatusMap.get(etape.id) || { status: null, loading: false };
                let etapeStatus = getEtapeStatus(etape, previousCompleted, computedCompletedEtapes, completedEtapes, documentsForCurrentDossier);
                if (isEnvoiDossierExamen && programmeSessionCreated) {
                  etapeStatus = epreuvesStatusData.status !== 'reussi'
                    ? { status: 'in_progress', label: 'En attente des résultats', color: 'warning' as const }
                    : { status: 'completed', label: 'Résultats validés - Prêt à passer à l\'étape suivante', color: 'success' as const };
                }
                // Afficher le bouton dès que toutes les pièces obligatoires sont téléversées (pas seulement validées)
                const shouldShow = (previousCompleted || isFirstEtape) && (!!nextEtape || isLastEtape) && (allValidated || isEtapeWithoutPieces || isEtapeCompleted || allMandatoryValidated || allMandatoryUploaded);
                const isButtonEnabled = (allValidated || isEtapeWithoutPieces || isEtapeCompleted || allMandatoryValidated) && (!isEnvoiDossierExamen || epreuvesStatusData.status === 'reussi');
                const handleTransmitAndNext = async (e: EtapeCircuit) => {
                  await handleTransmitToNextEtape(e);
                  if (activeStepIndex < etapes.length - 1) setActiveStepIndex((i) => i + 1);
                };
                const handleCompleteAndNext = async (e: EtapeCircuit) => {
                  await handleCompleteLastEtapeAndTransfer(e);
                };
                return (
                  <EtapeAccordion
                    etape={etape}
                    index={activeStepIndex}
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
                    onCompleteLastEtape={handleCompleteAndNext}
                    onTransmitToNextEtape={isLastEtape ? handleCompleteAndNext : handleTransmitAndNext}
                    pieceJustificationTypeMap={pieceJustificationTypeMap}
                    piecesJustificativesMap={piecesJustificativesMap}
                    expanded={true}
                    dossierStatut={dossierStatut}
                    codePaiement={dossierComplet?.code_paiement}
                    onDossierStatutUpdated={onDossierStatutUpdated}
                    sendingToCNEDDT={sendingToCNEDDT}
                    dossierInfoPourImpression={dossierInfoPourImpression}
                  />
                );
              })()}
            </Box>
          </>
        ) : (
        <Stack spacing={2}>
          {etapes.map((etape: EtapeCircuit, index: number) => {
            const previousEtape = circuit ? getPreviousEtape(etape, circuit) : null;
            const nextEtape = circuit ? getNextEtape(etape, circuit) : null;
            const previousCompleted = isPreviousEtapeCompleted(etape);
            const isEtapeCompleted = computedCompletedEtapes.has(etape.id) || completedEtapes.has(etape.id);
            const isEtapeWithoutPieces = !etape.pieces || etape.pieces.length === 0;
            const isLastEtape = !nextEtape;
            const isFirstEtape = !previousEtape;
            
            const allValidated = areAllPiecesValidated(
              etape,
              documentsForCurrentDossier,
              completedEtapes,
              computedCompletedEtapes,
              typeDocuments,
              piecesJustificativesMap
            );
            const allMandatoryValidated = areAllMandatoryPiecesValidated(
              etape,
              documentsForCurrentDossier,
              completedEtapes,
              computedCompletedEtapes,
              typeDocuments,
              piecesJustificativesMap
            );
            const allMandatoryUploaded = areAllMandatoryPiecesUploaded(
              etape,
              documentsForCurrentDossier,
              completedEtapes,
              computedCompletedEtapes,
              typeDocuments,
              piecesJustificativesMap
            );
            
            // Vérifier si c'est l'étape "ENVOI DU DOSSIER POUR EXAMEN" (accepter "DU" et "DE")
            const isEnvoiDossierExamen = etape.libelle?.toUpperCase().includes('ENVOI DU DOSSIER POUR EXAMEN') ||
                                       etape.libelle?.toUpperCase().includes('ENVOI DE DOSSIER POUR EXAMEN') ||
                                       etape.code?.toUpperCase().includes('ENVOI_DOSSIER_EXAMEN') ||
                                       etape.code?.toUpperCase().includes('DOSSIER_EXAMEN');
            
            // Vérifier si un programme session existe pour cette étape
            const programmeSessionCreated = programmeSessionsMap.get(etape.id) || false;
            const epreuvesStatusData = epreuvesStatusMap.get(etape.id) || { status: null, loading: false };
            const epreuvesStatus = epreuvesStatusData.status;
            
            // Modifier le statut de l'étape si c'est "ENVOI DOSSIER POUR EXAMEN" et qu'un programme session existe
            let etapeStatus = getEtapeStatus(
              etape,
              previousCompleted,
              computedCompletedEtapes,
              completedEtapes,
              documentsForCurrentDossier
            );
            
            // Si c'est l'étape "ENVOI DOSSIER POUR EXAMEN" et qu'un programme session existe
            if (isEnvoiDossierExamen && programmeSessionCreated) {
              // Si le statut des épreuves n'est pas encore 'reussi', l'étape est en attente des résultats
              if (epreuvesStatus !== 'reussi') {
                etapeStatus = {
                  status: 'in_progress',
                  label: 'En attente des résultats',
                  color: 'warning'
                };
              } else {
                // Si le statut est 'reussi', l'étape peut être complétée
                etapeStatus = {
                  status: 'completed',
                  label: 'Résultats validés - Prêt à passer à l\'étape suivante',
                  color: 'success'
                };
              }
            }

            // Logique pour déterminer si le bloc de boutons doit être affiché
            // Le bloc s'affiche dès que toutes les pièces obligatoires sont téléversées (pas seulement validées)
            const shouldShow = (previousCompleted || isFirstEtape) && 
              (!!nextEtape || isLastEtape) &&
              (allValidated || isEtapeWithoutPieces || isEtapeCompleted || allMandatoryValidated || allMandatoryUploaded);
            
            // Le bouton est activé si :
            // - Toutes les pièces validées OU étape sans pièces OU étape complétée OU toutes les pièces obligatoires validées
            // - Pour "ENVOI DOSSIER POUR EXAMEN": le statut des épreuves doit être 'reussi'
            const isButtonEnabled = (allValidated || isEtapeWithoutPieces || isEtapeCompleted || allMandatoryValidated) &&
              (!isEnvoiDossierExamen || epreuvesStatus === 'reussi');

            return (
              <EtapeAccordion
                key={etape.id}
                etape={etape}
                index={index}
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
                onCompleteLastEtape={handleCompleteLastEtapeAndTransfer}
                onTransmitToNextEtape={handleTransmitAndExpandNext}
                pieceJustificationTypeMap={pieceJustificationTypeMap}
                piecesJustificativesMap={piecesJustificativesMap}
                expanded={expandedEtapeId === etape.id}
                dossierStatut={dossierStatut}
                codePaiement={dossierComplet?.code_paiement}
                onDossierStatutUpdated={onDossierStatutUpdated}
                sendingToCNEDDT={sendingToCNEDDT}
                dossierInfoPourImpression={dossierInfoPourImpression}
                onChange={(_event, isExpanded) => {
                  if (isExpanded) {
                    setExpandedEtapeId(etape.id);
                  } else {
                    setExpandedEtapeId(null);
                  }
                }}
              />
            );
          })}
        </Stack>
        )}

        {/* Message "envoyé à la biométrie" uniquement quand le dossier a le statut "Dossier Envoyé" (API). */}
        {etapes.length > 0 && isDossierStatutSentToCNEDDT(dossierStatutProp) && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Dossier Envoyé à la biométrie.
          </Alert>
        )}
      </CardContent>

      {/* Dialogue de validation */}
      <ValidationDialog
        open={validationDialog.open}
        validationDialog={validationDialog}
        updatingDocument={updatingDocument}
        onClose={handleCloseValidationDialog}
        onSave={handleSaveValidation}
        onValideChange={(valide) => setValidationDialog(prev => ({ ...prev, valide }))}
        onCommentairesChange={(commentaires) => setValidationDialog(prev => ({ ...prev, commentaires }))}
      />

      {/* Dialogue de sélection de date d'examen */}
      <DateExamenDialog
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

export default CircuitEtapesCard;
