import React, { useMemo } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Chip,
  Stack,
  Alert,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { EtapeCircuit, PieceEtape, circuitSuiviService } from '../services/circuit-suivi.service';
import { EtapeStatus } from '../types/circuit-etapes.types';
import toast from 'react-hot-toast';
import { PieceCard } from './PieceCard';
import { getPreviousEtape } from '../utils/etapeHelpers';
import { useDocumentPieceMapping } from '../hooks/useDocumentPieceMapping';
import { useUserRole } from '../hooks/useUserRole';
import { isUserAuthorized, isAdminRole, canBypassPaymentVerification, isArchivageRole } from '../utils/roleHelpers';
import axiosClient from '../../../shared/utils/axiosConfig';
import { isDossierStatutSentToCNEDDT } from '../hooks/useCNEDDTTransfer';
import { EpreuveStatut, EpreuveAttempt } from '../types';
import { computeOverall, computeGeneral } from '../tables/ReceptionDossierTypeTable/utils';

export interface EtapeAccordionProps {
  etape: EtapeCircuit;
  index: number;
  etapeStatus: EtapeStatus;
  circuit: any;
  typeDocuments: any[];
  documentsForCurrentDossier: any[];
  isDocumentValidatedForPiece?: (piece: any) => boolean;
  isPreviousEtapeCompleted: boolean;
  computedCompletedEtapes: Set<string>;
  completedEtapes: Set<string>;
  areAllPiecesValidated: boolean;
  isEtapeCompleted: boolean;
  isEtapeWithoutPieces: boolean;
  isLastEtape: boolean;
  isFirstEtape: boolean;
  shouldShowButton: boolean;
  isButtonEnabled: boolean;
  transmittingEtape: string | null;
  dossierId?: string;
  uploadingForPiece: string | null;
  uploading: boolean;
  onUpdateDocument?: (documentId: string, data: { valide: boolean; commentaires?: string }) => Promise<void>;
  onOpenValidationDialog: (doc: any, piece?: PieceEtape) => void;
  onUploadForPiece: (piece: PieceEtape, etape: EtapeCircuit) => void;
  onFileSelectForPiece: (event: React.ChangeEvent<HTMLInputElement>, piece: PieceEtape, etape: EtapeCircuit) => void;
  fileInputRefs: React.MutableRefObject<Map<string, HTMLInputElement>>;
  onCompleteLastEtape: (etape: EtapeCircuit) => void;
  onTransmitToNextEtape: (etape: EtapeCircuit) => void;
  pieceJustificationTypeMap?: Map<string, { libelle: string }>; // Map piece_justification_id -> { libelle }
  /** Map partagée depuis le contexte (évite les appels répétés GET /pieces-justificatives). Si fournie, le composant ne charge pas les pièces en local. */
  piecesJustificativesMap?: Map<string, any>;
  expanded?: boolean;
  onChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  onDossierStatutUpdated?: () => void;
  /** Statut du dossier (pour afficher le bloc référence paiement quand EN_ATTENTE_PAIEMENT). */
  dossierStatut?: string;
  /** Code de paiement généré pour le dossier (pré-remplit l'input de vérification quand EN_ATTENTE_PAIEMENT). */
  codePaiement?: string | null;
  /** À la dernière étape, true pendant l'envoi du dossier à la CNEDDT (affiche "Envoi à la CNEDDT...") */
  sendingToCNEDDT?: boolean;
  /** Infos dossier pour l'impression du code de paiement (référence, candidat, catégorie permis). */
  dossierInfoPourImpression?: { reference?: string; candidatNom?: string; candidatPrenom?: string; categoriePermis?: string };
  /** Mode assistant pleine largeur (page traitement), sans accordéon MUI. */
  presentation?: 'accordion' | 'wizard';
  /** Affichage « Étape k / n » dans l'en-tête wizard. */
  wizardProgress?: { current: number; total: number };
}

