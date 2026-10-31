// Page de test pour vérifier que les routes fonctionnent
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Container,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants';

const TestPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        🎉 Module Candidat Examen - Test des Routes
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Cette page confirme que les routes du module candidat_examen fonctionnent correctement !
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ✅ Routes configurées avec succès
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Le module candidat_examen est maintenant accessible via les routes suivantes :
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" component="div">
              • <code>{ROUTES.CANDIDATS_EXAMEN}</code> - Liste des candidats
            </Typography>
            <Typography variant="body2" component="div">
              • <code>{ROUTES.CANDIDATS_EXAMEN_CANDIDATS}</code> - Candidats (alias)
            </Typography>
            <Typography variant="body2" component="div">
              • <code>{ROUTES.CANDIDATS_EXAMEN_SESSIONS}</code> - Sessions d'examen
            </Typography>
            <Typography variant="body2" component="div">
              • <code>{ROUTES.CANDIDATS_EXAMEN_PLANIFICATION}</code> - Planification
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={() => navigate(ROUTES.CANDIDATS_EXAMEN)}
        >
          Voir les Candidats
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate(ROUTES.CANDIDATS_EXAMEN_SESSIONS)}
        >
          Voir les Sessions
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate(ROUTES.CANDIDATS_EXAMEN_PLANIFICATION)}
        >
          Planification
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate(ROUTES.CNEPC)}
        >
          Retour au CNEPC
        </Button>
      </Box>
    </Container>
  );
};

export default TestPage;
