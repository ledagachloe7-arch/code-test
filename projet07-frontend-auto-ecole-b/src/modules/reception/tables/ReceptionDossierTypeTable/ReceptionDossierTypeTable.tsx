import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceptionDossier } from '../../types';
import { 
  Box, 
  Snackbar, 
  Alert, 
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  TablePagination,
  Skeleton,
  Fade,
  ListItemButton,
  ListItemText,
  List,
  Badge,
  Checkbox,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Delete, LockOpen, FolderOpen, Send, Search } from '@mui/icons-material';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { ROUTES } from '../../../../shared/constants';
import { ReceptionDossierTypeTableProps } from './types';
import { useDossierSuivi } from './hooks/useDossierSuivi';
import { useDossierPhoto } from './hooks/useDossierPhoto';
import { isNouveauPermisType, getSuiviColor } from './helpers.tsx';
import { isDossierStatutSentToCNEDDT } from '../../hooks/useCNEDDTTransfer';
import { sendDossierToCNEDDT } from '../../services/sendToCNEDDT.service';
import axiosClient from '../../../../shared/utils/axiosConfig';
import type { CircuitSuivi, EtapeCircuit } from '../../services/circuit-suivi.service';
import { useUserRole } from '../../hooks/useUserRole';
import { useAppStore } from '../../../../store';
import { referentielService } from '../../../cnepc/services';
import type { Referentiel } from '../../../cnepc/types/auto-ecole';
import { normalizeRole, isArchivageRole } from '../../utils/roleHelpers';
import { isEtapePaiementCircuit } from '../../utils/etapeHelpers';

const NON_RENSEIGNE_KEY = '__non_renseigne__';

/** Extrait province_id et centre_id d'un dossier (racine API ou details.dossier_complet).
 *  Supporte à la fois les champs plats (province_id, centre_id) et les objets imbriqués (province.id, centre.id). */
function getDossierProvinceCentre(d: ReceptionDossier): { province_id: string; centre_id: string } {
  const raw = d as unknown as Record<string, unknown>;
  const complet = (d.details as any)?.dossier_complet;
  const detailsDossier = (d.details as any)?.dossier;
  const province_id = String(
    raw.province_id ??
    complet?.province_id ?? (complet?.province as any)?.id ??
    detailsDossier?.province_id ?? (detailsDossier?.province as any)?.id ??
    ''
  ).trim();
  const centre_id = String(
    raw.centre_id ??
    complet?.centre_id ?? (complet?.centre as any)?.id ??
    detailsDossier?.centre_id ?? (detailsDossier?.centre as any)?.id ??
    ''
  ).trim();
  return { province_id: province_id || NON_RENSEIGNE_KEY, centre_id: centre_id || NON_RENSEIGNE_KEY };
}

/** Statuts fallback quand le suivi (prochaine étape) n'est pas disponible */
const STATUT_ORDER: { key: string; label: string; category: 'todo' | 'done' }[] = [
  { key: 'en_attente', label: 'En attente', category: 'todo' },
  { key: 'recu', label: 'Reçu', category: 'todo' },
  { key: 'transmis', label: 'Transmis', category: 'todo' },
  { key: 'cnepc', label: 'Cnepc', category: 'todo' },
  { key: 'valide', label: 'Validé', category: 'todo' },
  { key: 'envoye', label: 'Envoyé', category: 'todo' },
  { key: 'cneddt', label: 'Envoyé à la biométrie', category: 'done' },
  { key: 'autre', label: 'Autre', category: 'todo' },
];

/** Clé de groupement par statut dossier (fallback) */
function getStatutGroupKey(dossier: ReceptionDossier): string {
  if (isDossierStatutSentToCNEDDT(dossier.statut)) return 'cneddt';
  const s = (dossier.statut || '').trim().toLowerCase();
  const found = STATUT_ORDER.find((o) => o.key === s);
  return found ? found.key : s || 'autre';
}

/** Normalise une chaîne pour comparaison avec libellé d'étape (trim, majuscules, sans accents, espaces simples) */
function normalizeForMatch(s: string): string {
  return (s || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/_/g, ' ');
}

function normalizeSearchValue(s: unknown): string {
  return String(s ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Sources nom/prénom candidat depuis mapping UI + payload brut API (details.dossier_complet). */
function getDossierCandidateSearchTexts(d: ReceptionDossier): string[] {
  const complet = (d.details as any)?.dossier_complet;
  const personne = complet?.candidat?.personne;
  const nomTop = d.candidatNom;
  const prenomTop = d.candidatPrenom;
  const nomRaw = personne?.nom ?? complet?.candidat_nom ?? '';
  const prenomRaw = personne?.prenom ?? complet?.candidat_prenom ?? '';
  const nomComplet = personne?.nom_complet ?? '';

  const nom = normalizeSearchValue(nomTop || nomRaw);
  const prenom = normalizeSearchValue(prenomTop || prenomRaw);
  const full1 = `${nom} ${prenom}`.trim();
  const full2 = `${prenom} ${nom}`.trim();
  const fullRaw = normalizeSearchValue(nomComplet);

  return [nom, prenom, full1, full2, fullRaw].filter(Boolean);
}

/** Champs pour filtre instantané local (nom/prénom + référence + auto-école). */
function getDossierInstantFilterTexts(d: ReceptionDossier): string[] {
  const candidat = getDossierCandidateSearchTexts(d);
  const ref = normalizeSearchValue(d.reference);
  const ae = normalizeSearchValue(d.autoEcoleNom);
  return [...candidat, ref, ae].filter(Boolean);
}

/** Retourne l'index de l'étape dont le libellé correspond au statut du dossier, ou -1 */
function findCompletedEtapeIndex(statut: string | null | undefined, etapes: EtapeCircuit[]): number {
  if (!statut || !etapes?.length) return -1;
  const statutNorm = normalizeForMatch(statut);
  if (!statutNorm) return -1;
  return etapes.findIndex((e) => {
    const libelleNorm = normalizeForMatch(e.libelle || '');
    return libelleNorm === statutNorm || statutNorm.includes(libelleNorm) || libelleNorm.includes(statutNorm);
  });
}

/** Retourne l'étape en cours du dossier (celle dont le libellé correspond au statut, ou la première si aucune correspondance). Utilisé pour filtrer par rôle (ROLE_CNEPC voit les dossiers dont l'étape en cours a ce rôle). */
function getCurrentEtapeFromCircuit(
  dossier: ReceptionDossier,
  circuit: CircuitSuivi | null | undefined
): EtapeCircuit | null {
  if (isDossierStatutSentToCNEDDT(dossier.statut)) return null;
  const circuitWithEtapes = circuit?.etapes?.length
    ? circuit
    : (dossier.details?.dossier_complet as any)?.circuit as CircuitSuivi | undefined;
  const c = circuitWithEtapes ?? circuit;
  const etapes = c?.etapes;
  if (!etapes?.length) return null;
  const completedIndex = findCompletedEtapeIndex(dossier.statut, etapes);
  if (completedIndex >= 0) return etapes[completedIndex];
  return etapes[0] ?? null;
}

/** Indique si le dossier est à l'étape finale ROLE_CNEPC (prêt à être finalisé / envoyé à la biométrie) */
function isDossierAtCNEPCFinalStep(
  dossier: ReceptionDossier,
  circuit: CircuitSuivi | null | undefined
): boolean {
  if (isDossierStatutSentToCNEDDT(dossier.statut)) return false;
  const currentEtape = getCurrentEtapeFromCircuit(dossier, circuit);
  if (!currentEtape?.roles?.length) return false;
  return currentEtape.roles.some((r) => String(r).toUpperCase() === 'ROLE_CNEPC');
}

/**
 * Clé de groupement pour la barre de statistiques : étape actuelle du dossier (celle affichée dans CircuitEtapesCard/CircuitEtapesView).
 * Retourne le libellé de l'étape dont le statut correspond au dossier, ou 'cneddt', ou la première étape si aucune correspondance.
 */
function getCurrentEtapeKey(dossier: ReceptionDossier, circuit: CircuitSuivi | null | undefined): string {
  if (isDossierStatutSentToCNEDDT(dossier.statut)) return 'cneddt';
  const etapes = circuit?.etapes;
  if (!etapes?.length) return getStatutGroupKey(dossier);
  const completedIndex = findCompletedEtapeIndex(dossier.statut, etapes);
  if (completedIndex >= 0) return (etapes[completedIndex]?.libelle ?? '').trim() || getStatutGroupKey(dossier);
  return (etapes[0]?.libelle ?? '').trim() || getStatutGroupKey(dossier);
}

/** Carte d'un dossier avec photo justificative (photo / demi-carte) si présente */
const DossierCard: React.FC<{
  dossier: ReceptionDossier;
  suiviMap: Map<string, any>;
  loadingSuivi: boolean;
  isNouveauPermis: boolean;
  onOpenForTreatment?: (d: ReceptionDossier) => void;
  openingDossierId: string | null;
  onDeleteClick: (d: ReceptionDossier) => void;
  onDelete?: (id: string) => void | Promise<void>;
  getSuiviColor: (s: string) => string;
  /** À l'étape finale ROLE_CNEPC : affiche checkbox au lieu du bouton ouverture */
  isAtCNEPCFinalStep?: boolean;
  selected?: boolean;
  onToggleSelect?: (d: ReceptionDossier) => void;
}> = ({ dossier, suiviMap, loadingSuivi, isNouveauPermis, onOpenForTreatment, openingDossierId, onDeleteClick, onDelete, getSuiviColor, isAtCNEPCFinalStep, selected, onToggleSelect }) => {
  const { photoUrl, loading: loadingPhoto } = useDossierPhoto(dossier.id);
  const sentToCNEDDT = isDossierStatutSentToCNEDDT(dossier.statut);
  const suivi = sentToCNEDDT ? null : suiviMap.get(dossier.id);
  const formationDetails = dossier.details?.formation_complete || dossier.details?.dossier?.formation;
  const formationNom = formationDetails?.type_permis?.libelle || formationDetails?.nom || 'Formation';

  return (
    <Card sx={{ boxShadow: 'none', borderRadius: 0, '&:hover': { boxShadow: 'none', transition: 'box-shadow 0.3s ease' } }}>
      <CardContent sx={{ overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
          <Box sx={{ flexShrink: 0 }}>
            {loadingPhoto && !photoUrl ? (
              <Skeleton variant="rectangular" width={64} height={80} sx={{ borderRadius: 1 }} />
            ) : photoUrl ? (
              <Box
                component="img"
                src={photoUrl}
                alt="Photo candidat"
                sx={{
                  width: 64,
                  height: 80,
                  objectFit: 'cover',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 64,
                  height: 80,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  color: 'text.disabled',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Photo absente"
              >
                <UserCircleIcon className="w-10 h-10" />
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }} noWrap title={dossier.reference}>
                {dossier.reference}
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }} noWrap title={`${dossier.candidatNom} ${dossier.candidatPrenom}`}>
                {dossier.candidatNom} {dossier.candidatPrenom}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1, minWidth: 0, maxWidth: '100%' }}>
                {sentToCNEDDT ? (
                  <Chip label="Envoyé à la biométrie" size="small" color="success" variant="filled" sx={{ fontWeight: 600, fontSize: '0.7rem', maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }} />
                ) : loadingSuivi ? (
                  <Fade in={true} timeout={300}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 1 }} />
                    </Box>
                  </Fade>
                ) : suivi ? (
                  <Chip label={dossier.statut ?? '—'} size="small" color={getSuiviColor(suivi.status) as any} variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem', maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }} />
                ) : null}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
              {isAtCNEPCFinalStep && onToggleSelect ? (
                <Tooltip title={selected ? 'Désélectionner' : 'Sélectionner pour finaliser'}>
                  <Checkbox
                    size="small"
                    checked={!!selected}
                    onChange={() => onToggleSelect(dossier)}
                    sx={{ p: 0.5 }}
                  />
                </Tooltip>
              ) : onOpenForTreatment && !sentToCNEDDT ? (
                <Tooltip title={openingDossierId === dossier.id ? 'Ouverture…' : 'Ouvrir pour traitement'}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => onOpenForTreatment(dossier)}
                      disabled={openingDossierId !== null}
                      sx={{ color: '#2e7d32' }}
                    >
                      <LockOpen fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
              {onDelete && (
                <Tooltip title="Supprimer le dossier">
                  <IconButton size="small" onClick={() => onDeleteClick(dossier)} sx={{ color: '#d32f2f' }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={3}>
          {isNouveauPermis && (
            <>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>Formation</Typography>
                <Typography variant="body1" fontWeight={600} color="primary.main">{formationNom}</Typography>
                {formationDetails?.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{formationDetails.description}</Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>Auto-école</Typography>
                <Typography variant="body1" fontWeight={500}>{dossier.autoEcoleNom}</Typography>
              </Grid>
            </>
          )}
          {sentToCNEDDT && (
            <Grid item xs={12}>
              <Alert severity="success" icon={<CheckCircleIcon className="w-5 h-5" />} sx={{ width: '100%' }}>
                <Typography variant="body1" fontWeight="bold" className="font-display" gutterBottom>DOSSIER ENVOYÉ A LA BIOMETRIE</Typography>
                <Typography variant="body2" className="font-primary">Prise de donnée biométrique.</Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

const ReceptionDossierTypeTable: React.FC<ReceptionDossierTypeTableProps> = ({ 
  dossiers, 
  typeDemandeName,
  typeDemandeId,
  circuit: circuitProp,
  onReceive: _onReceive, 
  onOpenDocuments: _onOpenDocuments,
  onDelete
}) => {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(15);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; dossier: ReceptionDossier | null }>({
    open: false,
    dossier: null
  });
  const [deleting, setDeleting] = React.useState(false);
  const [openingDossierId, setOpeningDossierId] = React.useState<string | null>(null);
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [selectedStatutKey, setSelectedStatutKey] = React.useState<string>('all');
  const [provinces, setProvinces] = React.useState<Referentiel[]>([]);
  const [centres, setCentres] = React.useState<Referentiel[]>([]);
  const [selectedDossierIds, setSelectedDossierIds] = React.useState<Set<string>>(new Set());
  const [sendingToCNEDDT, setSendingToCNEDDT] = React.useState(false);
  /** Filtre centre instantané (données déjà chargées pour la page courante, aucun appel API). */
  const [centreUiFilterId, setCentreUiFilterId] = React.useState<string | null>(null);
  /** Filtre instantané local sur la liste déjà chargée (sans appel API). */
  const [searchTerm, setSearchTerm] = React.useState<string>('');

  const userRole = useUserRole();
  const { user } = useAppStore();

  const canFilterByCentreLocally = React.useMemo(() => {
    const r = normalizeRole(String((user as any)?.role || ''));
    return r === 'cnepc' || r === 'admin' || r === 'superadmin';
  }, [user]);
  // centre_id de l'agent : store (rempli au login) ou localStorage 'user' (fallback pour session existante)
  const userCentreId = React.useMemo(() => {
    const fromStore = (user as any)?.centre_id;
    if (fromStore && String(fromStore).trim()) return String(fromStore).trim();
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (stored) {
        const parsed = JSON.parse(stored) as { centre_id?: string };
        if (parsed?.centre_id && String(parsed.centre_id).trim()) return String(parsed.centre_id).trim();
      }
    } catch {}
    return null;
  }, [user]);

  // Log de la personne connectée dans la console (visible à chaque visite de la page)
  React.useEffect(() => {
    const userData = user ?? (() => {
      try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })();
    if (userData) {
      console.log('👤 Personne connectée (JSON):', JSON.stringify(userData, null, 2));
      console.log('📍 centre_id:', userCentreId ?? 'Non renseigné');
    }
  }, [user, userCentreId]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      referentielService.getReferentielsByType('province'),
      referentielService.getReferentielsByType('centre'),
    ]).then(([provincesData, centresData]) => {
      if (!cancelled) {
        setProvinces(provincesData || []);
        setCentres(centresData || []);
      }
    }).catch(() => {
      if (!cancelled) {
        setProvinces([]);
        setCentres([]);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const centresSorted = React.useMemo(
    () => [...centres].sort((a, b) => (a.libelle || '').localeCompare(b.libelle || '', 'fr')),
    [centres]
  );

  /** Cache O(n) : province/centre par dossier (évite de recalculer plusieurs fois dans les filtres + groupements) */
  const dossierLocById = React.useMemo(() => {
    const m = new Map<string, { province_id: string; centre_id: string }>();
    for (const d of dossiers) {
      m.set(d.id, getDossierProvinceCentre(d));
    }
    return m;
  }, [dossiers]);

  const dossiersAfterCentreUiFilter = React.useMemo(() => {
    if (!canFilterByCentreLocally || !centreUiFilterId?.trim()) return dossiers;
    const cid = centreUiFilterId.trim();
    return dossiers.filter((d) => {
      const { centre_id } = dossierLocById.get(d.id) ?? getDossierProvinceCentre(d);
      return centre_id !== NON_RENSEIGNE_KEY && centre_id === cid;
    });
  }, [dossiers, canFilterByCentreLocally, centreUiFilterId, dossierLocById]);

  // Filtrer par centre de l'agent uniquement (sans restriction par rôle ou étape).
  // Les dossiers envoyés à la biométrie (CNEDDT) passent toujours, leur centre_id peut être vide.
  const dossiersByCentre = React.useMemo(() => {
    if (canFilterByCentreLocally) return dossiersAfterCentreUiFilter;
    if ((userRole ?? '').toLowerCase().includes('superadmin')) return dossiers;
    if (!userCentreId) return dossiers;
    return dossiers.filter((d) => {
      if (isDossierStatutSentToCNEDDT(d.statut)) return true;
      const { centre_id } = dossierLocById.get(d.id) ?? getDossierProvinceCentre(d);
      return centre_id !== NON_RENSEIGNE_KEY && centre_id === userCentreId;
    });
  }, [dossiers, dossiersAfterCentreUiFilter, userCentreId, userRole, canFilterByCentreLocally, dossierLocById]);

  /** Filtre instantané par correspondance (liste déjà chargée). */
  const dossiersAfterSearch = React.useMemo(() => {
    if (!searchTerm || searchTerm.trim() === '') return dossiersByCentre;
    const q = normalizeSearchValue(searchTerm);
    return dossiersByCentre.filter((d) => getDossierInstantFilterTexts(d).some((v) => v.includes(q)));
  }, [dossiersByCentre, searchTerm]);

  // Archivage : uniquement les dossiers à l’étape paiement (statut ou étape courante du circuit)
  const filteredDossiers = React.useMemo(() => {
    if (!isArchivageRole(userRole)) return dossiersAfterSearch;
    return dossiersAfterSearch.filter((d) => {
      if (isDossierStatutSentToCNEDDT(d.statut)) return false;
      const st = (d.statut ?? '').toUpperCase();
      if (st.includes('EN_ATTENTE_PAIEMENT')) return true;
      const current = getCurrentEtapeFromCircuit(d, circuitProp);
      return current != null && isEtapePaiementCircuit(current);
    });
  }, [dossiersAfterSearch, userRole, circuitProp]);

  const { suiviMap, loadingSuivi } = useDossierSuivi(filteredDossiers, typeDemandeName, typeDemandeId, circuitProp);

  const isNouveauPermis = React.useMemo(() => {
    return isNouveauPermisType(typeDemandeName, suiviMap);
  }, [typeDemandeName, suiviMap]);

  const handleDeleteClick = (dossier: ReceptionDossier) => {
    setDeleteDialog({ open: true, dossier });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.dossier) return;

    setDeleting(true);
    try {
      await axiosClient.delete(`/dossiers/${deleteDialog.dossier.id}`);
      
      setSnackbar({
        open: true,
        message: 'Dossier supprimé avec succès',
        severity: 'success'
      });

      // Appeler le callback si fourni
      if (onDelete) {
        await onDelete(deleteDialog.dossier.id);
      }

      setDeleteDialog({ open: false, dossier: null });
    } catch (error: any) {
      console.error('Erreur lors de la suppression du dossier:', error);
      setSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Erreur lors de la suppression du dossier',
        severity: 'error'
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, dossier: null });
  };

  const handleOpenForTreatment = async (d: ReceptionDossier) => {
    setOpeningDossierId(d.id);
    try {
      await axiosClient.post(`/dossiers/${d.id}/open`);
      navigate(ROUTES.RECEPTION_TRAITEMENT_DOSSIER_CIRCUIT.replace(':id', d.id), {
        state: { openToNextStep: true, traitementQueueIds },
      });
    } catch (error: any) {
      const message = error?.response?.status === 423
        ? (error?.response?.data?.message || 'Ce dossier est déjà ouvert par un autre agent.')
        : (error?.response?.data?.message || 'Impossible d\'ouvrir le dossier.');
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setOpeningDossierId(null);
    }
  };

  const handleToggleSelect = (d: ReceptionDossier) => {
    setSelectedDossierIds((prev) => {
      const next = new Set(prev);
      if (next.has(d.id)) next.delete(d.id);
      else next.add(d.id);
      return next;
    });
  };

  const handleFinaliser = async () => {
    const ids = Array.from(selectedDossierIds);
    if (ids.length === 0) return;
    setSendingToCNEDDT(true);
    const errors: string[] = [];
    const successIds: string[] = [];
    for (const id of ids) {
      try {
        await sendDossierToCNEDDT(id, circuitProp ?? undefined, typeDemandeId ?? undefined);
        successIds.push(id);
      } catch (e: any) {
        const msg = e?.message || e?.response?.data?.message || 'Erreur inconnue';
        errors.push(`${id}: ${msg}`);
      }
    }
    setSendingToCNEDDT(false);
    setSelectedDossierIds(new Set());
    if (successIds.length > 0 && onDelete) {
      for (const id of successIds) await onDelete(id);
    }
    if (errors.length > 0) {
      setSnackbar({ open: true, message: errors.join(' ; '), severity: 'error' });
    } else if (successIds.length > 0) {
      setSnackbar({
        open: true,
        message: successIds.length === 1
          ? 'Dossier envoyé à la biométrie avec succès'
          : `${successIds.length} dossiers envoyés à la biométrie avec succès`,
        severity: 'success',
      });
    }
  };

  // Gestion de la pagination
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Grouper les dossiers par étape actuelle (celle affichée dans CircuitEtapesCard/CircuitEtapesView)
  const dossiersByCurrentEtape = React.useMemo(() => {
    const grouped = new Map<string, ReceptionDossier[]>();
    filteredDossiers.forEach((d) => {
      const key = getCurrentEtapeKey(d, circuitProp);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(d);
    });
    const etapes = circuitProp?.etapes ?? [];
    const etapeLibelles = etapes.map((e) => (e.libelle ?? '').trim()).filter(Boolean);
    const orderKeys: string[] = [];
    etapeLibelles.forEach((lib) => {
      if (grouped.has(lib)) orderKeys.push(lib);
    });
    const otherKeys = Array.from(grouped.keys()).filter((k) => k !== 'cneddt' && !etapeLibelles.includes(k));
    orderKeys.push(...otherKeys);
    if (grouped.has('cneddt')) orderKeys.push('cneddt');
    const ordered: ReceptionDossier[] = [];
    orderKeys.forEach((k) => ordered.push(...(grouped.get(k) || [])));
    return { grouped, ordered, orderKeys };
  }, [filteredDossiers, circuitProp]);

  // Menu de la sidebar : Tous, puis chaque étape du circuit (même ordre que CircuitEtapesView), puis Envoyé à la biométrie
  const statusMenuSections = React.useMemo(() => {
    const todoItems: { id: string; label: string; count: number }[] = [];
    const doneItems: { id: string; label: string; count: number }[] = [];
    dossiersByCurrentEtape.orderKeys.forEach((k) => {
      const count = dossiersByCurrentEtape.grouped.get(k)?.length ?? 0;
      if (count > 0) {
        const label = k === 'cneddt' ? 'Envoyé à la biométrie' : k;
        const item = { id: k, label, count };
        if (k === 'cneddt') doneItems.push(item);
        else todoItems.push(item);
      }
    });
    const todoTotal = todoItems.reduce((s, i) => s + i.count, 0);
    const doneTotal = doneItems.reduce((s, i) => s + i.count, 0);
    return {
      allItem: { id: 'all', label: 'Tous', count: filteredDossiers.length },
      todoItems,
      doneItems,
      todoTotal,
      doneTotal,
    };
  }, [filteredDossiers.length, dossiersByCurrentEtape]);

  // Dossiers à afficher selon l'étape sélectionnée dans la sidebar (étape actuelle = statut dossier)
  const dossiersToShow = React.useMemo(() => {
    if (selectedStatutKey === 'all') return dossiersByCurrentEtape.ordered;
    return dossiersByCurrentEtape.grouped.get(selectedStatutKey) ?? [];
  }, [selectedStatutKey, dossiersByCurrentEtape]);

  // Libellés province / centre : référentiels + enrichissement depuis les dossiers (API renvoie province/centre imbriqués)
  const provinceIdToLabel = React.useMemo(() => {
    const m = new Map<string, string>();
    m.set(NON_RENSEIGNE_KEY, 'Non renseigné');
    provinces.forEach((p) => m.set(p.id, p.libelle || p.code || p.id));
    dossiersToShow.forEach((d) => {
      const raw = (d.details as any)?.dossier_complet;
      const prov = raw?.province;
      if (prov?.id && prov?.libelle) m.set(prov.id, prov.libelle);
    });
    return m;
  }, [provinces, dossiersToShow]);
  const centreIdToLabel = React.useMemo(() => {
    const m = new Map<string, string>();
    m.set(NON_RENSEIGNE_KEY, 'Non renseigné');
    centres.forEach((c) => m.set(c.id, c.libelle || c.code || c.id));
    dossiersToShow.forEach((d) => {
      const raw = (d.details as any)?.dossier_complet;
      const cent = raw?.centre;
      if (cent?.id && cent?.libelle) m.set(cent.id, cent.libelle);
    });
    return m;
  }, [centres, dossiersToShow]);

  // Regroupement par province puis par centre
  const groupedByProvinceCentre = React.useMemo(() => {
    const byProvince = new Map<string, Map<string, ReceptionDossier[]>>();
    dossiersToShow.forEach((d) => {
      const { province_id, centre_id } = dossierLocById.get(d.id) ?? getDossierProvinceCentre(d);
      if (!byProvince.has(province_id)) byProvince.set(province_id, new Map());
      const byCentre = byProvince.get(province_id)!;
      if (!byCentre.has(centre_id)) byCentre.set(centre_id, []);
      byCentre.get(centre_id)!.push(d);
    });
    return byProvince;
  }, [dossiersToShow, dossierLocById]);

  // Ordre d'affichage : provinces et centres triés par libellé, "Non renseigné" en dernier
  const provinceCentreSections = React.useMemo(() => {
    const sections: { provinceId: string; centreId: string; labelProvince: string; labelCentre: string; dossiers: ReceptionDossier[] }[] = [];
    const provinceIds = Array.from(groupedByProvinceCentre.keys()).sort((a, b) => {
      if (a === NON_RENSEIGNE_KEY) return 1;
      if (b === NON_RENSEIGNE_KEY) return -1;
      return (provinceIdToLabel.get(a) || '').localeCompare(provinceIdToLabel.get(b) || '');
    });
    provinceIds.forEach((provinceId) => {
      const byCentre = groupedByProvinceCentre.get(provinceId)!;
      const centreIds = Array.from(byCentre.keys()).sort((a, b) => {
        if (a === NON_RENSEIGNE_KEY) return 1;
        if (b === NON_RENSEIGNE_KEY) return -1;
        return (centreIdToLabel.get(a) || '').localeCompare(centreIdToLabel.get(b) || '');
      });
      const labelProvince = provinceIdToLabel.get(provinceId) || provinceId;
      centreIds.forEach((centreId) => {
        const dossiers = byCentre.get(centreId) || [];
        sections.push({
          provinceId,
          centreId,
          labelProvince,
          labelCentre: centreIdToLabel.get(centreId) || centreId,
          dossiers,
        });
      });
    });
    return sections;
  }, [groupedByProvinceCentre, provinceIdToLabel, centreIdToLabel]);

  /** Ordre d’affichage courant (filtre + onglet) pour enchaîner les traitements sans repasser par la liste */
  const traitementQueueIds = React.useMemo(() => {
    const ids: string[] = [];
    provinceCentreSections.forEach((section) => {
      section.dossiers.forEach((d) => {
        if (!isDossierStatutSentToCNEDDT(d.statut)) ids.push(d.id);
      });
    });
    return ids;
  }, [provinceCentreSections]);

  const handleStatutTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedStatutKey(newValue);
    setPage(0);
  };

  // Réinitialiser l'onglet si le statut sélectionné n'a plus de dossiers
  React.useEffect(() => {
    if (selectedStatutKey !== 'all' && dossiersToShow.length === 0) {
      setSelectedStatutKey('all');
      setPage(0);
    }
  }, [selectedStatutKey, dossiersToShow.length]);

  // Remettre la page à 0 si elle dépasse le nombre de sections
  React.useEffect(() => {
    const maxPage = provinceCentreSections.length <= 0 ? 0 : Math.max(0, Math.ceil(provinceCentreSections.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(0);
  }, [provinceCentreSections.length, rowsPerPage, page]);

  return (
    <Box>
      <Box sx={{ mb: 2, maxWidth: 520 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Filtrer par nom, prénom, référence ou auto-école…"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      {canFilterByCentreLocally && (
        <Box sx={{ mb: 2, maxWidth: 400 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="reception-dossiers-centre-filter-label">Filtrer par centre</InputLabel>
            <Select
              labelId="reception-dossiers-centre-filter-label"
              label="Filtrer par centre"
              value={centreUiFilterId ?? ''}
              onChange={(e) => {
                const v = e.target.value as string;
                setCentreUiFilterId(v === '' ? null : v);
              }}
            >
              <MenuItem value="">
                <em>Tous les centres</em>
              </MenuItem>
              {centresSorted.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.libelle || c.code || c.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            Filtre instantané sur la page chargée (aucun rechargement).
          </Typography>
        </Box>
      )}
      {filteredDossiers.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, maxWidth: 400, mx: 'auto' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'action.selected',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderOpen sx={{ fontSize: 32, color: 'text.secondary' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Aucun dossier à afficher
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              {canFilterByCentreLocally && centreUiFilterId?.trim() && dossiers.length > 0
                ? 'Aucun dossier de ce centre parmi les résultats actuels.'
                : 'Aucun dossier ne correspond à ce type de demande pour votre profil. Les nouveaux dossiers apparaîtront ici lorsqu’ils seront disponibles.'}
            </Typography>
          </Box>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 0 }}>
            <Paper
              elevation={0}
              sx={{
                width: 240,
                minWidth: 240,
                flexShrink: 0,
                borderRight: 1,
                borderColor: 'divider',
                borderRadius: 0,
                py: 1,
              }}
            >
              <List disablePadding dense>
                <ListItemButton
                  selected={selectedStatutKey === 'all'}
                  onClick={() => handleStatutTabChange(null as any, 'all')}
                  sx={{
                    py: 1.25,
                    px: 2,
                    '&.Mui-selected': { borderLeft: 3, borderColor: 'primary.main', pl: 'calc(16px - 3px)' },
                  }}
                >
                  <ListItemText
                    primary={statusMenuSections.allItem.label}
                    primaryTypographyProps={{ fontWeight: selectedStatutKey === 'all' ? 600 : 400 }}
                  />
                  <Badge
                    badgeContent={statusMenuSections.allItem.count}
                    color="primary"
                    max={999}
                    sx={{ ml: 1 }}
                  />
                </ListItemButton>
              </List>
              {statusMenuSections.todoItems.length > 0 && (
                <>
                  <Typography variant="overline" sx={{ px: 2, pt: 2, pb: 0.5, display: 'block', color: 'text.secondary' }}>
                    Étapes du circuit ({statusMenuSections.todoTotal})
                  </Typography>
                  <List disablePadding dense>
                    {statusMenuSections.todoItems.map((item) => (
                      <ListItemButton
                        key={item.id}
                        selected={selectedStatutKey === item.id}
                        onClick={() => handleStatutTabChange(null as any, item.id)}
                        sx={{
                          py: 1.25,
                          px: 2,
                          '&.Mui-selected': { borderLeft: 3, borderColor: 'primary.main', pl: 'calc(16px - 3px)' },
                        }}
                      >
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontWeight: selectedStatutKey === item.id ? 600 : 400,
                            fontSize: '0.875rem',
                          }}
                        />
                        <Badge
                          badgeContent={item.count}
                          color="primary"
                          max={999}
                          sx={{ ml: 1 }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </>
              )}
              {statusMenuSections.doneItems.length > 0 && (
                <>
                  <Typography variant="overline" sx={{ px: 2, pt: 2, pb: 0.5, display: 'block', color: 'text.secondary' }}>
                    Traitement terminé ({statusMenuSections.doneTotal})
                  </Typography>
                  <List disablePadding dense>
                    {statusMenuSections.doneItems.map((item) => (
                      <ListItemButton
                        key={item.id}
                        selected={selectedStatutKey === item.id}
                        onClick={() => handleStatutTabChange(null as any, item.id)}
                        sx={{
                          py: 1.25,
                          px: 2,
                          '&.Mui-selected': { borderLeft: 3, borderColor: 'primary.main', pl: 'calc(16px - 3px)' },
                        }}
                      >
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontWeight: selectedStatutKey === item.id ? 600 : 400, fontSize: '0.875rem' }}
                        />
                        <Badge
                          badgeContent={item.count}
                          color="success"
                          max={999}
                          sx={{ ml: 1 }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </>
              )}
            </Paper>
            <Box sx={{ flex: 1, minWidth: 0, pl: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Type : {typeDemandeName}
                </Typography>
                {selectedDossierIds.size > 0 && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={sendingToCNEDDT ? <CircularProgress size={18} color="inherit" /> : <Send />}
                    onClick={handleFinaliser}
                    disabled={sendingToCNEDDT}
                  >
                    {sendingToCNEDDT ? 'Envoi en cours…' : `Finaliser (${selectedDossierIds.size})`}
                  </Button>
                )}
              </Box>
              {provinceCentreSections.length === 0 ? (
                <Box
                  sx={{
                    py: 4,
                    px: 3,
                    textAlign: 'center',
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    border: '1px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Aucun dossier à afficher dans cette catégorie.
                  </Typography>
                </Box>
              ) : (
                <>
                  {provinceCentreSections.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((section) => (
                    <Box key={`${section.provinceId}-${section.centreId}`} sx={{ mb: 4 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: 'text.primary' }}>
                        Province : {section.labelProvince} — Centre : {section.labelCentre}
                        <Chip label={section.dossiers.length} size="small" sx={{ ml: 1 }} />
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 2,
                          alignItems: 'stretch',
                        }}
                      >
                        {section.dossiers.map((dossier) => (
                          <Box
                            key={dossier.id}
                            sx={{
                              minWidth: 280,
                              maxWidth: 320,
                              flex: '1 1 280px',
                            }}
                          >
                            <DossierCard
                              dossier={dossier}
                              suiviMap={suiviMap}
                              loadingSuivi={loadingSuivi}
                              isNouveauPermis={isNouveauPermis}
                              onOpenForTreatment={isDossierAtCNEPCFinalStep(dossier, circuitProp) ? undefined : handleOpenForTreatment}
                              openingDossierId={openingDossierId}
                              onDeleteClick={handleDeleteClick}
                              onDelete={onDelete}
                              getSuiviColor={getSuiviColor}
                              isAtCNEPCFinalStep={isDossierAtCNEPCFinalStep(dossier, circuitProp)}
                              selected={selectedDossierIds.has(dossier.id)}
                              onToggleSelect={isDossierAtCNEPCFinalStep(dossier, circuitProp) ? handleToggleSelect : undefined}
                            />
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ))}
                  <TablePagination
                    component="div"
                    count={provinceCentreSections.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 15, 25]}
                    labelRowsPerPage="Sections par page:"
                    sx={{ mt: 3 }}
                  />
                </>
              )}
            </Box>
          </Box>
        </>
      )}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirmer la suppression
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Êtes-vous sûr de vouloir supprimer le dossier <strong>{deleteDialog.dossier?.reference}</strong> du candidat <strong>{deleteDialog.dossier?.candidatNom} {deleteDialog.dossier?.candidatPrenom}</strong> ?
            <br />
            <br />
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Annuler
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReceptionDossierTypeTable;

