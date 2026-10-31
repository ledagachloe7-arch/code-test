import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent
} from '@mui/material';
import {
  School as SchoolIcon
} from '@mui/icons-material';
import DossierService, { DossierComplet } from '../services/dossierService';
import DossiersCompletsTable from '../tables/DossiersCompletsTable';
import DossierDetailsSheet from '../components/DossierDetailsSheet';

const DossiersCompletsPage: React.FC = () => {
  const [dossiers, setDossiers] = useState<DossierComplet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDossier, setSelectedDossier] = useState<DossierComplet | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    chargerDossiers();
  }, []);

  const chargerDossiers = async () => {
    try {
      setLoading(true);
      const dossiersData = await DossierService.getDossiersComplets();
      setDossiers(dossiersData);
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDossier = (dossier: DossierComplet) => {
    setSelectedDossier(dossier);
    setDetailsOpen(true);
  };

  const handleUpdateDossiers = async () => {
    await chargerDossiers();
  };


  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Chargement des dossiers...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom className="font-display">
          Dossiers à compléter
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }} className="font-primary">
          Gestion des dossiers d'élèves avec heures de cours et documents
        </Typography>

        {dossiers.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom className="font-display">
                Aucun dossier complété
              </Typography>
              <Typography variant="body2" color="text.secondary" className="font-primary">
                Les dossiers complétés apparaîtront ici une fois qu'un élève aura terminé son processus d'inscription.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <DossiersCompletsTable 
            dossiers={dossiers} 
            onViewDossier={handleViewDossier} 
          />
        )}
      </Box>

      {/* DossierDetailsSheet */}
      <DossierDetailsSheet
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        dossier={selectedDossier}
        onUpdate={handleUpdateDossiers}
      />
    </Box>
  );
};

export default DossiersCompletsPage;
