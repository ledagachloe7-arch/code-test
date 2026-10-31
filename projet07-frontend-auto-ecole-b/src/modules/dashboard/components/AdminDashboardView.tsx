import React, { Suspense, lazy } from 'react';
import { Box, Paper } from '@mui/material';
import LastUpdateHeader from './LastUpdateHeader';
import {
  AdminStatsGridSkeleton,
  DossiersParAutoEcoleStatsSkeleton,
  DossiersParEtapeEtTypeDemandeStatsSkeleton,
  FinancePaiementChartsSkeleton,
  DossiersEnAttenteListSkeleton,
} from './AdminDashboardSkeletons';
import { useVisibleDashboardWidgets, isWidgetVisible } from '../hooks';

const AdminStatsGrid = lazy(() => import('./AdminStatsGrid'));
const DossiersParAutoEcoleStats = lazy(() => import('./DossiersParAutoEcoleStats'));
const DossiersParEtapeEtTypeDemandeStats = lazy(() => import('./DossiersParEtapeEtTypeDemandeStats'));
const FinancePaiementChartsWidget = lazy(() => import('./FinancePaiementChartsWidget'));
const DossiersEnAttenteList = lazy(() => import('./DossiersEnAttenteList'));

const SIDEBAR_WIDTH = 380;

const AdminDashboardView: React.FC = () => {
  const visibleKeys = useVisibleDashboardWidgets();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 3,
        alignItems: 'stretch',
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: 'visible',
          bgcolor: 'transparent',
          '& .MuiCard-root': { bgcolor: 'transparent', borderRadius: 0 },
          '& .MuiPaper-root': { borderRadius: 0 },
        }}
      >
        {isWidgetVisible(visibleKeys, 'lastUpdateHeader') && <LastUpdateHeader />}
        {isWidgetVisible(visibleKeys, 'adminStatsGrid') && (
          <Box sx={{ mb: 3 }}>
            <Suspense fallback={<AdminStatsGridSkeleton />}>
              <AdminStatsGrid />
            </Suspense>
          </Box>
        )}
        {isWidgetVisible(visibleKeys, 'dossiersParAutoEcoleStats') && (
          <Suspense fallback={<DossiersParAutoEcoleStatsSkeleton />}>
            <DossiersParAutoEcoleStats />
          </Suspense>
        )}
        {isWidgetVisible(visibleKeys, 'dossiersParEtapeEtTypeDemandeStats') && (
          <Suspense fallback={<DossiersParEtapeEtTypeDemandeStatsSkeleton />}>
            <DossiersParEtapeEtTypeDemandeStats />
          </Suspense>
        )}
        {isWidgetVisible(visibleKeys, 'financePaiementCharts') && (
          <Suspense fallback={<FinancePaiementChartsSkeleton />}>
            <FinancePaiementChartsWidget />
          </Suspense>
        )}
      </Box>

      {isWidgetVisible(visibleKeys, 'dossiersEnAttenteList') && (
        <Paper
          elevation={0}
          sx={{
            width: { xs: '100%', md: SIDEBAR_WIDTH },
            flexShrink: 0,
            position: { md: 'sticky' },
            top: { md: 24 },
            maxHeight: { md: 'calc(100vh - 48px)' },
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 0,
            borderLeft: { md: 1 },
            borderColor: { md: 'divider' },
          }}
        >
          <Box sx={{ overflow: 'auto', flex: 1, p: 2 }}>
            <Suspense fallback={<DossiersEnAttenteListSkeleton />}>
              <DossiersEnAttenteList variant="sidebar" />
            </Suspense>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default AdminDashboardView;
