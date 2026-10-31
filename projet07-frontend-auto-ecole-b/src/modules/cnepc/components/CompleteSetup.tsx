import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  PersonAdd,
  School,
  CheckCircle,
} from '@mui/icons-material';
import UserForm from '../forms/UserForm';
import AutoEcoleForm from '../forms/AutoEcoleForm';
import { UserFormData, AutoEcoleFormData, userService, autoEcoleService } from '../services';

interface CompleteSetupProps {
  onComplete: () => void;
  onCancel: () => void;
  open: boolean;
}

const CompleteSetup: React.FC<CompleteSetupProps> = ({
  onComplete,
  onCancel,
  open,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [createdAutoEcole, setCreatedAutoEcole] = useState<any>(null);

  const steps = [
    {
      label: 'Créer l\'utilisateur',
      description: 'Créer un compte responsable d\'auto-école',
      icon: <PersonAdd />,
    },
    {
      label: 'Créer l\'auto-école',
      description: 'Créer l\'auto-école et l\'associer au responsable',
      icon: <School />,
    },
    {
      label: 'Terminé',
      description: 'Configuration complète',
      icon: <CheckCircle />,
    },
  ];

  const handleUserSuccess = (user: any) => {
    console.log('✅ Utilisateur créé:', user);
    console.log('🆔 ID Utilisateur:', user?.id);
    console.log('👤 ID Personne:', user?.personne?.id);
    console.log('⚠️  IMPORTANT: L\'auto-école sera créée avec l\'ID de la personne:', user?.personne?.id);
    setCreatedUser(user);
    setActiveStep(1);
  };

  const handleAutoEcoleSuccess = (autoEcole: any) => {
    console.log('✅ Auto-école créée:', autoEcole);
    setCreatedAutoEcole(autoEcole);
    setActiveStep(2);
  };

  const handleComplete = () => {
    onComplete();
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <UserForm
            onSuccess={handleUserSuccess}
            onCancel={onCancel}
            open={true}
          />
        );
      case 1:
        return (
          <AutoEcoleForm
            autoEcole={undefined}
            onSuccess={handleAutoEcoleSuccess}
            onCancel={onCancel}
            open={true}
            responsableId={createdUser?.personne?.id}
            responsableInfo={{
              nom: createdUser?.personne?.nom || '',
              prenom: createdUser?.personne?.prenom || '',
              email: createdUser?.email || '',
              contact: createdUser?.personne?.contact || '',
            }}
          />
        );
      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Configuration terminée !
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              L'utilisateur responsable et l'auto-école ont été créés avec succès.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={onCancel}
              >
                Fermer
              </Button>
              <Button
                variant="contained"
                onClick={handleComplete}
              >
                Continuer
              </Button>
            </Box>
          </Box>
        );
      default:
        return null;
    }
  };

  if (!open) return null;

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Configuration Complète
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Créez un responsable d'auto-école et son auto-école en quelques étapes
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  optional={
                    <Typography variant="caption">{step.description}</Typography>
                  }
                >
                  {step.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ minHeight: 400 }}>
            {renderStepContent()}
          </Box>

          {activeStep < 2 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
              >
                Retour
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={activeStep === 0 && !createdUser}
              >
                {activeStep === steps.length - 1 ? 'Terminer' : 'Suivant'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CompleteSetup;
