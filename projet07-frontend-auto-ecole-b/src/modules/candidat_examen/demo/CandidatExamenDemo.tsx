// Démonstration du module candidat_examen
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Container,
  Alert,
} from '@mui/material';
import {
  CandidatExamenListPage,
  SessionExamenListPage,
  PlanificationPage,
} from '../pages';
import { CandidatExamenTable, SessionExamenTable } from '../tables';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`candidat-examen-tabpanel-${index}`}
      aria-labelledby={`candidat-examen-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CandidatExamenDemo: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Module Candidat Examen - Démonstration
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Ce module permet de gérer les candidats aux examens de permis de conduire, 
          l'organisation des sessions d'examen et la planification des créneaux.
        </Typography>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            <strong>Fonctionnalités disponibles :</strong>
            <br />
            • Gestion des candidats aux examens (inscription, suivi, résultats)
            <br />
            • Organisation des sessions d'examen (planification, ouverture/fermeture des inscriptions)
            <br />
            • Gestion des épreuves (théorique, pratique, orale)
            <br />
            • Planification automatique des créneaux d'examen
            <br />
            • Statistiques et tableaux de bord
          </Typography>
        </Alert>

        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="candidat-examen-tabs">
              <Tab label="Candidats aux Examens" />
              <Tab label="Sessions d'Examen" />
              <Tab label="Planification" />
              <Tab label="Tables de Données" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <CandidatExamenListPage />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <SessionExamenListPage />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <PlanificationPage />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Tables de Données
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Affichage des données sous forme de tableaux pour une vue détaillée
              </Typography>
              
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Table des Candidats
                </Typography>
                <CandidatExamenTable
                  candidats={[]}
                  loading={false}
                />
              </Box>
              
              <Box>
                <Typography variant="h6" gutterBottom>
                  Table des Sessions
                </Typography>
                <SessionExamenTable
                  sessions={[]}
                  loading={false}
                />
              </Box>
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default CandidatExamenDemo;
