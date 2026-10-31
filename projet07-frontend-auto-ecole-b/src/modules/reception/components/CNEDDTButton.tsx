import React from 'react';
import {
  Box,
  Typography,
  Button,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import { PaperAirplaneIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface CNEDDTButtonProps {
  allEtapesCompleted: boolean;
  dossierId?: string;
  epreuvesStatus?: string;
  loadingEpreuves: boolean;
  sendingToCNEDDT: boolean;
  sentToCNEDDT?: boolean;
  /** Tant que true (complétion de l'étape Final en cours), le bouton n'est pas affiché */
  completionLoading?: boolean;
  /** Quand true, le bouton est affiché par défaut à la dernière étape (même si toutes les étapes ne sont pas encore complétées) */
  isAtLastEtape?: boolean;
  onSendToCNEDDT: () => void;
}

export const CNEDDTButton: React.FC<CNEDDTButtonProps> = ({
  allEtapesCompleted,
  dossierId,
  epreuvesStatus,
  loadingEpreuves,
  sendingToCNEDDT,
  sentToCNEDDT = false,
  completionLoading = false,
  isAtLastEtape = false,
  onSendToCNEDDT
}) => {
  // Vérifier si les épreuves sont requises
  const hasEpreuves = epreuvesStatus && epreuvesStatus !== 'non_saisi' && epreuvesStatus.trim() !== '';
  const epreuvesValid = !hasEpreuves || epreuvesStatus === 'reussi';
  const prerequisitesOk = allEtapesCompleted && epreuvesValid && !loadingEpreuves;

  // À l'étape finale : bouton cliquable dès qu'on a un dossier et qu'on n'est pas en train d'envoyer
  // En dehors de la dernière étape : exiger en plus toutes les étapes complétées et épreuves valides
  const isButtonDisabled = sendingToCNEDDT || !dossierId || (isAtLastEtape ? false : !prerequisitesOk);

  // Ne pas masquer le bloc pendant la complétion de la dernière étape (pour garder le bouton visible)
  if (completionLoading) return null;
  // Afficher le bouton si toutes les étapes sont complétées OU si on est à la dernière étape (affichage par défaut)
  if (!allEtapesCompleted && !isAtLastEtape) return null;
  
  // Si le dossier a été envoyé avec succès, afficher le message de succès
  if (sentToCNEDDT) {
    return (
      <Box sx={{ mt: 4, pt: 3, borderTop: '2px solid', borderColor: 'divider' }}>
        <Alert 
          severity="success" 
          icon={<CheckCircleIcon className="w-6 h-6" />}
          sx={{
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
        >
          <Typography variant="h6" fontWeight="bold" className="font-display" gutterBottom>
            DOSSIER ENVOYÉ POUR IMPRESSION DE LA CARTE
          </Typography>
          <Typography variant="body2" className="font-primary">
            Le dossier a été envoyé avec succès à la CNEDDT pour l'impression de la carte.
          </Typography>
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ mt: 4, pt: 3, borderTop: '2px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" fontWeight="bold" className="font-display" gutterBottom>
            Toutes les étapes sont complétées
          </Typography>
          <Typography variant="body2" color="text.secondary" className="font-primary">
            {hasEpreuves && epreuvesStatus !== 'reussi'
              ? 'Toutes les épreuves doivent être validées pour envoyer à la CNEDDT'
              : 'Le dossier est prêt à être envoyé à la CNEDDT'}
          </Typography>
        </Box>
        <Tooltip 
          title={
            !allEtapesCompleted 
              ? 'Toutes les étapes du circuit doivent être complétées pour envoyer à la CNEDDT' 
              : hasEpreuves && epreuvesStatus !== 'reussi'
                ? 'Toutes les épreuves doivent être validées pour envoyer à la CNEDDT' 
                : 'Envoyer le dossier à la CNEDDT'
          }
        >
          <span>
            <Button
              variant="contained"
              size="large"
              color="secondary"
              startIcon={sendingToCNEDDT ? <CircularProgress size={20} /> : <PaperAirplaneIcon className="w-6 h-6" />}
              onClick={onSendToCNEDDT}
              disabled={isButtonDisabled}
              className="font-primary"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5
              }}
            >
              {sendingToCNEDDT ? 'Envoi en cours...' : 'Envoyer à la CNEDDT'}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

