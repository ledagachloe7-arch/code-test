import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Container, Paper, Alert, Tabs, Tab } from '@mui/material';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { FinancePaiementCharts } from '../../dashboard/components';
import FinanceTable from '../tables/FinanceTable';
import { FinanceRapportTab, FinanceDossierRapportTab } from '../components';
import { useFinanceData } from '../context';

const SIDEBAR_WIDTH = 420;

const FinancePage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const {
    aTraiter,
    dejaTraites,
    loading,
    error,
    loadFinanceDataIfNeeded,
    refreshFinanceData,
  } = useFinanceData();

  useEffect(() => {
    loadFinanceDataIfNeeded();
  }, [loadFinanceDataIfNeeded]);

  const byStatut = useMemo(() => {
    const map = new Map<string, number>();
    dejaTraites.forEach((d) => {
      const label = d.statut?.trim() || '—';
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [dejaTraites]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
          <CurrencyDollarIcon className="w-8 h-8" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Dashboard financière
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dossiers à traiter (génération du code de paiement pour les usagers) et dossiers déjà traités.
          </Typography>
        </Box>
      </Box>

      <Tabs
        value={tabValue}
        onChange={(_, v: number) => setTabValue(v)}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 2,
          '& .MuiTabs-indicator': { height: 3 },
        }}
      >
        <Tab label="Dashboard" id="finance-tab-0" aria-controls="finance-panel-0" />
        <Tab label="Rapport des flux" id="finance-tab-1" aria-controls="finance-panel-1" />
        <Tab label="Rapport de dossiers" id="finance-tab-2" aria-controls="finance-panel-2" />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {tabValue === 2 ? (
        <FinanceDossierRapportTab />
      ) : tabValue === 1 ? (
        <FinanceRapportTab />
      ) : (
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          alignItems: 'stretch',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <FinancePaiementCharts
            aTraiterCount={aTraiter.length}
            dejaTraitesCount={dejaTraites.length}
            byStatut={byStatut}
            loading={loading}
          />

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Dossiers à traiter
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dossiers à l&apos;étape paiement sans code, ou avec code généré mais paiement pas encore vérifié. Générer le code puis vérifier le paiement pour les faire passer en « déjà traités ».
                </Typography>
              </Box>
              {!loading && (
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {aTraiter.length}
                </Typography>
              )}
            </Box>
            <FinanceTable
              sectionType="a_traiter"
              rows={aTraiter}
              loading={loading}
              onRefresh={refreshFinanceData}
            />
          </Paper>
        </Box>

        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            width: { xs: '100%', md: SIDEBAR_WIDTH },
            flexShrink: 0,
            position: { md: 'sticky' },
            top: { md: 24 },
            maxHeight: { md: 'calc(100vh - 48px)' },
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: { md: 1 },
            borderColor: { md: 'divider' },
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Dossiers déjà traités
              </Typography>
              {!loading && (
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {dejaTraites.length}
                </Typography>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Dossiers avec code de paiement et vérification réussie (étape paiement complétée).
            </Typography>
          </Box>
          <Box sx={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
            <FinanceTable
              sectionType="deja_traite"
              rows={dejaTraites}
              loading={loading}
              onRefresh={refreshFinanceData}
              variant="sidebar"
            />
          </Box>
        </Paper>
      </Box>
      )}
    </Container>
  );
};

export default FinancePage;
