import React, { useEffect } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { useCreateDossier } from '../../contexts/CreateDossierContext';
import { AutoEcoleFormationStep } from '../../forms/steps';
import { useAutoEcoles, useFormations } from '../../forms/hooks';
import type { AutoEcole } from '../../services';

interface AutoEcoleFormationPageProps {
  onNext: () => void;
  onBack: () => void;
}

const AutoEcoleFormationPage: React.FC<AutoEcoleFormationPageProps> = ({ onNext, onBack }) => {
  const {
    autoEcoleId,
    formationData,
    setAutoEcoleId,
    setSelectedAutoEcole,
    setFormationData,
    error,
    setError,
    isNouveauPermis,
    isPreviewMode,
  } = useCreateDossier();

  const { autoEcoles, loading: loadingAutoEcoles, loadAutoEcoles } = useAutoEcoles();
  const { formations, loading: loadingFormations, loadFormations } = useFormations();

  useEffect(() => {
    if (!isPreviewMode && isNouveauPermis) loadAutoEcoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNouveauPermis, isPreviewMode]);

  useEffect(() => {
    if (isPreviewMode) return;
    if (autoEcoleId && isNouveauPermis) {
      const autoEcole = autoEcoles.find((ae: AutoEcole) => ae.id === autoEcoleId);
      if (autoEcole) {
        setSelectedAutoEcole(autoEcole);
        loadFormations(autoEcoleId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEcoleId, autoEcoles, isNouveauPermis, isPreviewMode]);

  const handleAutoEcoleChange = (value: string) => {
    setAutoEcoleId(value);
    setFormationData(prev => ({ ...prev, formation_id: '' }));
    setError(null);
  };

  const handleFormationChange = (value: string) => {
    setFormationData(prev => ({ ...prev, formation_id: value }));
    setError(null);
  };

  const handleNext = () => {
    if (!autoEcoleId) {
      setError('Veuillez sélectionner une auto-école');
      return;
    }
    if (!formationData.formation_id) {
      setError('Veuillez sélectionner une formation');
      return;
    }
    onNext();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Étape 2 : Auto-école et Formation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sélectionnez l'auto-école et la formation pour ce nouveau permis
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <AutoEcoleFormationStep
          autoEcoles={autoEcoles}
          loadingAutoEcoles={loadingAutoEcoles}
          formations={formations}
          loadingFormations={loadingFormations}
          loading={false}
          autoEcoleId={autoEcoleId}
          formationId={formationData.formation_id}
          onAutoEcoleChange={handleAutoEcoleChange}
          onFormationChange={handleFormationChange}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={onBack}
        >
          Retour
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={handleNext}
          disabled={!autoEcoleId || !formationData.formation_id || loadingAutoEcoles || loadingFormations}
        >
          Suivant
        </Button>
      </Box>
    </Box>
  );
};

export default AutoEcoleFormationPage;

