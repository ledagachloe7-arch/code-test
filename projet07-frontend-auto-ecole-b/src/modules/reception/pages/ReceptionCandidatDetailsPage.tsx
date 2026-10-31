import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  Container,
  Breadcrumbs,
  Link,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Fade,
  Fab,
  Drawer
} from '@mui/material';
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { ROUTES } from '../../../shared/constants';
import { useReceptionCandidatDetails, type CandidatDetailsCacheEntry as HookCacheEntry } from '../hooks/useReceptionCandidatDetails';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import { handleViewDocument, handleDownloadDocument } from '../utils/documentHandlers';
import { circuitSuiviService } from '../services/circuit-suivi.service';
import type { EtapeCircuit } from '../types/circuit-etapes.types';
import { useAppStore } from '../../../store';
import { useReceptionCache } from '../tables/ReceptionDossierTypeTable/context';
import { useReceptionCandidatDetailsData } from './ReceptionCandidatDetailsPage/ReceptionCandidatDetailsDataContext';
import type { DocumentsCardProps } from '../components/DocumentsCard';
import axiosClient from '../../../shared/utils/axiosConfig';

const CandidatInfoCardLazy = lazy(() => import('../components/CandidatInfoCard'));
const AutoEcoleInfoCardLazy = lazy(() => import('../components/AutoEcoleInfoCard'));
const CircuitEtapesCardLazy = lazy(() => import('../components/CircuitEtapesCard'));
const DocumentsCardLazy = lazy(() => import('../components/DocumentsCard'));

// Composants Skeleton pour le chargement transparent
const CandidatInfoCardSkeleton = () => (
  <Fade in={true} timeout={300}>
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 1 }} />
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Skeleton variant="text" width="40%" height={24} />
          <Skeleton variant="text" width="40%" height={24} />
        </Box>
        <Skeleton variant="text" width="50%" height={20} />
      </CardContent>
    </Card>
  </Fade>
);

const AutoEcoleInfoCardSkeleton = () => (
  <Fade in={true} timeout={300}>
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Skeleton variant="text" width="50%" height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={100} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="text" width="70%" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" height={24} />
      </CardContent>
    </Card>
  </Fade>
);

const DocumentsCardSkeleton = () => (
  <Fade in={true} timeout={300}>
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
          ))}
        </Box>
      </CardContent>
    </Card>
  </Fade>
);

