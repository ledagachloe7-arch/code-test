import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { dossierSupportService } from '../services';
import { gestionDossierService } from '../../cnepc/services/gestion-dossier.service';

type SupportStatus = 'en_attente' | 'en_cours' | 'valide' | 'rejete' | 'transmis' | 'Cnepc';

type SupportDossier = {
  id: string;
  candidat: string;
  typeDemande: string;
  centre: string;
  statut: string;
  createdAt: string;
};

const STATUS_OPTIONS: { value: SupportStatus; label: string }[] = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'valide', label: 'Validé' },
  { value: 'rejete', label: 'Rejeté' },
  { value: 'transmis', label: 'Transmis' },
  { value: 'Cnepc', label: 'CNEDDT' },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function toSupportDossier(raw: Record<string, unknown>): SupportDossier {
  const candidat = asObject(raw.candidat);
  const personne = asObject(candidat?.personne);
  const typeDemande = asObject(raw.type_demande);
  const centre = asObject(raw.centre);
  const candidatNom = [personne?.prenom, personne?.nom]
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return {
    id: String(raw.id ?? ''),
    candidat: candidatNom || `N° ${String(candidat?.numero_candidat ?? '—')}`,
    typeDemande: String(typeDemande?.name ?? '—'),
    centre: String(centre?.libelle ?? centre?.nom ?? '—'),
    statut: String(raw.statut ?? ''),
    createdAt: String(raw.created_at ?? ''),
  };
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SupportDossiersPage: React.FC = () => {
  const [rows, setRows] = useState<SupportDossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusByDossier, setStatusByDossier] = useState<Record<string, SupportStatus>>({});
  const [commentByDossier, setCommentByDossier] = useState<Record<string, string>>({});

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const loadAllDossiers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await dossierSupportService.getAllCreatedDossiers();
      setRows(raw.map(toSupportDossier));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement des dossiers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllDossiers();
  }, [loadAllDossiers]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const dateOnly = r.createdAt ? r.createdAt.slice(0, 10) : '';
      if (statutFilter && r.statut !== statutFilter) return false;
      if (dateFrom && (!dateOnly || dateOnly < dateFrom)) return false;
      if (dateTo && (!dateOnly || dateOnly > dateTo)) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.candidat.toLowerCase().includes(q) ||
        r.typeDemande.toLowerCase().includes(q) ||
        r.centre.toLowerCase().includes(q) ||
        r.statut.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statutFilter, dateFrom, dateTo]);

  useEffect(() => {
    setPage(0);
  }, [search, statutFilter, dateFrom, dateTo]);

  const handleTraiter = useCallback(async (dossierId: string) => {
    const statut = statusByDossier[dossierId];
    if (!statut) {
      setError('Sélectionnez un statut avant de traiter le dossier.');
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await gestionDossierService.updateDossierStatut(dossierId, statut, commentByDossier[dossierId]?.trim() || undefined);
      setSuccess(`Dossier ${dossierId} mis à jour avec succès.`);
      await loadAllDossiers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du traitement du dossier');
    }
  }, [statusByDossier, commentByDossier, loadAllDossiers]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
          <WrenchScrewdriverIcon className="w-8 h-8" />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Support dossiers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vue support pour afficher et traiter tous les dossiers créés, sans limite de date.
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Formulaire de filtres
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            label="Recherche"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ID, candidat, type, centre, statut..."
            size="small"
            fullWidth
          />
          <TextField
            select
            label="Statut"
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Tous</MenuItem>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Date création début"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Date création fin"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" onClick={() => void loadAllDossiers()} disabled={loading}>
            Actualiser
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        <TableContainer sx={{ maxHeight: 620 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Candidat</TableCell>
                <TableCell>Type de demande</TableCell>
                <TableCell>Centre</TableCell>
                <TableCell>Statut actuel</TableCell>
                <TableCell>Date création</TableCell>
                <TableCell>Nouveau statut</TableCell>
                <TableCell>Commentaire</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{row.id || '—'}</TableCell>
                    <TableCell>{row.candidat || '—'}</TableCell>
                    <TableCell>{row.typeDemande || '—'}</TableCell>
                    <TableCell>{row.centre || '—'}</TableCell>
                    <TableCell>{row.statut || '—'}</TableCell>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={statusByDossier[row.id] ?? ''}
                        onChange={(e) =>
                          setStatusByDossier((prev) => ({
                            ...prev,
                            [row.id]: e.target.value as SupportStatus,
                          }))
                        }
                      >
                        <MenuItem value="">Choisir</MenuItem>
                        {STATUS_OPTIONS.map((s) => (
                          <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Commentaire (optionnel)"
                        value={commentByDossier[row.id] ?? ''}
                        onChange={(e) =>
                          setCommentByDossier((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => void handleTraiter(row.id)}>
                        Traiter
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    Aucun dossier trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredRows.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 15, 25, 50]}
          labelRowsPerPage="Lignes :"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </Paper>
    </Container>
  );
};

export default SupportDossiersPage;
