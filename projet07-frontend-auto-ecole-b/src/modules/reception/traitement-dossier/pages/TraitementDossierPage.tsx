import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import {
  Outlet,
  useParams,
  useNavigate,
  useLocation,
  Navigate,
  generatePath,
  useOutletContext,
} from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
  Chip,
  Skeleton,
  Fade,
  Fab,
  Drawer,
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  UserCircleIcon,
  DocumentTextIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import { ROUTES } from '../../../../shared/constants';
import {
  useTraitementDossierDetails,
  type CandidatDetailsCacheEntry as HookCacheEntry,
} from '../hooks/useTraitementDossierDetails';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import { handleViewDocument, handleDownloadDocument } from '../utils/documentHandlers';
import { circuitSuiviService } from '../services/circuit-suivi.api';
import { useAppStore } from '../../../../store';
import {
  useTraitementDossierData,
  type TraitementDossierCacheEntry,
} from '../context/TraitementDossierDataContext';
import type { DocumentsCardProps } from '../components/TraitementDocumentsCard';
import type { TraitementCircuitPanelProps } from '../components/TraitementCircuitPanel';
import axiosClient from '../../../../shared/utils/axiosConfig';
import { isArchivageRole } from '../utils/roleHelpers';

const CandidatInfoCardLazy = lazy(() => import('../components/TraitementCandidatInfoCard'));
const AutoEcoleInfoCardLazy = lazy(() => import('../components/TraitementAutoEcoleInfoCard'));
const TraitementCircuitPanelLazy = lazy(() => import('../components/TraitementCircuitPanel'));
const TraitementDocumentsCardLazy = lazy(() => import('../components/TraitementDocumentsCard'));

const CandidatInfoCardSkeleton = () => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="text" width="50%" height={28} sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
  </Box>
);

const AutoEcoleInfoCardSkeleton = () => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
  </Box>
);

const DocumentsCardSkeleton = () => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="text" width="35%" height={28} sx={{ mb: 2 }} />
    {[1, 2, 3].map((i) => (
      <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 1, mb: 1 }} />
    ))}
  </Box>
);

const CircuitSkeleton = () => (
  <Box sx={{ p: 2 }}>
    {[1, 2, 3].map((i) => (
      <Skeleton key={i} variant="rectangular" height={72} sx={{ borderRadius: 1, mb: 1.5 }} />
    ))}
  </Box>
);

function formatDossierDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/** UUID (toutes variantes courantes) — à ne pas afficher comme « référence ». */
function isLikelyUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());
}

/** Ne pas afficher l’id technique du dossier (route, API) ni un UUID seul. */
function shouldHideAsDossierDisplay(
  value: string,
  routeDossierId: string | undefined,
  apiDossierId: unknown
): boolean {
  const s = value.trim();
  if (!s) return true;
  if (isLikelyUuid(s)) return true;
  const api = apiDossierId != null ? String(apiDossierId).trim() : '';
  const route = routeDossierId?.trim() ?? '';
  if (api && (s === api || s.toLowerCase() === api.toLowerCase())) return true;
  if (route && (s === route || s.toLowerCase() === route.toLowerCase())) return true;
  return false;
}

