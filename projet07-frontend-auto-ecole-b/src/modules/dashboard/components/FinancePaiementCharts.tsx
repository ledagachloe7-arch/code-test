import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Skeleton,
  useTheme,
} from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { ChartBarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const CHART_HEIGHT = 280;
const PIE_SIZE = 200;
/** Hauteur totale pour le donut + légende en dessous (évite que le cercle soit coupé). */
const PIE_CONTAINER_HEIGHT = PIE_SIZE + 72;
const CHART_MARGIN = { top: 24, right: 24, bottom: 60, left: 48 };

export interface FinancePaiementChartsProps {
  /** Nombre de dossiers à traiter (sans code paiement). */
  aTraiterCount: number;
  /** Nombre de dossiers déjà traités (avec code paiement). */
  dejaTraitesCount: number;
  /** Répartition par statut (ex. pour les dossiers déjà traités). */
  byStatut?: { label: string; value: number }[];
  loading?: boolean;
}

const FinancePaiementCharts: React.FC<FinancePaiementChartsProps> = ({
  aTraiterCount,
  dejaTraitesCount,
  byStatut = [],
  loading = false,
}) => {
  const theme = useTheme();
  const total = aTraiterCount + dejaTraitesCount;
  const hasPieData = total > 0;
  const hasBarData = byStatut.length > 0 && byStatut.some((s) => s.value > 0);

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={240} height={28} />
        </Box>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <Skeleton variant="text" width={160} height={20} sx={{ mb: 1, alignSelf: 'center' }} />
              <Skeleton variant="circular" width={PIE_SIZE} height={PIE_SIZE} />
            </Box>
          </Grid>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <Skeleton variant="text" width={280} height={20} sx={{ mb: 1, alignSelf: 'center' }} />
              <Skeleton variant="rectangular" height={CHART_HEIGHT} sx={{ borderRadius: 1, width: '100%' }} />
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  }

  const pieData = [
    { id: 0, value: aTraiterCount, label: 'À traiter', color: theme.palette.warning.main },
    { id: 1, value: dejaTraitesCount, label: 'Déjà traités', color: theme.palette.success.main },
  ].filter((d) => d.value > 0);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3, overflow: 'visible' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CurrencyDollarIcon className="w-6 h-6" style={{ color: theme.palette.primary.main }} />
        <Typography variant="h6" fontWeight={700}>
          Vue d&apos;ensemble paiement
        </Typography>
      </Box>
      <Grid container spacing={3} alignItems="center" sx={{ overflow: 'visible' }}>
        <Grid item xs={12} md={4} sx={{ overflow: 'visible', minHeight: PIE_CONTAINER_HEIGHT }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              minHeight: PIE_CONTAINER_HEIGHT,
              overflow: 'visible',
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ textAlign: 'center' }}>
              À traiter vs Déjà traités
            </Typography>
            {!hasPieData ? (
              <Box
                sx={{
                  height: PIE_CONTAINER_HEIGHT - 24,
                  width: '100%',
                  maxWidth: PIE_SIZE + 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Aucune donnée
                </Typography>
              </Box>
            ) : (
              <Box sx={{ overflow: 'visible', width: PIE_SIZE, height: PIE_CONTAINER_HEIGHT - 24 }}>
                <PieChart
                  series={[
                    {
                      data: pieData,
                      innerRadius: 40,
                      outerRadius: 90,
                      paddingAngle: 2,
                      cornerRadius: 4,
                      arcLabel: (item) => `${item.value}`,
                      arcLabelMinAngle: 20,
                    },
                  ]}
                  width={PIE_SIZE}
                  height={PIE_CONTAINER_HEIGHT - 24}
                  margin={{ top: 8, right: 8, bottom: 48, left: 8 }}
                  slotProps={{
                    legend: {
                      direction: 'row',
                      position: { vertical: 'bottom', horizontal: 'middle' },
                      padding: 8,
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        </Grid>
        <Grid item xs={12} md={8}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, alignSelf: 'center' }}>
              <ChartBarIcon className="w-5 h-5" style={{ color: theme.palette.secondary.main }} />
              <Typography variant="subtitle2" color="text.secondary">
                Répartition par statut (dossiers avec code paiement)
              </Typography>
            </Box>
            {!hasBarData ? (
              <Box
                sx={{
                  height: CHART_HEIGHT,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Aucun dossier déjà traité ou répartition non disponible.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <BarChart
                  xAxis={[
                    {
                      scaleType: 'band',
                      data: byStatut.map((s) => s.label),
                      tickLabelStyle: { fontSize: 11 },
                    },
                  ]}
                  series={[
                    {
                      data: byStatut.map((s) => s.value),
                      label: 'Dossiers',
                      color: theme.palette.secondary.main,
                    },
                  ]}
                  height={CHART_HEIGHT}
                  margin={CHART_MARGIN}
                  slotProps={{ legend: { hidden: true } }}
                />
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default FinancePaiementCharts;
