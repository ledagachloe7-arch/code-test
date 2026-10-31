// Page de liste des candidats aux examens
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
} from '@mui/material';
import {
  Refresh,
  FilterList,
  Download,
  Upload,
} from '@mui/icons-material';
import { CandidatExamen, CandidatExamenFilters } from '../types';
import { useCandidatExamen } from '../hooks';
import { StatistiquesPanel, FiltresPanel } from '../components';
import { CandidatExamenTable } from '../tables';

const CandidatExamenListPage: React.FC = () => {
  const [filters, setFilters] = useState<CandidatExamenFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showStats] = useState(true);
  const [selectedCandidat, setSelectedCandidat] = useState<CandidatExamen | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    candidats,
    loading,
    error,
    stats,
    deleteCandidat,
    refresh,
  } = useCandidatExamen(filters);

  const handleFiltersChange = (newFilters: CandidatExamenFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleViewCandidat = (candidat: CandidatExamen) => {
    setSelectedCandidat(candidat);
    setDialogOpen(true);
  };

  const handleEditCandidat = (candidat: CandidatExamen) => {
    // TODO: Implémenter l'édition
    console.log('Éditer candidat:', candidat);
  };

  const handleDeleteCandidat = async (candidat: CandidatExamen) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce candidat ?')) {
      try {
        await deleteCandidat(candidat.id);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };


  const handleExport = () => {
    // TODO: Implémenter l'export
    console.log('Export des candidats');
  };

  const handleImport = () => {
    // TODO: Implémenter l'import
    console.log('Import des candidats');
  };

  if (loading && candidats.length === 0) {
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
          Candidats aux Examens
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
          >
            Actualiser
          </Button>
        </Box>
      </Box>

      {/* Filtres */}
      {showFilters && (
        <Box sx={{ mb: 3 }}>
          <FiltresPanel
            type="candidats"
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
            type="candidats"
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

      {/* Table des candidats */}
      <CandidatExamenTable
        candidats={candidats}
        loading={loading}
        onView={handleViewCandidat}
        onEdit={handleEditCandidat}
        onDelete={handleDeleteCandidat}
        selectable={true}
        onSelectionChange={(selectedIds) => {
          console.log('Candidats sélectionnés:', selectedIds);
        }}
      />

      {/* Dialogue de détails */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Détails du Candidat
        </DialogTitle>
        <DialogContent>
          {selectedCandidat && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedCandidat.candidat.personne.prenom} {selectedCandidat.candidat.personne.nom}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedCandidat.candidat.numero_candidat}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Email:</strong> {selectedCandidat.candidat.personne.email}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Téléphone:</strong> {selectedCandidat.candidat.personne.contact}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Auto-école:</strong> {selectedCandidat.auto_ecole.nom_auto_ecole}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Session:</strong> {selectedCandidat.session_examen.nom}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Formation:</strong> {selectedCandidat.formation.nom}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Statut:</strong> {selectedCandidat.statut_libelle}
              </Typography>
              {selectedCandidat.commentaires && (
                <Typography variant="body2" gutterBottom>
                  <strong>Commentaires:</strong> {selectedCandidat.commentaires}
                </Typography>
              )}
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

export default CandidatExamenListPage;
