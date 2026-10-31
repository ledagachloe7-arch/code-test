import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  Grid,
  Skeleton,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { ChartBarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import DashboardSection from './DashboardSection';
import { useDashboardData } from '../context/DashboardDataContext';

const CHART_HEIGHT = 320;
const CHART_MARGIN = { top: 24, right: 24, bottom: 80, left: 48 };
const MAX_LABELS = 20;

/** Skeleton en forme de graphique à barres (pour un des deux BarCharts). */
const ChartSkeleton: React.FC<{ height: number }> = ({ height }) => {
  const chartInnerHeight = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const barHeights = [0.85, 0.5, 0.7, 0.45, 0.9, 0.55, 0.65, 0.75, 0.4, 0.8, 0.6, 0.5];
  return (
    <Box sx={{ width: '100%', height }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 0.5,
          height: chartInnerHeight,
          pt: `${CHART_MARGIN.top}px`,
          px: `${CHART_MARGIN.left}px`,
          pb: `${CHART_MARGIN.bottom}px`,
        }}
      >
        {barHeights.map((ratio, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            sx={{
              flex: 1,
              maxWidth: 28,
              height: ratio * chartInnerHeight,
              minHeight: 20,
              borderRadius: 0.5,
            }}
            animation="wave"
          />
        ))}
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          px: `${CHART_MARGIN.left}px`,
          mt: -6,
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} variant="text" width={36} height={14} sx={{ flex: 1, maxWidth: 44 }} />
        ))}
      </Box>
    </Box>
  );
};

const DossiersParEtapeEtTypeDemandeStats: React.FC = () => {
  const theme = useTheme();
  const { adminData, loadingAdmin } = useDashboardData();
  const parStatut = adminData?.aggregations.byStatut ?? [];
  const parTypeDemande = adminData?.aggregations.byTypeDemande ?? [];

  const totalParStatut = parStatut.reduce((sum, r) => sum + r.count, 0);
  const totalParType = parTypeDemande.reduce((sum, r) => sum + r.count, 0);
  const hasStatut = parStatut.length > 0;
  const hasTypeDemande = parTypeDemande.length > 0;
  const hasData = hasStatut || hasTypeDemande;

  const statutItems = parStatut.filter((i) => i.count >= 0).slice(0, MAX_LABELS);
  const typeDemandeItems = parTypeDemande.filter((i) => i.count >= 0).slice(0, MAX_LABELS);

  return (
    <DashboardSection
      title="Dossiers par étape de traitement et par type de demande"
      subtitle={
        loadingAdmin
          ? 'Chargement des données...'
          : !hasData
            ? 'Aucune donnée disponible.'
            : `Par étape de traitement : ${totalParStatut} dossiers — Par type de demande : ${totalParType} dossiers`
      }
      icon={<ChartBarIcon className="w-6 h-6" style={{ color: 'inherit' }} />}
    >
      {loadingAdmin ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="rectangular" width={20} height={20} sx={{ borderRadius: 0.5 }} />
              <Skeleton variant="text" width={220} height={28} />
            </Box>
            <ChartSkeleton height={CHART_HEIGHT} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="rectangular" width={20} height={20} sx={{ borderRadius: 0.5 }} />
              <Skeleton variant="text" width={180} height={28} />
            </Box>
            <ChartSkeleton height={CHART_HEIGHT} />
          </Grid>
        </Grid>
      ) : !hasData ? (
        <Typography color="text.secondary">Aucune donnée à afficher.</Typography>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DocumentTextIcon className="w-5 h-5" style={{ color: theme.palette.primary.main }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Par étape de étape de traitement
              </Typography>
            </Box>
            {!hasStatut ? (
              <Typography variant="body2" color="text.secondary">
                Aucun dossier par étape.
              </Typography>
            ) : (
              <BarChart
                xAxis={[
                  {
                    scaleType: 'band',
                    data: statutItems.map((i) => i.libelle),
                    tickLabelStyle: { fontSize: 10 },
                  },
                ]}
                series={[
                  {
                    data: statutItems.map((i) => i.count),
                    label: 'Dossiers',
                    color: theme.palette.primary.main,
                  },
                ]}
                height={CHART_HEIGHT}
                margin={{ ...CHART_MARGIN, bottom: Math.max(CHART_MARGIN.bottom, statutItems.length * 14) }}
                slotProps={{ legend: { hidden: true } }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DocumentTextIcon className="w-5 h-5" style={{ color: theme.palette.secondary.main }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Par type de demande
              </Typography>
            </Box>
            {!hasTypeDemande ? (
              <Typography variant="body2" color="text.secondary">
                Aucun dossier par type de demande.
              </Typography>
            ) : (
              <BarChart
                xAxis={[
                  {
                    scaleType: 'band',
                    data: typeDemandeItems.map((i) => i.libelle),
                    tickLabelStyle: { fontSize: 10 },
                  },
                ]}
                series={[
                  {
                    data: typeDemandeItems.map((i) => i.count),
                    label: 'Dossiers',
                    color: theme.palette.secondary.main,
                  },
                ]}
                height={CHART_HEIGHT}
                margin={{ ...CHART_MARGIN, bottom: Math.max(CHART_MARGIN.bottom, typeDemandeItems.length * 14) }}
                slotProps={{ legend: { hidden: true } }}
              />
            )}
          </Grid>
        </Grid>
      )}
    </DashboardSection>
  );
};

export default DossiersParEtapeEtTypeDemandeStats;
