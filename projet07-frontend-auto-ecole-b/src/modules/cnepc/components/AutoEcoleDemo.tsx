import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  School,
  People,
  Assignment,
  Add,
  Visibility,
  TrendingUp,
} from '@mui/icons-material';
import {
  AutoEcoleTable,
  CandidatsTable,
  AutoEcoleForm,
  CandidatForm,
  DossierForm,
  autoEcoleService,
  AutoEcole,
} from '../index';

const AutoEcoleDemo: React.FC = () => {
  const [selectedView, setSelectedView] = useState<'auto-ecoles' | 'candidats'>('auto-ecoles');
  const [selectedAutoEcole, setSelectedAutoEcole] = useState<AutoEcole | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<'auto-ecole' | 'candidat' | 'dossier'>('auto-ecole');

  const handleAutoEcoleSelect = (autoEcole: AutoEcole) => {
    setSelectedAutoEcole(autoEcole);
    setSelectedView('candidats');
  };

  const handleFormOpen = (type: 'auto-ecole' | 'candidat' | 'dossier') => {
    setFormType(type);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    // Ici vous pourriez rafraîchir les données
    console.log('Formulaire soumis avec succès');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          🏫 Gestion des Auto-Écoles - Démonstration
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Ce module permet de gérer les auto-écoles et leurs candidats inscrits selon la documentation auto-école.
        </Typography>

        {/* Fonctionnalités disponibles */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <School color="primary" />
                  <Typography variant="h6">Auto-Écoles</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Créer et gérer les auto-écoles avec leurs responsables
                </Typography>
                <Chip label="CRUD Complet" color="primary" size="small" />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <People color="success" />
                  <Typography variant="h6">Candidats</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Gérer les profils des candidats et leurs informations
                </Typography>
                <Chip label="Profils Complets" color="success" size="small" />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Assignment color="info" />
                  <Typography variant="h6">Dossiers</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Suivre les dossiers de candidature et leur statut
                </Typography>
                <Chip label="Suivi Avancé" color="info" size="small" />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <TrendingUp color="warning" />
                  <Typography variant="h6">Statistiques</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Tableaux de bord et statistiques en temps réel
                </Typography>
                <Chip label="Analytics" color="warning" size="small" />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Actions rapides */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Actions Rapides
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleFormOpen('auto-ecole')}
          >
            Nouvelle Auto-École
          </Button>
          <Button
            variant="outlined"
            startIcon={<People />}
            onClick={() => handleFormOpen('candidat')}
          >
            Nouveau Candidatss
          </Button>
          <Button
            variant="outlined"
            startIcon={<Assignment />}
            onClick={() => handleFormOpen('dossier')}
            disabled={!selectedAutoEcole}
          >
            Nouveau Dossier
          </Button>
        </Box>
      </Paper>

      {/* Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, p: 1 }}>
          <Button
            variant={selectedView === 'auto-ecoles' ? 'contained' : 'outlined'}
            onClick={() => setSelectedView('auto-ecoles')}
            startIcon={<School />}
          >
            Auto-Écoles
          </Button>
          <Button
            variant={selectedView === 'candidats' ? 'contained' : 'outlined'}
            onClick={() => setSelectedView('candidats')}
            startIcon={<People />}
            disabled={!selectedAutoEcole}
          >
            Candidats Inscrits
          </Button>
        </Box>
      </Paper>

      {/* Contenu principal */}
      {selectedView === 'auto-ecoles' && (
        <AutoEcoleTable
          onAutoEcoleSelect={handleAutoEcoleSelect}
        />
      )}

      {selectedView === 'candidats' && selectedAutoEcole && (
        <CandidatsTable
          autoEcoleId={selectedAutoEcole.id}
        />
      )}

      {selectedView === 'candidats' && !selectedAutoEcole && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <School sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucune auto-école sélectionnée
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sélectionnez une auto-école pour voir ses candidats inscrits
          </Typography>
        </Paper>
      )}

      {/* Formulaires modaux */}
      {formOpen && formType === 'auto-ecole' && (
        <AutoEcoleForm
          onSuccess={handleFormSuccess}
          onCancel={handleFormClose}
          open={formOpen}
        />
      )}

      {formOpen && formType === 'candidat' && (
        <CandidatForm
          onSuccess={handleFormSuccess}
          onCancel={handleFormClose}
          open={formOpen}
        />
      )}

      {formOpen && formType === 'dossier' && selectedAutoEcole && (
        <DossierForm
          autoEcoleId={selectedAutoEcole.id}
          onSuccess={handleFormSuccess}
          onCancel={handleFormClose}
          open={formOpen}
        />
      )}

      {/* Informations sur l'auto-école sélectionnée */}
      {selectedAutoEcole && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Auto-École Sélectionnée
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Nom
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {selectedAutoEcole.nom_auto_ecole}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Responsable
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {selectedAutoEcole.responsable.prenom} {selectedAutoEcole.responsable.nom}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1">
                {selectedAutoEcole.email}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Statut
              </Typography>
              <Chip
                label={selectedAutoEcole.statut_libelle}
                color={selectedAutoEcole.statut ? 'success' : 'error'}
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Documentation */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          📚 Documentation API
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ce module implémente la documentation auto-école avec les endpoints suivants :
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2">
            • <strong>POST /api/auto-ecoles</strong> - Créer une auto-écoles
          </Typography>
          <Typography variant="body2">
            • <strong>GET /api/auto-ecoles</strong> - Lister les auto-écoles
          </Typography>
          <Typography variant="body2">
            • <strong>GET /api/auto-ecoles/mes-dossiers</strong> - Candidats inscrits
          </Typography>
          <Typography variant="body2">
            • <strong>POST /api/candidats</strong> - Créer un candidat
          </Typography>
          <Typography variant="body2">
            • <strong>POST /api/dossiers</strong> - Créer un dossier de candidature
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default AutoEcoleDemo;