/** Contenu métier d’une étape de circuit (pièces, paiement, examen, transmission). */
export const CircuitEtapeStepContent: React.FC<EtapeAccordionProps> = ({
  etape,
  index,
  etapeStatus,
  circuit,
  typeDocuments,
  documentsForCurrentDossier,
  isDocumentValidatedForPiece,
  isPreviousEtapeCompleted,
  computedCompletedEtapes,
  completedEtapes,
  areAllPiecesValidated: _areAllPiecesValidated,
  isEtapeCompleted,
  isEtapeWithoutPieces,
  isLastEtape,
  isFirstEtape,
  shouldShowButton,
  isButtonEnabled,
  transmittingEtape,
  dossierId,
  uploadingForPiece,
  uploading,
  onUpdateDocument,
  onOpenValidationDialog,
  onUploadForPiece,
  onFileSelectForPiece,
  fileInputRefs,
  onCompleteLastEtape,
  onTransmitToNextEtape,
  pieceJustificationTypeMap: _pieceJustificationTypeMap = new Map(),
  piecesJustificativesMap: piecesJustificativesMapFromParent,
  expanded = false,
  onChange,
  onDossierStatutUpdated,
  dossierStatut,
  codePaiement,
  sendingToCNEDDT = false,
  dossierInfoPourImpression,
  presentation = 'accordion',
  wizardProgress
}) => {
  const previousEtape = getPreviousEtape(etape, circuit);
  const [piecesJustificativesMapLocal, setPiecesJustificativesMapLocal] = React.useState<Map<string, any>>(new Map());
  const piecesJustificativesMap = piecesJustificativesMapFromParent !== undefined ? piecesJustificativesMapFromParent : piecesJustificativesMapLocal;
  const userRole = useUserRole();
  const [settingEnAttentePaiement, setSettingEnAttentePaiement] = React.useState(false);
  const [referencePaiement, setReferencePaiement] = React.useState('');
  const [verifyingPaiement, setVerifyingPaiement] = React.useState(false);
  const [paiementVerifie, setPaiementVerifie] = React.useState(false);
  /** True quand un paiement a été tenté mais a échoué (ex. montant insuffisant) : le champ code est alors grisé et non modifiable. */
  /** Modal Payer par MoovMoney */
  const [moovModalOpen, setMoovModalOpen] = React.useState(false);
  const [moovNumero, setMoovNumero] = React.useState('');
  const [moovSubmitting, setMoovSubmitting] = React.useState(false);

  /** Format Moov attendu : 241 + 8 chiffres (ex: 24177123456) */
  const MOOV_NUMERO_REGEX = /^241\d{8}$/;
  const moovNumeroNormalized = moovNumero.replace(/\D/g, '').slice(0, 11);
  const isMoovNumeroValide = MOOV_NUMERO_REGEX.test(moovNumeroNormalized);

  const isDossierEnAttentePaiement = (dossierStatut ?? '').toUpperCase() === 'EN_ATTENTE_PAIEMENT';
  /** Un code existe côté dossier (liste Finance ou API) : même logique métier que « en attente paiement » pour l’UI. */
  const hasDossierCodePaiement = Boolean((codePaiement ?? '').toString().trim());
  const isDossierPaymentPhase = isDossierEnAttentePaiement || hasDossierCodePaiement;

  // Vérifier si l'étape est "ENVOI (DU/DE) DOSSIER POUR EXAMEN" (libellés et codes variés pour robustesse)
  const libelleUpper = etape.libelle?.toUpperCase() ?? '';
  const codeUpper = etape.code?.toUpperCase() ?? '';
  const isEnvoiDossierExamen = libelleUpper.includes('ENVOI DU DOSSIER POUR EXAMEN') ||
                               libelleUpper.includes('ENVOI DE DOSSIER POUR EXAMEN') ||
                               libelleUpper.includes('ENVOI DOSSIER POUR EXAMEN') ||
                               (libelleUpper.includes('ENVOI') && libelleUpper.includes('DOSSIER') && libelleUpper.includes('EXAMEN')) ||
                               codeUpper.includes('ENVOI_DOSSIER_EXAMEN') ||
                               codeUpper.includes('ENVOI_DOSSIER') ||
                               codeUpper.includes('DOSSIER_EXAMEN');

  // Étape dont le statut/libellé contient "PAIEMENT" (ex: PAIEMENT DE DOSSIER, PAIEMENT DE FRAIS D'EXAMEN)
  const isEtapePaiement = (etape.libelle?.toUpperCase().includes('PAIEMENT') ?? false) ||
                          (etape.statut_libelle?.toUpperCase().includes('PAIEMENT') ?? false) ||
                          (etape.code?.toUpperCase().includes('PAIEMENT') ?? false);

  const authorized = isArchivageRole(userRole)
    ? isEtapePaiement
    : isUserAuthorized(userRole, etape.roles);

  // Pré-remplir l'input de vérification avec le code de paiement (API ou navigation Finance)
  React.useEffect(() => {
    if (isEtapePaiement && isDossierPaymentPhase && codePaiement != null && String(codePaiement).trim()) {
      setReferencePaiement(String(codePaiement).trim());
    }
  }, [isEtapePaiement, isDossierPaymentPhase, codePaiement]);
  
  // États pour le statut des épreuves
  const [epreuvesStatus, setEpreuvesStatus] = React.useState<EpreuveStatut | null>(null);
  const [loadingEpreuves, setLoadingEpreuves] = React.useState(false);
  const [programmeSessionCreated, setProgrammeSessionCreated] = React.useState(false);
  
  // Log pour déboguer les problèmes d'autorisation
  React.useEffect(() => {
    console.log('🔐 EtapeAccordion - Vérification autorisation:', {
      etapeId: etape.id,
      etapeLibelle: etape.libelle,
      etapeRoles: etape.roles,
      userRole,
      authorized,
      isPreviousEtapeCompleted,
      isFirstEtape
    });
  }, [etape.id, etape.roles, userRole, authorized, isPreviousEtapeCompleted, isFirstEtape]);

  // Charger le statut des résultats pour l'étape "ENVOI DOSSIER POUR EXAMEN"
  React.useEffect(() => {
    const loadEpreuvesStatus = async () => {
      if (!isEnvoiDossierExamen || !dossierId) {
        setEpreuvesStatus(null);
        return;
      }

      try {
        setLoadingEpreuves(true);
        console.log('📋 EtapeAccordion - Chargement du statut des épreuves pour le dossier:', dossierId);
        
        const response = await axiosClient.get('/resultats', {
          params: { dossier_id: dossierId }
        });
        
        const resultats = Array.isArray(response.data?.data) ? response.data.data : [];
        
        if (resultats.length === 0) {
          setEpreuvesStatus('non_saisi');
          setLoadingEpreuves(false);
          return;
        }
        
        // Organiser les résultats par type d'examen
        const creneauxAttempts: EpreuveAttempt[] = [];
        const codeConduiteAttempts: EpreuveAttempt[] = [];
        const tourVilleAttempts: EpreuveAttempt[] = [];
        
        resultats.forEach((resultat: any) => {
          const attempt: EpreuveAttempt = {
            result: resultat.statut as EpreuveStatut,
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
        
        // Trier par date
        creneauxAttempts.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateA - dateB;
        });
        codeConduiteAttempts.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateA - dateB;
        });
        tourVilleAttempts.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateA - dateB;
        });
        
        // Calculer les statuts
        const creneauxStatus = computeOverall(creneauxAttempts);
        const codeStatus = computeOverall(codeConduiteAttempts);
        const villeStatus = computeOverall(tourVilleAttempts);
        const generalStatus = computeGeneral(creneauxStatus, codeStatus, villeStatus);
        
        setEpreuvesStatus(generalStatus);
        console.log('✅ EtapeAccordion - Statut des épreuves chargé:', {
          creneaux: creneauxStatus,
          code: codeStatus,
          ville: villeStatus,
          general: generalStatus
        });
      } catch (error: any) {
        console.error('❌ EtapeAccordion - Erreur lors du chargement du statut des épreuves:', error);
        setEpreuvesStatus('non_saisi');
      } finally {
        setLoadingEpreuves(false);
      }
    };

    loadEpreuvesStatus();
  }, [isEnvoiDossierExamen, dossierId]);

  // Écouter l'événement de création de programme session
  React.useEffect(() => {
    const handleProgrammeSessionCreated = (event: CustomEvent) => {
      if (event.detail?.dossierId === dossierId) {
        setProgrammeSessionCreated(true);
        // Recharger le statut après un délai
        setTimeout(() => {
          if (dossierId && isEnvoiDossierExamen) {
            const loadEpreuvesStatus = async () => {
              try {
                setLoadingEpreuves(true);
                const response = await axiosClient.get('/resultats', {
                  params: { dossier_id: dossierId }
                });
                const resultats = Array.isArray(response.data?.data) ? response.data.data : [];
                
                if (resultats.length === 0) {
                  setEpreuvesStatus('non_saisi');
                  return;
                }
                
                const creneauxAttempts: EpreuveAttempt[] = [];
                const codeConduiteAttempts: EpreuveAttempt[] = [];
                const tourVilleAttempts: EpreuveAttempt[] = [];
                
                resultats.forEach((resultat: any) => {
                  const attempt: EpreuveAttempt = {
                    result: resultat.statut as EpreuveStatut,
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
                
                creneauxAttempts.sort((a, b) => {
                  const dateA = a.date ? new Date(a.date).getTime() : 0;
                  const dateB = b.date ? new Date(b.date).getTime() : 0;
                  return dateA - dateB;
                });
                codeConduiteAttempts.sort((a, b) => {
                  const dateA = a.date ? new Date(a.date).getTime() : 0;
                  const dateB = b.date ? new Date(b.date).getTime() : 0;
                  return dateA - dateB;
                });
                tourVilleAttempts.sort((a, b) => {
                  const dateA = a.date ? new Date(a.date).getTime() : 0;
                  const dateB = b.date ? new Date(b.date).getTime() : 0;
                  return dateA - dateB;
                });
                
                const creneauxStatus = computeOverall(creneauxAttempts);
                const codeStatus = computeOverall(codeConduiteAttempts);
                const villeStatus = computeOverall(tourVilleAttempts);
                const generalStatus = computeGeneral(creneauxStatus, codeStatus, villeStatus);
                
                setEpreuvesStatus(generalStatus);
              } catch (error) {
                console.error('Erreur lors du rechargement du statut:', error);
              } finally {
                setLoadingEpreuves(false);
              }
            };
            loadEpreuvesStatus();
          }
        }, 1000);
      }
    };
    
    window.addEventListener('programmeSessionCreated', handleProgrammeSessionCreated as EventListener);
    return () => {
      window.removeEventListener('programmeSessionCreated', handleProgrammeSessionCreated as EventListener);
    };
  }, [dossierId, isEnvoiDossierExamen]);

  // Mettre le statut du dossier à EN_ATTENTE_PAIEMENT (sans compléter l'étape)
  const handleSetEnAttentePaiement = React.useCallback(async () => {
    if (!dossierId) return;
    try {
      setSettingEnAttentePaiement(true);
      await circuitSuiviService.updateDossierStatut(dossierId, 'EN_ATTENTE_PAIEMENT');
      toast.success('Statut du dossier mis à jour : En attente de paiement');
      window.dispatchEvent(new CustomEvent('circuitReload', { detail: { dossierId } }));
      onDossierStatutUpdated?.();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Erreur lors de la mise à jour du statut';
      toast.error(message);
    } finally {
      setSettingEnAttentePaiement(false);
    }
  }, [dossierId, onDossierStatutUpdated]);

  const handleVerifierPaiement = React.useCallback(async () => {
    const ref = referencePaiement.trim();
    if (!ref) {
      toast.error('Veuillez saisir un code de paiement');
      return;
    }
    try {
      setVerifyingPaiement(true);
      const checkResponse = await axiosClient.get(`/dossiers/${dossierId}/check-paiement`, { params: { code: ref } });
      const { paid, message } = checkResponse.data as { paid: boolean; message?: string };
      if (paid) {
        setPaiementVerifie(true);
        toast.success('Paiement vérifié. Vous pouvez maintenant passer à l\'étape suivante.');
      } else {
        toast.error('Paiement en attente de validation');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur réseau lors de la vérification du paiement';
      const errPayload = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: unknown } }).response?.data
        : null;
      const jsonPreview = errPayload != null ? JSON.stringify(errPayload, null, 2) : message;
      toast.error(
        () => (
          <Box component="span" sx={{ display: 'block', textAlign: 'left' }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              Paiement Non Effectué
            </Typography>
            <Box component="pre" sx={{ fontSize: '0.7rem', maxHeight: 180, overflow: 'auto', m: 0, p: 1, bgcolor: 'action.hover', borderRadius: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {typeof jsonPreview === 'string' ? jsonPreview : JSON.stringify(errPayload, null, 2)}
            </Box>
          </Box>
        ),
        { duration: 12000 }
      );
    } finally {
      setVerifyingPaiement(false);
    }
  }, [referencePaiement, dossierId]);

  const handleInitierPaiementMoov = React.useCallback(async () => {
    const normalized = moovNumero.replace(/\D/g, '');
    if (!dossierId || !normalized) {
      toast.error('Veuillez saisir le numéro');
      return;
    }
    if (!MOOV_NUMERO_REGEX.test(normalized)) {
      toast.error('Le numéro doit être au format 241XXXXXXXX (241 + 8 chiffres), ex: 24177123456');
      return;
    }
    setMoovSubmitting(true);
    try {
      await axiosClient.post(`/dossiers/${dossierId}/initier-paiement-moov`, { numero: normalized });
      toast.success('Paiement Moov Money initié');
      setMoovModalOpen(false);
      setMoovNumero('');
      onDossierStatutUpdated?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erreur lors de l\'initiation du paiement';
      toast.error(msg);
    } finally {
      setMoovSubmitting(false);
    }
  }, [dossierId, moovNumero, onDossierStatutUpdated]);

  const handleImprimerCodePaiement = React.useCallback(() => {
    const code = (codePaiement ?? referencePaiement)?.trim();
    if (!code) {
      toast.error('Aucun code de paiement à imprimer');
      return;
    }
    const ref = dossierInfoPourImpression?.reference || dossierId || '—';
    const nom = dossierInfoPourImpression?.candidatNom || '—';
    const prenom = dossierInfoPourImpression?.candidatPrenom || '—';
    const categoriePermis = dossierInfoPourImpression?.categoriePermis || 'la catégorie du permis concernée par ce dossier';
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const logoUrl = `${window.location.origin}/assets/img/mtt.png`;
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Code de paiement - ${ref}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 16px; font-size: 0.85rem; }
    .bar-vert-jaune-bleu { display: flex; height: 8px; margin: 0 -16px 12px -16px; }
    .bar-vert-jaune-bleu span { flex: 1; }
    .bar-vert { background: #009739; }
    .bar-jaune { background: #FCD116; }
    .bar-bleu { background: #003DA5; }
    .header-print { text-align: center; margin-bottom: 1.5rem; }
    .header-print img { max-width: 180px; height: auto; display: block; margin: 0 auto 0.5rem; }
    h1 { font-size: 1.05rem; margin-bottom: 0.75rem; border-bottom: 2px solid #333; padding-bottom: 0.35rem; }
    .code { font-size: 1.35rem; font-weight: bold; letter-spacing: 0.1em; margin: 0.75rem 0; padding: 0.5rem 0.75rem; background: #f5f5f5; text-align: center; border: 2px dashed #333; }
    .info { margin: 0.35rem 0; }
    .label { font-weight: bold; color: #555; }
    .instruction { margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: #fff3cd; border-left: 4px solid #856404; font-size: 0.75rem; line-height: 1.4; }
    .parcours { margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: #f0f7ff; border-left: 4px solid #1976d2; font-size: 0.7rem; line-height: 1.35; }
    .parcours ol { margin: 0.25rem 0 0 1rem; padding: 0; }
    .parcours li { margin-bottom: 0.15rem; }
    .footer { margin-top: 0.75rem; font-size: 0.7rem; color: #666; }
  </style>
</head>
<body>
  <div class="bar-vert-jaune-bleu">
    <span class="bar-vert"></span><span class="bar-jaune"></span><span class="bar-bleu"></span>
  </div>
  <div class="header-print">
    <img src="${logoUrl}" alt="Ministère des Transports, de la Marine Marchande et de la Logistique" />
  </div>
  <h1>Code de paiement – Frais de dossier</h1>
  <div class="info"><span class="label">Référence dossier :</span> ${ref}</div>
  <div class="info"><span class="label">Candidat :</span> ${prenom} ${nom}</div>
  <div class="info"><span class="label">Date :</span> ${dateStr}</div>
  <p class="label">Code de paiement à communiquer :</p>
  <div class="code">${code}</div>
  <div class="instruction">
    <strong>À remettre à l'usager.</strong><br><br>
    Ce code de paiement permet de régler les <strong>frais de dossier</strong> pour le permis de catégorie <strong>${categoriePermis}</strong>. Ce code est <strong>valable une seule fois</strong> et ne peut être utilisé qu'une fois pour finaliser le paiement.
  </div>
  <div class="parcours">
    <strong>Parcours de paiement (Moov Money / Airtel Money) :</strong>
    <ol>
      <li>Composer <strong>*150#</strong></li>
      <li>Sélectionner <strong>8 – Gouvernement</strong></li>
      <li>Sélectionner <strong>2 – Transport et Mobilité</strong></li>
      <li>Sélectionner <strong>1 – Rengus</strong></li>
      <li>Choisir la <strong>pièce d'identité</strong> avec laquelle le dossier a été créé</li>
      <li>Saisir le <strong>numéro de la pièce d'identité</strong></li>
      <li>À l'étape « Numéro de paiement », saisir le code suivant : <strong>${code}</strong></li>
    </ol>
  </div>
  <div class="footer">Document généré le ${dateStr} – À conserver jusqu'au paiement.</div>
</body>
</html>`;
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Autorisez les pop-ups pour imprimer');
      return;
    }
    win.document.write(printContent);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.onafterprint = () => win.close();
    }, 250);
  }, [codePaiement, referencePaiement, dossierId, dossierInfoPourImpression]);

  // Fonction pour obtenir le libellé du statut
  const getStatutLabel = (statut: EpreuveStatut | null): string => {
    if (!statut) return 'Non chargé';
    switch (statut) {
      case 'reussi': return 'Validé';
      case 'echoue': return 'Échoué';
      case 'absent': return 'Absent';
      case 'non_saisi':
      default: return 'Non saisi';
    }
  };

  // Fonction pour obtenir la couleur du statut
  const getStatutColor = (statut: EpreuveStatut | null): 'success' | 'error' | 'warning' | 'default' => {
    if (!statut) return 'default';
    switch (statut) {
      case 'reussi': return 'success';
      case 'echoue': return 'error';
      case 'absent': return 'warning';
      case 'non_saisi':
      default: return 'default';
    }
  };
  
  // Mapping mémoire uniquement (pas de localStorage)
  const { documentPieceMapping } = useDocumentPieceMapping();

  // Normalise les documents : piece_justification_id vient directement de l'API,
  // avec fallback sur le mapping mémoire (événement documentUploaded de la session).
  const normalizedDocuments = useMemo(() => {
    return documentsForCurrentDossier.map(doc => {
      const apiPieceId = doc.piece_justification_id || null;
      const memoryMappedId = doc.id ? (documentPieceMapping.get(doc.id) ?? null) : null;
      const finalPieceId = apiPieceId || memoryMappedId;
      return {
        ...doc,
        piece_justification_id: finalPieceId,
        valide: doc.is_simulated ? (doc.valide !== undefined ? doc.valide : false) : doc.valide,
      };
    });
  }, [documentsForCurrentDossier, documentPieceMapping]);

  // Effect pour récupérer les pièces justificatives en local uniquement si non fournies par le parent
  React.useEffect(() => {
    if (piecesJustificativesMapFromParent !== undefined) return;

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
          if (Array.isArray(response.data)) {
            allPieces = response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            allPieces = response.data.data;
          } else if (response.data.data && !Array.isArray(response.data.data)) {
            allPieces = [response.data.data];
          } else {
            allPieces = [response.data];
          }
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
  }, [documentsForCurrentDossier, piecesJustificativesMapFromParent]);

  // Toutes les pièces (tous types) ont au moins un document uploadé (conservé pour usage futur / cohérence avec areAllRequiredPiecesUploaded)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const areAllPiecesUploaded = useMemo(() => {
    if (!etape.pieces || etape.pieces.length === 0) return false;
    return etape.pieces.every((piece: PieceEtape) => {
      const pieceJustificationId = piece.type_document;
      return normalizedDocuments.some((d: any) => {
        if (d.etape_id && d.etape_id !== etape.id) return false;
        const docPieceId = d.piece_justification_id;
        if (d.is_simulated && docPieceId && String(docPieceId) === String(pieceJustificationId)) return true;
        const pieceJustificativeData = docPieceId ? piecesJustificativesMap.get(docPieceId) : null;
        const docPieceJustificationLibelle = pieceJustificativeData?.libelle || null;
        const referentiel = typeDocuments.find((td: any) => td.id === pieceJustificationId);
        const referentielLibelle = referentiel?.libelle || referentiel?.name || null;
        if (docPieceJustificationLibelle && referentielLibelle && docPieceJustificationLibelle.toLowerCase().trim() === referentielLibelle.toLowerCase().trim()) return true;
        if (docPieceId && (String(docPieceId) === String(pieceJustificationId) || d.type_document_id === pieceJustificationId)) return true;
        return false;
      });
    });
  }, [etape.pieces, etape.id, normalizedDocuments, typeDocuments, piecesJustificativesMap]);

  // Seules les pièces obligatoires sont téléversées → étape débloquée, bouton "Passer à l'étape suivante" visible
  const areAllRequiredPiecesUploaded = useMemo(() => {
    const requiredPieces = etape.pieces?.filter((p: PieceEtape) => p.obligatoire) ?? [];
    if (requiredPieces.length === 0) return true;
    return requiredPieces.every((piece: PieceEtape) => {
      const pieceJustificationId = piece.type_document;
      return normalizedDocuments.some((d: any) => {
        if (d.etape_id && d.etape_id !== etape.id) return false;
        const docPieceId = d.piece_justification_id;
        if (d.is_simulated && docPieceId && String(docPieceId) === String(pieceJustificationId)) return true;
        const pieceJustificativeData = docPieceId ? piecesJustificativesMap.get(docPieceId) : null;
        const docPieceJustificationLibelle = pieceJustificativeData?.libelle || null;
        const referentiel = typeDocuments.find((td: any) => td.id === pieceJustificationId);
        const referentielLibelle = referentiel?.libelle || referentiel?.name || null;
        if (docPieceJustificationLibelle && referentielLibelle && docPieceJustificationLibelle.toLowerCase().trim() === referentielLibelle.toLowerCase().trim()) return true;
        if (docPieceId && (String(docPieceId) === String(pieceJustificationId) || d.type_document_id === pieceJustificationId)) return true;
        return false;
      });
    });
  }, [etape.pieces, etape.id, normalizedDocuments, typeDocuments, piecesJustificativesMap]);

  const isAdmin = isAdminRole(userRole);
  const canBypassPaiementSansCode = canBypassPaymentVerification(userRole);
  const isAutoEcoleWithAllUploaded = userRole === 'ROLE_AUTO_ECOLE' && !isEtapeWithoutPieces && areAllRequiredPiecesUploaded && (isPreviousEtapeCompleted || isFirstEtape);
  // Admin : toujours autorisé à voir et activer le bouton, quelles que soient les pièces
  const effectiveShouldShowButton = isAdmin || shouldShowButton || isAutoEcoleWithAllUploaded;
  const effectiveIsButtonEnabled = isAdmin || isButtonEnabled || (userRole === 'ROLE_AUTO_ECOLE' && !isEtapeWithoutPieces && areAllRequiredPiecesUploaded);

  const headerRow = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', mr: 2 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: etapeStatus.status === 'completed' ? 'success.main' :
                              etapeStatus.status === 'in_progress' ? 'warning.main' : 'grey.300',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.875rem'
            }}
          >
            {index + 1}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" fontWeight="bold" className="font-display">
                {etape.libelle}
              </Typography>
              <Chip
                label={etapeStatus.label}
                size="small"
                color={etapeStatus.color}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
            {etape.statut_libelle && (
              <Typography variant="caption" color="text.secondary" className="font-primary">
                Statut: {etape.statut_libelle}
              </Typography>
            )}
          </Box>
          {etapeStatus.status === 'completed' ? (
            <CheckCircleIcon className="w-6 h-6 text-green-600" />
          ) : etapeStatus.status === 'in_progress' ? (
            <ClockIcon className="w-6 h-6 text-orange-600" />
          ) : (
            <XCircleIcon className="w-6 h-6 text-gray-400" />
          )}
          {isEtapePaiement && authorized && isDossierPaymentPhase && !paiementVerifie && !isEtapeCompleted && !computedCompletedEtapes.has(etape.id) && !completedEtapes.has(etape.id) && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setMoovModalOpen(true);
              }}
              startIcon={
                <Box
                  component="img"
                  src="/assets/img/moovmoney.png"
                  alt="Moov Money"
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              }
              sx={{ textTransform: 'none', ml: 'auto', flexShrink: 0 }}
            >
              Payer par Moov Money
            </Button>
          )}
        </Box>
  );

  const stepStack = (
        <Stack spacing={2}>
          {/* Informations détaillées de l'étape */}
          <Box>
            <Typography variant="body2" color="text.secondary" className="font-primary" gutterBottom>
              Informations de l'étape
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              
            
              {etape.created_at && (
                <Box>
                  <Typography variant="caption" color="text.secondary" className="font-primary">
                    Créée le
                  </Typography>
                  <Typography variant="body2" className="font-primary">
                    {new Date(etape.created_at).toLocaleDateString('fr-FR')}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          {/* Pièces justificatives (affiché uniquement s'il y a des pièces) */}
          {etape.pieces && etape.pieces.length > 0 && (
            <Box>
              <Typography variant="body2" fontWeight="bold" className="font-display" gutterBottom>
                Pièces justificatives requises ({etape.pieces.length})
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {etape.pieces.map((piece: PieceEtape, pieceIndex: number) => {
                  const pieceJustificationId = piece.type_document;
                  const pieceId = `${etape.id}-${piece.type_document}`;
                  
                  const typeDoc = typeDocuments.find(td => 
                    td.id === piece.type_document || td.name === piece.type_document
                  );
                  const typeDocName = typeDoc?.name || typeDoc?.libelle || piece.libelle || piece.type_document;
                  
                  // Chercher les documents qui correspondent à cette pièce
                  // IMPORTANT: Prendre en compte les documents simulés qui ont déjà le bon piece_justification_id
                  let doc = normalizedDocuments.find(d => {
                    // Filtrer par etape_id si disponible (optimisation)
                    if (d.etape_id && d.etape_id !== etape.id) {
                      return false; // Le document appartient à une autre étape
                    }
                    
                    const docPieceId = d.piece_justification_id;
                    
                    if (d.is_simulated && docPieceId) {
                      if (String(docPieceId) === String(pieceJustificationId)) {
                        console.log('✅ EtapeAccordion - Document simulé trouvé par piece_justification_id:', {
                          pieceTypeDocument: pieceJustificationId,
                          pieceLibelle: piece.libelle,
                          docId: d.id,
                          docNom: d.nom_fichier || d.nom,
                          docPieceId: docPieceId,
                          isSimulated: true,
                          matches: true
                        });
                        return true;
                      }
                    }
                    
                    // Récupérer les données de la PieceJustificative depuis la map locale
                    const pieceJustificativeData = docPieceId ? piecesJustificativesMap.get(docPieceId) : null;
                    const docPieceJustificationLibelle = pieceJustificativeData?.libelle || null;
                    
                    // Récupérer le Referentiel correspondant à pieceJustificationId (qui est le type_document_id)
                    const referentiel = typeDocuments.find(td => td.id === pieceJustificationId);
                    const referentielLibelle = referentiel?.libelle || referentiel?.name || null;
                    
                    // Comparaison par libelle : PieceJustificative.libelle === Referentiel.libelle
                    if (docPieceJustificationLibelle && referentielLibelle && 
                        docPieceJustificationLibelle.toLowerCase().trim() === referentielLibelle.toLowerCase().trim()) {
                      console.log('✅ EtapeAccordion - Document trouvé par libelle:', {
                        pieceTypeDocument: pieceJustificationId,
                        pieceLibelle: piece.libelle,
                        docId: d.id,
                        docNom: d.nom_fichier || d.nom,
                        docPieceJustificationLibelle: docPieceJustificationLibelle,
                        referentielLibelle: referentielLibelle,
                        docPieceId: docPieceId,
                        isSimulated: d.is_simulated,
                        matches: true
                      });
                      return true;
                    }
                    
                    // Fallback: Comparaison directe par piece_justification_id ou type_document_id
                    if (docPieceId && (String(docPieceId) === String(pieceJustificationId) || 
                        d.type_document_id === pieceJustificationId)) {
                      return true;
                    }
                    
                    return false;
                  });
                  
                  // Construire le tableau de documents pour cette pièce (compatible avec PieceCard)
                  const docsForPiece = doc ? [doc] : [];
                  
                  // Log pour déboguer
                  if (doc) {
                    console.log('✅ EtapeAccordion - Document trouvé pour pièce:', {
                      pieceTypeDocument: pieceJustificationId,
                      pieceLibelle: piece.libelle,
                      docId: doc.id,
                      docNom: doc.nom_fichier || doc.nom,
                      docPieceId: doc.piece_justification_id,
                      matches: true
                    });
                  } else {
                    // Log détaillé pour comprendre pourquoi aucun document n'est trouvé
                    const documentsWithPieceIds = normalizedDocuments.map(d => ({
                      id: d.id,
                      nom: d.nom_fichier || d.nom,
                      pieceIdFromAPI: d.piece_justification_id,
                      typeDocumentId: d.type_document_id,
                      etapeId: d.etape_id,
                      matchesPiece: d.piece_justification_id === pieceJustificationId,
                      matchesPieceString: String(d.piece_justification_id) === String(pieceJustificationId)
                    }));
                    
                    console.log('❌ EtapeAccordion - Aucun document trouvé pour pièce:', {
                      pieceTypeDocument: pieceJustificationId,
                      pieceLibelle: piece.libelle,
                      etapeId: etape.id,
                      etapeLibelle: etape.libelle,
                      totalDocuments: normalizedDocuments.length,
                      documentsWithPieceIds: documentsWithPieceIds,
                      comparison: {
                        pieceJustificationId,
                        pieceJustificationIdString: String(pieceJustificationId),
                        documentsPieceIds: documentsWithPieceIds.map(d => ({
                          fromAPI: d.pieceIdFromAPI,
                          matches: d.matchesPiece
                        }))
                      }
                    });
                  }
                  
                  // Utiliser directement docsForPiece (qui inclut déjà le fallback par type_document_id)
                  const docsForType = docsForPiece;
                  
                  const isValideTruthy = (v: unknown) =>
                    v === true || v === 1 || v === 'true' || (typeof v === 'boolean' && v) || (typeof v === 'number' && v !== 0);
                  const isValidated = isDocumentValidatedForPiece
                    ? isDocumentValidatedForPiece(piece)
                    : docsForPiece.length > 0 && docsForPiece.every(doc => isValideTruthy(doc.valide));
                  
                  const isUploading = uploadingForPiece === pieceId || uploading;
                  // Pour la première étape, elle est toujours accessible (pas d'étape précédente)
                  // Pour les autres étapes, vérifier si l'étape précédente est complétée
                  const isEtapeAccessible = isFirstEtape || isPreviousEtapeCompleted;
                  // Bouton de validation des documents réservé aux étapes ayant le rôle ROLE_CNEPC
                  const canShowValidation = etape.roles?.includes('ROLE_CNEPC') ?? false;
                  
                  return (
                    <PieceCard
                      key={pieceIndex}
                      piece={piece}
                      etape={etape}
                      typeDocName={typeDocName}
                      docsForType={docsForType}
                      isValidated={isValidated}
                      isUploading={isUploading}
                      isEtapeAccessible={isEtapeAccessible}
                      authorized={authorized}
                      dossierId={dossierId}
                      {...(canShowValidation ? { onUpdateDocument, onOpenValidationDialog } : {})}
                      onUploadClick={() => onUploadForPiece(piece, etape)}
                      onFileSelect={(e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        // Envoyer un seul fichier (le premier) pour éviter "Array to string conversion" côté API
                        const singleFile = files[0];
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(singleFile);
                        const syntheticEvent = {
                          ...e,
                          target: { ...e.target, files: dataTransfer.files }
                        } as React.ChangeEvent<HTMLInputElement>;
                        onFileSelectForPiece(syntheticEvent, piece, etape);
                        e.target.value = '';
                      }}
                      fileInputRef={(el) => {
                        if (el) {
                          fileInputRefs.current.set(pieceId, el);
                        } else {
                          fileInputRefs.current.delete(pieceId);
                        }
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>
          )}

          {/* Message si l'étape précédente n'est pas complétée */}
          {!isPreviousEtapeCompleted && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" className="font-primary">
                Cette étape est en attente. Veuillez compléter l'étape précédente : <strong>{previousEtape?.libelle}</strong>
              </Typography>
            </Alert>
          )}

          {/* Bouton "Mettre en attente de paiement" : masqué si étape complétée ou si dossier déjà envoyé (DOSSIER ENVOYER) */}
          {isEtapePaiement && authorized && dossierId && !isDossierPaymentPhase && !isEtapeCompleted && !computedCompletedEtapes.has(etape.id) && !completedEtapes.has(etape.id) && !isDossierStatutSentToCNEDDT(dossierStatut) && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" className="font-primary" gutterBottom>
                Marquer le dossier comme en attente de paiement (l'étape reste en cours).
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="medium"
                  disabled={settingEnAttentePaiement}
                  startIcon={settingEnAttentePaiement ? <CircularProgress size={16} /> : null}
                  onClick={handleSetEnAttentePaiement}
                  sx={{ textTransform: 'none' }}
                >
                  {settingEnAttentePaiement ? 'Mise à jour...' : 'Mettre le dossier en attente de paiement'}
                </Button>
              </Stack>
            </Box>
          )}

          {/* Vérification du paiement : affiché pour les étapes paiement quand le dossier est déjà EN_ATTENTE_PAIEMENT */}
          {isEtapePaiement && authorized && isDossierPaymentPhase && !paiementVerifie && !isEtapeCompleted && !computedCompletedEtapes.has(etape.id) && !completedEtapes.has(etape.id) && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              {(codePaiement ?? referencePaiement)?.trim() && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="medium"
                    onClick={handleImprimerCodePaiement}
                    sx={{ textTransform: 'none' }}
                  >
                    Imprimer le code de paiement
                  </Button>
                </Stack>
              )}
              <Typography variant="body2" color="text.secondary" className="font-primary" gutterBottom>
                Saisissez le code de paiement et vérifiez pour pouvoir passer à l'étape suivante.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start" sx={{ mt: 1 }}>
                <TextField
                  label="Code de paiement"
                  value={referencePaiement}
                  onChange={(e) => setReferencePaiement(e.target.value)}
                  placeholder="Ex: AB123456"
                  size="small"
                  disabled={verifyingPaiement}
                  sx={{ minWidth: 220 }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  size="medium"
                  disabled={!referencePaiement.trim() || verifyingPaiement}
                  startIcon={verifyingPaiement ? <CircularProgress size={16} /> : null}
                  onClick={handleVerifierPaiement}
                  sx={{ textTransform: 'none' }}
                >
                  {verifyingPaiement ? 'Vérification...' : 'Vérifier'}
                </Button>
                {canBypassPaiementSansCode && (
                  <Button
                    variant="outlined"
                    color="warning"
                    size="medium"
                    disabled={transmittingEtape === etape.id || (isLastEtape && sendingToCNEDDT)}
                    startIcon={(transmittingEtape === etape.id || (isLastEtape && sendingToCNEDDT)) ? <CircularProgress size={16} /> : null}
                    onClick={() => {
                      if (isLastEtape) {
                        onCompleteLastEtape(etape);
                      } else {
                        onTransmitToNextEtape(etape);
                      }
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    {(transmittingEtape === etape.id || (isLastEtape && sendingToCNEDDT))
                      ? 'Traitement...'
                      : isLastEtape
                        ? 'Finaliser sans vérifier le paiement'
                        : 'Compléter sans vérifier le paiement'}
                  </Button>
                )}
              </Stack>
            </Box>
          )}

          {/* Message succès vérification paiement */}
          {isEtapePaiement && paiementVerifie && !isEtapeCompleted && !computedCompletedEtapes.has(etape.id) && !completedEtapes.has(etape.id) && (
            <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircleIcon className="w-5 h-5" />}>
              Paiement vérifié. Vous pouvez passer à l'étape suivante.
            </Alert>
          )}

          {/* Statut des résultats pour l'étape ENVOI DOSSIER POUR EXAMEN */}
          {isEnvoiDossierExamen && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold" className="font-display">
                  Statut des résultats d'examen
                </Typography>
                {loadingEpreuves ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary" className="font-primary">
                      Chargement du statut...
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Chip
                      label={getStatutLabel(epreuvesStatus)}
                      color={getStatutColor(epreuvesStatus)}
                      size="medium"
                      variant={epreuvesStatus === 'non_saisi' ? 'outlined' : 'filled'}
                    />
                    <Typography variant="body2" color="text.secondary" className="font-primary">
                      {epreuvesStatus === 'reussi' && '✅ Toutes les épreuves sont validées'}
                      {epreuvesStatus === 'echoue' && '❌ Au moins une épreuve est échouée'}
                      {epreuvesStatus === 'absent' && '⚠️ Au moins un candidat est absent'}
                      {epreuvesStatus === 'non_saisi' && '📝 En attente de saisie des résultats'}
                    </Typography>
                  </Box>
                )}
                {!programmeSessionCreated && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2" className="font-primary">
                      Veuillez envoyer le dossier à l'examen pour commencer le processus.
                    </Typography>
                  </Alert>
                )}
                {programmeSessionCreated && epreuvesStatus !== 'reussi' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2" className="font-primary">
                      Le dossier a été envoyé à l'examen. Vous devez attendre que toutes les épreuves soient validées avant de pouvoir passer à l'étape suivante.
                    </Typography>
                  </Alert>
                )}
              </Paper>
            </Box>
          )}

          {/* Bouton pour passer à l'étape suivante : à une étape paiement, affiché quand le dossier est EN_ATTENTE_PAIEMENT ; sinon selon effectiveShouldShowButton */}
          {(isEtapePaiement ? (isDossierPaymentPhase && authorized) : (effectiveShouldShowButton && authorized)) && (
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="body2" fontWeight="bold" className="font-display" gutterBottom>
                    {(isEtapeCompleted || computedCompletedEtapes.has(etape.id) || completedEtapes.has(etape.id)) 
                      ? 'Étape terminée' 
                      : (isEtapePaiement && isDossierPaymentPhase)
                        ? (paiementVerifie ? 'Dossier en attente de paiement - Prêt à compléter l\'étape' : 'Vérifiez le paiement pour continuer')
                        : effectiveIsButtonEnabled 
                          ? (isLastEtape ? (isAutoEcoleWithAllUploaded ? 'Tous les documents sont uploadés - Dernière étape' : 'Toutes les pièces sont validées - Dernière étape') : (isAutoEcoleWithAllUploaded ? 'Tous les documents sont uploadés' : 'Toutes les pièces sont validées')) 
                          : 'En attente de validation des pièces'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" className="font-primary">
                    {(isEtapeCompleted || computedCompletedEtapes.has(etape.id) || completedEtapes.has(etape.id))
                      ? 'Cette étape est déjà complétée'
                      : isLastEtape 
                        ? 'Finaliser cette étape' 
                        : 'Passer à l\'étape suivante'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {/* Bouton "Envoyer à l'examen" : envoie le dossier vers l'examen (CandidatExamenTable) sans compléter l'étape ; n'affiche pas "Passer à l'étape suivante" */}
                  {isEnvoiDossierExamen && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={transmittingEtape === etape.id ? <CircularProgress size={16} /> : <CheckCircleIcon className="w-5 h-5" />}
                      onClick={() => onTransmitToNextEtape(etape)}
                      disabled={
                        transmittingEtape === etape.id ||
                        programmeSessionCreated ||
                        epreuvesStatus === 'reussi' ||
                        !dossierId ||
                        !circuit?.id ||
                        isEtapeCompleted ||
                        computedCompletedEtapes.has(etape.id) ||
                        completedEtapes.has(etape.id)
                      }
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        opacity: programmeSessionCreated || epreuvesStatus === 'reussi' ? 0.6 : 1
                      }}
                    >
                      {transmittingEtape === etape.id ? 'Traitement...' : 'Envoyer à l\'examen'}
                    </Button>
                  )}
                  
                  {/* Bouton "Passer à l'étape suivante" : pour l'étape ENVOI DOSSIER EXAMEN, visible uniquement quand le statut global des épreuves est validé (reussi) */}
                  {(!isEnvoiDossierExamen || epreuvesStatus === 'reussi') && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={(transmittingEtape === etape.id || (isLastEtape && sendingToCNEDDT)) ? <CircularProgress size={16} /> : <CheckCircleIcon className="w-5 h-5" />}
                    onClick={() => {
                      if (isLastEtape) {
                        onCompleteLastEtape(etape);
                      } else {
                        onTransmitToNextEtape(etape);
                      }
                    }}
                    disabled={
                      transmittingEtape === etape.id ||
                      (isLastEtape && sendingToCNEDDT) ||
                      !dossierId ||
                      !circuit?.id ||
                      isEtapeCompleted ||
                      computedCompletedEtapes.has(etape.id) ||
                      completedEtapes.has(etape.id) ||
                      (isEnvoiDossierExamen && epreuvesStatus !== 'reussi') ||
                      (isEtapePaiement && isDossierPaymentPhase && !paiementVerifie) ||
                      (!(isEtapePaiement && isDossierPaymentPhase) && !effectiveIsButtonEnabled)
                    }
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      opacity: (effectiveIsButtonEnabled || (isEtapePaiement && isDossierPaymentPhase && paiementVerifie)) && !isEtapeCompleted && !computedCompletedEtapes.has(etape.id) && !completedEtapes.has(etape.id) && (!isEnvoiDossierExamen || epreuvesStatus === 'reussi') ? 1 : 0.6
                    }}
                  >
                    {transmittingEtape === etape.id
                      ? 'Traitement...'
                      : isLastEtape && sendingToCNEDDT
                        ? 'Envoi en cours...'
                        : isLastEtape
                          ? 'Finaliser le dossier'
                          : 'Passer à l\'étape suivante'}
                  </Button>
                  )}
                </Box>
              </Box>
            </Box>
          )}
          
          {/* Message si l'utilisateur n'est pas autorisé */}
          {!authorized && etape.roles && etape.roles.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2" className="font-primary">
                Votre rôle ({userRole || 'Non défini'}) ne vous autorise pas à effectuer des actions sur cette étape. 
                Rôles autorisés : {etape.roles.join(', ')}
              </Typography>
            </Alert>
          )}
          
          {/* Message de confirmation si l'étape est complétée */}
          {(computedCompletedEtapes.has(etape.id) || completedEtapes.has(etape.id)) && (
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <Box>
                  <Typography variant="body2" fontWeight="bold" className="font-display" color="success.main">
                    Étape complétée
                  </Typography>
                  <Typography variant="caption" color="text.secondary" className="font-primary">
                    Cette étape est terminée
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* Modal Paiement Moov Money */}
          <Dialog open={moovModalOpen} onClose={() => !moovSubmitting && setMoovModalOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Payer par Moov Money</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Saisissez le numéro Moov Money pour initier le paiement.
              </Typography>
              <TextField
                label="Numéro"
                value={moovNumero}
                onChange={(e) => setMoovNumero(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="24177123456"
                fullWidth
                size="small"
                disabled={moovSubmitting}
                error={!!moovNumero && !isMoovNumeroValide}
                helperText={!!moovNumero && !isMoovNumeroValide ? 'Format attendu : 241 + 8 chiffres (ex: 24177123456)' : undefined}
                inputProps={{ maxLength: 11, inputMode: 'numeric' }}
                sx={{ mt: 1 }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setMoovModalOpen(false)} disabled={moovSubmitting}>
                Annuler
              </Button>
              <Button
                variant="contained"
                onClick={handleInitierPaiementMoov}
                disabled={moovSubmitting || !isMoovNumeroValide}
                startIcon={moovSubmitting ? <CircularProgress size={16} /> : null}
              >
                {moovSubmitting ? 'Envoi...' : 'Initier le paiement'}
              </Button>
            </DialogActions>
          </Dialog>

        </Stack>
  );

  if (presentation === 'wizard') {
    const progLabel = wizardProgress
      ? `Étape ${wizardProgress.current} sur ${wizardProgress.total}`
      : `Étape ${index + 1}`;
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2.25,
            background: (t) =>
              isEtapePaiement
                ? `linear-gradient(115deg, ${t.palette.warning.dark} 0%, ${t.palette.warning.main} 50%, ${t.palette.secondary.main} 100%)`
                : isEnvoiDossierExamen
                  ? 'linear-gradient(115deg, #01579b 0%, #0277bd 50%, #039be5 100%)'
                  : etape.pieces && etape.pieces.length > 0
                    ? `linear-gradient(115deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 50%, ${t.palette.info.light} 100%)`
                    : `linear-gradient(115deg, ${t.palette.grey[800]} 0%, ${t.palette.grey[700]} 100%)`,
            color: 'common.white',
          }}
        >
          <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 1, display: 'block', mb: 0.5 }}>
            {progLabel}
          </Typography>
          <Stack direction="row" alignItems="flex-start" spacing={2}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'common.white',
                fontWeight: 800,
                fontSize: '1.1rem',
                flexShrink: 0,
              }}
            >
              {index + 1}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.3, wordBreak: 'break-word' }}>
                {etape.libelle}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }} useFlexGap>
                <Chip
                  label={etapeStatus.label}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'common.white',
                    borderColor: 'rgba(255,255,255,0.35)',
                  }}
                  variant="outlined"
                />
                {etape.statut_libelle && (
                  <Chip
                    label={etape.statut_libelle}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.7rem', color: 'common.white', borderColor: 'rgba(255,255,255,0.45)' }}
                  />
                )}
              </Stack>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              {etapeStatus.status === 'completed' ? (
                <CheckCircleIcon className="w-8 h-8" style={{ opacity: 0.95 }} />
              ) : etapeStatus.status === 'in_progress' ? (
                <ClockIcon className="w-8 h-8" style={{ opacity: 0.95 }} />
              ) : (
                <XCircleIcon className="w-8 h-8" style={{ opacity: 0.85 }} />
              )}
              {isEtapePaiement && authorized && isDossierPaymentPhase && !paiementVerifie && !isEtapeCompleted && !computedCompletedEtapes.has(etape.id) && !completedEtapes.has(etape.id) && (
                <Button
                  variant="contained"
                  color="inherit"
                  size="medium"
                  onClick={() => setMoovModalOpen(true)}
                  startIcon={
                    <Box
                      component="img"
                      src="/assets/img/moovmoney.png"
                      alt="Moov Money"
                      sx={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  }
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    bgcolor: 'rgba(255,255,255,0.95)',
                    color: 'text.primary',
                    '&:hover': { bgcolor: 'common.white' },
                  }}
                >
                  Moov Money
                </Button>
              )}
            </Box>
          </Stack>
        </Box>
        <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: (t) => (t.palette.mode === 'dark' ? 'grey.900' : 'grey.50') }}>
          {stepStack}
        </Box>
      </Paper>
    );
  }

  return (
    <Accordion
      key={etape.id}
      expanded={expanded}
      onChange={onChange}
      sx={{
        border: '1px solid',
        borderColor: etapeStatus.status === 'completed' ? 'success.main' :
                     etapeStatus.status === 'in_progress' ? 'warning.main' : 'divider',
        borderRadius: 1,
        '&:before': { display: 'none' }
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: etapeStatus.status === 'completed' ? 'success.50' :
                          etapeStatus.status === 'in_progress' ? 'warning.50' : 'background.paper',
          '&:hover': {
            backgroundColor: etapeStatus.status === 'completed' ? 'success.100' :
                            etapeStatus.status === 'in_progress' ? 'warning.100' : 'action.hover'
          }
        }}
      >
        {headerRow}
      </AccordionSummary>
      <AccordionDetails>
        {stepStack}
      </AccordionDetails>
    </Accordion>
  );
};
