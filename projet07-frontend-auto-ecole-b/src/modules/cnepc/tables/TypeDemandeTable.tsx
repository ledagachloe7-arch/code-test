import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Description,
  CalendarToday,
  Fingerprint,
} from '@mui/icons-material';
import { TypeDemande, TypeDemandeListResponse } from '../types/type-demande';
import { typeDemandeService } from '../services/type-demande.service';
import TypeDemandeForm from '../forms/TypeDemandeForm';
import { getTypeDemandeDisplayName } from '../pages/UsagerDossierPage/utils';

interface TypeDemandeTableProps {
  refreshTrigger?: number;
}

const TypeDemandeTable: React.FC<TypeDemandeTableProps> = ({ refreshTrigger }) => {
  const [typeDemandes, setTypeDemandes] = useState<TypeDemande[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [filteredTypeDemandes, setFilteredTypeDemandes] = useState<TypeDemande[]>([]);

  // États pour les modales
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTypeDemande, setSelectedTypeDemande] = useState<TypeDemande | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeDemandeToDelete, setTypeDemandeToDelete] = useState<TypeDemande | null>(null);

  // Charger tous les types de demande (sans pagination pour les onglets)
  const loadTypeDemandes = async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger tous les types de demande (avec un nombre élevé de résultats par page)
      const response: TypeDemandeListResponse = await typeDemandeService.getTypeDemandes(
        1,
        1000, // Charger beaucoup de résultats pour avoir tous les types
        { search: searchTerm }
      );

      setTypeDemandes(response.data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des types de demande:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des types de demande');
    } finally {
      setLoading(false);
    }
  };

  // Effet pour charger les données
  useEffect(() => {
    loadTypeDemandes();
  }, [searchTerm, refreshTrigger]);

  // Filtrer les types de demande selon le terme de recherche
  useEffect(() => {
    if (searchTerm) {
      const filtered = typeDemandes.filter((td) =>
        td.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTypeDemandes(filtered);
      // Réinitialiser l'onglet actuel si nécessaire
      setCurrentTab((prevTab) => {
        if (filtered.length > 0 && prevTab >= filtered.length) {
          return 0;
        }
        return prevTab;
      });
    } else {
      setFilteredTypeDemandes(typeDemandes);
    }
  }, [searchTerm, typeDemandes]);

  // Gestion de la recherche
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentTab(0);
  };

  // Gestion des onglets
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Actions
  const handleEdit = (typeDemande: TypeDemande) => {
    setSelectedTypeDemande(typeDemande);
    setFormOpen(true);
  };

  const handleDelete = (typeDemande: TypeDemande) => {
    setTypeDemandeToDelete(typeDemande);
    setDeleteDialogOpen(true);
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    if (!typeDemandeToDelete) return;

    try {
      await typeDemandeService.deleteTypeDemande(typeDemandeToDelete.id);
      setDeleteDialogOpen(false);
      setTypeDemandeToDelete(null);
      await loadTypeDemandes();
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // Gestion du formulaire
  const handleFormSuccess = () => {
    setFormOpen(false);
    setSelectedTypeDemande(undefined);
    loadTypeDemandes();
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setSelectedTypeDemande(undefined);
  };

  const handleAddNew = () => {
    setSelectedTypeDemande(undefined);
    setFormOpen(true);
  };

  // Liste des types de demande à afficher (filtrée ou complète)
  const displayList = searchTerm ? filteredTypeDemandes : typeDemandes;
  const currentTypeDemande = displayList[currentTab];

  return (
    <Box>
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Types de demandes
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddNew}
            sx={{
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            Ajouter
          </Button>
        </Box>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Rechercher un type de demande..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'primary.main' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              background: 'white',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              },
              '&.Mui-focused': {
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
              },
            },
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : displayList.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Aucun type de demande trouvé
            </Typography>
          </Box>
        ) : (
          <>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: 2,
                borderColor: 'divider',
                mb: 3,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  minHeight: 48,
                  borderRadius: '8px 8px 0 0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(25, 118, 210, 0.08)',
                  },
                  '&.Mui-selected': {
                    color: 'primary.main',
                    background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(66, 165, 245, 0.05) 100%)',
                  },
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                },
              }}
            >
              {displayList.map((typeDemande, index) => (
                <Tab
                  key={typeDemande.id}
                  label={getTypeDemandeDisplayName(typeDemande.name)}
                  value={index}
                />
              ))}
            </Tabs>

            {currentTypeDemande && (
              <Card
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 3,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                  transition: 'all 0.3s ease-in-out',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  '&:hover': {
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.16)',
                    transform: 'translateY(-2px)',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 50%, #90caf9 100%)',
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  {/* Header Section */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 3,
                      pb: 3,
                      borderBottom: '2px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                        }}
                      >
                        <Description sx={{ color: 'white', fontSize: 28 }} />
                      </Box>
                      <Box>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1,
                          }}
                        >
                          {getTypeDemandeDisplayName(currentTypeDemande.name)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            icon={<CalendarToday sx={{ fontSize: 16 }} />}
                            label={`Créé le ${new Date(currentTypeDemande.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}`}
                            size="small"
                            sx={{
                              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                              color: '#1565c0',
                              fontWeight: 500,
                              border: '1px solid rgba(25, 118, 210, 0.2)',
                            }}
                          />
                          {currentTypeDemande.updated_at !== currentTypeDemande.created_at && (
                            <Chip
                              icon={<CalendarToday sx={{ fontSize: 16 }} />}
                              label={`Modifié le ${new Date(currentTypeDemande.updated_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}`}
                              size="small"
                              sx={{
                                background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                                color: '#e65100',
                                fontWeight: 500,
                                border: '1px solid rgba(255, 152, 0, 0.2)',
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        onClick={() => handleEdit(currentTypeDemande)}
                        aria-label="Modifier"
                        sx={{
                          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                          color: 'white',
                          width: 48,
                          height: 48,
                          boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                            transform: 'scale(1.1)',
                            boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                          },
                        }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(currentTypeDemande)}
                        aria-label="Supprimer"
                        sx={{
                          background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
                          color: 'white',
                          width: 48,
                          height: 48,
                          boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #c62828 0%, #d32f2f 100%)',
                            transform: 'scale(1.1)',
                            boxShadow: '0 6px 16px rgba(211, 47, 47, 0.4)',
                          },
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Details Section */}
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          p: 2.5,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
                          border: '1px solid',
                          borderColor: 'divider',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)',
                            borderColor: 'primary.main',
                            transform: 'translateX(4px)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Fingerprint
                            sx={{
                              color: 'primary.main',
                              fontSize: 20,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              fontSize: '0.75rem',
                            }}
                          >
                            Identifiant
                          </Typography>
                        </Box>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            fontFamily: 'monospace',
                            letterSpacing: 1,
                          }}
                        >
                          {currentTypeDemande.id}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          p: 2.5,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
                          border: '1px solid',
                          borderColor: 'divider',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)',
                            borderColor: 'primary.main',
                            transform: 'translateX(4px)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Description
                            sx={{
                              color: 'primary.main',
                              fontSize: 20,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              fontSize: '0.75rem',
                            }}
                          >
                            Nom du Type
                          </Typography>
                        </Box>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                          }}
                        >
                          {getTypeDemandeDisplayName(currentTypeDemande.name)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Paper>

      {/* Formulaire */}
      <TypeDemandeForm
        typeDemande={selectedTypeDemande}
        open={formOpen}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer le type de demande "{getTypeDemandeDisplayName(typeDemandeToDelete?.name)}" ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TypeDemandeTable;

