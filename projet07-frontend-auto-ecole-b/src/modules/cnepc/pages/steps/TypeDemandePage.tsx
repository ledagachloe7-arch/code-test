import React, { useEffect } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useCreateDossier } from '../../contexts/CreateDossierContext';
import { TypeDemandeStep } from '../../forms/steps';
import { useTypeDemandes } from '../../forms/hooks';
import { checkIsNouveauPermis, checkIsFicheEnregistre } from '../../forms/utils';

interface TypeDemandePageProps {
  onNext: () => void;
  onBack: () => void;
}

const TypeDemandePage: React.FC<TypeDemandePageProps> = ({ onNext, onBack }) => {
  const {
    typeDemandeId,
    selectedTypeDemande,
    isNouveauPermis,
    setTypeDemandeId,
    setSelectedTypeDemande,
    setIsNouveauPermis,
    setIsFicheEnregistre,
    error,
    setError,
    isPreviewMode,
  } = useCreateDossier();

  const { typeDemandes, loading: loadingTypeDemandes, loadTypeDemandes } = useTypeDemandes();

  useEffect(() => {
    if (!isPreviewMode) loadTypeDemandes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewMode]);

  const handleTypeDemandeChange = (value: string) => {
    setTypeDemandeId(value);
    setError(null);

    const typeDemande = typeDemandes.find((td: any) => td.id === value);
    if (typeDemande) {
      setSelectedTypeDemande(typeDemande);
      const isNouveau = checkIsNouveauPermis(typeDemande.name);
      const isFiche = checkIsFicheEnregistre(typeDemande.name);
      setIsNouveauPermis(isNouveau);
      setIsFicheEnregistre(isFiche);
    }
  };

  const handleNext = () => {
    if (!typeDemandeId) {
      setError('Veuillez sélectionner un type de demande');
      return;
    }
    onNext();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Étape 1 : Type de demande
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sélectionnez le type de demande pour ce dossier
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <TypeDemandeStep
          typeDemandeId={typeDemandeId}
          typeDemandes={typeDemandes}
          loadingTypeDemandes={loadingTypeDemandes}
          loading={false}
          selectedTypeDemande={selectedTypeDemande}
          isNouveauPermis={isNouveauPermis}
          onTypeDemandeChange={handleTypeDemandeChange}
          onBack={onBack}
          onNextClick={handleNext}
        />
      </Box>
    </Box>
  );
};

export default TypeDemandePage;

