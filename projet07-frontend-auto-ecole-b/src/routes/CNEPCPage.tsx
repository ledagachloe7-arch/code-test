import React, { useState } from 'react';
import { Typography, Container, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../shared/constants';
import { CompleteSetup } from '../modules/cnepc';
import { CNEPCHeader, ModulesGrid, useCNEPCStats, getModulesConfig } from '../modules/gestionnaire';

const CNEPCPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCompleteSetup, setShowCompleteSetup] = useState(false);
  const { stats, loading } = useCNEPCStats();

  const modules = getModulesConfig(
    navigate,
    () => setShowCompleteSetup(true)
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <CNEPCHeader stats={stats} loading={loading} />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          service examen et Validation
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Interface de gestion des auto-écoles et des candidats au permis de conduire
        </Typography>

        <ModulesGrid modules={modules} />
      </Container>

      {/* Configuration Complète */}
      <CompleteSetup
        open={showCompleteSetup}
        onComplete={() => {
          setShowCompleteSetup(false);
          navigate(ROUTES.AUTO_ECOLES);
        }}
        onCancel={() => setShowCompleteSetup(false)}
      />
    </Box>
  );
};

export default CNEPCPage;
