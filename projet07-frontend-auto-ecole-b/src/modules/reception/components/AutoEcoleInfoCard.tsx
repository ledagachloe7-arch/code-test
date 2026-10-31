import React from 'react';
import { Card, CardContent, Box, Typography, Stack } from '@mui/material';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { ReceptionDossier } from '../types';

interface AutoEcoleInfoCardProps {
  autoEcole: any;
  formation: any;
  dossier: ReceptionDossier | null;
  dossierId?: string;
}

const AutoEcoleInfoCard: React.FC<AutoEcoleInfoCardProps> = ({ 
  autoEcole, 
  formation, 
  dossier,
  dossierId 
}) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AcademicCapIcon className="w-5 h-5 mr-2 text-blue-600" />
          <Typography variant="h6" fontWeight="bold" className="font-display">
            Auto-École
          </Typography>
        </Box>
        
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
              Nom de l'auto-école
            </Typography>
            <Typography variant="body1" className="font-primary">
              {autoEcole.nom_auto_ecole || autoEcole.nom || dossier?.autoEcoleNom || 'N/A'}
            </Typography>
          </Box>
          
          {formation && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
                Formation
              </Typography>
              <Typography variant="body1" className="font-primary">
                {formation.type_permis?.libelle || formation.nom || 'Formation'}
              </Typography>
            </Box>
          )}
          
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
              Date d'envoi
            </Typography>
            <Typography variant="body1" className="font-primary">
              {dossier?.dateEnvoi ? new Date(dossier.dateEnvoi).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'N/A'}
            </Typography>
          </Box>
          
          {dossier?.dateExamen && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
                Date d'examen
              </Typography>
              <Typography variant="body1" className="font-primary">
                {new Date(dossier.dateExamen).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Typography>
            </Box>
          )}
          
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
              Référence du dossier
            </Typography>
            <Typography variant="body1" className="font-primary">
              {dossier?.reference || dossierId || 'N/A'}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AutoEcoleInfoCard;