/** Libellé lisible pour un élément de data_categorie (objet API, type_permis imbriqué, etc.). */
function permisCategorieItemToLabel(x: unknown): string | null {
  if (x == null) return null;
  if (typeof x === 'string') {
    const t = x.trim();
    if (!t || t.toLowerCase() === 'string') return null;
    return t;
  }
  if (typeof x !== 'object') {
    const t = String(x).trim();
    return t || null;
  }
  const o = x as Record<string, unknown>;
  const typePermis =
    o.type_permis && typeof o.type_permis === 'object' ? (o.type_permis as Record<string, unknown>) : null;
  const attrs =
    o.attributes && typeof o.attributes === 'object' ? (o.attributes as Record<string, unknown>) : null;
  const dataNested = o.data && typeof o.data === 'object' && !Array.isArray(o.data) ? (o.data as Record<string, unknown>) : null;
  const candidates: unknown[] = [
    o.libelle,
    o.nom,
    o.name,
    o.label,
    o.titre,
    o.code,
    o.libelle_categorie,
    o.categorie,
    attrs?.libelle,
    attrs?.nom,
    attrs?.name,
    attrs?.code,
    attrs?.label,
    dataNested?.libelle,
    dataNested?.nom,
    dataNested?.name,
    dataNested?.code,
    typePermis?.libelle,
    typePermis?.nom,
    typePermis?.name,
    typePermis?.code,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') {
      const s = String(c).trim();
      if (s.toLowerCase() === 'string') continue;
      return s;
    }
  }
  return null;
}

/** Entrées affichables pour data_categorie (évite placeholders et « [object Object] »). */
function normalizeDataCategorie(raw: unknown): string[] {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const s = permisCategorieItemToLabel(x);
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

function entityLibelle(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const a = [o.libelle, o.nom, o.name, o.nom_auto_ecole].find((x) => x != null && String(x).trim() !== '');
  if (a != null) return String(a);
  if (o.code != null && String(o.code).trim() !== '') return String(o.code);
  return null;
}

/** Libellés et textes lisibles pour l’en-tête (aucun UUID). */
function buildDossierHeaderChips(
  dossierComplet: any,
  dossierStatut: string | null | undefined,
  formationLabel: string | null,
  autoEcoleLabel: string | null
): { key: string; label: string; color?: 'default' | 'primary' | 'warning' | 'error' | 'success' }[] {
  if (!dossierComplet || typeof dossierComplet !== 'object') return [];
  const d = dossierComplet;
  const chips: { key: string; label: string; color?: 'default' | 'primary' | 'warning' | 'error' | 'success' }[] = [];

  const statut = d.statut ?? dossierStatut;
  if (statut != null && String(statut).trim() !== '') {
    chips.push({ key: 'statut', label: String(statut), color: 'primary' });
  }

  if (d.type_demande && typeof d.type_demande === 'object') {
    const o = d.type_demande as { name?: string; libelle?: string; nom?: string };
    const t = o.name || o.libelle || o.nom;
    if (t != null && String(t).trim() !== '') chips.push({ key: 'type_demande', label: String(t) });
  }

  if (formationLabel) chips.push({ key: 'formation', label: formationLabel });
  if (autoEcoleLabel) chips.push({ key: 'auto_ecole', label: autoEcoleLabel });

  const refObj = d.referenciel ?? d.referentiel;
  const refLb = entityLibelle(refObj);
  if (refLb) chips.push({ key: 'referentiel', label: `Référentiel · ${refLb}` });

  const provLb = entityLibelle(d.province);
  if (provLb) chips.push({ key: 'province', label: `Province · ${provLb}` });

  const centreLb = entityLibelle(d.centre);
  if (centreLb) chips.push({ key: 'centre', label: `Centre · ${centreLb}` });

  const dm = formatDossierDate(d.date_modification);
  if (dm) chips.push({ key: 'date_modif', label: `Modifié le ${dm}` });

  if (d.numero_permis != null && String(d.numero_permis).trim() !== '') {
    chips.push({ key: 'nperm', label: `N° permis ${d.numero_permis}` });
  }
  if (d.numero_origine_permis != null && String(d.numero_origine_permis).trim() !== '') {
    chips.push({ key: 'nperm_o', label: `Permis origine ${d.numero_origine_permis}` });
  }
  if (d.lieu_de_dobtention_du_permis != null && String(d.lieu_de_dobtention_du_permis).trim() !== '') {
    chips.push({ key: 'lieu_perm', label: `Obtenu à ${d.lieu_de_dobtention_du_permis}` });
  }

  const dObt = formatDossierDate(d.date_de_dobtention_du_permis);
  if (dObt) chips.push({ key: 'd_obt', label: `Obtention ${dObt}` });
  const dDel = formatDossierDate(d.date_de_delivrance_du_permis);
  if (dDel) chips.push({ key: 'd_del', label: `Délivrance ${dDel}` });
  const dExp = formatDossierDate(d.expiration_date);
  if (dExp) chips.push({ key: 'd_exp', label: `Expire ${dExp}` });
  const dSus = formatDossierDate(d.suspended_date);
  if (dSus) chips.push({ key: 'd_sus', label: `Suspension ${dSus}` });

  if (d.expired === true) chips.push({ key: 'expired', label: 'Permis expiré', color: 'warning' });
  if (d.suspended === true) chips.push({ key: 'suspended', label: 'Permis suspendu', color: 'error' });

  if (d.commentaires != null && String(d.commentaires).trim() !== '') {
    const c = String(d.commentaires).trim();
    const short = c.length > 56 ? `${c.slice(0, 54)}…` : c;
    chips.push({ key: 'com', label: short });
  }

  return chips;
}

export interface TraitementDossierOutletContext {
  showDocumentsSection: boolean;
  hideCircuitForCnepc: boolean;
  documentsCardProps: DocumentsCardProps;
  circuitPanelProps: TraitementCircuitPanelProps;
}

/**
 * Redirection initiale : ouverture sur le circuit si demandé (liste réception) ou rôle auto-école ; sinon page documents.
 */
export const TraitementDossierIndexRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const ctx = useOutletContext<TraitementDossierOutletContext>();
  if (!id) return null;
  const openToNext = (location.state as { openToNextStep?: boolean } | null)?.openToNextStep === true;
  const goCircuit = openToNext || !ctx.showDocumentsSection;
  const to = goCircuit
    ? generatePath(ROUTES.RECEPTION_TRAITEMENT_DOSSIER_CIRCUIT, { id })
    : generatePath(ROUTES.RECEPTION_TRAITEMENT_DOSSIER_DOCUMENTS, { id });
  return <Navigate to={to} replace state={location.state} />;
};

