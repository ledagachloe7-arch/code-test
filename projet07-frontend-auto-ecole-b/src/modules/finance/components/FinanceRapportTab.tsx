import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Skeleton,
  Grid,
  useTheme,
  Button,
  IconButton,
  ButtonBase,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { useNavigate } from 'react-router-dom';
import { ChartBarIcon, DocumentTextIcon, UserCircleIcon, CalendarDaysIcon, ArrowDownTrayIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import type { DossierFinance } from '../types';
import { useFinanceData } from '../context';
import { useDossierPhoto } from '../../reception/tables/ReceptionDossierTypeTable/hooks/useDossierPhoto';
import { openDossierAndGoToTraitementCircuit } from '../utils/openDossierTraitementNavigate';
import * as XLSX from 'xlsx';

const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function formatDateLabel(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const CHART_HEIGHT = 260;
const CHART_MARGIN = { top: 24, right: 24, bottom: 60, left: 48 };
const ROWS_PER_PAGE = 10;

type GroupBy = 'date' | 'type_demande' | 'categorie';

interface AggRow {
  key: string;
  label: string;
  date?: string;
  typeDemande: string;
  categorie: string;
  centre: string;
  count: number;
}

function getDateStr(d: { updated_at?: string | null; created_at?: string | null }): string {
  const raw = d.updated_at || d.created_at;
  if (!raw) return '—';
  const date = new Date(raw);
  if (isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
}

const PHOTO_WIDTH = 48;
const PHOTO_HEIGHT = 60;

/** Carte pour un dossier déjà traité (sidebar) */
const HistoricPaiementCard: React.FC<{ entry: DossierFinance }> = ({ entry }) => {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const { photoUrl, loading: loadingPhoto } = useDossierPhoto(entry.id);

  const handleOpenTraitement = async () => {
    if (opening) return;
    setOpening(true);
    try {
      await openDossierAndGoToTraitementCircuit(navigate, entry.id, {
        code_paiement: entry.code_paiement,
      });
    } finally {
      setOpening(false);
    }
  };

  return (
    <ButtonBase
      component="div"
      onClick={() => void handleOpenTraitement()}
      disabled={opening}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        py: 0.75,
        px: 1,
        borderRadius: 1,
        textAlign: 'left',
        color: 'text.primary',
        '&:hover': { bgcolor: 'action.hover' },
        '&.Mui-disabled': { opacity: 0.75 },
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        {loadingPhoto && !photoUrl ? (
          <Skeleton variant="rectangular" width={PHOTO_WIDTH} height={PHOTO_HEIGHT} sx={{ borderRadius: 1 }} />
        ) : photoUrl ? (
          <Box
            component="img"
            src={photoUrl}
            alt="Photo candidat"
            sx={{
              width: PHOTO_WIDTH,
              height: PHOTO_HEIGHT,
              objectFit: 'cover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        ) : (
          <Box
            sx={{
              width: PHOTO_WIDTH,
              height: PHOTO_HEIGHT,
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
            <UserCircleIcon className="w-8 h-8" />
          </Box>
        )}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={600} noWrap title={entry.candidatLabel ?? ''}>
          {entry.candidatLabel?.trim() || '—'}
        </Typography>
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all', color: 'text.secondary' }}>
          {entry.code_paiement?.trim() || '—'}
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
          Paiement : {(entry.updated_at || entry.created_at)
            ? formatDateLabel(entry.updated_at || entry.created_at!)
            : '—'}
        </Typography>
      </Box>
    </ButtonBase>
  );
};

export const FinanceRapportTab: React.FC = () => {
  const theme = useTheme();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [datePickStep, setDatePickStep] = useState<'from' | 'to'>('from');
  const [filterTypeDemande, setFilterTypeDemande] = useState<string>('');
  const [filterCategorie, setFilterCategorie] = useState<string>('');
  const [filterCentre, setFilterCentre] = useState<string>('');
  const [groupBy, setGroupBy] = useState<GroupBy>('date');
  const [chartsVisible, setChartsVisible] = useState(true);
  const [colFilterDate, setColFilterDate] = useState('');
  const [colFilterTypeDemande, setColFilterTypeDemande] = useState('');
  const [colFilterCategorie, setColFilterCategorie] = useState('');
  const [colFilterCentre, setColFilterCentre] = useState('');
  const [page, setPage] = useState(0);

  const { dejaTraites, loading: loadingHistoric } = useFinanceData();
  const historicPaiement: DossierFinance[] = dejaTraites;

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const endPad = 6 - last.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    for (let i = 0; i < endPad; i++) days.push(null);
    return days;
  }, [calendarMonth]);

  const handleCalendarDay = (d: Date) => {
    const iso = toISO(d);
    if (datePickStep === 'from') {
      setDateFrom(iso);
      setDateTo('');
      setDatePickStep('to');
    } else {
      if (iso < dateFrom) {
        setDateTo(dateFrom);
        setDateFrom(iso);
      } else {
        setDateTo(iso);
      }
      setDatePickStep('from');
    }
  };

  const clearDateRange = () => {
    setDateFrom('');
    setDateTo('');
    setDatePickStep('from');
  };

  const typeDemandeOptions = useMemo(() => {
    const set = new Set<string>();
    historicPaiement.forEach((d) => {
      const v = (d.typeDemandeName ?? '—').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [historicPaiement]);

  const categorieOptions = useMemo(() => {
    const set = new Set<string>();
    historicPaiement.forEach((d) => {
      const v = (d.formationLabel ?? '—').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [historicPaiement]);

  const centreOptions = useMemo(() => {
    const set = new Set<string>();
    historicPaiement.forEach((d) => {
      const v = (d.centreLabel ?? '—').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [historicPaiement]);

  const filtered = useMemo(() => {
    let list = historicPaiement;
    if (dateFrom) {
      list = list.filter((d) => {
        const s = getDateStr(d);
        return s !== '—' && s >= dateFrom;
      });
    }
    if (dateTo) {
      list = list.filter((d) => {
        const s = getDateStr(d);
        return s !== '—' && s <= dateTo;
      });
    }
    if (filterTypeDemande) {
      list = list.filter((d) => (d.typeDemandeName ?? '—').trim() === filterTypeDemande);
    }
    if (filterCategorie) {
      list = list.filter((d) => (d.formationLabel ?? '—').trim() === filterCategorie);
    }
    if (filterCentre) {
      list = list.filter((d) => (d.centreLabel ?? '—').trim() === filterCentre);
    }
    return list;
  }, [historicPaiement, dateFrom, dateTo, filterTypeDemande, filterCategorie, filterCentre]);

  const aggregated = useMemo((): AggRow[] => {
    const map = new Map<string, { typeDemande: string; categorie: string; centre: string; date?: string; count: number }>();
    const norm = (s: string) => (s && s.trim()) || '—';

    filtered.forEach((d) => {
      const typeDemande = norm(d.typeDemandeName ?? '');
      const categorie = norm(d.formationLabel ?? '');
      const centre = norm(d.centreLabel ?? '');
      const dateStr = getDateStr(d);

      if (groupBy === 'date') {
        const key = `${dateStr}|${typeDemande}|${categorie}|${centre}`;
        const cur = map.get(key);
        if (cur) {
          cur.count += 1;
        } else {
          map.set(key, { typeDemande, categorie, centre, date: dateStr, count: 1 });
        }
      } else if (groupBy === 'type_demande') {
        const key = `${typeDemande}|${centre}`;
        const cur = map.get(key);
        if (cur) {
          cur.count += 1;
        } else {
          map.set(key, { typeDemande, categorie, centre, count: 1 });
        }
      } else {
        const key = `${categorie}|${centre}`;
        const cur = map.get(key);
        if (cur) {
          cur.count += 1;
        } else {
          map.set(key, { typeDemande, categorie, centre, count: 1 });
        }
      }
    });

    if (groupBy === 'type_demande') {
      return Array.from(map.entries())
        .map(([key, v]) => ({ key, label: v.typeDemande, typeDemande: v.typeDemande, categorie: v.categorie, centre: v.centre, count: v.count }))
        .sort((a, b) => b.count - a.count);
    }
    if (groupBy === 'categorie') {
      return Array.from(map.entries())
        .map(([key, v]) => ({ key, label: v.categorie, typeDemande: v.typeDemande, categorie: v.categorie, centre: v.centre, count: v.count }))
        .sort((a, b) => b.count - a.count);
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({
        key,
        label: v.date ?? '—',
        date: v.date,
        typeDemande: v.typeDemande,
        categorie: v.categorie,
        centre: v.centre,
        count: v.count,
      }))
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }, [filtered, groupBy]);

  const colOptionsDate = useMemo(() => {
    const set = new Set<string>();
    aggregated.forEach((r) => {
      const v = (r.date ?? '—').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [aggregated]);

  const colOptionsTypeDemande = useMemo(() => {
    const set = new Set<string>();
    aggregated.forEach((r) => {
      const v = (r.typeDemande ?? '—').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [aggregated]);

  const colOptionsCategorie = useMemo(() => {
    const set = new Set<string>();
    aggregated.forEach((r) => {
      const v = (r.categorie ?? '—').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [aggregated]);

  const colOptionsCentre = useMemo(() => {
    const set = new Set<string>();
    aggregated.forEach((r) => {
      const v = (r.centre ?? '—').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [aggregated]);

  const tableFiltered = useMemo(() => {
    let list = aggregated;
    const norm = (s: string | undefined) => (s && s.trim()) || '—';
    const match = (value: string | undefined, filter: string) =>
      !filter || norm(value) === filter;
    if (colFilterDate) list = list.filter((r) => match(r.date, colFilterDate));
    if (colFilterTypeDemande) list = list.filter((r) => match(r.typeDemande, colFilterTypeDemande));
    if (colFilterCategorie) list = list.filter((r) => match(r.categorie, colFilterCategorie));
    if (colFilterCentre) list = list.filter((r) => match(r.centre, colFilterCentre));
    return list;
  }, [aggregated, colFilterDate, colFilterTypeDemande, colFilterCategorie, colFilterCentre]);

  const total = useMemo(() => tableFiltered.reduce((acc, r) => acc + r.count, 0), [tableFiltered]);

  const paginatedRows = useMemo(() => {
    const start = page * ROWS_PER_PAGE;
    return tableFiltered.slice(start, start + ROWS_PER_PAGE);
  }, [tableFiltered, page]);

  React.useEffect(() => {
    setPage(0);
  }, [aggregated.length, tableFiltered.length]);

  const byTypeDemande = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((d) => {
      const label = (d.typeDemandeName ?? '—').trim() || '—';
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const byCategoriePermis = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((d) => {
      const label = (d.formationLabel ?? '—').trim() || '—';
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const byCentre = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((d) => {
      const label = (d.centreLabel ?? '—').trim() || '—';
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const dossiersPaiementEffectue = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = a.updated_at || a.created_at || '';
      const dateB = b.updated_at || b.created_at || '';
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA;
    });
  }, [filtered]);

  const calendarBlock = (
    <Paper variant="outlined" sx={{ p: 1.5, position: { md: 'sticky' }, top: { md: 24 } }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <CalendarDaysIcon className="w-4 h-4" />
        Période
      </Typography>
      {datePickStep === 'to' && dateFrom && (
        <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 0.5 }}>
          Sélectionnez la date de fin
        </Typography>
      )}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          {calendarMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </Typography>
        <Stack direction="row">
          <IconButton size="small" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} aria-label="Mois précédent">
            ‹
          </IconButton>
          <IconButton size="small" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} aria-label="Mois suivant">
            ›
          </IconButton>
        </Stack>
      </Stack>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', width: 280 }}>
        {WEEKDAYS.map((w) => (
          <Box key={w} sx={{ width: '14.28%', py: 0.5, textAlign: 'center', boxSizing: 'border-box' }}>
            <Typography variant="caption" color="text.secondary">{w}</Typography>
          </Box>
        ))}
        {calendarDays.map((d, i) => {
          if (!d) return <Box key={`e-${i}`} sx={{ width: '14.28%', aspectRatio: '1', p: 0.25, boxSizing: 'border-box' }} />;
          const iso = toISO(d);
          const isFrom = iso === dateFrom;
          const isTo = iso === dateTo;
          const inRange = dateFrom && dateTo && iso >= dateFrom && iso <= dateTo;
          return (
            <Box key={iso} sx={{ width: '14.28%', aspectRatio: '1', p: 0.25, boxSizing: 'border-box' }}>
              <Box
                onClick={() => handleCalendarDay(d)}
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  ...(isFrom || isTo
                    ? { bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 600 }
                    : inRange
                      ? { bgcolor: 'action.selected' }
                      : { '&:hover': { bgcolor: 'action.hover' } }),
                }}
              >
                {d.getDate()}
              </Box>
            </Box>
          );
        })}
      </Box>
      <Button size="small" onClick={clearDateRange} sx={{ mt: 1 }}>Effacer les dates</Button>
    </Paper>
  );

  const handleExportExcel = () => {
    const headers = ['Code de paiement', 'Nom et prénom', 'Type de permis', 'Catégorie de permis', 'Centre', 'Date de paiement'];
    const rows = dossiersPaiementEffectue.map((d) => [
      d.code_paiement?.trim() ?? '',
      d.candidatLabel?.trim() ?? '',
      d.typeDemandeName?.trim() ?? '',
      d.formationLabel?.trim() ?? '',
      d.centreLabel?.trim() ?? '',
      (d.updated_at || d.created_at) ? formatDateLabel(d.updated_at || d.created_at!) : '',
    ]);
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rapport paiements');
    const dateRange = dateFrom && dateTo ? `${dateFrom}_${dateTo}` : dateFrom || dateTo || 'rapport';
    XLSX.writeFile(wb, `rapport-paiements-${dateRange}.xlsx`);
  };

  const listeHistoricPaiementBlock = (
    <Paper variant="outlined" sx={{ p: 1.5, mt: 2, height: 'auto' }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <DocumentTextIcon className="w-4 h-4" />
        Historique des paiements
      </Typography>
      {loadingHistoric ? (
        <Stack spacing={0.5}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      ) : historicPaiement.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Aucun paiement dans l&apos;historique.
        </Typography>
      ) : (
        <Stack component="ul" spacing={0.5} sx={{ listStyle: 'none', pl: 0, m: 0 }}>
          {historicPaiement.map((entry) => (
            <HistoricPaiementCard key={entry.id} entry={entry} />
          ))}
        </Stack>
      )}
    </Paper>
  );

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
          <ChartBarIcon className="w-8 h-8" />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Rapport des flux financiers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dossiers avec code de paiement, ventilés par date, type de demande et catégorie de permis.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Filtres
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" alignItems="center">
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Type de demande</InputLabel>
                <Select
                  value={filterTypeDemande}
                  label="Type de demande"
                  onChange={(e) => setFilterTypeDemande(e.target.value)}
                >
                  <MenuItem value="">Tous</MenuItem>
                  {typeDemandeOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Catégorie de permis</InputLabel>
                <Select
                  value={filterCategorie}
                  label="Catégorie de permis"
                  onChange={(e) => setFilterCategorie(e.target.value)}
                >
                  <MenuItem value="">Toutes</MenuItem>
                  {categorieOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Centre</InputLabel>
                <Select
                  value={filterCentre}
                  label="Centre"
                  onChange={(e) => setFilterCentre(e.target.value)}
                >
                  <MenuItem value="">Tous</MenuItem>
                  {centreOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Grouper par</InputLabel>
                <Select
                  value={groupBy}
                  label="Grouper par"
                  onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                >
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="type_demande">Type de demande</MenuItem>
                  <MenuItem value="categorie">Catégorie de permis</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                size="medium"
                startIcon={<ArrowDownTrayIcon className="w-5 h-5" />}
                onClick={handleExportExcel}
                disabled={dossiersPaiementEffectue.length === 0}
                sx={{ textTransform: 'none' }}
              >
                Exporter en Excel
              </Button>
            </Stack>
          </Paper>

      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Graphiques
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={chartsVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            onClick={() => setChartsVisible((v) => !v)}
            sx={{ textTransform: 'none' }}
          >
            {chartsVisible ? 'Masquer les graphiques' : 'Afficher les graphiques'}
          </Button>
        </Stack>
        {chartsVisible && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ChartBarIcon className="w-5 h-5" />
                Flux par type de demande
              </Typography>
              {loadingHistoric ? (
                <Skeleton variant="rectangular" height={CHART_HEIGHT} sx={{ borderRadius: 1 }} />
              ) : byTypeDemande.length === 0 ? (
                <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">Aucune donnée</Typography>
                </Box>
              ) : (
                <BarChart
                  xAxis={[{ scaleType: 'band', data: byTypeDemande.map((s) => s.label), tickLabelStyle: { fontSize: 11 } }]}
                  series={[{ data: byTypeDemande.map((s) => s.value), label: 'Dossiers', color: theme.palette.primary.main }]}
                  height={CHART_HEIGHT}
                  margin={CHART_MARGIN}
                  slotProps={{ legend: { hidden: true } }}
                />
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ChartBarIcon className="w-5 h-5" />
                Flux par catégorie de permis
              </Typography>
              {loadingHistoric ? (
                <Skeleton variant="rectangular" height={CHART_HEIGHT} sx={{ borderRadius: 1 }} />
              ) : byCategoriePermis.length === 0 ? (
                <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">Aucune donnée</Typography>
                </Box>
              ) : (
                <BarChart
                  xAxis={[{ scaleType: 'band', data: byCategoriePermis.map((s) => s.label), tickLabelStyle: { fontSize: 11 } }]}
                  series={[{ data: byCategoriePermis.map((s) => s.value), label: 'Dossiers', color: theme.palette.secondary.main }]}
                  height={CHART_HEIGHT}
                  margin={CHART_MARGIN}
                  slotProps={{ legend: { hidden: true } }}
                />
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ChartBarIcon className="w-5 h-5" />
                Flux par centre
              </Typography>
              {loadingHistoric ? (
                <Skeleton variant="rectangular" height={CHART_HEIGHT} sx={{ borderRadius: 1 }} />
              ) : byCentre.length === 0 ? (
                <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">Aucune donnée</Typography>
                </Box>
              ) : (
                <BarChart
                  xAxis={[{ scaleType: 'band', data: byCentre.map((s) => s.label), tickLabelStyle: { fontSize: 11 } }]}
                  series={[{ data: byCentre.map((s) => s.value), label: 'Dossiers', color: theme.palette.success.main }]}
                  height={CHART_HEIGHT}
                  margin={CHART_MARGIN}
                  slotProps={{ legend: { hidden: true } }}
                />
              )}
            </Paper>
          </Grid>
        </Grid>
        )}
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {loadingHistoric ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {groupBy === 'date' && (
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Date</TableCell>
                  )}
                  {(groupBy === 'date' || groupBy === 'type_demande') && (
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Type de demande</TableCell>
                  )}
                  {(groupBy === 'date' || groupBy === 'categorie') && (
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Catégorie de permis</TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Centre</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    Nombre
                  </TableCell>
                </TableRow>
                <TableRow>
                  {groupBy === 'date' && (
                    <TableCell sx={{ py: 0.5, borderBottom: 0 }}>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={colFilterDate}
                          displayEmpty
                          onChange={(e) => setColFilterDate(e.target.value)}
                          sx={{ fontSize: '0.75rem', py: 0 }}
                        >
                          <MenuItem value="">Toutes</MenuItem>
                          {colOptionsDate.map((opt) => (
                            <MenuItem key={opt} value={opt} sx={{ fontSize: '0.75rem' }}>
                              {opt}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  )}
                  {(groupBy === 'date' || groupBy === 'type_demande') && (
                    <TableCell sx={{ py: 0.5, borderBottom: 0 }}>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={colFilterTypeDemande}
                          displayEmpty
                          onChange={(e) => setColFilterTypeDemande(e.target.value)}
                          sx={{ fontSize: '0.75rem', py: 0 }}
                        >
                          <MenuItem value="">Tous</MenuItem>
                          {colOptionsTypeDemande.map((opt) => (
                            <MenuItem key={opt} value={opt} sx={{ fontSize: '0.75rem' }}>
                              {opt}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  )}
                  {(groupBy === 'date' || groupBy === 'categorie') && (
                    <TableCell sx={{ py: 0.5, borderBottom: 0 }}>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={colFilterCategorie}
                          displayEmpty
                          onChange={(e) => setColFilterCategorie(e.target.value)}
                          sx={{ fontSize: '0.75rem', py: 0 }}
                        >
                          <MenuItem value="">Toutes</MenuItem>
                          {colOptionsCategorie.map((opt) => (
                            <MenuItem key={opt} value={opt} sx={{ fontSize: '0.75rem' }}>
                              {opt}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  )}
                  <TableCell sx={{ py: 0.5, borderBottom: 0 }}>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={colFilterCentre}
                        displayEmpty
                        onChange={(e) => setColFilterCentre(e.target.value)}
                        sx={{ fontSize: '0.75rem', py: 0 }}
                      >
                        <MenuItem value="">Tous</MenuItem>
                        {colOptionsCentre.map((opt) => (
                          <MenuItem key={opt} value={opt} sx={{ fontSize: '0.75rem' }}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5, borderBottom: 0 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {tableFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }} color="text.secondary">
                      {aggregated.length === 0
                        ? 'Aucune donnée pour les filtres sélectionnés.'
                        : 'Aucune ligne ne correspond aux filtres de colonne.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => (
                    <TableRow key={row.key} hover>
                      {groupBy === 'date' && (
                        <TableCell sx={{ fontSize: '0.8rem' }}>{row.date ?? '—'}</TableCell>
                      )}
                      {(groupBy === 'date' || groupBy === 'type_demande') && (
                        <TableCell sx={{ fontSize: '0.8rem' }}>{row.typeDemande}</TableCell>
                      )}
                      {(groupBy === 'date' || groupBy === 'categorie') && (
                        <TableCell sx={{ fontSize: '0.8rem' }}>{row.categorie}</TableCell>
                      )}
                      <TableCell sx={{ fontSize: '0.8rem' }}>{row.centre}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {row.count}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {tableFiltered.length > 0 && (
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell colSpan={groupBy === 'date' ? 4 : groupBy === 'type_demande' ? 3 : 2} sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                      Total
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                      {total}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={tableFiltered.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={ROWS_PER_PAGE}
              rowsPerPageOptions={[ROWS_PER_PAGE]}
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
              sx={{ borderTop: 1, borderColor: 'divider', fontSize: '0.875rem' }}
            />
          </TableContainer>
        )}
      </Paper>
        </Box>
        <Box sx={{ flexShrink: 0 }}>
          {calendarBlock}
          {listeHistoricPaiementBlock}
        </Box>
      </Box>
    </Box>
  );
};

export default FinanceRapportTab;
