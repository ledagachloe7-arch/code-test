import React from 'react';
import { Box, Typography, Grid, Skeleton, Fade } from '@mui/material';
import { Dossier } from '../../../types/auto-ecole';
import DossierCard from './DossierCard';

interface DossierListProps {
  candidatDossiers: Dossier[];
  selectedDossierId?: string;
  initialId?: string;
  loadingDossiers: boolean;
  referentielsCache: Map<string, any>;
  typeDemandeCache: Map<string, any>;
  dossierStatusCache: Map<string, string>;
  onDossierClick: (dossierId: string) => void;
}

const DossierList: React.FC<DossierListProps> = React.memo(({
  candidatDossiers,
  selectedDossierId,
  initialId,
  loadingDossiers,
  referentielsCache,
  typeDemandeCache,
  dossierStatusCache,
  onDossierClick,
}) => {
  const currentDossierId = selectedDossierId || initialId;

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Dossiers du Candidat ({candidatDossiers.length})
      </Typography>
      
      {loadingDossiers ? (
        <Fade in={true} timeout={300}>
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
              </Grid>
            ))}
          </Grid>
        </Fade>
      ) : (
        <Grid container spacing={2}>
          {candidatDossiers.map((d) => (
            <DossierCard
              key={d.id}
              dossier={d}
              isSelected={d.id === currentDossierId}
              referentielsCache={referentielsCache}
              typeDemandeCache={typeDemandeCache}
              dossierStatusCache={dossierStatusCache}
              onDossierClick={onDossierClick}
            />
          ))}
          
          {candidatDossiers.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Aucun autre dossier trouvé
              </Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}, (prevProps, nextProps) => {
  // Optimisation : ne re-rendre que si selectedDossierId change (pour mettre à jour uniquement la sélection visuelle)
  // Les autres props ne doivent pas déclencher de re-render complet de la liste
  if (prevProps.selectedDossierId !== nextProps.selectedDossierId) {
    return false; // Re-render nécessaire pour mettre à jour la sélection
  }
  
  // Pour les autres changements (liste, caches, etc.), comparer les références
  return (
    prevProps.candidatDossiers === nextProps.candidatDossiers &&
    prevProps.loadingDossiers === nextProps.loadingDossiers &&
    prevProps.referentielsCache === nextProps.referentielsCache &&
    prevProps.typeDemandeCache === nextProps.typeDemandeCache &&
    prevProps.dossierStatusCache === nextProps.dossierStatusCache
  );
});

DossierList.displayName = 'DossierList';

export default DossierList;

