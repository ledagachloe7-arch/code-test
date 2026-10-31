import React from 'react';
import LastUpdateHeader from './LastUpdateHeader';
import AutoEcoleStatsGrid from './AutoEcoleStatsGrid';
import { useVisibleDashboardWidgets, isWidgetVisible } from '../hooks';

const AutoEcoleDashboardView: React.FC = () => {
  const visibleKeys = useVisibleDashboardWidgets();

  return (
    <>
      {isWidgetVisible(visibleKeys, 'lastUpdateHeader') && <LastUpdateHeader />}
      {isWidgetVisible(visibleKeys, 'autoEcoleStatsGrid') && <AutoEcoleStatsGrid />}
    </>
  );
};

export default AutoEcoleDashboardView;
