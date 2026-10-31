import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
} from '@mui/material';
import { School, Person, CheckCircle } from '@mui/icons-material';
import UserForm from './UserForm';
import AutoEcoleForm from './AutoEcoleForm';
import { AutoEcole } from '../services';
import type { User } from '../services/user.service';

interface AutoEcoleCreationWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (autoEcole: AutoEcole) => void;
}

/**
 * 🧙‍♂️ Assistant de création d'auto-école en 2 étapes
 * 
 * Ce composant orchestre le processus complet :
 * 1️⃣ Création d'un responsable d'auto-école
 * 2️⃣ Création de l'auto-école et attribution au responsable
 * 
 * Conforme au JSON de réponse de l'API défini dans la documentation.
 */
const AutoEcoleCreationWizard: React.FC<AutoEcoleCreationWizardProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const [showUserForm, setShowUserForm] = useState(true);
  const [showAutoEcoleForm, setShowAutoEcoleForm] = useState(false);

  const steps = [
    {
      label: 'Créer le responsable',
      description: 'Création du compte utilisateur pour le responsable de l\'auto-école',
      icon: <Person />,
    },
    {
      label: 'Créer l\'auto-école',
      description: 'Création de l\'établissement et attribution au responsable',
      icon: <School />,
    },
  ];

  /**
   * 🎯 Étape 1 : Gestion de la création du responsable
   */
  const handleUserCreated = (user: User) => {
    console.log('✅ Étape 1 terminée - Responsable créé:', user);
    setCreatedUser(user);
    setActiveStep(1);
    setShowUserForm(false);
    setShowAutoEcoleForm(true);
  };

  /**
   * 🎯 Étape 2 : Gestion de la création de l'auto-école
   */
  const handleAutoEcoleCreated = (autoEcole: AutoEcole) => {
    console.log('✅ Étape 2 terminée - Auto-école créée:', autoEcole);
    console.log('🎉 Processus complet terminé avec succès !');
    console.log('📊 Résumé:', {
      responsable: createdUser,
      autoEcole: autoEcole,
      formations: autoEcole.formations?.length || 0,
      dossiers: autoEcole.dossiers?.length || 0,
    });
    
    onSuccess(autoEcole);
    handleReset();
  };

  /**
   * 🔄 Réinitialiser l'assistant
   */
  const handleReset = () => {
    setActiveStep(0);
    setCreatedUser(null);
    setShowUserForm(true);
    setShowAutoEcoleForm(false);
  };

  /**
   * ❌ Annulation
   */
  const handleCancel = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <School color="primary" fontSize="large" />
          <Box>
            <Typography variant="h5" component="div">
              Assistant de création d'auto-école
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Processus en 2 étapes : Responsable puis Auto-école
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* 📊 Stepper - Afficher la progression */}
        <Box sx={{ mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((step, index) => (
              <Step key={step.label} completed={index < activeStep}>
                <StepLabel
                  icon={
                    index < activeStep ? (
                      <CheckCircle color="success" />
                    ) : (
                      step.icon
                    )
                  }
                >
                  <Typography variant="body2" fontWeight="bold">
                    {step.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* 📋 Instructions pour l'étape en cours */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            {activeStep === 0 ? (
              <>
                <strong>Étape 1/2 :</strong> Créez d'abord le compte du responsable de l'auto-école.
                Ce compte aura le rôle <code>ROLE_AUTO_ECOLE</code>.
              </>
            ) : (
              <>
                <strong>Étape 2/2 :</strong> Créez maintenant l'établissement auto-école qui sera
                automatiquement associé au responsable <strong>{createdUser?.email}</strong>.
              </>
            )}
          </Typography>
        </Alert>

        {/* 📝 Formulaire de création de responsable (Étape 1) */}
        {showUserForm && (
          <UserForm
            open={true}
            onSuccess={handleUserCreated}
            onCancel={handleCancel}
          />
        )}

        {/* 🏫 Formulaire de création d'auto-école (Étape 2) */}
        {showAutoEcoleForm && createdUser && createdUser.personne && (
          <AutoEcoleForm
            open={true}
            responsableId={createdUser.personne.id}
            responsableInfo={{
              nom: createdUser.personne.nom,
              prenom: createdUser.personne.prenom,
              email: createdUser.email,
              contact: createdUser.personne.contact,
            }}
            onSuccess={handleAutoEcoleCreated}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AutoEcoleCreationWizard;

