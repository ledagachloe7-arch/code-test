/**
 * Module Dashboard : tableau de bord (stats auto-école / admin).
 */
export { DashboardPage } from './pages';
export {
  StatCard,
  DashboardSection,
  LastUpdateHeader,
  DashboardLayout,
  AdminStatsGrid,
  AutoEcoleStatsGrid,
  AdminDashboardView,
  AutoEcoleDashboardView,
} from './components';
export { useDashboardStats } from './hooks';
export { getAutoEcoleStats, getAdminStats } from './services';
export type { AutoEcoleStats, AdminStats } from './types';
