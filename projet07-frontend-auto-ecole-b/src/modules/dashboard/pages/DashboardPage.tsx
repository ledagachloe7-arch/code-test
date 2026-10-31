import React, { Suspense, lazy, useEffect } from 'react';
import { Box } from '@mui/material';
import { useAppStore } from '../../../store';
import { useDashboardView, useVisibleDashboardWidgets, isWidgetVisible } from '../hooks';
import { DashboardLayout } from '../components';
import DashboardLoadingFallback from '../components/DashboardLoadingFallback';
import DashboardSectionFallback from '../components/DashboardSectionFallback';
import { useDashboardCache } from '../context/DashboardCacheContext';
import { useDashboardData } from '../context/DashboardDataContext';
import { FinanceRapportTab } from '../../finance/components';
import { useFinanceData } from '../../finance/context';

const AdminDashboardViewLazy = lazy(() => import('../components/AdminDashboardView'));
const AutoEcoleDashboardViewLazy = lazy(() => import('../components/AutoEcoleDashboardView'));
const TodoListByEtapeLazy = lazy(() => import('../components/TodoListByEtape'));

const DashboardPage: React.FC = () => {
  const { user } = useAppStore();
  const dashboardView = useDashboardView();
  const visibleKeys = useVisibleDashboardWidgets();
  const showTodoList = isWidgetVisible(visibleKeys, 'todoListByEtape');
  const isAdminView = dashboardView === 'admin';
  const cache = useDashboardCache();
  const { loadAutoEcoleStatsIfNeeded, loadAdminDataIfNeeded } = useDashboardData();
  const { loadFinanceDataIfNeeded } = useFinanceData();
  const isRoleCSAF = String(user?.role ?? '') === 'ROLE_CSAF';

  useEffect(() => {
    if (isAdminView) loadAdminDataIfNeeded();
    else loadAutoEcoleStatsIfNeeded();
  }, [isAdminView, loadAdminDataIfNeeded, loadAutoEcoleStatsIfNeeded]);

  useEffect(() => {
    if (isRoleCSAF) loadFinanceDataIfNeeded();
  }, [isRoleCSAF, loadFinanceDataIfNeeded]);

  const AdminView = cache.AdminDashboardView ?? AdminDashboardViewLazy;
  const AutoEcoleView = cache.AutoEcoleDashboardView ?? AutoEcoleDashboardViewLazy;
  const TodoList = cache.TodoListByEtape ?? TodoListByEtapeLazy;
  const useSuspense = !cache.isReady;

  return (
    <DashboardLayout>
      {isAdminView ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {useSuspense ? (
            <Suspense fallback={<DashboardLoadingFallback />}>
              <AdminView />
            </Suspense>
          ) : (
            <AdminView />
          )}
          {showTodoList &&
            (useSuspense ? (
              <Suspense fallback={<DashboardSectionFallback />}>
                <TodoList />
              </Suspense>
            ) : (
              <TodoList />
            ))}
          {isRoleCSAF && (
            <Box sx={{ mt: 2 }}>
              <FinanceRapportTab />
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {useSuspense ? (
            <Suspense fallback={<DashboardLoadingFallback />}>
              <AutoEcoleView />
            </Suspense>
          ) : (
            <AutoEcoleView />
          )}
          {isRoleCSAF && (
            <Box sx={{ mt: 2 }}>
              <FinanceRapportTab />
            </Box>
          )}
        </Box>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
