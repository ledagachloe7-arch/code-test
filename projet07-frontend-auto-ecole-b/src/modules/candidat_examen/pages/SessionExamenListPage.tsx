// Page de liste des sessions d'examen
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Refresh,
  FilterList,
  Download,
  Upload,
  Add,
  Save,
  Cancel,
} from '@mui/icons-material';
import { SessionExamen, SessionExamenFilters } from '../types';
import { useSessionExamen } from '../hooks';
import { StatistiquesPanel, FiltresPanel } from '../components';
import { SessionExamenTable } from '../tables';

const SessionExamenListPage: React.FC = () => {
  const [filters, setFilters] = useState<SessionExamenFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showStats] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionExamen | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionExamen | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    date_debut: '',
    date_fin: '',
    type_permis_id: '',
    statut: 'planifiee',
    capacite_maximale: 50,
    lieu: 'CNEPC Libreville, Gabon',
    adresse: 'Libreville, Province de l\'Estuaire, Gabon',
    type_epreuve: 'tour_ville', // tour_ville, creneaux, code_route
    responsable_id: '1', // ID par défaut du responsable CNEPC
  });

  const {
    sessions,
    loading,
    error,
    stats,
    createSession,
    updateSession,
    deleteSession,
    ouvrirInscriptions,
    fermerInscriptions,
    refresh,
  } = useSessionExamen(filters);

  const handleFiltersChange = (newFilters: SessionExamenFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleViewSession = (session: SessionExamen) => {
    setSelectedSession(session);
    setDialogOpen(true);
  };

  const handleEditSession = (session: SessionExamen) => {
    setEditingSession(session);
    setFormData({
      nom: session.nom,
      description: session.description || '',
      date_debut: session.date_debut.split('T')[0],
      date_fin: session.date_fin.split('T')[0],
      type_permis_id: session.type_permis_id,
      statut: session.statut,
      capacite_maximale: session.capacite_maximale,
      lieu: session.lieu || 'CNEPC Libreville, Gabon',
      adresse: session.adresse || 'Libreville, Province de l\'Estuaire, Gabon',
      type_epreuve: session.type_epreuve || 'tour_ville',
      responsable_id: session.responsable_id,
    });
    setShowCreateForm(true);
  };

  const handleDeleteSession = async (session: SessionExamen) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) {
      try {
        await deleteSession(session.id);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const handleOuvrirInscriptions = async (session: SessionExamen) => {
    try {
      await ouvrirInscriptions(session.id);
    } catch (error) {
      console.error('Erreur lors de l\'ouverture des inscriptions:', error);
    }
  };

  const handleFermerInscriptions = async (session: SessionExamen) => {
    try {
      await fermerInscriptions(session.id);
    } catch (error) {
      console.error('Erreur lors de la fermeture des inscriptions:', error);
    }
  };

  const handleExport = () => {
    // TODO: Implémenter l'export
    console.log('Export des sessions');
  };

  const handleImport = () => {
    // TODO: Implémenter l'import
    console.log('Import des sessions');
  };

  const handleCreateSession = () => {
    setEditingSession(null);
    setFormData({
      nom: '',
      description: '',
      date_debut: '',
      date_fin: '',
      type_permis_id: '',
      statut: 'planifiee',
      capacite_maximale: 50,
      lieu: 'CNEPC Libreville, Gabon',
      adresse: 'Libreville, Province de l\'Estuaire, Gabon',
      type_epreuve: 'tour_ville',
      responsable_id: '1',
    });
    setShowCreateForm(true);
  };

  const handleSaveSession = async () => {
    try {
      if (editingSession) {
        // Mise à jour
        await updateSession(editingSession.id, formData);
      } else {
        // Création
        await createSession(formData);
      }
      setShowCreateForm(false);
      setEditingSession(null);
      refresh();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const handleCancelEdit = () => {
    setShowCreateForm(false);
    setEditingSession(null);
    setFormData({
      nom: '',
      description: '',
      date_debut: '',
      date_fin: '',
      type_permis_id: '',
      statut: 'planifiee',
      capacite_maximale: 50,
      lieu: 'CNEPC Libreville, Gabon',
      adresse: 'Libreville, Province de l\'Estuaire, Gabon',
      type_epreuve: 'tour_ville',
      responsable_id: '1',
    });
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading && sessions.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Sessions d'Examen - CNEPC Libreville
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{ mr: 1 }}
          >
            Filtres
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            sx={{ mr: 1 }}
          >
            Exporter
          </Button>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={handleImport}
            sx={{ mr: 1 }}
          >
            Importer
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={refresh}
            sx={{ mr: 1 }}
          >
            Actualiser
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateSession}
          >
            Programmer Session
          </Button>
        </Box>
      </Box>

      {/* Filtres */}
      {showFilters && (
        <Box sx={{ mb: 3 }}>
          <FiltresPanel
            type="sessions"
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
        </Box>
      )}

      {/* Statistiques */}
      {showStats && stats && (
        <Box sx={{ mb: 3 }}>
          <StatistiquesPanel
            type="sessions"
            stats={stats}
            loading={loading}
          />
        </Box>
      )}

      {/* Message d'erreur */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Table des sessions */}
      <SessionExamenTable
        sessions={sessions}
        loading={loading}
        onView={handleViewSession}
        onEdit={handleEditSession}
        onDelete={handleDeleteSession}
        onOuvrirInscriptions={handleOuvrirInscriptions}
        onFermerInscriptions={handleFermerInscriptions}
        selectable={true}
        onSelectionChange={(selectedIds) => {
          console.log('Sessions sélectionnées:', selectedIds);
        }}
      />

      {/* Formulaire de création/édition */}
      {showCreateForm && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {editingSession ? 'Modifier la Session' : 'Programmer une Nouvelle Session'}
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nom de la session"
                  value={formData.nom}
                  onChange={(e) => handleFormChange('nom', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Type d'épreuve</InputLabel>
                  <Select
                    value={formData.type_epreuve}
                    onChange={(e) => handleFormChange('type_epreuve', e.target.value)}
                  >
                    <MenuItem value="tour_ville">Tour de ville</MenuItem>
                    <MenuItem value="creneaux">Créneaux</MenuItem>
                    <MenuItem value="code_route">Code de la route</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date de début"
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => handleFormChange('date_debut', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date de fin"
                  type="date"
                  value={formData.date_fin}
                  onChange={(e) => handleFormChange('date_fin', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={formData.statut}
                    onChange={(e) => handleFormChange('statut', e.target.value)}
                  >
                    <MenuItem value="planifiee">Planifiée</MenuItem>
                    <MenuItem value="ouverte">Ouverte</MenuItem>
                    <MenuItem value="fermee">Fermée</MenuItem>
                    <MenuItem value="en_cours">En cours</MenuItem>
                    <MenuItem value="terminee">Terminée</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Capacité maximale"
                  type="number"
                  value={formData.capacite_maximale}
                  onChange={(e) => handleFormChange('capacite_maximale', parseInt(e.target.value))}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Lieu"
                  value={formData.lieu}
                  onChange={(e) => handleFormChange('lieu', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Adresse"
                  value={formData.adresse}
                  onChange={(e) => handleFormChange('adresse', e.target.value)}
                  required
                />
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveSession}
                disabled={!formData.nom || !formData.date_debut || !formData.date_fin}
              >
                {editingSession ? 'Modifier' : 'Créer'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleCancelEdit}
              >
                Annuler
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Dialogue de détails */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Détails de la Session d'Examen - CNEPC Libreville
        </DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedSession.nom}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedSession.type_permis?.libelle || 'Type de permis'} - {selectedSession.type_permis?.categorie || 'Catégorie'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={selectedSession.statut_libelle || selectedSession.statut}
                  color={selectedSession.statut === 'ouverte' ? 'success' : 'default'}
                  size="small"
                />
                <Chip
                  label="CNEPC Libreville"
                  color="primary"
                  size="small"
                />
              </Box>
              <Typography variant="body2" gutterBottom>
                <strong>Description:</strong> {selectedSession.description || 'Session d\'examen du permis de conduire au Gabon'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Période:</strong> Du {new Date(selectedSession.date_debut).toLocaleDateString('fr-FR')} au {new Date(selectedSession.date_fin).toLocaleDateString('fr-FR')}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Lieu:</strong> {selectedSession.lieu || 'CNEPC Libreville, Gabon'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Adresse:</strong> {selectedSession.adresse || 'Libreville, Province de l\'Estuaire, Gabon'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Responsable:</strong> {selectedSession.responsable?.nom_complet || 'Responsable CNEPC'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Capacité:</strong> {selectedSession.capacite_utilisee || 0} / {selectedSession.capacite_maximale || 50} candidats
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Type d'épreuve:</strong> {
                  selectedSession.type_epreuve === 'tour_ville' ? 'Tour de ville' :
                  selectedSession.type_epreuve === 'creneaux' ? 'Créneaux' :
                  selectedSession.type_epreuve === 'code_route' ? 'Code de la route' :
                  'Non spécifié'
                }
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Épreuves:</strong> {selectedSession.epreuves?.length || 3} épreuve(s) programmée(s) (Théorique, Pratique, Orale)
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Centre d'examen:</strong> Centre National d'Éducation et de Prévention de la Circulation (CNEPC)
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Pays:</strong> République Gabonaise
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default SessionExamenListPage;
