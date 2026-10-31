import React from 'react';
import {
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Box,
  Stepper,
  Step,
  StepLabel,
  Collapse,
} from '@mui/material';
import { PersonAdd, ArrowBack, ArrowForward, CheckCircle, Add, Close } from '@mui/icons-material';
import { useRecuperationExistantForm } from './useRecuperationExistantForm';
import { RecuperationExistantStepContent } from './RecuperationExistantStepContent';

interface RecuperationExistantFormProps {
  onSuccess: () => void;
}

const RecuperationExistantForm: React.FC<RecuperationExistantFormProps> = ({ onSuccess }) => {
  const form = useRecuperationExistantForm(onSuccess);

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={form.showForm ? <Close /> : <Add />}
          onClick={() => {
            if (form.showForm) form.resetForm();
            form.setShowForm(!form.showForm);
          }}
        >
          {form.showForm ? 'Annuler' : "Récupération de l'existant"}
        </Button>
      </Box>

      <Collapse in={form.showForm}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <PersonAdd color="secondary" />
            <Typography variant="h6">Récupération de l'existant (DUPLICATA)</Typography>
          </Box>

          <Stepper activeStep={form.activeStep} sx={{ mb: 4 }}>
            {form.steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {form.error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => form.setError(null)} icon={false}>
              <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
                <strong>Erreur :</strong>
                <br />
                {form.error}
              </Typography>
            </Alert>
          )}

          {form.success && (
            <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
              {form.success}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <RecuperationExistantStepContent
              step={form.activeStep}
              getRealStepIndex={form.getRealStepIndex}
              selectedTypeDemande={form.selectedTypeDemande}
              numeroPermisParts={form.numeroPermisParts}
              isFicheEnregistre={form.isFicheEnregistre}
              loading={form.loading}
              permisFormat={form.permisFormat}
              onNumeroPermisPartsChange={form.setNumeroPermisParts}
              onFormatChange={form.setPermisFormat}
              numeroPermis={form.numeroPermis}
              buildNumeroPermis={form.buildNumeroPermis}
              loadingRecuperation={form.loadingRecuperation}
              error={form.error}
              dataRecuperee={form.dataRecuperee}
              permisData={form.permisData}
              formationData={form.formationData}
              referentiels={form.referentiels}
              personneData={form.personneData}
              onPersonneDataChange={form.setPersonneData}
              onRegisterPersonne={form.handleRegisterPersonne}
              candidatData={form.candidatData}
              onCandidatDataChange={form.setCandidatData}
              onCreateCandidatPlaceholder={() => Promise.resolve()}
              permisOrigineFormat={form.permisOrigineFormat}
              numeroOriginePermisParts={form.numeroOriginePermisParts}
              onPermisDataChange={form.setPermisData}
              onNumeroOriginePermisPartsChange={form.setNumeroOriginePermisParts}
              onPermisOrigineFormatChange={form.setPermisOrigineFormat}
              loadingReferentiels={form.loadingReferentiels}
              onFormationDataChange={form.setFormationData}
              onSubmit={form.handleSubmit}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              {form.activeStep > 0 && (
                <Button
                  onClick={form.handleBack}
                  disabled={form.loading || form.loadingRecuperation}
                  startIcon={<ArrowBack />}
                >
                  Précédent
                </Button>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              {form.activeStep < form.steps.length - 1 ? (
                <Button
                  onClick={form.handleNext}
                  variant="contained"
                  disabled={form.loading || form.loadingRecuperation}
                  endIcon={
                    form.loading || form.loadingRecuperation ? (
                      <CircularProgress size={20} />
                    ) : (
                      <ArrowForward />
                    )
                  }
                >
                  {form.loading || form.loadingRecuperation
                    ? form.activeStep === 2
                      ? 'Récupération...'
                      : 'Chargement...'
                    : form.activeStep === 2
                      ? 'Récupérer les données'
                      : 'Suivant'}
                </Button>
              ) : (
                <Button
                  onClick={form.handleSubmit}
                  variant="contained"
                  disabled={form.loading || form.loadingRecuperation}
                  startIcon={form.loading ? <CircularProgress size={20} /> : <CheckCircle />}
                >
                  {form.loading ? 'Création en cours...' : 'Finaliser la création'}
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default RecuperationExistantForm;