/** Page dédiée : vérification et dépôt des documents uniquement. */
export const TraitementDossierDocumentsRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = useOutletContext<TraitementDossierOutletContext>();

  if (!ctx.showDocumentsSection && id) {
    return <Navigate to={generatePath(ROUTES.RECEPTION_TRAITEMENT_DOSSIER_CIRCUIT, { id })} replace />;
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        p: { xs: 1.5, sm: 2 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Vérification des documents du dossier
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Téléversez les pièces, consultez les aperçus puis validez ou refusez chaque document.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => id && navigate(generatePath(ROUTES.RECEPTION_TRAITEMENT_DOSSIER_CIRCUIT, { id }), { state: location.state })}
        >
          Aller au parcours du circuit
        </Button>
      </Stack>
      {ctx.hideCircuitForCnepc && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Tant qu’au moins un document n’est pas validé ou vérifié, le parcours des étapes reste indisponible.
        </Alert>
      )}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'grey.900' : 'grey.50'),
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: 'background.paper', height: '100%', minHeight: 320 }}>
          <Suspense fallback={<DocumentsCardSkeleton />}>
            <TraitementDocumentsCardLazy {...ctx.documentsCardProps} />
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
};

/** Page dédiée : parcours du circuit uniquement. */
export const TraitementDossierCircuitRoute: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const ctx = useOutletContext<TraitementDossierOutletContext>();
  const pathDocuments = id ? generatePath(ROUTES.RECEPTION_TRAITEMENT_DOSSIER_DOCUMENTS, { id }) : '';

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        p: { xs: 1.5, sm: 2 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Parcours du circuit
        </Typography>
        {ctx.showDocumentsSection && pathDocuments && (
          <Button variant="text" size="small" sx={{ textTransform: 'none' }} onClick={() => navigate(pathDocuments, { state: location.state })}>
            Vérification des documents
          </Button>
        )}
      </Stack>
      {ctx.hideCircuitForCnepc ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Validez ou vérifiez tous les documents depuis la page « Vérification des documents », puis revenez ici pour poursuivre le circuit.
        </Alert>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Suspense fallback={<CircuitSkeleton />}>
            <TraitementCircuitPanelLazy {...ctx.circuitPanelProps} />
          </Suspense>
        </Box>
      )}
    </Box>
  );
};

const TraitementDossierLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const receptionNavState = location.state as {
    openToNextStep?: boolean;
    code_paiement?: string | null;
    traitementQueueIds?: string[];
  } | null | undefined;
  const openToNextStep = receptionNavState?.openToNextStep === true;
  const traitementQueueIds = useMemo(() => {
    const raw = receptionNavState?.traitementQueueIds;
    if (!Array.isArray(raw)) return [] as string[];
    return raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  }, [receptionNavState?.traitementQueueIds]);
  const nextDossierId = useMemo(() => {
    if (!id || traitementQueueIds.length === 0) return null;
    const idx = traitementQueueIds.indexOf(id);
    if (idx < 0) return null;
    return traitementQueueIds[idx + 1] ?? null;
  }, [id, traitementQueueIds]);
  const codePaiementHint = useMemo(() => {
    const c = receptionNavState?.code_paiement;
    return c != null && String(c).trim() !== '' ? String(c).trim() : undefined;
  }, [receptionNavState?.code_paiement]);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [closingDossier, setClosingDossier] = useState(false);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);

  const traitementDossierData = useTraitementDossierData();
  const cachedEntry = id ? traitementDossierData.get(id) : undefined;
  const cacheOptions = useMemo(
    () =>
      id
        ? {
            initialData: (cachedEntry ?? undefined) as HookCacheEntry | undefined,
            onCacheUpdate: (data: HookCacheEntry) => {
              traitementDossierData.set(id, data as unknown as TraitementDossierCacheEntry);
            },
            codePaiementHint,
          }
        : undefined,
    [id, cachedEntry, traitementDossierData, codePaiementHint]
  );

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
    loadingPiecesJustificatives,
  } = useTraitementDossierDetails(id, cacheOptions);

  const { uploading, fileInputRef, handleUploadNewDocument, handleFileSelect: handleFileSelectUpload } = useDocumentUpload({
    dossierId: id,
    formatFileSize,
    onUploadSuccess: async () => {
      await chargerDocuments();
      setSnackbar({ open: true, message: 'Document uploadé avec succès', severity: 'success' });
    },
    onError: (message) => {
      setSnackbar({ open: true, message, severity: 'error' });
    },
  });

  const { user } = useAppStore();
  const userRole =
    user?.role ??
    (typeof localStorage !== 'undefined'
      ? (() => {
          try {
            const u = localStorage.getItem('user_data');
            return u ? (JSON.parse(u) as { role?: string })?.role : null;
          } catch {
            return null;
          }
        })()
      : null);

  const receptionListPath =
    userRole === 'ROLE_AUTO_ECOLE'
      ? `${ROUTES.ELEVES}/demandes`
      : userRole === 'ROLE_CSAF'
        ? ROUTES.FINANCE || '/finance'
        : userRole === 'ROLE_ENREGISTREUR'
          ? ROUTES.GESTION_DOSSIER || '/gestion-dossier'
        : ROUTES.RECEPTION || '/reception';
  const receptionListLabel =
    userRole === 'ROLE_CSAF'
      ? 'Finance'
      : userRole === 'ROLE_ENREGISTREUR'
        ? 'Gestion dossier'
      : 'Réception des dossiers';

  const docs = (documentsFromApi ?? []).filter((doc: any) => !doc?.documentable_id || doc.documentable_id === id);
  const isDocValidatedOrVerified = (doc: any) => {
    if (!doc) return false;
    const v = doc.valide;
    const verifie = doc.verifie ?? doc.verifiee;
    const valideOk =
      v === true || v === 1 || v === 'true' || (typeof v === 'boolean' && v) || (typeof v === 'number' && v !== 0);
    const verifieOk =
      verifie === true ||
      verifie === 1 ||
      verifie === 'true' ||
      (typeof verifie === 'boolean' && verifie) ||
      (typeof verifie === 'number' && verifie !== 0);
    return valideOk || verifieOk;
  };
  const hasUnvalidatedDocuments = docs.some((doc: any) => !isDocValidatedOrVerified(doc));
  const mustVerifyDocumentsBeforeCircuit =
    userRole === 'ROLE_CNEPC' ||
    userRole === 'ROLE_ADMIN' ||
    userRole === 'ROLE_SEV' ||
    (typeof userRole === 'string' && userRole.toLowerCase() === 'admin');
  const hideCircuitForCnepc = mustVerifyDocumentsBeforeCircuit && hasUnvalidatedDocuments;
  const showDocumentsSection = userRole !== 'ROLE_AUTO_ECOLE' && !isArchivageRole(userRole);

  const candidatData =
    dossierComplet?.candidat || dossier?.details?.candidat_complet || dossier?.details?.dossier?.candidat;
  const personne = candidatData?.personne || {};
  const formation = dossierComplet?.formation || dossier?.details?.formation_complete || dossier?.details?.dossier?.formation;
  const autoEcole = dossierComplet?.auto_ecole || dossier?.details?.auto_ecole_complete || {};

  const reference = dossier?.reference ?? dossierComplet?.reference ?? (dossier?.details as any)?.dossier?.reference ?? id;
  const prenom = personne?.prenom ?? '';
  const nom = personne?.nom ?? '';

  const formationLabel =
    formation?.type_permis?.libelle ?? formation?.nom ?? (formation as any)?.type_permis?.code ?? null;
  const autoEcoleLabel = autoEcole?.nom_auto_ecole ?? autoEcole?.nom ?? null;

  const dossierInfoPourImpression = useMemo(
    () => ({
      reference: reference ?? undefined,
      candidatNom: nom || undefined,
      candidatPrenom: prenom || undefined,
      categoriePermis: formation?.type_permis?.libelle ?? formation?.nom ?? (formation as any)?.type_permis?.code ?? undefined,
    }),
    [reference, nom, prenom, formation]
  );

  const dossierHeaderChips = useMemo(
    () =>
      buildDossierHeaderChips(
        dossierComplet,
        dossier?.statut ?? dossierComplet?.statut,
        formationLabel,
        autoEcoleLabel
      ),
    [dossierComplet, dossier?.statut, formationLabel, autoEcoleLabel]
  );

  /** Référence métier uniquement : jamais l’id dossier (URL / API) ni un UUID seul. */
  const displayReferenceHeader = useMemo(() => {
    const apiId = dossierComplet?.id ?? dossier?.id;
    const candidates = [
      dossier?.reference,
      dossierComplet?.reference,
      (dossier?.details as { dossier?: { reference?: string; id?: string } } | undefined)?.dossier?.reference,
    ].filter((x) => x != null && String(x).trim() !== '');
    for (const c of candidates) {
      const s = String(c).trim();
      if (!shouldHideAsDossierDisplay(s, id, apiId)) return s;
    }
    return null;
  }, [dossier?.reference, dossierComplet?.reference, dossierComplet?.id, dossier?.id, dossier?.details, id]);

  const dataCategorieOptions = useMemo(() => {
    const d = dossierComplet as { data_categorie?: unknown; dataCategorie?: unknown } | null | undefined;
    return normalizeDataCategorie(d?.data_categorie ?? d?.dataCategorie);
  }, [dossierComplet]);

  const [selectedPermisCategorie, setSelectedPermisCategorie] = useState('');
  useEffect(() => {
    if (dataCategorieOptions.length === 0) {
      setSelectedPermisCategorie('');
      return;
    }
    if (!dataCategorieOptions.includes(selectedPermisCategorie)) {
      setSelectedPermisCategorie(dataCategorieOptions[0]);
    }
  }, [dataCategorieOptions, selectedPermisCategorie]);

  const navigationStateForChildRoutes = useMemo(
    () => ({
      ...(receptionNavState ?? {}),
      openToNextStep: receptionNavState?.openToNextStep,
      traitementQueueIds: traitementQueueIds.length > 0 ? traitementQueueIds : undefined,
    }),
    [receptionNavState, traitementQueueIds]
  );

  const handleCloseAndGoBack = async () => {
    if (!id) {
      navigate(receptionListPath);
      return;
    }
    setClosingDossier(true);
    try {
      await axiosClient.post(`/dossiers/${id}/close`);
      traitementDossierData.invalidate(id);
      setSnackbar({ open: true, message: 'Dossier fermé (déverrouillé) avec succès.', severity: 'success' });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Impossible de fermer le dossier.',
        severity: 'error',
      });
    } finally {
      setClosingDossier(false);
      navigate(receptionListPath);
    }
  };

  const handleNextDossier = async () => {
    if (!id || !nextDossierId) return;
    setClosingDossier(true);
    try {
      await axiosClient.post(`/dossiers/${id}/close`);
      traitementDossierData.invalidate(id);
      await axiosClient.post(`/dossiers/${nextDossierId}/open`);
      const path = ROUTES.RECEPTION_TRAITEMENT_DOSSIER_CIRCUIT.replace(':id', nextDossierId);
      navigate(path, {
        replace: true,
        state: {
          ...receptionNavState,
          openToNextStep: true,
          traitementQueueIds,
        },
      });
      setSnackbar({ open: true, message: 'Dossier suivant ouvert.', severity: 'success' });
    } catch (error: any) {
      const message =
        error?.response?.status === 423
          ? error?.response?.data?.message || 'Le dossier suivant est déjà ouvert par un autre agent.'
          : error?.response?.data?.message || 'Impossible de passer au dossier suivant.';
      setSnackbar({ open: true, message, severity: 'error' });
      navigate(receptionListPath);
    } finally {
      setClosingDossier(false);
    }
  };

  const handleUpdateDocument = async (documentId: string, data: { valide: boolean; commentaires?: string }) => {
    if (documentId && String(documentId).startsWith('sim_')) return;
    try {
      await circuitSuiviService.updateDocument(documentId, data);
      await chargerDocuments();
      setSnackbar({
        open: true,
        message: data.valide ? 'Document validé avec succès' : 'Document invalidé avec succès',
        severity: 'success',
      });
    } catch (error: any) {
      let errorMessage = 'Erreur lors de la mise à jour du document';
      if (error.response?.data?.message) errorMessage = error.response.data.message;
      else if (error.message) errorMessage = error.message;
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

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
      loadingPiecesJustificatives,
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
      loadingPiecesJustificatives,
    ]
  );

  const circuitPanelProps = useMemo<TraitementCircuitPanelProps>(
    () => ({
      circuit,
      loadingCircuit,
      loadingTypeDocuments,
      typeDocuments,
      documentsFromApi,
      getDocumentsByType,
      getDocumentsForPiece,
      isDocumentValidated,
      isDocumentValidatedForPiece,
      dossierId: id,
      dossierComplet,
      dossierStatut: dossier?.statut ?? dossierComplet?.statut,
      onDocumentUploaded: chargerDocuments,
      uploading,
      onUpdateDocument: handleUpdateDocument,
      epreuvesStatus: epreuvesStatus || undefined,
      loadingEpreuves,
      onSendToCNEDDT: async () => {
        await chargerDocuments?.();
        await chargerDossierComplet?.();
      },
      pieceJustificationTypeMap,
      piecesJustificativesMap,
      loadingPiecesJustificatives,
      onDossierStatutUpdated: async () => {
        await chargerDossierComplet?.();
      },
      openToNextStep,
      dossierInfoPourImpression,
    }),
    [
      circuit,
      loadingCircuit,
      loadingTypeDocuments,
      typeDocuments,
      documentsFromApi,
      getDocumentsByType,
      getDocumentsForPiece,
      isDocumentValidated,
      isDocumentValidatedForPiece,
      id,
      dossierComplet,
      dossier?.statut,
      chargerDocuments,
      uploading,
      handleUpdateDocument,
      epreuvesStatus,
      loadingEpreuves,
      pieceJustificationTypeMap,
      piecesJustificativesMap,
      loadingPiecesJustificatives,
      chargerDossierComplet,
      openToNextStep,
      dossierInfoPourImpression,
    ]
  );

  const outletContext = useMemo<TraitementDossierOutletContext>(
    () => ({
      showDocumentsSection,
      hideCircuitForCnepc,
      documentsCardProps,
      circuitPanelProps,
    }),
    [showDocumentsSection, hideCircuitForCnepc, documentsCardProps, circuitPanelProps]
  );

  const pathDocuments = id ? generatePath(ROUTES.RECEPTION_TRAITEMENT_DOSSIER_DOCUMENTS, { id }) : '';
  const pathCircuit = id ? generatePath(ROUTES.RECEPTION_TRAITEMENT_DOSSIER_CIRCUIT, { id }) : '';
  const onDocumentsPage = location.pathname === pathDocuments;
  const onCircuitPage = location.pathname === pathCircuit;

  if (!dossier && !loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, bgcolor: 'background.default' }}>
        <Paper variant="outlined" sx={{ p: 4, maxWidth: 420, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Dossier introuvable
          </Typography>
          <Button variant="contained" startIcon={<ArrowLeftIcon className="w-5 h-5" />} onClick={() => navigate(receptionListPath)} sx={{ mt: 2 }}>
            Retour à {receptionListLabel}
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        width: '100%',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 2.5, md: 3 },
            py: { xs: 1.5, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 1.5,
          }}
        >
          <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} sx={{ alignSelf: 'flex-start' }}>
            <Button
              variant="text"
              color="inherit"
              onClick={handleCloseAndGoBack}
              disabled={closingDossier}
              startIcon={<ArrowLeftIcon className="w-5 h-5" />}
              sx={{ textTransform: 'none', fontWeight: 600, px: 0 }}
            >
              Retour · {receptionListLabel}
            </Button>
            {nextDossierId ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNextDossier}
                disabled={closingDossier}
                endIcon={<ArrowRightIcon className="w-5 h-5" />}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Dossier suivant
              </Button>
            ) : null}
          </Stack>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              gap: 2,
              width: '100%',
            }}
          >
            <Box sx={{ flex: '1 1 280px', minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.8, lineHeight: 1.2 }}>
                Traitement du dossier
              </Typography>
              {displayReferenceHeader && (
                <Typography variant="h5" component="h1" fontWeight={700} sx={{ lineHeight: 1.25, wordBreak: 'break-word' }}>
                  {displayReferenceHeader}
                </Typography>
              )}
              <Typography variant="body1" sx={{ mt: displayReferenceHeader ? 0.5 : 0, fontWeight: 600 }}>
                {[prenom, nom].filter(Boolean).join(' ') || 'Candidat'}
              </Typography>
              {!loading && dossierHeaderChips.length > 0 && (
                <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75} sx={{ mt: 1.25, alignItems: 'center' }}>
                  {dossierHeaderChips.map((c) => (
                    <Chip
                      key={c.key}
                      size="small"
                      label={c.label}
                      color={c.color ?? 'default'}
                      variant={c.color ? 'filled' : 'outlined'}
                      sx={{ maxWidth: '100%', height: 'auto', py: 0.5, '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'left' } }}
                    />
                  ))}
                </Stack>
              )}
              {!loading && dataCategorieOptions.length > 0 && (
                <FormControl size="small" sx={{ mt: 1.25, minWidth: { xs: '100%', sm: 280 }, maxWidth: '100%' }}>
                  <InputLabel id="permis-categories-label">Permis (catégories)</InputLabel>
                  <Select
                    labelId="permis-categories-label"
                    label="Permis (catégories)"
                    value={selectedPermisCategorie}
                    onChange={(e) => setSelectedPermisCategorie(e.target.value as string)}
                  >
                    {dataCategorieOptions.map((opt, idx) => (
                      <MenuItem key={`${idx}-${opt}`} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
            {showDocumentsSection && id && !loading && (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  width: { xs: '100%', md: 'auto' },
                  justifyContent: { xs: 'stretch', md: 'flex-end' },
                  alignSelf: { xs: 'stretch', md: 'flex-start' },
                  ml: { md: 'auto' },
                }}
              >
                <Button
                  variant={onDocumentsPage ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<DocumentTextIcon className="w-4 h-4" />}
                  onClick={() => navigate(pathDocuments, { state: navigationStateForChildRoutes })}
                  sx={{ flex: { xs: 1, md: 'none' }, textTransform: 'none' }}
                >
                  Documents
                </Button>
                <Button
                  variant={onCircuitPage ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<MapIcon className="w-4 h-4" />}
                  onClick={() => navigate(pathCircuit, { state: navigationStateForChildRoutes })}
                  sx={{ flex: { xs: 1, md: 'none' }, textTransform: 'none' }}
                >
                  Parcours
                </Button>
              </Stack>
            )}
          </Box>
        </Box>
      </Box>

      {loading ? (
        <Fade in>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <Paper variant="outlined" square sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 0, overflow: 'hidden' }}>
              <Box sx={{ px: 2, pt: 2 }}>
                <Skeleton variant="text" width="40%" height={36} />
              </Box>
              <CircuitSkeleton />
            </Paper>
          </Box>
        </Fade>
      ) : (
        <Fade in timeout={400}>
          <Paper
            elevation={0}
            variant="outlined"
            square
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              borderRadius: 0,
              borderLeft: 'none',
              borderRight: 'none',
              borderColor: 'divider',
            }}
          >
            <Outlet context={outletContext} />
          </Paper>
        </Fade>
      )}

      {!loading && (
        <Fab
          color="primary"
          aria-label="Fiche candidat et auto-école"
          onClick={() => setInfoDrawerOpen(true)}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}
        >
          <UserCircleIcon className="w-6 h-6" />
        </Fab>
      )}

      <Drawer
        anchor="right"
        open={infoDrawerOpen}
        onClose={() => setInfoDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, maxWidth: '100%' } }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, pb: 8 }}>
          <Typography variant="h6" fontWeight={700}>
            Fiche dossier
          </Typography>
          <Suspense fallback={<CandidatInfoCardSkeleton />}>
            <CandidatInfoCardLazy candidatData={candidatData} personne={personne} />
          </Suspense>
          {(() => {
            const isNouveauPermis = circuit?.nom_entite === 'NOUVEAUPERMIS';
            const hasAutoEcole = autoEcole && (autoEcole.nom_auto_ecole || autoEcole.nom || (Object.keys(autoEcole).length > 0 && autoEcole.id !== undefined));
            const hasFormation = formation && (formation.type_permis || formation.nom || (Object.keys(formation).length > 0 && formation.id !== undefined));
            return isNouveauPermis && (hasAutoEcole || hasFormation);
          })() && (
            <Suspense fallback={<AutoEcoleInfoCardSkeleton />}>
              <AutoEcoleInfoCardLazy autoEcole={autoEcole} formation={formation} dossier={dossier} dossierId={id} />
            </Suspense>
          )}
        </Box>
      </Drawer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TraitementDossierLayout;
