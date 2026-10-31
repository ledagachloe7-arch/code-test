import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Snackbar,
  Stack
} from '@mui/material';
import { AcademicCapIcon, EyeIcon, PencilIcon } from '@heroicons/react/24/outline';
import { autoEcoleService } from '../services/auto-ecole.service';
import { getAutoEcoleId } from '../../../shared/utils/autoEcoleUtils';
import { Formation } from '../types/auto-ecole';

const FormationsPage: React.FC = () => {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [editPrixOpen, setEditPrixOpen] = useState(false);
  const [newPrix, setNewPrix] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    loadFormations();
  }, []);

  const loadFormations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const autoEcoleId = getAutoEcoleId();
      
      if (!autoEcoleId) {
        setError('Aucune auto-école associée à votre compte.');
        setLoading(false);
        return;
      }

      const data = await autoEcoleService.getFormationsByAutoEcole(autoEcoleId);
      setFormations(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des formations:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des formations');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (formation: Formation) => {
    setSelectedFormation(formation);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedFormation(null);
  };

  const handleOpenEditPrix = (formation: Formation) => {
    setSelectedFormation(formation);
    setNewPrix(formation.montant?.toString() || '');
    setEditPrixOpen(true);
  };

  const handleCloseEditPrix = () => {
    setEditPrixOpen(false);
    setSelectedFormation(null);
    setNewPrix('');
  };

  const handleUpdatePrix = async () => {
    if (!selectedFormation || !newPrix) return;

    try {
      setUpdating(true);
      const prixNum = parseFloat(newPrix);
      
      if (isNaN(prixNum) || prixNum < 0) {
        setSnackbar({
          open: true,
          message: 'Veuillez entrer un montant valide',
          severity: 'error'
        });
        setUpdating(false);
        return;
      }

      await autoEcoleService.updateFormation(selectedFormation.id, {
        montant: prixNum
      });

      setSnackbar({
        open: true,
        message: 'Prix mis à jour avec succès',
        severity: 'success'
      });

      handleCloseEditPrix();
      loadFormations();
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du prix:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Erreur lors de la mise à jour du prix',
        severity: 'error'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: '#f5f5f5', minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 1 }}>
          Nos formations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Consultez les formations proposées par votre auto-école
        </Typography>
      </Box>

      {/* Statistiques */}
      {formations.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {formations.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Formation{formations.length > 1 ? 's' : ''} disponible{formations.length > 1 ? 's' : ''}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {formations.filter(f => f.statut).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Formation{formations.filter(f => f.statut).length > 1 ? 's' : ''} active{formations.filter(f => f.statut).length > 1 ? 's' : ''}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Liste des formations */}
      {formations.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <AcademicCapIcon className="w-16 h-16 text-gray-300 mb-2" style={{ margin: '0 auto' }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Aucune formation disponible
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Votre auto-école n'a pas encore de formations enregistrées.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type de permis</TableCell>
                <TableCell>Session</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Montant</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formations.map((formation) => (
                <TableRow key={formation.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {formation.type_permis?.libelle || 
                       formation.typePermis?.libelle || 
                       formation.type_permis?.nom || 
                       formation.typePermis?.nom || 
                       'Non spécifié'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formation.session?.libelle || 
                       formation.session?.code || 
                       'Non spécifié'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formation.description || formation.nom || 'Aucune description'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {formation.montant_formate || 
                       (formation.montant ? `${formation.montant} FCFA` : 'N/A')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={formation.statut_libelle || (formation.statut ? 'Active' : 'Inactive')}
                      color={formation.statut ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="Voir les détails">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(formation)}
                          color="primary"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        )}

      {/* Dialogue de détails de la formation */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Détails de la formation
        </DialogTitle>
        <DialogContent>
          {selectedFormation && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Type de permis
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {selectedFormation.type_permis?.libelle || 
                   selectedFormation.typePermis?.libelle || 
                   selectedFormation.type_permis?.nom || 
                   selectedFormation.typePermis?.nom || 
                   'Non spécifié'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Session
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {selectedFormation.session?.libelle || 
                   selectedFormation.session?.code || 
                   'Non spécifié'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1">
                  {selectedFormation.description || selectedFormation.nom || 'Aucune description'}
                </Typography>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Montant
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PencilIcon className="w-4 h-4" />}
                    onClick={() => {
                      handleCloseDetails();
                      handleOpenEditPrix(selectedFormation);
                    }}
                  >
                    Modifier le prix
                  </Button>
                </Box>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  {selectedFormation.montant_formate || 
                   (selectedFormation.montant ? `${selectedFormation.montant} FCFA` : 'N/A')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Statut
                </Typography>
                <Chip
                  label={selectedFormation.statut_libelle || (selectedFormation.statut ? 'Active' : 'Inactive')}
                  color={selectedFormation.statut ? 'success' : 'default'}
                  size="small"
                />
              </Box>

              {selectedFormation.duree_jours && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Durée (jours)
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {selectedFormation.duree_jours} jour{selectedFormation.duree_jours > 1 ? 's' : ''}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de modification du prix */}
      <Dialog
        open={editPrixOpen}
        onClose={handleCloseEditPrix}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Modifier le prix de la formation
        </DialogTitle>
        <DialogContent>
          {selectedFormation && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Type de permis: {selectedFormation.type_permis?.libelle || selectedFormation.typePermis?.libelle || 'N/A'}
              </Typography>
              <TextField
                fullWidth
                label="Nouveau prix (FCFA)"
                type="number"
                value={newPrix}
                onChange={(e) => setNewPrix(e.target.value)}
                sx={{ mt: 2 }}
                inputProps={{ min: 0, step: 100 }}
                helperText="Entrez le nouveau montant en FCFA"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditPrix} disabled={updating}>
            Annuler
          </Button>
          <Button 
            onClick={handleUpdatePrix} 
            variant="contained" 
            disabled={updating || !newPrix}
            sx={{ 
              backgroundColor: '#3A75C4',
              '&:hover': { backgroundColor: '#2A5A9A' }
            }}
          >
            {updating ? 'Mise à jour...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FormationsPage;

