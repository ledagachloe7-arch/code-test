import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
} from '@mui/icons-material';
import { AutoEcoleTable } from '../tables';
import { AutoEcole } from '../services';
import { AutoEcoleSettings } from '../components';

const AutoEcoleManagement: React.FC = () => {
  const [selectedAutoEcole, setSelectedAutoEcole] = useState<AutoEcole | null>(null);
  const [refreshTrigger] = useState(0);

  // Gestion de la sélection d'une auto-école pour afficher les paramètres
  const handleAutoEcoleSettings = (autoEcole: AutoEcole) => {
    setSelectedAutoEcole(autoEcole);
  };

  // Retour à la liste
  const handleBackToList = () => {
    setSelectedAutoEcole(null);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* En-tête */}
      <Box sx={{ mb: 3 }}>
        {selectedAutoEcole ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={handleBackToList} color="primary">
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h3" component="h1" gutterBottom>
                Paramètres - {selectedAutoEcole.nom_auto_ecole}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Gérez les paramètres, candidats et formations de cette auto-école
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            <Typography variant="h3" component="h1" gutterBottom>
              Gestion des Auto-Écoles
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gérez vos auto-écoles et suivez les candidats inscrits
            </Typography>
          </>
        )}
      </Box>

      {/* Contenu conditionnel */}
      {selectedAutoEcole ? (
        <Paper sx={{ width: '100%', p: 3 }}>
          <AutoEcoleSettings
            autoEcole={selectedAutoEcole}
            refreshTrigger={refreshTrigger}
          />
        </Paper>
      ) : (
        <AutoEcoleTable
          onAutoEcoleSettings={handleAutoEcoleSettings}
          refreshTrigger={refreshTrigger}
        />
      )}
    </Box>
  );
};

export default AutoEcoleManagement;
