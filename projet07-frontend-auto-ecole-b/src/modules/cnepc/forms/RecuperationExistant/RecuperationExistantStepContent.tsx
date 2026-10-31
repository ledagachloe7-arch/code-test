import React from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import {
  NumeroPermisStep,
  PermisInfoStep,
  PersonneFormStep,
  CandidatFormStep,
  FinalisationStep,
  DossierInfoStep,
} from '../steps';

interface RecuperationExistantStepContentProps {
  step: number;
  getRealStepIndex: (step: number) => number;
  // Step 0
  selectedTypeDemande: { name: string } | null;
  // Step 1
  numeroPermisParts: any;
  isFicheEnregistre: boolean;
  loading: boolean;
  permisFormat: 'standard' | 'op';
  onNumeroPermisPartsChange: (v: any) => void;
  onFormatChange: (v: 'standard' | 'op') => void;
  // Step 2
  numeroPermis: string;
  buildNumeroPermis: (parts: any, format: string) => string;
  loadingRecuperation: boolean;
  error: string | null;
  dataRecuperee: any;
  // Step 3
  permisData: any;
  formationData: any;
  referentiels: any[];
  // Step 4
  personneData: any;
  onPersonneDataChange: (v: any) => void;
  onRegisterPersonne: () => Promise<void>;
  // Step 5
  candidatData: any;
  onCandidatDataChange: (v: any) => void;
  onCreateCandidatPlaceholder: () => void;
  // Step 6
  permisOrigineFormat: 'standard' | 'op';
  numeroOriginePermisParts: any;
  onPermisDataChange: (v: any) => void;
  onNumeroOriginePermisPartsChange: (v: any) => void;
  onPermisOrigineFormatChange: (v: 'standard' | 'op') => void;
  loadingReferentiels: boolean;
  onFormationDataChange: (v: any) => void;
  onSubmit: () => Promise<void>;
}

export const RecuperationExistantStepContent: React.FC<RecuperationExistantStepContentProps> = ({
  step,
  getRealStepIndex,
  selectedTypeDemande,
  numeroPermisParts,
  isFicheEnregistre,
  loading,
  permisFormat,
  onNumeroPermisPartsChange,
  onFormatChange,
  numeroPermis,
  buildNumeroPermis,
  loadingRecuperation,
  error,
  dataRecuperee,
  permisData,
  formationData,
  referentiels,
  personneData,
  onPersonneDataChange,
  onRegisterPersonne,
  candidatData,
  onCandidatDataChange,
  onCreateCandidatPlaceholder,
  permisOrigineFormat,
  numeroOriginePermisParts,
  onPermisDataChange,
  onNumeroOriginePermisPartsChange,
  onPermisOrigineFormatChange,
  loadingReferentiels,
  onFormationDataChange,
  onSubmit,
}) => {
  const realStep = getRealStepIndex(step);

  switch (realStep) {
    case 0:
      return (
        <Box>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Type de demande: <strong>DUPLICATA</strong>
          </Typography>
          {selectedTypeDemande && (
            <Typography variant="caption" color="text.secondary">
              {selectedTypeDemande.name}
            </Typography>
          )}
        </Box>
      );

    case 1:
      return (
        <NumeroPermisStep
          numeroPermisParts={numeroPermisParts}
          isFicheEnregistre={isFicheEnregistre}
          loading={loading}
          format={permisFormat}
          onNumeroPermisPartsChange={onNumeroPermisPartsChange}
          onFormatChange={onFormatChange}
        />
      );

    case 2: {
      const numPermisAffiche = numeroPermis || buildNumeroPermis(numeroPermisParts, permisFormat);
      return (
        <Box>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Récupération des données pour le numéro de permis: <strong>{numPermisAffiche || 'Non renseigné'}</strong>
          </Typography>
          {loadingRecuperation && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Récupération en cours...</Typography>
            </Box>
          )}
          {error && !loadingRecuperation && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {dataRecuperee && !loadingRecuperation && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Données récupérées avec succès ! Les informations ont été pré-remplies.
            </Alert>
          )}
        </Box>
      );
    }

    case 3:
      return (
        <DossierInfoStep
          permisData={permisData}
          formationData={formationData}
          referentiels={referentiels}
          loading={loading}
        />
      );

    case 4:
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Informations personnelles
          </Typography>
          <PersonneFormStep
            personneData={personneData}
            loading={loading}
            onPersonneDataChange={onPersonneDataChange}
            onRegister={onRegisterPersonne}
            error={error}
          />
        </Box>
      );

    case 5:
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Informations du candidat
          </Typography>
          <CandidatFormStep
            candidatData={candidatData}
            loading={loading}
            onCandidatDataChange={onCandidatDataChange}
            onCreateCandidat={onCreateCandidatPlaceholder}
            error={error}
          />
        </Box>
      );

    case 6:
      return (
        <Box>
          <PermisInfoStep
            permisData={permisData}
            numeroPermis={numeroPermis}
            loading={loading}
            onPermisDataChange={onPermisDataChange}
          />
          <Box sx={{ mt: 4 }}>
            <FinalisationStep
              formationData={formationData}
              referentiels={referentiels}
              loadingReferentiels={loadingReferentiels}
              loading={loading}
              onFormationDataChange={onFormationDataChange}
              onSubmit={onSubmit}
            />
          </Box>
        </Box>
      );

    default:
      return <Typography>Étape inconnue</Typography>;
  }
};
