import React from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { useCreateDossier } from '../../contexts/CreateDossierContext';
import { PermisBOrigineStep } from '../../forms/steps';
import { buildNumeroOriginePermis } from '../../forms/utils';

interface PermisBOriginePageProps {
  onNext: () => void;
  onBack: () => void;
}

const PermisBOriginePage: React.FC<PermisBOriginePageProps> = ({ onNext, onBack }) => {
  const {
    numeroBOriginePermisParts,
    permisBOrigineFormat,
    permisBOrigineData,
    setNumeroBOriginePermisParts,
    setPermisBOrigineFormat,
    setPermisBOrigineData,
    error,
    setError,
    verifyingPermis,
    permisVerified,
    verificationError,
    candidatNonTrouve,
    handleVerifyPermis,
    isFicheEnregistre,
  } = useCreateDossier();

  const handleNext = () => {
    setError(null);
    const numPermisBOrigineComplet = buildNumeroOriginePermis(numeroBOriginePermisParts, permisBOrigineFormat);
    if (!numPermisBOrigineComplet?.trim()) {
      setError('Veuillez remplir le numéro du permis B d\'origine');
      return;
    }
    if (permisBOrigineFormat === 'standard' && numeroBOriginePermisParts.categorie !== 'B') {
      setError('La catégorie du permis B d\'origine doit être B');
      return;
    }
    if (!permisBOrigineData.lieu_de_dobtention_du_permis?.trim()) {
      setError('Veuillez remplir le lieu d\'obtention du permis B');
      return;
    }
    if (!permisBOrigineData.date_de_dobtention_du_permis) {
      setError('Veuillez remplir la date d\'obtention du permis B');
      return;
    }
    if (!permisBOrigineData.date_de_delivrance_du_permis) {
      setError('Veuillez remplir la date de délivrance du permis B');
      return;
    }

    if (isFicheEnregistre) {
      setPermisBOrigineData((prev) => ({
        ...prev,
        numero_origine_permis: numPermisBOrigineComplet.trim(),
        lieu_de_dobtention_du_permis: permisBOrigineData.lieu_de_dobtention_du_permis?.trim() || prev.lieu_de_dobtention_du_permis,
        date_de_dobtention_du_permis: permisBOrigineData.date_de_dobtention_du_permis || prev.date_de_dobtention_du_permis,
        date_de_delivrance_du_permis: permisBOrigineData.date_de_delivrance_du_permis || prev.date_de_delivrance_du_permis,
      }));
      onNext();
      return;
    }

    if (!permisVerified) {
      setError('Veuillez vérifier le permis B d\'origine avant de continuer');
      return;
    }
    onNext();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Permis B d'origine
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isFicheEnregistre
          ? 'Renseignez le numéro et les informations du permis B d\'origine (saisie manuelle, sans vérification en ligne).'
          : 'Saisissez les informations du permis B d\'origine (requis pour le permis C)'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <PermisBOrigineStep
          numeroBOriginePermisParts={numeroBOriginePermisParts}
          permisBOrigineFormat={permisBOrigineFormat}
          permisBOrigineData={permisBOrigineData}
          loading={false}
          skipVerification={isFicheEnregistre}
          verifyingPermis={verifyingPermis}
          permisVerified={permisVerified}
          verificationError={verificationError}
          candidatNonTrouve={candidatNonTrouve}
          onNumeroBOriginePermisPartsChange={setNumeroBOriginePermisParts}
          onPermisBOrigineFormatChange={setPermisBOrigineFormat}
          onPermisBOrigineDataChange={setPermisBOrigineData}
          onVerifyPermis={isFicheEnregistre ? undefined : handleVerifyPermis}
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
          disabled={verifyingPermis || (!isFicheEnregistre && !permisVerified)}
        >
          Suivant
        </Button>
      </Box>
    </Box>
  );
};

export default PermisBOriginePage;

