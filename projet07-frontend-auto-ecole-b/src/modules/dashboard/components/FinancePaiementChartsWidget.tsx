import React from 'react';
import { useDashboardData } from '../context/DashboardDataContext';
import FinancePaiementCharts from './FinancePaiementCharts';

/**
 * Widget dashboard : affiche les graphiques de paiement (données depuis le contexte).
 * Utilisé sur le tableau de bord admin.
 */
const FinancePaiementChartsWidget: React.FC = () => {
  const { adminData, loadingAdmin } = useDashboardData();
  const finance = adminData?.finance ?? {
    aTraiterCount: 0,
    dejaTraitesCount: 0,
    byStatut: [],
  };

  return (
    <FinancePaiementCharts
      aTraiterCount={finance.aTraiterCount}
      dejaTraitesCount={finance.dejaTraitesCount}
      byStatut={finance.byStatut}
      loading={loadingAdmin}
    />
  );
};

export default FinancePaiementChartsWidget;
