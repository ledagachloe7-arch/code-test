import React from 'react';
import { Paper, Typography, Box, Stack, useTheme, Skeleton } from '@mui/material';

export interface StatCardProps {
  title: string;
  value: number | string;
  loading?: boolean;
  icon?: React.ReactNode;
  valueColor?: 'primary' | 'success' | 'error' | 'text';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  loading = false,
  icon,
  valueColor = 'text',
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const glassBg = isDark
    ? 'rgba(38, 255, 0, 0.05)'
    : 'rgba(255, 255, 255, 0.4)';
  const glassBorder = isDark
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(255, 255, 255, 0.6)';
  const resolvedColor =
    valueColor === 'text'
      ? theme.palette.text.primary
      : theme.palette[valueColor].main;

  const paperSx = {
    p: 2,
    height: '100%',
    width: '100%',
    minWidth: 0,
    borderRadius: 0,
    background: glassBg,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `1px solid ${glassBorder}`,
    boxShadow: theme.shadows[10],
  };

  if (loading) {
    return (
      <Paper elevation={0} sx={paperSx}>
        <Stack direction="column" spacing={0.5} sx={{ width: '100%' }}>
          {icon && (
            <Skeleton variant="circular" width={24} height={24} sx={{ mb: 0.5 }} />
          )}
          <Skeleton variant="text" width="60%" height={22} />
          <Stack direction="row" alignItems="flex-end" sx={{ width: '100%', pt: 0.5 }}>
            <Skeleton variant="text" width={48} height={32} sx={{ flexShrink: 0 }} />
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={paperSx}>
      <Stack direction="column" spacing={0.5} sx={{ width: '100%' }}>
        {icon && (
          <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {title}
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
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, flexShrink: 0, color: resolvedColor }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default StatCard;
export { StatCard };
