import React from 'react';
import { Paper, Typography, Box, Stack, useTheme, Skeleton } from '@mui/material';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';

export interface StatCardWithSparklineProps {
  title: string;
  value: number | string;
  sparkData: number[];
  /** Libellés des points (ex. semaines) pour l’axe X du graphique. */
  xAxisLabels?: string[];
  color?: string;
  icon?: React.ReactNode;
  /** Élévation du Paper (0 = pas d’ombre). */
  elevation?: number;
  loading?: boolean;
}

const SPARKLINE_HEIGHT = 40;
const SPARKLINE_WIDTH = 120;

/** Espace les mots pour certains types de demande (ex. NOUVEAUPERMIS → NOUVEAU PERMIS). */
function formatTitleForDisplay(title: string): string {
  if (!title || typeof title !== 'string') return title;
  const upper = title.trim().toUpperCase();
  if (upper === 'NOUVEAUPERMIS') return 'NOUVEAU PERMIS';
  if (upper === 'FICHEENREGISTREMENT') return 'FICHE ENREGISTREMENT';
  return title;
}

const StatCardWithSparkline: React.FC<StatCardWithSparklineProps> = ({
  title,
  value,
  sparkData,
  xAxisLabels,
  color,
  icon,
  elevation,
  loading = false,
}) => {
  const theme = useTheme();
  const resolvedColor = color ?? theme.palette.primary.main;
  const isDark = theme.palette.mode === 'dark';
  const glassBg = isDark
    ? 'rgba(38, 255, 0, 0.05)'
    : 'rgba(255, 255, 255, 0.4)';
  const glassBorder = isDark
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(255, 255, 255, 0.6)';
  const boxShadow =
    elevation === 0 ? 'none' : theme.shadows[10];

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          height: '100%',
          width: '100%',
          minWidth: 0,
          borderRadius: 0,
          background: glassBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${glassBorder}`,
          boxShadow,
        }}
      >
        <Stack direction="column" spacing={0.5} sx={{ width: '100%' }}>
          {icon && (
            <Skeleton variant="circular" width={24} height={24} sx={{ mb: 0.5 }} />
          )}
          <Skeleton variant="text" width="60%" height={22} />
          <Stack direction="row" alignItems="flex-end" sx={{ width: '100%', pt: 0.5 }}>
            <Skeleton variant="text" width={48} height={32} sx={{ flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 8 }} />
            <Skeleton
              variant="rectangular"
              width={SPARKLINE_WIDTH}
              height={SPARKLINE_HEIGHT}
              sx={{ borderRadius: 0.5, flexShrink: 0 }}
            />
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      height: '100%',
      width: '100%',
      minWidth: 0,
      borderRadius: 0,
      background: glassBg,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: `1px solid ${glassBorder}`,
      boxShadow,
    }}
  >
    <Stack direction="column" spacing={0.5} sx={{ width: '100%' }}>
      {icon && (
        <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        {formatTitleForDisplay(title)}
      </Typography>
      <Stack
        direction="row"
        alignItems="flex-end"
        sx={{
          width: '100%',
          borderBottom: `2px solid ${resolvedColor}33`,
          pb: 0,
        }}
      >
        <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, flexShrink: 0 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 8 }} />
        <Box sx={{ flexShrink: 0 }}>
          <SparkLineChart
            data={sparkData}
            xAxis={xAxisLabels?.length ? { id: 'week-axis', data: xAxisLabels } : undefined}
            height={SPARKLINE_HEIGHT}
            width={SPARKLINE_WIDTH}
            area
            showHighlight
            showTooltip
            colors={[resolvedColor]}
            margin={{ top: 2, bottom: 0, left: 4, right: 0 }}
          />
        </Box>
      </Stack>
    </Stack>
  </Paper>
  );
};

export default StatCardWithSparkline;
export { StatCardWithSparkline };
