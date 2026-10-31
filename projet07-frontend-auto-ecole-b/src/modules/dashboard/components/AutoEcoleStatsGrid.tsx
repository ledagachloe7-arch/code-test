import React, { useEffect } from 'react';
import { Grid } from '@mui/material';
import { UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import DashboardSection from './DashboardSection';
import StatCard from './StatCard';
import { useDashboardData } from '../context/DashboardDataContext';

const AutoEcoleStatsGrid: React.FC = () => {
  const {
    autoEcoleStats,
    loadingAutoEcole,
    refreshAutoEcoleStats,
  } = useDashboardData();

  const stats = autoEcoleStats ?? {
    totalEleves: 0,
    dossiersValides: 0,
    transmisCNEPC: 0,
    dossiersValidationDossier: 0,
  };

  useEffect(() => {
    const refresh = () => refreshAutoEcoleStats();
    ['dossierUpdated', 'dossierValidated', 'dossierTransmis'].forEach((ev) =>
      window.addEventListener(ev, refresh)
    );
    return () => {
      ['dossierUpdated', 'dossierValidated', 'dossierTransmis'].forEach((ev) =>
        window.removeEventListener(ev, refresh)
      );
    };
  }, [refreshAutoEcoleStats]);

  return (
    <DashboardSection
      title="Statistiques"
      subtitle="Nombre d'inscrits et dossiers en attente de validationss"
      icon={<DocumentTextIcon className="w-6 h-6" style={{ color: 'inherit' }} />}
    >
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={6}>
          <StatCard
            title="Nombre d'inscrits"
            value={stats.totalEleves}
            loading={loadingAutoEcole}
            icon={<UserGroupIcon className="w-8 h-8" />}
            valueColor="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <StatCard
            title={'Dossiers au statut "VALIDATION DE DOSSIER"'}
            value={stats.dossiersValidationDossier}
            loading={loadingAutoEcole}
            icon={<DocumentTextIcon className="w-8 h-8" />}
            valueColor="primary"
          />
        </Grid>
      </Grid>
    </DashboardSection>
  );
};

export default AutoEcoleStatsGrid;
