import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  Skeleton,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';
import DashboardSection from './DashboardSection';
import { useDashboardData } from '../context/DashboardDataContext';

const CHART_HEIGHT = 380;
const CHART_MARGIN = { top: 24, right: 24, bottom: 80, left: 56 };

/** Skeleton en forme de graphique à barres (même disposition que le BarChart). */
const ChartSkeleton: React.FC<{ height: number }> = ({ height }) => {
  const chartInnerHeight = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const barHeights = [0.9, 0.5, 0.7, 0.4, 0.85, 0.55, 0.75, 0.45, 0.65, 0.6, 0.8, 0.5];
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
              maxWidth: 32,
              height: ratio * chartInnerHeight,
              minHeight: 24,
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
          <Skeleton key={i} variant="text" width={40} height={16} sx={{ flex: 1, maxWidth: 48 }} />
        ))}
      </Box>
    </Box>
  );
};

const DossiersParAutoEcoleStats: React.FC = () => {
  const theme = useTheme();
  const { adminData, loadingAdmin } = useDashboardData();
  const items = adminData?.dossiersParAutoEcole ?? [];

  const totalDossiers = items.reduce((sum, row) => sum + row.count, 0);
  const subtitle = loadingAdmin
    ? 'Chargement des données...'
    : items.length === 0
      ? 'Aucune auto-école'
      : `Répartition des dossiers par auto-école (${items.length} auto-école(s), total: ${totalDossiers} dossiers)`;

  const chartItems = items.filter((item) => item.count >= 0);
  const xLabels = chartItems.map((i) => i.nom);
  const seriesData = chartItems.map((i) => i.count);
  const hasData = chartItems.length > 0;

  return (
    <DashboardSection
      title="Dossiers par auto-école"
      subtitle={subtitle}
      icon={<BuildingOffice2Icon className="w-6 h-6" style={{ color: 'inherit' }} />}
    >
      {loadingAdmin ? (
        <ChartSkeleton height={CHART_HEIGHT} />
      ) : !hasData ? (
        <Typography color="text.secondary">Aucune auto-école à afficher.</Typography>
      ) : (
        <Box sx={{ width: '100%' }}>
          <BarChart
            xAxis={[
              {
                scaleType: 'band',
                data: xLabels,
                tickLabelStyle: { fontSize: 11 },
              },
            ]}
            series={[
              {
                data: seriesData,
                label: 'Nombre de dossiers',
                color: theme.palette.primary.main,
              },
            ]}
            height={CHART_HEIGHT}
            margin={CHART_MARGIN}
            slotProps={{ legend: { hidden: true } }}
          />
        </Box>
      )}
    </DashboardSection>
  );
};

export default DossiersParAutoEcoleStats;
