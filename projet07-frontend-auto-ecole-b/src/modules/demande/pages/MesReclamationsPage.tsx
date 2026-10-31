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
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { mesReclamationsService, type MesReclamationsQuery } from '../services';
import type { Dossier } from '../../cnepc/types/auto-ecole';
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

const MesReclamationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MesReclamationsQuery>({
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
      const response = await mesReclamationsService.getMesReclamations(filters);
      setRows(response.data ?? []);
      setPagination(asPaginationMeta(response.meta));
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setError(ax.response?.data?.message ?? ax.message ?? "Erreur lors du chargement de l'historique des réclamations.");
      setRows([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const start = useMemo(() => (pagination.current_page - 1) * pagination.per_page + 1, [pagination]);
  const end = useMemo(() => Math.min(pagination.current_page * pagination.per_page, pagination.total), [pagination]);

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
            <ChatBubbleLeftRightIcon style={{ width: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Mes réclamations
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Historique des retours CNEDDT (statut exact RETOUR_CNEDDT_POUR_MODIFICATION).
            </Typography>
          </Box>
          <Chip
            label="Retours CNEDDT"
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
            p: 1.5,
            mb: 2,
            borderRadius: 2,
            borderColor: alpha(NAVY, 0.16),
            bgcolor: alpha('#1976d2', 0.03),
          }}
        >
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={3}>
              <TextField
                label="Numéro (recherche partielle)"
                size="small"
                fullWidth
                value={filters.numero ?? ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, numero: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="type_demande_id (UUID)"
                size="small"
                fullWidth
                value={filters.type_demande_id ?? ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, type_demande_id: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={2}>
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
            <Grid item xs={12} md={2}>
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
            <Grid item xs={12} md={2}>
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
          ) : rows.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              Aucune réclamation trouvée pour les filtres sélectionnés.
            </Alert>
          ) : (
            <Stack spacing={0.8} sx={{ p: 0.8 }}>
              {rows.map((row) => {
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
                      <Grid item sx={{ minWidth: 0, flex: 1.4 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block', mb: 0.2 }}>
                          Numéro
                        </Typography>
                        <Typography variant="body2" sx={{ lineHeight: 1.15, fontFamily: 'monospace' }} noWrap>
                          {(row as { numero?: string }).numero ?? row.id}
                        </Typography>
                      </Grid>
                      <Grid item sx={{ minWidth: 0, flex: 1.6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block', mb: 0.2 }}>
                          Type
                        </Typography>
                        <Typography variant="body2" sx={{ lineHeight: 1.15 }} noWrap title={row.type_demande?.name ?? row.type_demande_id ?? '—'}>
                          {row.type_demande?.name ?? row.type_demande_id ?? '—'}
                        </Typography>
                      </Grid>
                      <Grid item sx={{ minWidth: 0, flex: 1.2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block', mb: 0.2 }}>
                          Statut
                        </Typography>
                        <Chip
                          size="small"
                          label={row.statut ?? '—'}
                          color="warning"
                          variant="outlined"
                          sx={{ height: 20, '& .MuiChip-label': { px: 0.7, fontSize: '0.68rem' } }}
                        />
                      </Grid>
                      <Grid item sx={{ minWidth: 0, flex: 1.6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block', mb: 0.2 }}>
                          Candidat
                        </Typography>
                        <Typography variant="body2" sx={{ lineHeight: 1.15 }} noWrap title={candidatNom || '—'}>
                          {candidatNom || '—'}
                        </Typography>
                      </Grid>
                      <Grid item sx={{ minWidth: 0, flex: 1 }}>
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
                          sx={{ minHeight: 28, py: 0.2, px: 1.1, whiteSpace: 'nowrap' }}
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
                          Modifier
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
            {pagination.total > 0 ? `${start}-${end} sur ${pagination.total}` : '0 résultat'}
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

export default MesReclamationsPage;
