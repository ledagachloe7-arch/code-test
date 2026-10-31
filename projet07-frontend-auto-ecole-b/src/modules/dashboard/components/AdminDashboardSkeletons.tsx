import React from 'react';
import { Box, Card, CardContent, Skeleton } from '@mui/material';

/** Skeleton pour AdminStatsGrid (section Dossiers par type de demande). */
export const AdminStatsGridSkeleton: React.FC = () => (
  <Card elevation={0} sx={{ mb: 3, boxShadow: 'none', borderRadius: 0 }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Skeleton variant="circular" width={48} height={48} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="55%" height={32} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width="85%" height={20} />
        </Box>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 2,
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
    </CardContent>
  </Card>
);

const CHART_HEIGHT_AUTO_ECOLE = 380;

/** Skeleton pour DossiersParAutoEcoleStats (section avec bar chart). */
export const DossiersParAutoEcoleStatsSkeleton: React.FC = () => (
  <Card elevation={0} sx={{ mb: 3, boxShadow: 'none', borderRadius: 0 }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Skeleton variant="circular" width={48} height={48} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="45%" height={32} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width="75%" height={20} />
        </Box>
      </Box>
      <Skeleton
        variant="rectangular"
        height={CHART_HEIGHT_AUTO_ECOLE}
        sx={{ borderRadius: 1, width: '100%' }}
      />
    </CardContent>
  </Card>
);

const CHART_HEIGHT_ETAPE = 320;

/** Skeleton pour DossiersParEtapeEtTypeDemandeStats (section avec 2 graphiques). */
export const DossiersParEtapeEtTypeDemandeStatsSkeleton: React.FC = () => (
  <Card elevation={0} sx={{ mb: 3, boxShadow: 'none', borderRadius: 0 }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Skeleton variant="circular" width={48} height={48} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="70%" height={32} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width="90%" height={20} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton
          variant="rectangular"
          height={CHART_HEIGHT_ETAPE}
          sx={{ borderRadius: 1, width: '100%' }}
        />
        <Skeleton
          variant="rectangular"
          height={CHART_HEIGHT_ETAPE}
          sx={{ borderRadius: 1, width: '100%' }}
        />
      </Box>
    </CardContent>
  </Card>
);

/** Skeleton pour FinancePaiementCharts (graphiques paiement). */
export const FinancePaiementChartsSkeleton: React.FC = () => (
  <Card elevation={0} sx={{ mb: 3, boxShadow: 'none', borderRadius: 0 }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="text" width={220} height={28} />
      </Box>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Skeleton variant="circular" width={220} height={220} sx={{ flexShrink: 0 }} />
        <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 1, flex: 1, minWidth: 200 }} />
      </Box>
    </CardContent>
  </Card>
);

/** Skeleton pour DossiersEnAttenteList en mode sidebar (liste de cartes avec photo). */
export const DossiersEnAttenteListSkeleton: React.FC = () => (
  <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Skeleton variant="circular" width={48} height={48} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="70%" height={28} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="50%" height={20} />
      </Box>
    </Box>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Skeleton variant="rectangular" width={48} height={60} sx={{ borderRadius: 1, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="80%" height={22} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="50%" height={18} sx={{ mb: 0.5 }} />
            <Skeleton variant="rectangular" width={70} height={20} sx={{ borderRadius: 1 }} />
          </Box>
        </Box>
      ))}
    </Box>
  </Box>
);
