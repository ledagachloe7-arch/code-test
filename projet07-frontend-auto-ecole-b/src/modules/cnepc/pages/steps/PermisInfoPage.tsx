import React from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { useCreateDossier } from '../../contexts/CreateDossierContext';
import { PermisInfoStep } from '../../forms/steps';
import { buildNumeroPermis } from '../../forms/utils';

interface PermisInfoPageProps {
  onNext: () => void;
  onBack: () => void;
}

const PermisInfoPage: React.FC<PermisInfoPageProps> = ({ onNext, onBack }) => {
  const {
    permisData,
    numeroPermisParts,
    permisFormat,
    setPermisData,
    setNumeroPermis,
    error,
    setError,
  } = useCreateDossier();

  const handleNext = () => {
    if (!permisData.lieu_de_dobtention_du_permis || permisData.lieu_de_dobtention_du_permis.trim() === '') {
      setError('Veuillez remplir le lieu d\'obtention du permis');
      return;
    }
    if (!permisData.date_de_dobtention_du_permis) {
      setError('Veuillez remplir la date d\'obtention du permis');
      return;
    }
    if (!permisData.date_de_delivrance_du_permis) {
      setError('Veuillez remplir la date de délivrance du permis');
      return;
    }
    
    // Mettre à jour le numéro de permis si nécessaire
    const numPermisComplet = buildNumeroPermis(numeroPermisParts, permisFormat);
    if (numPermisComplet) {
      setNumeroPermis(numPermisComplet);
      setPermisData(prev => ({ ...prev, numero_permis: numPermisComplet }));
    }
    
    onNext();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Étape 3 : Informations du permis
      </Typography>
    

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <PermisInfoStep
          permisData={permisData}
          numeroPermis={buildNumeroPermis(numeroPermisParts, permisFormat)}
          loading={false}
          onPermisDataChange={setPermisData}
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
        >
          Suivant
        </Button>
      </Box>
    </Box>
  );
};

export default PermisInfoPage;

