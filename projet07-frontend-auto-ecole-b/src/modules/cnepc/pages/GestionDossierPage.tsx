import React, { useState, lazy, Suspense } from 'react';
import { Box, Typography, Button, Paper, Skeleton, Fade } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Add, Inventory } from '@mui/icons-material';
import { clearCreateDossierDraft } from '../contexts/createDossierDraftStorage';

// Lazy loading du composant table
const GestionDossierTable = lazy(() => import('../tables/GestionDossierTable'));

const GestionDossierTableSkeleton = () => (
  <Fade in={true} timeout={300}>
    <Paper sx={{ p: 3 }}>
      <Skeleton variant="text" width="30%" height={40} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
        ))}
      </Box>
    </Paper>
  </Fade>
);

const GestionDossierPage: React.FC = () => {
  const navigate = useNavigate();
  const [refreshTrigger] = useState(0);

  const handleCreateDossier = () => {
    clearCreateDossierDraft();
    navigate('/gestion-dossier/create/0');
  };

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', width: '100%', height: '100%' }}>
      {/* Contenu principal - occupe toute la largeur disponible */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 3, py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Gestion de Dossier
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gérez tous les dossiers des candidats, consultez leur statut et effectuez les actions nécessaires
            </Typography>
            <br />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateDossier}
            >
              Créer un nouveau dossier
            </Button>
            <Button
              variant="outlined"
              color="success"
              startIcon={<Inventory />}
              onClick={() => navigate('/gestion-dossier/archives')}
            >
              Voir les dossiers archivés
            </Button>
          </Box>
          </Box>

        </Box>

        <Suspense fallback={<GestionDossierTableSkeleton />}>
          <GestionDossierTable refreshTrigger={refreshTrigger} />
        </Suspense>
      </Box>
    </Box>
  );
};

export default GestionDossierPage;
