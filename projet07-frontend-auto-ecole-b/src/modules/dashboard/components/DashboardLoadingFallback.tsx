import React from 'react';
import { Box, Skeleton } from '@mui/material';

const SIDEBAR_WIDTH = 380;

/** Skeleton pour le chargement des vues AdminDashboardView / AutoEcoleDashboardView. */
const DashboardLoadingFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      gap: 3,
      alignItems: 'stretch',
    }}
  >
    {/* Contenu principal */}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {/* LastUpdateHeader */}
      <Skeleton variant="text" width={220} height={28} sx={{ mb: 3 }} />

      {/* Grille de cartes stats (ex. AdminStatsGrid / AutoEcoleStatsGrid) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 2,
          mb: 3,
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={100}
            sx={{ borderRadius: 1 }}
          />
        ))}
      </Box>

      {/* Blocs sections (DossiersParAutoEcoleStats, DossiersParEtapeEtTypeDemandeStats) */}
      <Skeleton
        variant="rectangular"
        height={200}
        sx={{ borderRadius: 1, mb: 2 }}
      />
      <Skeleton
        variant="rectangular"
        height={180}
        sx={{ borderRadius: 1 }}
      />
    </Box>

    {/* Sidebar (pour vue admin) */}
    <Box
      sx={{
        width: { xs: '100%', md: SIDEBAR_WIDTH },
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
      }}
    >
      <Skeleton variant="text" width="60%" height={28} sx={{ mb: 2 }} />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton
          key={i}
          variant="rectangular"
          height={72}
          sx={{ borderRadius: 1, mb: 1.5 }}
        />
      ))}
    </Box>
  </Box>
);

export default DashboardLoadingFallback;
