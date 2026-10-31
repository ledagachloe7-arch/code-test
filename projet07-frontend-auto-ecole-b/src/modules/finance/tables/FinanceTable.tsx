import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  Skeleton,
  Stack,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { UserCircleIcon, ChevronRightIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { DossierFinance } from '../types';
import { openDossierAndGoToTraitementCircuit } from '../utils/openDossierTraitementNavigate';

export type FinanceTableSectionType = 'a_traiter' | 'deja_traite';

export interface FinanceTableProps {
  sectionType: FinanceTableSectionType;
  rows: DossierFinance[];
  loading?: boolean;
  onRefresh?: () => void;
  /** Affichage compact pour la sidebar (table plus petite, défilement horizontal si besoin). */
  variant?: 'default' | 'sidebar';
}

const ROWS_PER_PAGE = 15;

const FinanceTable: React.FC<FinanceTableProps> = ({ sectionType, rows, loading, onRefresh, variant = 'default' }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterTypeDemande, setFilterTypeDemande] = useState('');
  const [filterFormation, setFilterFormation] = useState('');
  const [filterCentre, setFilterCentre] = useState('');
  const [openingDossierId, setOpeningDossierId] = useState<string | null>(null);
  const [openTraitementError, setOpenTraitementError] = useState<string | null>(null);
  const isSidebar = variant === 'sidebar';

  const handleOpenTraitement = async (row: DossierFinance) => {
    if (openingDossierId) return;
    setOpenTraitementError(null);
    setOpeningDossierId(row.id);
    try {
      await openDossierAndGoToTraitementCircuit(navigate, row.id, {
        code_paiement: row.code_paiement,
      });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (e as Error)?.message ??
        "Impossible d'ouvrir le dossier.";
      setOpenTraitementError(String(msg));
    } finally {
      setOpeningDossierId(null);
    }
  };

  const statutOptions = useMemo(() => [...new Set(rows.map((r) => r.statut).filter(Boolean))], [rows]);
  const typeDemandeOptions = useMemo(() => [...new Set(rows.map((r) => r.typeDemandeName).filter(Boolean))] as string[], [rows]);
  const formationOptions = useMemo(() => [...new Set(rows.map((r) => r.formationLabel).filter(Boolean))] as string[], [rows]);
  const centreOptions = useMemo(() => [...new Set(rows.map((r) => (r.centreLabel ?? '').trim()).filter(Boolean))] as string[], [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return rows.filter((row) => {
      const centre = (row.centreLabel ?? '—').trim();
      const matchSearch =
        !q ||
        row.candidatLabel?.toLowerCase().includes(q) ||
        row.code_paiement?.toLowerCase().includes(q) ||
        row.autoEcoleNom?.toLowerCase().includes(q) ||
        row.typeDemandeName?.toLowerCase().includes(q) ||
        row.formationLabel?.toLowerCase().includes(q) ||
        row.reference?.toLowerCase().includes(q) ||
        centre.toLowerCase().includes(q);
      const matchStatut = !filterStatut || row.statut === filterStatut;
      const matchType = !filterTypeDemande || row.typeDemandeName === filterTypeDemande;
      const matchFormation = !filterFormation || row.formationLabel === filterFormation;
      const matchCentre = !filterCentre || centre === filterCentre;
      return matchSearch && matchStatut && matchType && matchFormation && matchCentre;
    });
  }, [rows, searchQuery, filterStatut, filterTypeDemande, filterFormation, filterCentre]);

  const hasActiveFilters = searchQuery || filterStatut || filterTypeDemande || filterFormation || filterCentre;

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatut('');
    setFilterTypeDemande('');
    setFilterFormation('');
    setFilterCentre('');
  };

  useEffect(() => {
    setPage(0);
  }, [rows.length, searchQuery, filterStatut, filterTypeDemande, filterFormation, filterCentre]);

  const paginatedRows = filteredRows.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

  if (loading) {
    if (isSidebar) {
      return (
        <Stack spacing={1} sx={{ mt: 1.5, px: 1 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      );
    }
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ mt: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: '0.75rem' }}>Code paiement</TableCell>
              <TableCell>Candidat</TableCell>
              <TableCell>Auto-école</TableCell>
              <TableCell>Centre</TableCell>
              <TableCell>Type de demande</TableCell>
              <TableCell>Catégorie de permis</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton variant="text" width={90} height={18} /></TableCell>
                <TableCell><Skeleton variant="text" width={100} height={18} /></TableCell>
                <TableCell><Skeleton variant="text" width={80} height={18} /></TableCell>
                <TableCell><Skeleton variant="text" width={72} height={18} /></TableCell>
                <TableCell><Skeleton variant="text" width={80} height={18} /></TableCell>
                <TableCell><Skeleton variant="text" width={60} height={18} /></TableCell>
                <TableCell><Skeleton variant="rounded" width={70} height={20} /></TableCell>
                <TableCell align="right"><Skeleton variant="text" width={50} height={18} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (rows.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: isSidebar ? 2 : 4, mt: 0, textAlign: 'center', ...(isSidebar && { boxShadow: 'none', bgcolor: 'transparent' }) }}>
        <Typography color="text.secondary" variant={isSidebar ? 'body2' : 'body1'}>
          {sectionType === 'a_traiter'
            ? 'Aucun dossier à traiter pour le moment.'
            : 'Aucun dossier déjà traité.'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {sectionType === 'a_traiter'
            ? 'Les dossiers sans code ou avec code mais paiement non encore vérifié apparaîtront ici.'
            : 'Les dossiers avec code de paiement et vérification réussie apparaîtront ici.'}
        </Typography>
      </Paper>
    );
  }

  const noResultsAfterFilter = filteredRows.length === 0;

  if (isSidebar) {
    // Vue sidebar : une card par dossier (code paiement, type de permis, usager), 15 par page.
    return (
      <Stack spacing={1} sx={{ mt: 1.5, px: 1 }}>
        {openTraitementError && (
          <Alert severity="error" sx={{ mx: 0.5 }} onClose={() => setOpenTraitementError(null)}>
            {openTraitementError}
          </Alert>
        )}
        <TextField
          size="small"
          placeholder="Rechercher un dossier…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MagnifyingGlassIcon className="w-4 h-4" style={{ color: 'var(--mui-palette-text-secondary)' }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')} edge="end">
                  <XMarkIcon className="w-3.5 h-3.5" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ mx: 0.5 }}
        />
        {noResultsAfterFilter ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Aucun dossier ne correspond à votre recherche.
            </Typography>
          </Box>
        ) : (
        <>
        {paginatedRows.map((row) => (
          <Card
            key={row.id}
            variant="outlined"
            sx={{
              overflow: 'hidden',
              mx: 0.5,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <CardActionArea
              onClick={() => void handleOpenTraitement(row)}
              disabled={openingDossierId !== null}
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                opacity: openingDossierId === row.id ? 0.75 : 1,
              }}
            >
              <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" fontFamily="monospace" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
                    {row.code_paiement || 'En attente de traitement'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {row.formationLabel ?? '—'}
                  </Typography>
                  {(row.centreLabel ?? '').trim() ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {row.centreLabel}
                    </Typography>
                  ) : null}
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <UserCircleIcon
                      className="w-4 h-4"
                      style={{ color: 'var(--mui-palette-text-secondary)', flexShrink: 0 }}
                    />
                    <Typography variant="caption" fontWeight={500} sx={{ fontSize: '0.7rem' }}>
                      {row.candidatLabel ?? '—'}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
        <TablePagination
          component="div"
          count={filteredRows.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          sx={{ borderTop: 1, borderColor: 'divider', fontSize: '0.75rem', minHeight: 40 }}
        />
        </>
        )}
      </Stack>
    );
  }

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{ mt: 0 }}
    >
      {/* Barre de recherche et filtres */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
        }}
      >
        {openTraitementError && (
          <Alert severity="error" sx={{ width: '100%' }} onClose={() => setOpenTraitementError(null)}>
            {openTraitementError}
          </Alert>
        )}
        <TextField
          size="small"
          placeholder="Rechercher (candidat, code, auto-école…)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MagnifyingGlassIcon className="w-4 h-4" style={{ color: 'var(--mui-palette-text-secondary)' }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')} edge="end">
                  <XMarkIcon className="w-3.5 h-3.5" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ minWidth: 260, flex: 1 }}
        />
        {typeDemandeOptions.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel sx={{ fontSize: '0.78rem' }}>Type de demande</InputLabel>
            <Select
              value={filterTypeDemande}
              label="Type de demande"
              onChange={(e) => setFilterTypeDemande(e.target.value)}
              sx={{ fontSize: '0.78rem' }}
            >
              <MenuItem value=""><em>Tous</em></MenuItem>
              {typeDemandeOptions.map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontSize: '0.78rem' }}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {formationOptions.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ fontSize: '0.78rem' }}>Catégorie</InputLabel>
            <Select
              value={filterFormation}
              label="Catégorie"
              onChange={(e) => setFilterFormation(e.target.value)}
              sx={{ fontSize: '0.78rem' }}
            >
              <MenuItem value=""><em>Toutes</em></MenuItem>
              {formationOptions.map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontSize: '0.78rem' }}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {centreOptions.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ fontSize: '0.78rem' }}>Centre</InputLabel>
            <Select
              value={filterCentre}
              label="Centre"
              onChange={(e) => setFilterCentre(e.target.value)}
              sx={{ fontSize: '0.78rem' }}
            >
              <MenuItem value=""><em>Tous</em></MenuItem>
              {centreOptions.map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontSize: '0.78rem' }}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {statutOptions.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel sx={{ fontSize: '0.78rem' }}>Statut</InputLabel>
            <Select
              value={filterStatut}
              label="Statut"
              onChange={(e) => setFilterStatut(e.target.value)}
              sx={{ fontSize: '0.78rem' }}
            >
              <MenuItem value=""><em>Tous</em></MenuItem>
              {statutOptions.map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontSize: '0.78rem' }}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {hasActiveFilters && (
          <Chip
            label={`Réinitialiser (${filteredRows.length} / ${rows.length})`}
            size="small"
            onDelete={resetFilters}
            sx={{ fontSize: '0.72rem', height: 28 }}
          />
        )}
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Code paiement</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Candidat</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Auto-école</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Centre</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Type de demande</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Catégorie de permis</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Statut</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {noResultsAfterFilter ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Aucun dossier ne correspond à votre recherche ou aux filtres sélectionnés.
                </Typography>
              </TableCell>
            </TableRow>
          ) : paginatedRows.map((row) => (
            <TableRow
              key={row.id}
              hover
              onClick={() => void handleOpenTraitement(row)}
              sx={{
                cursor: openingDossierId !== null ? 'default' : 'pointer',
                ...(openingDossierId === row.id ? { opacity: 0.75 } : {}),
                '&:hover': openingDossierId ? undefined : { bgcolor: 'action.hover' },
              }}
            >
              <TableCell sx={{ fontSize: '0.75rem' }}>
                <Typography variant="caption" fontFamily="monospace" fontWeight={600} component="span">
                  {row.code_paiement || 'En attente de traitement'}
                </Typography>
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem' }}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <UserCircleIcon
                    className="w-4 h-4"
                    style={{ color: 'var(--mui-palette-text-secondary)', flexShrink: 0 }}
                  />
                  <Typography variant="caption" fontWeight={500} component="span">
                    {row.candidatLabel ?? '—'}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem' }}>
                <Typography variant="caption" color="text.secondary" component="span">
                  {row.autoEcoleNom ?? '—'}
                </Typography>
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem', maxWidth: 160 }}>
                <Typography variant="caption" color="text.secondary" component="span" noWrap title={row.centreLabel ?? ''}>
                  {(row.centreLabel ?? '').trim() || '—'}
                </Typography>
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem' }}>
                <Typography variant="caption" component="span">{row.typeDemandeName ?? '—'}</Typography>
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem' }}>
                <Typography variant="caption" color="text.secondary" component="span">
                  {row.formationLabel ?? '—'}
                </Typography>
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem' }}>
                <Chip label={row.statut} size="small" color="warning" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                <Stack
                  component="span"
                  direction="row"
                  alignItems="center"
                  justifyContent="flex-end"
                  spacing={0.5}
                  sx={{ color: 'primary.main' }}
                >
                  {openingDossierId === row.id ? (
                    <CircularProgress size={18} />
                  ) : (
                    <>
                      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
                        Voir le dossier
                      </Typography>
                      <ChevronRightIcon className="w-4 h-4" />
                    </>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={filteredRows.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={ROWS_PER_PAGE}
        rowsPerPageOptions={[ROWS_PER_PAGE]}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        sx={{ fontSize: '0.75rem' }}
      />
    </TableContainer>
  );
};

export default FinanceTable;
