import React from 'react';
import { Grid, Box, Alert, useTheme } from '@mui/material';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import DashboardSection from './DashboardSection';
import StatCardWithSparkline from './StatCardWithSparkline';
import { useDashboardData } from '../context/DashboardDataContext';

const AdminStatsGrid: React.FC = () => {
  const theme = useTheme();
  const { adminData, loadingAdmin } = useDashboardData();

  const weekLabels = adminData?.weekly.weekLabels ?? [];
  const items = adminData?.weekly.items ?? [];

  const cardColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
  ];

  const totalDossiers = items.reduce((sum, row) => sum + row.count, 0);
  const subtitle = loadingAdmin
    ? 'Chargement des données...'
    : items.length === 0
      ? 'Aucun type de demande'
      : `Répartition par type de demande et par semaine (${items.length} type(s), total: ${totalDossiers} dossiers)`;

  const displayItems = items.filter((item) => item.count >= 0);

  return (
    <DashboardSection
      title="Dossiers par type de demande"
      subtitle={subtitle}
      icon={<DocumentTextIcon className="w-6 h-6" style={{ color: 'inherit' }} />}
    >
      {loadingAdmin ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} lg={3} key={i}>
              <StatCardWithSparkline
                title=""
                value={0}
                sparkData={[]}
                color={cardColors[(i - 1) % cardColors.length]}
                elevation={2}
                loading
              />
            </Grid>
          ))}
        </Grid>
      ) : displayItems.length === 0 ? (
        <Box sx={{ color: 'text.secondary' }}>Aucune donnée à afficher.</Box>
      ) : (
        <Grid container spacing={3}>
          {displayItems.map((item, index) => (
            <Grid item xs={12} sm={6} lg={3} key={item.typeDemandeId || item.libelle}>
              <StatCardWithSparkline
                title={item.libelle}
                value={item.count}
                sparkData={item.weeklyCounts}
                xAxisLabels={weekLabels}
                color={cardColors[index % cardColors.length]}
                elevation={2}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </DashboardSection>
  );
};

export default AdminStatsGrid;
