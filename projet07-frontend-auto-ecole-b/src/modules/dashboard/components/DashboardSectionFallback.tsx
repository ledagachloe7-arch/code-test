import React from 'react';
import { Box, Skeleton, Paper } from '@mui/material';

/** Skeleton pour le chargement de TodoListByEtape (section table / liste par étape). */
const DashboardSectionFallback: React.FC = () => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 0.5 }} />
      <Skeleton variant="text" width={140} height={32} />
    </Box>
    <Skeleton variant="text" width="90%" height={20} sx={{ mb: 2 }} />
    {/* Lignes type tableau / groupes */}
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton
          key={i}
          variant="rectangular"
          height={56}
          sx={{ borderRadius: 1 }}
        />
      ))}
    </Box>
  </Paper>
);

export default DashboardSectionFallback;
