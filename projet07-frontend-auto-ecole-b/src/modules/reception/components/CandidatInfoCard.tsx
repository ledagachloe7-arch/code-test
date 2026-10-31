import React, { useEffect } from 'react';
import { Card, CardContent, Box, Typography, Stack } from '@mui/material';
import { UserIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

interface CandidatInfoCardProps {
  candidatData: any;
  personne: any;
}

const CandidatInfoCard: React.FC<CandidatInfoCardProps> = ({ candidatData, personne }) => {
  useEffect(() => {
    const info = { candidatData, personne };
    console.log('CandidatInfoCard – informations du candidat (JSON):', JSON.stringify(info, null, 2));
  }, [candidatData, personne]);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
          <Typography variant="h6" fontWeight="bold" className="font-display">
            {personne.prenom || ''} {personne.nom || ''}
          </Typography>
        </Box>
        
        <Stack spacing={2}>
          {personne.email && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EnvelopeIcon className="w-5 h-5 mr-2 text-gray-500" />
              <Typography variant="body2" className="font-primary">{personne.email}</Typography>
            </Box>
          )}
          
          {personne.contact && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PhoneIcon className="w-5 h-5 mr-2 text-gray-500" />
              <Typography variant="body2" className="font-primary">{personne.contact}</Typography>
            </Box>
          )}
          
          {personne.adresse && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <MapPinIcon className="w-5 h-5 mr-2 text-gray-500 mt-0.5" />
              <Typography variant="body2" className="font-primary">{personne.adresse}</Typography>
            </Box>
          )}
          
          {candidatData?.date_naissance && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <UserIcon className="w-5 h-5 mr-2 text-gray-500" />
              <Typography variant="body2" className="font-primary">
                Né(e) le {new Date(candidatData.date_naissance).toLocaleDateString('fr-FR')}
              </Typography>
            </Box>
          )}
          
          {candidatData?.lieu_naissance && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <MapPinIcon className="w-5 h-5 mr-2 text-gray-500" />
              <Typography variant="body2" className="font-primary">
                Lieu de naissance: {candidatData.lieu_naissance}
              </Typography>
            </Box>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AcademicCapIcon className="w-5 h-5 mr-2 text-gray-500" />
            <Typography variant="body2" className="font-primary">
              Nationalité: {candidatData?.nationalite || 'Non spécifiée'}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default CandidatInfoCard;

