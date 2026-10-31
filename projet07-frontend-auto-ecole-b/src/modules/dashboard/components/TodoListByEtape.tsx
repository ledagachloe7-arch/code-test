import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Alert,
  Chip,
  Stack,
  Skeleton,
  Avatar,
  useTheme,
  Fab,
  Badge,
  Popover,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import { ClipboardDocumentListIcon, UserCircleIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ROUTES } from '../../../shared/constants';
import { getDossiersForTodoAdmin } from '../../reception/services/todo-reception.service';
import { circuitSuiviService, type EtapeCircuit } from '../../reception/services/circuit-suivi.service';
import type { DossierTodoItem } from '../../reception/types';

/** Dernière étape : ne représente pas une tâche à traiter. */
function isEtapeFinale(statut: string): boolean {
  const upper = (statut ?? '').toUpperCase();
  return upper.includes('ENVOI DE DOSSIER POUR IMPRESSION') || upper.includes('IMPRESSION');
}

/** Normalise un statut pour le matching (trim, lowercase). */
function normalizeStatut(s: string): string {
  return (s ?? '').trim().toLowerCase();
}

/** Variantes de clé pour matcher un statut dossier avec une étape (libellé peut avoir espaces, "de", etc.). */
function statutKeyVariants(raw: string): string[] {
  const n = normalizeStatut(raw);
  const keys = new Set<string>();
  keys.add(n);
  keys.add(n.replace(/\s+/g, '_'));
  keys.add(n.replace(/_/g, ' '));
  keys.add(n.replace(/\s+de\s+/g, ' ').replace(/\s+/g, '_'));
  keys.add(n.replace(/\s+de\s+/g, '_'));
  return Array.from(keys);
}

/** Libellé affiché pour un statut (remplacer _ par espaces). */
function formatStatutLabel(statut: string): string {
  return (statut ?? '').trim().replace(/_/g, ' ');
}

/** Espace les mots pour certains types de demande (ex. NOUVEAUPERMIS → NOUVEAU PERMIS). */
function formatTypeDemandeLabel(label: string): string {
  if (!label || typeof label !== 'string') return label;
  const upper = label.trim().toUpperCase();
  if (upper === 'NOUVEAUPERMIS') return 'NOUVEAU PERMIS';
  if (upper === 'FICHEENREGISTREMENT') return 'FICHE ENREGISTREMENT';
  return label;
}

interface EtapeInfo {
  libelle: string;
  ordre: number;
  roles: string[];
}

/** Construit une map statut normalisé -> { libelle, ordre, roles } à partir des circuits. Plusieurs clés par étape pour matcher les statuts dossiers. */
async function buildStatutToEtapeMap(): Promise<Map<string, EtapeInfo>> {
  const map = new Map<string, EtapeInfo>();
  try {
    const circuits = await circuitSuiviService.getCircuitsActifs();
    let ordreGlobal = 0;
    for (const circuit of circuits) {
      if (!circuit.id) continue;
      const etapes: EtapeCircuit[] = await circuitSuiviService.getEtapesByCircuitId(circuit.id);
      for (const etape of etapes) {
        const libelle = (etape.libelle ?? etape.statut_libelle ?? etape.code ?? '').trim();
        if (!libelle) continue;
        const info: EtapeInfo = {
          libelle: libelle.replace(/_/g, ' '),
          ordre: etape.ordre ?? ordreGlobal++,
          roles: Array.isArray(etape.roles) ? etape.roles : [],
        };
        const sources = [libelle, (etape.statut_libelle ?? '').trim(), (etape.code ?? '').trim()].filter(Boolean);
        for (const src of sources) {
          for (const key of statutKeyVariants(src)) {
            if (key && !map.has(key)) map.set(key, info);
          }
        }
        ordreGlobal++;
      }
    }
  } catch {
    // ignore
  }
  return map;
}

/** Agrège les dossiers par statut (étape) en excluant l'étape finale (impression). */
function aggregateByStatutAsTasks(items: DossierTodoItem[]): Map<string, DossierTodoItem[]> {
  const byStatut = new Map<string, DossierTodoItem[]>();
  for (const item of items) {
    if (isEtapeFinale(item.statut)) continue;
    const statut = item.statut?.trim() || '__vide__';
    const list = byStatut.get(statut) ?? [];
    list.push(item);
    byStatut.set(statut, list);
  }
  return byStatut;
}

export interface TodoEtapeGroup {
  statut: string;
  etapeInfo: EtapeInfo;
  dossiers: DossierTodoItem[];
}

const TodoListByEtape: React.FC = () => {
  const [dossiers, setDossiers] = useState<DossierTodoItem[]>([]);
  const [statutMap, setStatutMap] = useState<Map<string, EtapeInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const openPopover = Boolean(popoverAnchor);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [items, map] = await Promise.all([
          getDossiersForTodoAdmin(25),
          buildStatutToEtapeMap(),
        ]);
        if (!cancelled) {
          setDossiers(items);
          setStatutMap(map);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Erreur lors du chargement');
          setDossiers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const groupsByEtape = useMemo((): TodoEtapeGroup[] => {
    const byStatut = aggregateByStatutAsTasks(dossiers);
    const groups: TodoEtapeGroup[] = [];
    byStatut.forEach((list, statut) => {
      let etapeInfo: EtapeInfo | undefined;
      for (const key of statutKeyVariants(statut)) {
        etapeInfo = statutMap.get(key);
        if (etapeInfo) break;
      }
      groups.push({
        statut,
        etapeInfo: etapeInfo ?? {
          libelle: formatStatutLabel(statut),
          ordre: 999,
          roles: [],
        },
        dossiers: list,
      });
    });
    groups.sort((a, b) => a.etapeInfo.ordre - b.etapeInfo.ordre);
    return groups;
  }, [dossiers, statutMap]);

  const totalTaskCount = useMemo(
    () => groupsByEtape.reduce((sum, g) => sum + g.dossiers.length, 0),
    [groupsByEtape]
  );

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const handleFabClick = (event: React.MouseEvent<HTMLElement>) => {
    setPopoverAnchor(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setPopoverAnchor(null);
  };

  const popoverContent = () => {
    if (error) {
      return (
        <Box sx={{ p: 2, maxWidth: 320 }}>
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
        </Box>
      );
    }
    if (loading) {
      return (
        <Box sx={{ p: 2, width: 360 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width={120} height={20} />
              <Skeleton variant="text" width={180} height={16} />
            </Box>
          </Stack>
          <Divider sx={{ my: 1 }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ py: 1.5 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="70%" height={20} />
                <Skeleton variant="text" width="50%" height={16} />
              </Box>
            </Stack>
          ))}
        </Box>
      );
    }
    if (groupsByEtape.length === 0) {
      return (
        <Box sx={{ p: 3, width: 320, textAlign: 'center' }}>
          <Box sx={{ color: 'text.disabled', display: 'flex', justifyContent: 'center', mb: 1.5 }}>
            <ClipboardDocumentListIcon className="w-10 h-10" />
          </Box>
          <Typography color="text.secondary" variant="body2">
            Aucune tâche à afficher pour le moment.
          </Typography>
        </Box>
      );
    }
    return (
      <Box sx={{ width: 380, maxHeight: 420, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" fontWeight={700} color="primary">
              Todo par étape
            </Typography>
            <Chip label={`${totalTaskCount} tâche${totalTaskCount > 1 ? 's' : ''}`} size="small" color="primary" />
          </Stack>
        </Box>
        <List sx={{ py: 0, overflow: 'auto', flex: 1 }}>
          {groupsByEtape.map((group) => {
            const { etapeInfo, dossiers: list } = group;
            return (
              <React.Fragment key={group.statut}>
                <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {etapeInfo.libelle}
                  </Typography>
                </Box>
                {list.map((item) => (
                  <ListItemButton
                    key={item.id}
                    component={Link}
                    to={ROUTES.RECEPTION_CANDIDAT_DETAILS.replace(':id', item.id)}
                    onClick={handlePopoverClose}
                    sx={{
                      py: 1.5,
                      alignItems: 'flex-start',
                      borderBottom: 1,
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' },
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 40, height: 40 }}>
                        <UserCircleIcon className="w-5 h-5" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.candidatLabel}
                      primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                      secondary={
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.25 }} flexWrap="wrap">
                          <Typography component="span" variant="caption" color="text.secondary">
                            {formatTypeDemandeLabel(item.typeDemandeName ?? '')}
                            {item.autoEcoleNom ? ` · ${item.autoEcoleNom}` : ''}
                          </Typography>
                        </Stack>
                      }
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <ChevronRightIcon className="w-4 h-4" style={{ color: 'var(--mui-palette-text-disabled)', flexShrink: 0, marginTop: 4 }} />
                  </ListItemButton>
                ))}
              </React.Fragment>
            );
          })}
        </List>
      </Box>
    );
  };

  return (
    <>
      <Fab
        color="primary"
        aria-label="Tâches à traiter"
        onClick={handleFabClick}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: theme.zIndex.speedDial,
        }}
      >
        <Badge badgeContent={totalTaskCount} color="error" showZero>
          <ClipboardDocumentListIcon className="w-6 h-6" />
        </Badge>
      </Fab>
      <Popover
        open={openPopover}
        anchorEl={popoverAnchor}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { borderRadius: 2, border: `1px solid ${glassBorder}`, overflow: 'hidden', mt: -1 } } }}
      >
        {popoverContent()}
      </Popover>
    </>
  );
};

export default TodoListByEtape;
