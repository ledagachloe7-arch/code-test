import React from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useCreateDossier } from '../../contexts/CreateDossierContext';
import { CandidatFormStep } from '../../forms/steps';
import { autoEcoleService } from '../../services';
import { validateCandidat } from '../../forms/validation';
import { getFieldLabel } from '../../forms/utils';

interface CandidatFormPageProps {
  onNext: () => void;
  onBack: () => void;
}

const CandidatFormPage: React.FC<CandidatFormPageProps> = ({ onNext, onBack }) => {
  const {
    candidatData,
    personneId,
    setCandidatData,
    setCandidatId,
    setLoading,
    setError,
    error,
    loading,
  } = useCreateDossier();

  const handleCreateCandidat = async () => {
    setError(null);
    
    if (!validateCandidat({ candidatData, setError })) {
      return;
    }
    
    if (!personneId) {
      setError('Erreur: ID de la personne manquant. Veuillez recommencer.');
      return;
    }
    
    setLoading(true);
    try {
      const numero_candidat = `CAN-${Date.now()}`;
      const candidatPayload = {
        personne_id: personneId,
        numero_candidat,
        date_naissance: candidatData.date_naissance,
        lieu_naissance: candidatData.lieu_naissance,
        nip: candidatData.nip,
        type_piece: candidatData.type_piece,
        numero_piece: candidatData.numero_piece,
        nationalite: candidatData.nationalite,
        genre: candidatData.genre,
      };
      
      const response = await autoEcoleService.createCandidat(candidatPayload as any);
      
      if (response.data?.id) {
        setCandidatId(response.data.id);
        onNext();
      } else {
        setError('Erreur: Impossible de récupérer l\'ID du candidat créé.');
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const errorMessages: string[] = [];
        
        Object.entries(errors).forEach(([field, messages]: [string, any]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg: string) => errorMessages.push(`${getFieldLabel(field)}: ${msg}`));
          } else {
            errorMessages.push(`${getFieldLabel(field)}: ${messages}`);
          }
        });
        
        if (errorMessages.length > 0) {
          setError(errorMessages.join(', '));
        } else {
          setError('Erreur lors de la création du candidat. Veuillez vérifier vos informations.');
        }
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Erreur lors de la création du candidat. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Informations du candidat
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Complétez les informations du candidat
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <CandidatFormStep
          candidatData={candidatData}
          loading={loading}
          onCandidatDataChange={setCandidatData}
          onCreateCandidat={handleCreateCandidat}
          onBack={onBack}
          error={error}
        />
      </Box>
    </Box>
  );
};

export default CandidatFormPage;

