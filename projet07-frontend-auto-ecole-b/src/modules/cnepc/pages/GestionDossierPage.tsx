import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Box, Typography, Button, Card, CardContent, Paper, Skeleton, Fade } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Add, Inventory } from '@mui/icons-material';
import { gestionDossierService, typeDemandeService } from '../services';
import { clearCreateDossierDraft } from '../contexts/createDossierDraftStorage';
import { TypeDemande } from '../types/type-demande';

// Lazy loading du composant table
const GestionDossierTable = lazy(() => import('../tables/GestionDossierTable'));

// Composants Skeleton pour le chargement transparent
const StatsSkeleton = () => (
  <Fade in={true} timeout={300}>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent>
            <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="40%" height={40} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="30%" height={16} />
          </CardContent>
        </Card>
      ))}
    </Box>
  </Fade>
);

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

interface TypeDemandeStats {
  typeDemande: TypeDemande;
  count: number;
}

const GestionDossierPage: React.FC = () => {
  const navigate = useNavigate();
  const [refreshTrigger] = useState(0);
  const [typeDemandeStats, setTypeDemandeStats] = useState<TypeDemandeStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const handleCreateDossier = () => {
    clearCreateDossierDraft();
    navigate('/gestion-dossier/create/0');
  };

  // Charger les statistiques par type de demande
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      // Charger tous les types de demande
      const typeDemandesResponse = await typeDemandeService.getTypeDemandes(1, 100);
      const typeDemandes = typeDemandesResponse.data;

      // Charger tous les dossiers pour compter
      const dossiersResponse = await gestionDossierService.getDossiers(1, 1000);
      const allDossiers = dossiersResponse.data;

      // Compter les dossiers par type de demande
      const stats: TypeDemandeStats[] = typeDemandes.map((typeDemande) => {
        const count = allDossiers.filter((dossier) => {
          return dossier.type_demande_id === typeDemande.id;
        }).length;

        return {
          typeDemande,
          count,
        };
      });

      // Trier par nombre de dossiers (décroissant)
      stats.sort((a, b) => b.count - a.count);
      setTypeDemandeStats(stats);
    } catch (err: any) {
      console.error('Erreur lors du chargement des statistiques:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  const handleTypeDemandeClick = (typeDemandeId: string) => {
    // Passer le filtre au composant table via un callback ou un prop
    // Pour l'instant, on peut utiliser un state partagé ou un callback
    // Cette fonctionnalité nécessitera une modification de GestionDossierTable
    // pour accepter un prop de filtre initial
    console.log('Filtrer par type de demande:', typeDemandeId);
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

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Suspense fallback={<GestionDossierTableSkeleton />}>
              <GestionDossierTable refreshTrigger={refreshTrigger} />
            </Suspense>
          </Box>

          {/* Sidebar droite avec les statistiques */}
          <Paper
            sx={{
              width: 320,
              minWidth: 320,
              position: 'sticky',
              top: 20,
              alignSelf: 'flex-start',
              maxHeight: 'calc(100vh - 100px)',
              overflowY: 'auto',
              borderLeft: 0,
              borderColor: 'transparent',
              backgroundColor: 'transparent',
              p: 2,
            }}
            elevation={0}
          >
        

        {loadingStats ? (
          <StatsSkeleton />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {typeDemandeStats.map((stat) => (
              <Card
                key={stat.typeDemande.id}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                  },
                }}
                onClick={() => handleTypeDemandeClick(stat.typeDemande.id)}
              >
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {stat.typeDemande.name}
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {stat.count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.count === 1 ? 'dossier' : 'dossiers'}
                  </Typography>
                </CardContent>
              </Card>
            ))}

            {typeDemandeStats.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Aucune statistique disponible
              </Typography>
            )}
          </Box>
        )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default GestionDossierPage;

