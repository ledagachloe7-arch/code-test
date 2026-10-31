import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Box,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { Send, Warning, CheckCircle } from '@mui/icons-material';

interface SendFormProps {
  batchId: string;
  batchName: string;
  studentsCount: number;
  onSend: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const SendForm: React.FC<SendFormProps> = ({
  batchId,
  batchName,
  studentsCount,
  onSend,
  onCancel,
  isLoading = false,
}) => {
  const handleSend = () => {
    // Confirmation avant envoi
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir envoyer le lot "${batchName}" au CNEPC ?\n\n` +
      `Cette action enverra ${studentsCount} dossiers d'élèves.`
    );
    
    if (confirmed) {
      onSend();
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" className="mb-4">
          Envoi au CNEPC
        </Typography>

        <Alert severity="info" className="mb-4">
          <Typography variant="body2">
            Vous êtes sur le point d'envoyer un lot de dossiers au CNEPC. 
            Cette action est irréversible.
          </Typography>
        </Alert>

        <Box className="mb-4">
          <Typography variant="subtitle1" className="mb-2">
            Détails du lot :
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemText 
                primary="Nom du lot" 
                secondary={batchName}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Nombre d'élèves" 
                secondary={`${studentsCount} dossiers`}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="ID du lot" 
                secondary={batchId}
              />
            </ListItem>
          </List>
        </Box>

        <Divider className="my-4" />

        <Box className="mb-4">
          <Typography variant="subtitle1" className="mb-2">
            Vérifications avant envoi :
          </Typography>
          
          <Box className="space-y-2">
            <Box className="flex items-center gap-2">
              <CheckCircle color="success" />
              <Typography variant="body2">
                Tous les dossiers sont complets
              </Typography>
            </Box>
            <Box className="flex items-center gap-2">
              <CheckCircle color="success" />
              <Typography variant="body2">
                Documents validés
              </Typography>
            </Box>
            <Box className="flex items-center gap-2">
              <CheckCircle color="success" />
              <Typography variant="body2">
                Connexion CNEPC disponible
              </Typography>
            </Box>
          </Box>
        </Box>

        <Alert severity="warning" className="mb-4">
          <Typography variant="body2">
            <strong>Attention :</strong> Une fois envoyé, le statut du lot passera à "En attente de confirmation" 
            et vous recevrez une notification lorsque le CNEPC aura traité les dossiers.
          </Typography>
        </Alert>

        <Box className="flex justify-end gap-2">
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Send />}
            onClick={handleSend}
            disabled={isLoading}
            sx={{
              backgroundColor: '#50C786',
              '&:hover': { backgroundColor: '#40B676' },
            }}
          >
            {isLoading ? 'Envoi en cours...' : 'Envoyer au CNEPC'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SendForm;
