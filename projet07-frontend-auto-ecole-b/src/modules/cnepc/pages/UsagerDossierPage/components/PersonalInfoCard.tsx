import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { Dossier } from '../../../types/auto-ecole';
import { formatDate } from '../utils';

interface PersonalInfoCardProps {
  dossier: Dossier;
}

const PersonalInfoCard: React.FC<PersonalInfoCardProps> = ({ dossier }) => {
  return (
    <>
      {dossier.candidat?.personne && (
        <Card 
          elevation={0} 
          sx={{ 
            mb: 2, 
            backgroundColor: 'transparent',
            boxShadow: 'none',
          }}
        >
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Nom complet
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {dossier.candidat.personne.prenom} {dossier.candidat.personne.nom}
            </Typography>
            
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Numéro Candidat
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {dossier.candidat.numero_candidat || 'N/A'}
            </Typography>
            
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Email
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {dossier.candidat.personne.email || 'N/A'}
            </Typography>
            
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Téléphone
            </Typography>
            <Typography variant="body1">
              {(dossier.candidat.personne as any).telephone || dossier.candidat.personne.contact || 'N/A'}
            </Typography>
          </CardContent>
        </Card>
      )}

      {dossier.candidat && (
        <Card 
          elevation={0}
          sx={{
            backgroundColor: 'transparent',
            boxShadow: 'none',
          }}
        >
          <CardContent>
            {dossier.candidat.date_naissance && (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Date de naissance
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {formatDate(dossier.candidat.date_naissance)}
                </Typography>
              </>
            )}
            
            {dossier.candidat.lieu_naissance && (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Lieu de naissance
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {dossier.candidat.lieu_naissance}
                </Typography>
              </>
            )}
            
            {dossier.candidat.nip && (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  NIP
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {dossier.candidat.nip}
                </Typography>
              </>
            )}
            
            {dossier.candidat.nationalite && (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Nationalité
                </Typography>
                <Typography variant="body1">
                  {dossier.candidat.nationalite}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default PersonalInfoCard;