const CircuitEtapesCardSkeleton = () => (
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

const ReceptionCandidatDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const receptionNavState = location.state as { openToNextStep?: boolean; code_paiement?: string | null } | null | undefined;
  const openToNextStep = receptionNavState?.openToNextStep === true;
  const codePaiementHint = useMemo(() => {
    const c = receptionNavState?.code_paiement;
    return c != null && String(c).trim() !== '' ? String(c).trim() : undefined;
  }, [receptionNavState?.code_paiement]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [closingDossier, setClosingDossier] = useState(false);
  const [activeEtape, setActiveEtape] = useState<EtapeCircuit | null>(null);
  const [timelineHeaderContent, setTimelineHeaderContent] = useState<React.ReactNode>(null);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);

  const cache = useReceptionCache();
  const candidatDetailsData = useReceptionCandidatDetailsData();
  const cachedEntry = id ? candidatDetailsData.get(id) : undefined;
  const cacheOptions = useMemo(
    () =>
      id
        ? {
            initialData: (cachedEntry ?? undefined) as HookCacheEntry | undefined,
            onCacheUpdate: (data: HookCacheEntry) => {
              candidatDetailsData.set(id, data as Parameters<typeof candidatDetailsData.set>[1]);
            },
            codePaiementHint,
          }
        : undefined,
    [id, cachedEntry, candidatDetailsData, codePaiementHint]
  );

  useEffect(() => {
    setTimelineHeaderContent(null);
  }, [id]);

  const {
    loading,
    loadingDocuments,
    dossierComplet,
    dossier,
    epreuvesStatus,
    loadingEpreuves,
    circuit,
    loadingCircuit,
    typeDocuments,
    loadingTypeDocuments,
    documentsFromApi,
    chargerDocuments,
    chargerDossierComplet,
    formatFileSize,
    getDocumentsByType,
    getDocumentsForPiece,
    isDocumentValidated,
    isDocumentValidatedForPiece,
    pieceJustificationTypeMap,
    piecesJustificativesMap,
    loadingPiecesJustificatives
  } = useReceptionCandidatDetails(id, cacheOptions);

  const { uploading, fileInputRef, handleUploadNewDocument, handleFileSelect: handleFileSelectUpload } = useDocumentUpload({
    dossierId: id,
    formatFileSize,
    onUploadSuccess: async () => {
      await chargerDocuments();
      setSnackbar({
        open: true,
        message: 'Document uploadé avec succès',
        severity: 'success'
      });
    },
    onError: (message) => {
      setSnackbar({
        open: true,
        message,
        severity: 'error'
      });
    }
  });

  const { user } = useAppStore();
  const userRole = user?.role ?? (typeof localStorage !== 'undefined' ? (() => {
    try {
      const u = localStorage.getItem('user_data');
      return u ? (JSON.parse(u) as { role?: string })?.role : null;
    } catch { return null; }
  })() : null);
  // Réception des dossiers : auto-école → liste des demandes (élèves), CSAF → Finance,
  // Enregistreur → Gestion dossier (CNEPC), autres rôles → réception.
  const receptionListPath = userRole === 'ROLE_AUTO_ECOLE'
    ? `${ROUTES.ELEVES}/demandes`
    : userRole === 'ROLE_CSAF'
      ? (ROUTES.FINANCE || '/finance')
      : userRole === 'ROLE_ENREGISTREUR'
        ? (ROUTES.GESTION_DOSSIER || '/gestion-dossier')
      : (ROUTES.RECEPTION || '/reception');
  const receptionListLabel = userRole === 'ROLE_CSAF' ? 'Finance' : 'Réception des dossiers';

  // Documents du dossier courant (aligné avec le filtre dans DocumentsCard)
  const docs = (documentsFromApi ?? []).filter(
    (doc: any) => !doc?.documentable_id || doc.documentable_id === id
  );
  const isDocValidatedOrVerified = (doc: any) => {
    if (!doc) return false;
    const v = doc.valide;
    const verifie = doc.verifie ?? doc.verifiee;
    const valideOk = v === true || v === 1 || v === 'true' || (typeof v === 'boolean' && v) || (typeof v === 'number' && v !== 0);
    const verifieOk = verifie === true || verifie === 1 || verifie === 'true' || (typeof verifie === 'boolean' && verifie) || (typeof verifie === 'number' && verifie !== 0);
    return valideOk || verifieOk;
  };
  const allDocumentsValidatedOrVerified = docs.length > 0 && docs.every(isDocValidatedOrVerified);
  const hasUnvalidatedDocuments = docs.some((doc: any) => !isDocValidatedOrVerified(doc));
  // CNEPC, Admin et SEV : vérification des pièces via DocumentsCard avant d'afficher les étapes du circuit
  const mustVerifyDocumentsBeforeCircuit = userRole === 'ROLE_CNEPC' || userRole === 'ROLE_ADMIN' || userRole === 'ROLE_SEV' || (typeof userRole === 'string' && userRole.toLowerCase() === 'admin');
  const hideCircuitForCnepc = mustVerifyDocumentsBeforeCircuit && hasUnvalidatedDocuments;
  // DocumentsCard : jamais affichée pour ROLE_AUTO_ECOLE ; pour les autres rôles, masquée si tous les docs sont validés/vérifiés, sinon affichée pour CNEPC/Admin/SEV s'il reste des docs à valider ou si l'étape active a des pièces.
  const showDocumentsCard = userRole !== 'ROLE_AUTO_ECOLE' && !allDocumentsValidatedOrVerified && ((mustVerifyDocumentsBeforeCircuit && hasUnvalidatedDocuments) || (!mustVerifyDocumentsBeforeCircuit && !!(activeEtape?.pieces && activeEtape.pieces.length > 0)));

  // Utiliser les données complètes si disponibles, sinon utiliser les données du dossier (même source que CandidatInfoCard)
  const candidatData = dossierComplet?.candidat || dossier?.details?.candidat_complet || dossier?.details?.dossier?.candidat;
  const personne = candidatData?.personne || {};
  const formation = dossierComplet?.formation || dossier?.details?.formation_complete || dossier?.details?.dossier?.formation;
  const autoEcole = dossierComplet?.auto_ecole || dossier?.details?.auto_ecole_complete || {};

  // Infos dossier pour l'impression du code de paiement (même référence / candidat que CandidatInfoCard)
  const dossierInfoPourImpression = useMemo(
    () => ({
      reference: dossier?.reference ?? dossierComplet?.reference ?? (dossier?.details as any)?.dossier?.reference ?? undefined,
      candidatNom: personne?.nom ?? undefined,
      candidatPrenom: personne?.prenom ?? undefined,
      categoriePermis: formation?.type_permis?.libelle ?? formation?.nom ?? (formation as any)?.type_permis?.code ?? undefined,
    }),
    [dossier?.reference, dossierComplet?.reference, dossier?.details, personne?.nom, personne?.prenom, formation]
  );

  /** Ferme le dossier (déverrouille) puis navigue vers la liste. Utilisé par le fil d'ariane et le bouton retour. */
  const handleCloseAndGoBack = async () => {
    if (!id) {
      navigate(receptionListPath);
      return;
    }
    setClosingDossier(true);
    try {
      await axiosClient.post(`/dossiers/${id}/close`);
      candidatDetailsData.invalidate(id);
      setSnackbar({
        open: true,
        message: 'Dossier fermé (déverrouillé) avec succès.',
        severity: 'success'
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Impossible de fermer le dossier.',
        severity: 'error'
      });
    } finally {
      setClosingDossier(false);
      navigate(receptionListPath);
    }
  };

  const handleUpdateDocument = async (documentId: string, data: { valide: boolean; commentaires?: string }) => {
    if (documentId && String(documentId).startsWith('sim_')) {
      return;
    }
    try {
      await circuitSuiviService.updateDocument(documentId, data);
      
      // Rafraîchir les documents après la mise à jour
      await chargerDocuments();
      
      setSnackbar({
        open: true,
        message: data.valide ? 'Document validé avec succès' : 'Document invalidé avec succès',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('❌ Erreur lors de la mise à jour du document:', error);
      
      let errorMessage = 'Erreur lors de la mise à jour du document';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  // Props partagées pour DocumentsCard (après handleUpdateDocument pour éviter "before initialization")
  const documentsCardProps = useMemo<DocumentsCardProps>(
    () => ({
      documentsFromApi,
      loadingDocuments,
      uploading,
      dossierId: id,
      fileInputRef,
      onUploadClick: handleUploadNewDocument,
      onFileSelect: handleFileSelectUpload,
      onViewDocument: handleViewDocument,
      onDownloadDocument: handleDownloadDocument,
      onUpdateDocument: handleUpdateDocument,
      formatFileSize,
      circuit,
      typeDocuments,
      pieceJustificationTypeMap,
      piecesJustificativesMap,
      loadingPiecesJustificatives
    }),
    [
      documentsFromApi,
      loadingDocuments,
      uploading,
      id,
      formatFileSize,
      circuit,
      typeDocuments,
      pieceJustificationTypeMap,
      piecesJustificativesMap,
      loadingPiecesJustificatives
    ]
  );

  if (!dossier && !loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            Dossier non trouvé
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowLeftIcon className="w-5 h-5" />}
            onClick={() => navigate(receptionListPath)}
            sx={{ mt: 2 }}
          >
            Retour à la liste
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ width: '100%', py: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      <Container maxWidth={false} sx={{ px: { xs: 0, sm: 2, md: 3 } }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            component="button"
            variant="body1"
            onClick={handleCloseAndGoBack}
            disabled={closingDossier}
            sx={{ textDecoration: 'none', cursor: closingDossier ? 'wait' : 'pointer' }}
          >
            {receptionListLabel}
          </Link>
          <Typography color="text.primary">
            Détails du candidat
          </Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={handleCloseAndGoBack}
              disabled={closingDossier}
              sx={{ mr: 1 }}
              aria-label="Retour"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </IconButton>
            <Typography variant="h4" component="h1" fontWeight="bold" className="font-display">
              Détails du candidat
            </Typography>
            {dossier?.statut && (
              <Chip
                label={`Statut: ${dossier.statut}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
            )}
          </Box>
        </Box>

        {/* Timeline du circuit - masquée pour CNEPC/admin tant qu'il y a des docs non validés */}
        {!hideCircuitForCnepc && timelineHeaderContent && (
          <Box sx={{ mb: 2 }}>
            {timelineHeaderContent}
          </Box>
        )}

        <Divider sx={{ mb: 4 }} />

        {/* Contenu principal */}
        {loading ? (
          <Fade in={true} timeout={300}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', lg: 'row' },
                gap: 3, 
                alignItems: 'flex-start' 
              }}
            >
              {/* Colonne gauche - Skeletons */}
              <Box 
                sx={{ 
                  flex: { xs: '1 1 100%', lg: '1 1 40%' }, 
                  minWidth: 0,
                  width: { xs: '100%', lg: 'auto' }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <CandidatInfoCardSkeleton />
                  <AutoEcoleInfoCardSkeleton />
                  <DocumentsCardSkeleton />
                </Box>
              </Box>
              
              {/* Colonne droite - Skeleton */}
              <Box 
                sx={{ 
                  flex: { xs: '1 1 100%', lg: '1 1 60%' }, 
                  minWidth: 0,
                  width: { xs: '100%', lg: 'auto' }
                }}
              >
                <CircuitEtapesCardSkeleton />
              </Box>
            </Box>
          </Fade>
        ) : (
          <Fade in={true} timeout={500}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', lg: 'row' },
                gap: 3, 
                alignItems: 'flex-start' 
              }}
            >
            {/* Colonne gauche - Documents : masquée via CSS quand non concerné pour éviter démontage/remontage et refresh intempestif */}
            <Box 
              sx={{ 
                flex: { xs: '1 1 100%', lg: hideCircuitForCnepc ? '1 1 100%' : '1 1 40%' }, 
                minWidth: 0,
                width: { xs: '100%', lg: 'auto' },
                display: showDocumentsCard ? 'block' : 'none'
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {cache.isCandidatDetailsReady && cache.DocumentsCard ? (
                  <cache.DocumentsCard {...documentsCardProps} />
                ) : (
                  <Suspense fallback={<DocumentsCardSkeleton />}>
                    <DocumentsCardLazy {...documentsCardProps} />
                  </Suspense>
                )}
              </Box>
            </Box>

            {/* Colonne droite - Circuit et Étapes (masqué pour CNEPC/admin tant qu'il y a des docs non validés) */}
            {!hideCircuitForCnepc && (
            <Box 
              sx={{ 
                flex: { xs: '1 1 100%', lg: showDocumentsCard ? '1 1 60%' : '1 1 100%' }, 
                minWidth: 0,
                width: { xs: '100%', lg: 'auto' }
              }}
            >
              {cache.isCandidatDetailsReady && cache.CircuitEtapesCard ? (
                <cache.CircuitEtapesCard
                  circuit={circuit}
                  loadingCircuit={loadingCircuit}
                  loadingTypeDocuments={loadingTypeDocuments}
                  typeDocuments={typeDocuments}
                  documentsFromApi={documentsFromApi}
                  getDocumentsByType={getDocumentsByType}
                  getDocumentsForPiece={getDocumentsForPiece}
                  isDocumentValidated={isDocumentValidated}
                  isDocumentValidatedForPiece={isDocumentValidatedForPiece}
                  dossierId={id}
                  dossierComplet={dossierComplet}
                  dossierStatut={dossier?.statut ?? dossierComplet?.statut}
                  onDocumentUploaded={chargerDocuments}
                  uploading={uploading}
                  onUpdateDocument={handleUpdateDocument}
                  epreuvesStatus={epreuvesStatus || undefined}
                  loadingEpreuves={loadingEpreuves}
                  onSendToCNEDDT={async () => {
                    await chargerDocuments?.();
                    await chargerDossierComplet?.();
                  }}
                  pieceJustificationTypeMap={pieceJustificationTypeMap}
                  piecesJustificativesMap={piecesJustificativesMap}
                  loadingPiecesJustificatives={loadingPiecesJustificatives}
                  displayMode="timeline"
                  onActiveStepChange={setActiveEtape}
                  renderTimelineHeader={setTimelineHeaderContent}
                  onDossierStatutUpdated={async () => {
                    await chargerDossierComplet?.();
                  }}
                  openToNextStep={openToNextStep}
                  dossierInfoPourImpression={dossierInfoPourImpression}
                />
              ) : (
                <Suspense fallback={<CircuitEtapesCardSkeleton />}>
                  <CircuitEtapesCardLazy
                    circuit={circuit}
                    loadingCircuit={loadingCircuit}
                    loadingTypeDocuments={loadingTypeDocuments}
                    typeDocuments={typeDocuments}
                    documentsFromApi={documentsFromApi}
                    getDocumentsByType={getDocumentsByType}
                    getDocumentsForPiece={getDocumentsForPiece}
                    isDocumentValidated={isDocumentValidated}
                    isDocumentValidatedForPiece={isDocumentValidatedForPiece}
                    dossierId={id}
                    dossierComplet={dossierComplet}
                    dossierStatut={dossier?.statut ?? dossierComplet?.statut}
                    onDocumentUploaded={chargerDocuments}
                    uploading={uploading}
                    onUpdateDocument={handleUpdateDocument}
                    epreuvesStatus={epreuvesStatus || undefined}
                    loadingEpreuves={loadingEpreuves}
                    onSendToCNEDDT={async () => {
                      await chargerDocuments?.();
                      await chargerDossierComplet?.();
                    }}
                    pieceJustificationTypeMap={pieceJustificationTypeMap}
                    piecesJustificativesMap={piecesJustificativesMap}
                    loadingPiecesJustificatives={loadingPiecesJustificatives}
                    displayMode="timeline"
                    onActiveStepChange={setActiveEtape}
                    renderTimelineHeader={setTimelineHeaderContent}
                    onDossierStatutUpdated={async () => {
                      await chargerDossierComplet?.();
                    }}
                    openToNextStep={openToNextStep}
                    dossierInfoPourImpression={dossierInfoPourImpression}
                  />
                </Suspense>
              )}
            </Box>
            )}
          </Box>
          </Fade>
        )}
      </Container>

      {/* FAB : Infos candidat + auto-école */}
      {!loading && (
        <Fab
          color="primary"
          aria-label="Informations candidat et auto-école"
          onClick={() => setInfoDrawerOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1200,
          }}
        >
          <UserCircleIcon className="w-6 h-6" />
        </Fab>
      )}

      {/* Drawer : carte infos personnelles + carte auto-école */}
      <Drawer
        anchor="right"
        open={infoDrawerOpen}
        onClose={() => setInfoDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 }, maxWidth: '100%' },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3, pb: 10 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Informations
          </Typography>
          {cache.isCandidatDetailsReady && cache.CandidatInfoCard ? (
            <cache.CandidatInfoCard candidatData={candidatData} personne={personne} />
          ) : (
            <Suspense fallback={<CandidatInfoCardSkeleton />}>
              <CandidatInfoCardLazy candidatData={candidatData} personne={personne} />
            </Suspense>
          )}
          {(() => {
            const isNouveauPermis = circuit?.nom_entite === 'NOUVEAUPERMIS';
            const hasAutoEcole = autoEcole && (autoEcole.nom_auto_ecole || autoEcole.nom || (Object.keys(autoEcole).length > 0 && autoEcole.id !== undefined));
            const hasFormation = formation && (formation.type_permis || formation.nom || (Object.keys(formation).length > 0 && formation.id !== undefined));
            return isNouveauPermis && (hasAutoEcole || hasFormation);
          })() && (
            cache.isCandidatDetailsReady && cache.AutoEcoleInfoCard ? (
              <cache.AutoEcoleInfoCard
                autoEcole={autoEcole}
                formation={formation}
                dossier={dossier}
                dossierId={id}
              />
            ) : (
              <Suspense fallback={<AutoEcoleInfoCardSkeleton />}>
                <AutoEcoleInfoCardLazy
                  autoEcole={autoEcole}
                  formation={formation}
                  dossier={dossier}
                  dossierId={id}
                />
              </Suspense>
            )
          )}
        </Box>
      </Drawer>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReceptionCandidatDetailsPage;
