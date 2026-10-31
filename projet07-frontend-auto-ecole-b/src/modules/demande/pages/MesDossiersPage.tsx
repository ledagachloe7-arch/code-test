import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { FolderOpenIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { mesDossiersService, type MesDossiersQuery } from '../services';
import type { Dossier } from '../../cnepc/types/auto-ecole';
import { API_CONFIG } from '../../../shared/constants/api';
import axiosClient from '../../../shared/utils/axiosConfig';
import { fetchDocumentAsBlob } from '../../reception/traitement-dossier/utils/documentHandlers';
import { ROUTES } from '../../../shared/constants';

interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

const asPaginationMeta = (meta?: Record<string, unknown>): PaginationMeta => ({
  current_page: Number(meta?.current_page ?? 1),
  per_page: Number(meta?.per_page ?? 15),
  total: Number(meta?.total ?? 0),
  last_page: Number(meta?.last_page ?? 1),
});

const formatDate = (raw?: string): string => {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleString('fr-FR');
};

const NAVY = '#0d4a7a';
interface PermisDisplayItem {
  numero: string;
  categorie: string;
}

interface DossierDocumentLike {
  chemin_fichier?: string;
  nom_fichier?: string;
  nom?: string;
  type_mime?: string;
  type_document?: { libelle?: string; code?: string } | null;
}

const parsePermisEntry = (entry: unknown): PermisDisplayItem | null => {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const raw = entry.trim();
    if (!raw) return null;
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw) as {
          codification_code?: string;
          numero_permis?: string;
          numero?: string;
          categorie?: string;
          classe?: string;
        };
        const numero = String(parsed.codification_code || parsed.numero_permis || parsed.numero || '').trim();
        const categorie = String(parsed.categorie || parsed.classe || '').trim().toUpperCase();
        if (!numero) return null;
        return { numero, categorie: categorie || '—' };
      } catch {
        return { numero: raw, categorie: '—' };
      }
    }
    return { numero: raw, categorie: '—' };
  }
  if (typeof entry === 'object') {
    const obj = entry as {
      codification_code?: string;
      numero_permis?: string;
      numero?: string;
      categorie?: string;
      classe?: string;
    };
    const numero = String(obj.codification_code || obj.numero_permis || obj.numero || '').trim();
    const categorie = String(obj.categorie || obj.classe || '').trim().toUpperCase();
    if (!numero) return null;
    return { numero, categorie: categorie || '—' };
  }
  return null;
};

const normalizeForSearch = (value?: string): string =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

const resolveDocumentUrl = (rawPath?: string): string => {
  const path = String(rawPath ?? '').trim();
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = String(API_CONFIG.BASE_URL ?? '').replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const findPhotoDocument = (row: Dossier): DossierDocumentLike | null => {
  const docs = ((row as Dossier & { documents?: DossierDocumentLike[] }).documents ?? []) as DossierDocumentLike[];
  if (!Array.isArray(docs) || docs.length === 0) return null;
  return (
    docs.find((d) => {
      const blob = normalizeForSearch(
        [
          d.nom_fichier,
          d.nom,
          d.type_document?.libelle,
          d.type_document?.code,
          d.type_mime,
          d.chemin_fichier,
        ]
          .filter(Boolean)
          .join(' '),
      );
      return blob.includes('photo');
    }) ?? null
  );
};

const extractPermisInfos = (row: Dossier): { principal: string; categorie: string; permisItems: PermisDisplayItem[] } => {
  const r = row as Dossier & {
    numero_permis?: string;
    data_categorie?: Array<{ numero?: string; numero_permis?: string; categorie?: string } | string>;
    permis?: Array<{ numero_permis?: string; categorie?: string }>;
  };
  const dataCategorie = Array.isArray(r.data_categorie) ? r.data_categorie : [];
  const entriesFromCategorie = dataCategorie.map((entry) => parsePermisEntry(entry)).filter((v): v is PermisDisplayItem => v != null);
  const numerosFromCategorie = entriesFromCategorie.map((e) => e.numero);
  const categoriesFromCategorie = dataCategorie
    .map((entry) =>
      typeof entry === 'string'
        ? (() => {
            const raw = entry.trim();
            if (raw.startsWith('{') && raw.endsWith('}')) {
              try {
                const parsed = JSON.parse(raw) as { classe?: string; categorie?: string };
                return String(parsed.categorie || parsed.classe || '').trim();
              } catch {
                return '';
              }
            }
            return '';
          })()
        : (entry?.categorie || '').trim(),
    )
    .filter(Boolean);
  const permisArray = Array.isArray(r.permis) ? r.permis : [];
  const entriesFromPermis = permisArray
    .map((p) => {
      const numero = String(p?.numero_permis || '').trim();
      const categorie = String(p?.categorie || '').trim().toUpperCase();
      if (!numero) return null;
      return { numero, categorie: categorie || '—' };
    })
    .filter((v): v is PermisDisplayItem => v != null);
  const numerosFromPermis = permisArray.map((p) => (p?.numero_permis || '').trim()).filter(Boolean);
  const categoriesFromPermis = permisArray.map((p) => (p?.categorie || '').trim()).filter(Boolean);
  const principal = (r.numero_permis || numerosFromCategorie[0] || numerosFromPermis[0] || '').trim();
  const categorie = Array.from(new Set([...categoriesFromCategorie, ...categoriesFromPermis])).join(', ');
  const allEntries = [...entriesFromCategorie, ...entriesFromPermis];
  if (principal && !allEntries.some((e) => e.numero === principal)) {
    allEntries.unshift({ numero: principal, categorie: '—' });
  }
  const seen = new Set<string>();
  const permisItems = allEntries.filter((e) => {
    if (seen.has(e.numero)) return false;
    seen.add(e.numero);
    return true;
  });
  return {
    principal: principal || '—',
    categorie: categorie || '—',
    permisItems,
  };
};

const MesDossiersPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrlByDossier, setAvatarUrlByDossier] = useState<Record<string, string>>({});
  const [nomFilter, setNomFilter] = useState('');
  const [numeroPermisFilter, setNumeroPermisFilter] = useState('');
  const [typePermisFilter, setTypePermisFilter] = useState('');
  const [filters, setFilters] = useState<MesDossiersQuery>({
    page: 1,
    per_page: 15,
    numero: '',
    type_demande_id: '',
    date_from: '',
    date_to: '',
  });
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mesDossiersService.getMesDossiers(filters);
      setRows(response.data ?? []);
      setPagination(asPaginationMeta(response.meta));
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setError(ax.response?.data?.message ?? ax.message ?? "Erreur lors du chargement de l'historique des dossiers.");
      setRows([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const loadAvatars = async () => {
      const nextMap: Record<string, string> = {};
      for (const row of rows) {
        const dossierId = String(row.id ?? '').trim();
        if (!dossierId) continue;
        try {
          const docsResponse = await axiosClient.get('/documents', { params: { dossier_id: dossierId } });
          const payload = (docsResponse.data?.data ?? docsResponse.data?.documents ?? docsResponse.data) as unknown;
          const docs = Array.isArray(payload) ? (payload as DossierDocumentLike[]) : [];
          const photoDoc = findPhotoDocument({ ...row, documents: docs } as Dossier);
          if (!photoDoc) continue;
          const fetched = await fetchDocumentAsBlob(photoDoc as unknown as { id?: string; chemin_fichier?: string; type_mime?: string; nom_fichier?: string; nom?: string });
          if (!fetched || !/^image\//i.test(fetched.contentType)) continue;
          const objectUrl = URL.createObjectURL(fetched.blob);
          objectUrls.push(objectUrl);
          nextMap[dossierId] = objectUrl;
        } catch {
          continue;
        }
      }
      if (!cancelled) setAvatarUrlByDossier(nextMap);
    };
    if (rows.length > 0) {
      void loadAvatars();
    } else {
      setAvatarUrlByDossier({});
    }
    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [rows]);

  const start = useMemo(() => (pagination.current_page - 1) * pagination.per_page + 1, [pagination]);
  const end = useMemo(() => Math.min(pagination.current_page * pagination.per_page, pagination.total), [pagination]);
  const typePermisOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      extractPermisInfos(row).permisItems.forEach((p) => {
        const c = String(p.categorie || '').trim().toUpperCase();
        if (c && c !== '—') set.add(c);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);
  const displayedRows = useMemo(() => {
    const needleName = normalizeForSearch(nomFilter);
    const needlePermis = normalizeForSearch(numeroPermisFilter);
    const needleType = normalizeForSearch(typePermisFilter);
    return rows.filter((row) => {
      const fullName =
        row.candidat?.personne?.nom_complet ??
        `${row.candidat?.personne?.prenom ?? ''} ${row.candidat?.personne?.nom ?? ''}`;
      const matchesName = !needleName || normalizeForSearch(fullName).includes(needleName);
      if (!matchesName) return false;
      const permis = extractPermisInfos(row);
      const matchesPermis = !needlePermis || permis.permisItems.some((p) => normalizeForSearch(p.numero).includes(needlePermis));
      if (!matchesPermis) return false;
      const matchesType = !needleType || permis.permisItems.some((p) => normalizeForSearch(p.categorie) === needleType);
      return matchesType;
    });
  }, [rows, nomFilter, numeroPermisFilter, typePermisFilter]);

  return (
    <Container
      maxWidth={false}
      sx={{
        py: 3,
        px: { xs: 2, md: 3 },
        background: `
          radial-gradient(ellipse 120% 80% at 0% 30%, ${alpha(NAVY, 0.14)} 0%, transparent 52%),
          linear-gradient(180deg, ${alpha('#1976d2', 0.08)} 0%, transparent 42%),
          linear-gradient(to bottom, #f8fbff, #fafcff)
        `,
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          borderColor: alpha(NAVY, 0.22),
          backgroundImage: `linear-gradient(168deg, rgba(255,255,255,0.995) 0%, ${alpha('#1976d2', 0.07)} 46%, rgba(255,255,255,0.98) 100%)`,
          boxShadow: `0 12px 28px ${alpha('#1976d2', 0.12)}`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: alpha('#1976d2', 0.14),
              color: '#1565c0',
              border: `1px solid ${alpha('#1976d2', 0.25)}`,
            }}
          >
            <FolderOpenIcon style={{ width: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Mes dossiers
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Historique des envois CNEDDT de l&apos;utilisateur connecté (statut exact DOSSIER ENVOYER).
            </Typography>
          </Box>
          <Chip
            label="Historique CNEDDT"
            sx={{
              ml: 'auto',
              bgcolor: alpha('#1976d2', 0.12),
              color: '#0b3d66',
              borderColor: alpha('#1976d2', 0.25),
            }}
            variant="outlined"
          />
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            p: 1.75,
            mb: 2,
            borderRadius: 2,
            borderColor: alpha(NAVY, 0.16),
            bgcolor: alpha('#1976d2', 0.04),
            boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.7)}`,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#0b3d66' }}>
              Filtres de recherche
            </Typography>
            <Button
              size="small"
              variant="text"
              sx={{ minHeight: 26, px: 0.8 }}
              onClick={() => {
                setNomFilter('');
                setNumeroPermisFilter('');
                setTypePermisFilter('');
                setFilters((prev) => ({
                  ...prev,
                  page: 1,
                  numero: '',
                  type_demande_id: '',
                  date_from: '',
                  date_to: '',
                }));
              }}
            >
              Réinitialiser
            </Button>
          </Stack>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={3}>
              <TextField
                label="Nom du candidat"
                size="small"
                fullWidth
                value={nomFilter}
                onChange={(e) => setNomFilter(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Numéro (recherche partielle)"
                size="small"
                fullWidth
                value={filters.numero ?? ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, numero: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="Numéro de permis"
                size="small"
                fullWidth
                value={numeroPermisFilter}
                onChange={(e) => setNumeroPermisFilter(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={1.5}>
              <TextField
                select
                label="Type de permis"
                size="small"
                fullWidth
                value={typePermisFilter}
                onChange={(e) => setTypePermisFilter(e.target.value)}
              >
                <MenuItem value="">Tous</MenuItem>
                {typePermisOptions.map((typePermis) => (
                  <MenuItem key={typePermis} value={typePermis}>
                    {typePermis}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={1.25}>
              <TextField
                label="Date du"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={filters.date_from ?? ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, date_from: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={1.25}>
              <TextField
                label="Date au"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={filters.date_to ?? ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, date_to: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={1}>
              <TextField
                label="Par page"
                type="number"
                size="small"
                fullWidth
                inputProps={{ min: 1, max: 100 }}
                value={filters.per_page ?? 15}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    page: 1,
                    per_page: Math.min(100, Math.max(1, Number(e.target.value || 15))),
                  }))
                }
              />
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2, borderColor: alpha(NAVY, 0.16) }}>
          {loading ? (
            <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={22} />
            </Box>
          ) : displayedRows.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              Aucun dossier trouvé pour les filtres sélectionnés{nomFilter ? ' (nom inclus).' : '.'}
            </Alert>
          ) : (
            <Stack spacing={0.8} sx={{ p: 0.8 }}>
              {displayedRows.map((row) => {
                const permis = extractPermisInfos(row);
                const photoDoc = findPhotoDocument(row);
                const avatarSrc = avatarUrlByDossier[String(row.id)] || resolveDocumentUrl(photoDoc?.chemin_fichier);
                const candidatNom =
                  row.candidat?.personne?.nom_complet ??
                  `${row.candidat?.personne?.prenom ?? ''} ${row.candidat?.personne?.nom ?? ''}`.trim() ??
                  '';
                return (
                  <Paper
                    key={row.id}
                    variant="outlined"
                    sx={{
                      px: 1.2,
                      py: 1,
                      borderRadius: 1.5,
                      borderColor: alpha('#1976d2', 0.2),
                      background: `linear-gradient(145deg, ${alpha('#1976d2', 0.05)} 0%, rgba(255,255,255,0.98) 65%)`,
                    }}
                  >
                    <Grid container spacing={0.9} alignItems="center" wrap="nowrap" sx={{ minHeight: 52 }}>
                      <Grid item sx={{ minWidth: 0, flex: 2.8 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block', mb: 0.2 }}>
                          Permis par catégorie
                        </Typography>
                        <Stack direction="row" spacing={0.35} useFlexGap flexWrap="wrap">
                          {permis.permisItems.length > 0 ? (
                            permis.permisItems.map((p) => (
                              <Chip
                                key={p.numero}
                                size="small"
                                label={`${p.categorie}: ${p.numero}`}
                                sx={{
                                  height: 20,
                                  borderRadius: 1,
                                  '& .MuiChip-label': { px: 0.65, fontFamily: 'monospace', fontSize: '0.67rem', lineHeight: 1 },
                                  borderColor: alpha('#1976d2', 0.25),
                                  bgcolor: alpha('#1976d2', 0.06),
                                  color: '#0b3d66',
                                }}
                                variant="outlined"
                              />
                            ))
                          ) : (
                            <Typography variant="body2">—</Typography>
                          )}
                        </Stack>
                      </Grid>
                      <Grid item sx={{ minWidth: 0, flex: 1.3 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block', mb: 0.2 }}>
                          Candidat
                        </Typography>
                        <Stack direction="row" spacing={0.6} alignItems="center">
                          <Avatar
                            src={avatarSrc || undefined}
                            alt={candidatNom || 'Profil usager'}
                            sx={{
                              width: 26,
                              height: 26,
                              bgcolor: alpha('#1976d2', 0.15),
                              border: `1px solid ${alpha('#1976d2', 0.28)}`,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                            }}
                            imgProps={{ referrerPolicy: 'no-referrer' }}
                          >
                            {(candidatNom || 'U').slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" sx={{ lineHeight: 1.15 }} noWrap title={candidatNom || '—'}>
                            {candidatNom || '—'}
                          </Typography>
                        </Stack>
                      </Grid>
                      <Grid item sx={{ minWidth: 0, flex: 1.2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block', mb: 0.2 }}>
                          Type
                        </Typography>
                        <Typography variant="body2" sx={{ lineHeight: 1.15 }} noWrap title={row.type_demande?.name ?? row.type_demande_id ?? '—'}>
                          {row.type_demande?.name ?? row.type_demande_id ?? '—'}
                        </Typography>
                      </Grid>
                      <Grid item sx={{ minWidth: 0, flex: 0.9 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block', mb: 0.2 }}>
                          Créé le
                        </Typography>
                        <Typography variant="body2" sx={{ lineHeight: 1.15 }} noWrap>
                          {formatDate(row.created_at)}
                        </Typography>
                      </Grid>
                      <Grid item sx={{ flexShrink: 0 }}>
                        <Button
                          size="small"
                          variant="contained"
                          sx={{ minHeight: 28, py: 0.2, px: 1.1, alignSelf: 'center', whiteSpace: 'nowrap' }}
                          onClick={() =>
                            navigate(ROUTES.NOUVELLE_DEMANDE, {
                              state: {
                                prefillFromDossier: {
                                  dossier_id: row.id,
                                  candidat_id: row.candidat_id,
                                  candidat_display:
                                    row.candidat?.personne?.nom_complet ??
                                    `${row.candidat?.personne?.prenom ?? ''} ${row.candidat?.personne?.nom ?? ''}`.trim(),
                                  candidat: row.candidat,
                                  type_demande_id: row.type_demande_id,
                                  type_demande_name: row.type_demande?.name,
                                  auto_ecole_id: row.auto_ecole_id,
                                  formation_id: row.formation_id,
                                  referenciel_id: row.referenciel_id,
                                  province_id: (row as Dossier & { province_id?: string }).province_id,
                                  centre_id: (row as Dossier & { centre_id?: string }).centre_id,
                                  commentaires: row.commentaires,
                                  numero_permis: (row as Dossier & { numero_permis?: string }).numero_permis,
                                  numero_origine_permis: (row as Dossier & { numero_origine_permis?: string }).numero_origine_permis,
                                  data_categorie: (row as Dossier & { data_categorie?: unknown[] }).data_categorie,
                                  documents: (row as Dossier & { documents?: unknown[] }).documents,
                                },
                              },
                            })
                          }
                        >
                          Ouvrir
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Paper>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {nomFilter || numeroPermisFilter || typePermisFilter
              ? `${displayedRows.length} résultat(s) filtré(s) sur ${rows.length} ligne(s) chargée(s)`
              : pagination.total > 0
                ? `${start}-${end} sur ${pagination.total}`
                : '0 résultat'}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              disabled={loading || pagination.current_page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))}
            >
              Précédent
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={loading || pagination.current_page >= pagination.last_page}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.min(pagination.last_page, (prev.page ?? 1) + 1),
                }))
              }
            >
              Suivant
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
};

export default MesDossiersPage;
