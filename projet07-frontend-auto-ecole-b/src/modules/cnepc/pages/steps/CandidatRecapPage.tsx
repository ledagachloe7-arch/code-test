import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useCreateDossier } from '../../contexts/CreateDossierContext';
import { CandidatRecapStep } from '../../forms/steps';

interface CandidatRecapPageProps {
  onNext: () => void;
  onBack: () => void;
}

const CandidatRecapPage: React.FC<CandidatRecapPageProps> = ({ onNext, onBack }) => {
  const {
    candidatTrouveFromPermis,
    candidatTrouveFromPermisPrincipal,
    candidatTrouveFromPermisOrigine,
    setSelectedCandidat,
    setCandidatMode,
    setCandidatId,
    setPersonneId,
    setCandidatTrouveFromPermis,
    setCandidatTrouveFromPermisPrincipal,
    setCandidatTrouveFromPermisOrigine,
    loading,
  } = useCreateDossier();

  // Déterminer quel candidat afficher
  const candidat = candidatTrouveFromPermis || candidatTrouveFromPermisPrincipal || candidatTrouveFromPermisOrigine;

  const handleConfirm = () => {
    if (candidat) {
      setSelectedCandidat(candidat);
      setCandidatMode('existing');
      setCandidatId(candidat.id);
      if (candidat.personne?.id) {
        setPersonneId(candidat.personne.id);
      }
      // Réinitialiser les états de candidat trouvé
      setCandidatTrouveFromPermis(null);
      setCandidatTrouveFromPermisPrincipal(null);
      setCandidatTrouveFromPermisOrigine(null);
      onNext();
    }
  };

  const handleRefineSearch = () => {
    setCandidatTrouveFromPermis(null);
    setCandidatTrouveFromPermisPrincipal(null);
    setCandidatTrouveFromPermisOrigine(null);
    setCandidatMode(null);
    setSelectedCandidat(null);
  };

  const handleCreateNew = () => {
    setCandidatTrouveFromPermis(null);
    setCandidatTrouveFromPermisPrincipal(null);
    setCandidatTrouveFromPermisOrigine(null);
    setCandidatMode('new');
    setSelectedCandidat(null);
    onNext();
  };

  if (!candidat) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Aucun candidat trouvé
        </Typography>
        <Button onClick={onBack}>Retour</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Candidat existant trouvé
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Un candidat correspondant a été trouvé. Voulez-vous utiliser ce candidat ou créer un nouveau ?
      </Typography>

      <Box sx={{ mb: 3 }}>
        <CandidatRecapStep
          candidat={candidat}
          loading={loading}
          onConfirm={handleConfirm}
          onRefineSearch={handleRefineSearch}
          onCreateNew={handleCreateNew}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={onBack}
        >
          Retour
        </Button>
      </Box>
    </Box>
  );
};

export default CandidatRecapPage;

