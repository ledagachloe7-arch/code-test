import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Card,
  CardContent,
  List,
  ListItem,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Delete,
  Visibility,
  Person,
  Email,
  Phone,
  LocationOn,
  School,
  Assignment,
} from '@mui/icons-material';
import { Dossier, MesDossiersResponse, AutoEcole, Formation, autoEcoleService, typeDemandeService } from '../services';
import { TypeDemande } from '../types/type-demande';
import { CandidatForm, DossierForm } from '../forms';

interface CandidatsTableProps {
  autoEcoleId?: string;
  refreshTrigger?: number;
}

const CandidatsTable: React.FC<CandidatsTableProps> = ({
  autoEcoleId,
  refreshTrigger,
}) => {
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  
  // États pour les détails de l'auto-école
  const [autoEcoleDetails, setAutoEcoleDetails] = useState<AutoEcole | null>(null);
  
  // Cache pour les détails de formation
  const [formationsCache, setFormationsCache] = useState<Map<string, Formation>>(new Map());
  
  // Cache pour les types de demande
  const [typeDemandeCache, setTypeDemandeCache] = useState<Map<string, TypeDemande>>(new Map());
  
  // États pour les statistiques (utilisés à l'initialisation / API mes-dossiers, l'affichage utilise statistiquesAffichage)
  const [, setStatistiques] = useState<{
    total: number;
    en_attente: number;
    en_cours: number;
    valide: number;
    rejete: number;
  } | null>(null);
  
  // États pour les modales
  const [candidatFormOpen, setCandidatFormOpen] = useState(false);
  const [dossierFormOpen, setDossierFormOpen] = useState(false);
  const [selectedCandidat, setSelectedCandidat] = useState<any>(undefined);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dossierToDelete, setDossierToDelete] = useState<Dossier | null>(null);
  
  // Menu contextuel
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Fonction pour enrichir les données de formation
  const enrichFormationData = async (dossiers: Dossier[]) => {
    const formationsToFetch = new Set<string>();
    
    // Identifier les formations qui ont besoin d'être enrichies
    dossiers.forEach(dossier => {
      if (dossier.formation && !formationsCache.has(dossier.formation.id)) {
        formationsToFetch.add(dossier.formation.id);
      }
    });
    
    // Récupérer les détails des formations manquantes
    if (formationsToFetch.size > 0) {
      try {
        console.log('🔄 Enrichissement des données de formation pour:', Array.from(formationsToFetch));
        
        // Récupérer toutes les formations de l'auto-école
        const formations = await autoEcoleService.getFormationsByAutoEcole(autoEcoleId || autoEcoleDetails?.id || '');
        
        // Mettre à jour le cache
        const newCache = new Map(formationsCache);
        formations.forEach(formation => {
          newCache.set(formation.id, formation);
        });
        setFormationsCache(newCache);
        
        console.log('✅ Cache de formations mis à jour:', newCache.size, 'formations');
      } catch (error) {
        console.error('❌ Erreur lors de l\'enrichissement des formations:', error);
      }
    }
  };

  // Fonction pour enrichir les données de type de demande
  const enrichTypeDemandeData = async (dossiers: Dossier[]) => {
    const typeDemandesToFetch = new Set<string>();
    
    // Identifier les types de demande qui ont besoin d'être enrichis
    dossiers.forEach(dossier => {
      if (dossier.type_demande_id && !dossier.type_demande && !typeDemandeCache.has(dossier.type_demande_id)) {
        typeDemandesToFetch.add(dossier.type_demande_id);
      }
    });
    
    console.log('🔍 [ENRICH TYPE DEMANDE] Dossiers analysés:', dossiers.length);
    console.log('🔍 [ENRICH TYPE DEMANDE] Types de demande à charger:', Array.from(typeDemandesToFetch));
    console.log('🔍 [ENRICH TYPE DEMANDE] Cache actuel:', typeDemandeCache.size, 'éléments');
    
    // Récupérer les détails des types de demande manquants
    if (typeDemandesToFetch.size > 0) {
      try {
        console.log('🔄 Enrichissement des types de demande pour:', Array.from(typeDemandesToFetch));
        
        // Récupérer tous les types de demande manquants
        const typeDemandePromises = Array.from(typeDemandesToFetch).map(id => 
          typeDemandeService.getTypeDemandeById(id).catch(err => {
            console.error(`❌ Erreur lors du chargement du type de demande ${id}:`, err);
            return null;
          })
        );
        
        const typeDemandes = (await Promise.all(typeDemandePromises)).filter(td => td !== null) as TypeDemande[];
        
        console.log('✅ Types de demande chargés:', typeDemandes.length, typeDemandes);
        
        // Mettre à jour le cache
        const newCache = new Map(typeDemandeCache);
        typeDemandes.forEach(typeDemande => {
          newCache.set(typeDemande.id, typeDemande);
          console.log(`📦 Type de demande ajouté au cache: ${typeDemande.id} - ${typeDemande.name}`);
        });
        setTypeDemandeCache(newCache);
        
        // Mettre à jour les dossiers avec les types de demande chargés
        setDossiers(prevDossiers => {
          const updatedDossiers = prevDossiers.map(dossier => {
            if (dossier.type_demande_id && newCache.has(dossier.type_demande_id)) {
              const updatedDossier = {
                ...dossier,
                type_demande: newCache.get(dossier.type_demande_id)!
              };
              console.log(`✅ Dossier ${dossier.id} mis à jour avec type de demande:`, updatedDossier.type_demande?.name);
              return updatedDossier;
            }
            return dossier;
          });
          console.log('📋 Dossiers mis à jour:', updatedDossiers.length);
          return updatedDossiers;
        });
        
        console.log('✅ Cache de types de demande mis à jour:', newCache.size, 'types de demande');
      } catch (error) {
        console.error('❌ Erreur lors de l\'enrichissement des types de demande:', error);
      }
    } else {
      console.log('ℹ️ Aucun type de demande à charger');
    }
  };

  // Charger les dossiers (candidats inscrits)
  const loadDossiers = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║  [CANDIDATS TABLE] Chargement des dossiers                  ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('🏫 Auto-École ID fourni:', autoEcoleId || 'Aucun (mode "mes dossiers")');
      console.log('═══════════════════════════════════════════════════════════════');

      // Si un autoEcoleId est fourni, utiliser l'endpoint /dossiers
      // Sinon, utiliser l'endpoint /auto-ecoles/mes-dossiers (pour le responsable connecté)
      if (autoEcoleId) {
        console.log('📍 Mode: Dossiers d\'une auto-école spécifique (ID fourni)');
        
        const response = await autoEcoleService.getDossiersByAutoEcoleId(autoEcoleId, {
          statut: statutFilter as any,
        });

        console.log('📋 Réponse complète:', response);
        console.log('📊 Nombre de dossiers:', response.dossiers?.length || 0);
        console.log('📋 Dossiers avec type_demande_id:', response.dossiers?.filter(d => d.type_demande_id).map(d => ({ id: d.id, type_demande_id: d.type_demande_id, has_type_demande: !!d.type_demande })));
        console.log('═══════════════════════════════════════════════════════════════');

        const dossiersToSet = response.dossiers || [];
        setDossiers(dossiersToSet);
        
        // Si on a un autoEcoleId, charger les détails de l'auto-école séparément
        if (autoEcoleId && !autoEcoleDetails) {
          try {
            const autoEcoleData = await autoEcoleService.getAutoEcoleById(autoEcoleId);
            setAutoEcoleDetails(autoEcoleData);
          } catch (err) {
            console.error('❌ Erreur lors du chargement des détails de l\'auto-école:', err);
          }
        }
        
        // Enrichir les données de formation et types de demande
        await enrichFormationData(dossiersToSet);
        await enrichTypeDemandeData(dossiersToSet);
        
        // Pas de statistiques avec /dossiers, on les calcule localement
        const dossiers = response.dossiers || [];
        const stats = {
          total: dossiers.length,
          en_attente: dossiers.filter(d => d.statut === 'en_attente').length,
          en_cours: dossiers.filter(d => d.statut === 'en_cours').length,
          valide: dossiers.filter(d => d.statut === 'valide').length,
          rejete: dossiers.filter(d => d.statut === 'rejete').length,
        };
        setStatistiques(stats);
      } else {
        console.log('📍 Mode: Mes dossiers (responsable connecté)');
        
        const response: MesDossiersResponse = await autoEcoleService.getMesDossiers({
          statut: statutFilter as any,
        });

        console.log('📋 Réponse complète:', response);
        console.log('📊 Auto-école:', response.auto_ecole?.nom_auto_ecole);
        console.log('📊 Nombre de dossiers:', response.dossiers?.length || 0);
        console.log('📋 Dossiers avec type_demande_id:', response.dossiers?.filter(d => d.type_demande_id).map(d => ({ id: d.id, type_demande_id: d.type_demande_id, has_type_demande: !!d.type_demande })));
        console.log('📊 Statistiques:', response.statistiques);
        console.log('═══════════════════════════════════════════════════════════════');

        // Utiliser directement les données de la réponse
        const dossiersToSet = response.dossiers || [];
        setDossiers(dossiersToSet);
        setAutoEcoleDetails(response.auto_ecole || null);
        setStatistiques(response.statistiques || null);
        
        // Enrichir les données de formation et types de demande
        await enrichFormationData(dossiersToSet);
        await enrichTypeDemandeData(dossiersToSet);
      }
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement des dossiers:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des candidats');
    } finally {
      setLoading(false);
    }
  };

  // Effet pour charger les données
  useEffect(() => {
    loadDossiers();
  }, [autoEcoleId, statutFilter, refreshTrigger]);

  // Filtrer les dossiers par terme de recherche
  const filteredDossiers = dossiers.filter(dossier => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      dossier.candidat.personne.nom.toLowerCase().includes(searchLower) ||
      dossier.candidat.personne.prenom.toLowerCase().includes(searchLower) ||
      dossier.candidat.numero_candidat.toLowerCase().includes(searchLower) ||
      dossier.candidat.personne.email.toLowerCase().includes(searchLower)
    );
  });

  // Statistiques dynamiques calculées à partir des dossiers filtrés (recherche + statut)
  const statistiquesAffichage = {
    total: filteredDossiers.length,
    en_attente: filteredDossiers.filter(d => d.statut === 'en_attente').length,
    en_cours: filteredDossiers.filter(d => d.statut === 'en_cours').length,
    valide: filteredDossiers.filter(d => d.statut === 'valide').length,
    rejete: filteredDossiers.filter(d => d.statut === 'rejete').length,
  };
  const hasActiveFilters = Boolean(searchTerm || statutFilter);

  // Gestion de la recherche
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Gestion du filtre par statut
  const handleStatutFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatutFilter(event.target.value);
  };

  // Gestion du menu contextuel
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, dossierId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(dossierId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
  };

  // Actions du menu
  const handleView = () => {
    const dossier = dossiers.find(d => d.id === selectedRowId);
    if (dossier) {
      // Navigation vers la page de détails du candidat avec les données du dossier
      navigate(`/candidat/${dossier.id}`, { 
        state: { dossier } 
      });
    }
    handleMenuClose();
  };

  const handleEditDossier = () => {
    const dossier = dossiers.find(d => d.id === selectedRowId);
    if (dossier) {
      setSelectedDossier(dossier);
      setDossierFormOpen(true);
    }
    handleMenuClose();
  };

  const handleEditCandidat = () => {
    const dossier = dossiers.find(d => d.id === selectedRowId);
    if (dossier) {
      setSelectedCandidat(dossier.candidat);
      setCandidatFormOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    const dossier = dossiers.find(d => d.id === selectedRowId);
    if (dossier) {
      setDossierToDelete(dossier);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  // Gestion des formulaires
  const handleCandidatFormClose = () => {
    setCandidatFormOpen(false);
    setSelectedCandidat(undefined);
  };

  const handleDossierFormClose = () => {
    setDossierFormOpen(false);
    setSelectedDossier(undefined);
  };

  const handleFormSuccess = () => {
    loadDossiers();
    handleCandidatFormClose();
    handleDossierFormClose();
  };

  // Gestion de la suppression
  const handleDeleteConfirm = async () => {
    if (!dossierToDelete) return;

    try {
      // Note: Il n'y a pas de méthode deleteDossier dans le service actuel
      // await autoEcoleService.deleteDossier(dossierToDelete.id);
      console.log('Suppression du dossier:', dossierToDelete.id);
      loadDossiers();
      setDeleteDialogOpen(false);
      setDossierToDelete(null);
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDossierToDelete(null);
  };

  // Formatage des dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Obtenir la couleur du statut
  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'en_attente': return 'warning';
      case 'en_cours': return 'info';
      case 'valide': return 'success';
      case 'rejete': return 'error';
      default: return 'default';
    }
  };

  // Obtenir le libellé du statut
  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'en_attente': return 'En attente';
      case 'en_cours': return 'En cours';
      case 'valide': return 'Validé';
      case 'rejete': return 'Rejeté';
      default: return statut;
    }
  };

  return (
    <Box>
      {/* Section des détails de l'auto-école */}
      {autoEcoleDetails && (
        <Box sx={{ mb: 4 }}>
            <Card elevation={3}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: 'primary.main',
                      color: 'white',
                    }}
                  >
                    <School sx={{ fontSize: 48 }} />
                  </Avatar>
                  
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box>
                        <Typography variant="h4" fontWeight="bold" gutterBottom color="text.primary">
                          {autoEcoleDetails.nom_auto_ecole}
                        </Typography>
                        <Chip
                          label={autoEcoleDetails.statut_libelle}
                          color={autoEcoleDetails.statut ? 'success' : 'error'}
                          size="small"
                          sx={{ mb: 2 }}
                        />
                      </Box>
                    </Box>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="overline" color="text.secondary" fontWeight="bold">
                              Contact
                            </Typography>
                            <List dense disablePadding>
                              <ListItem disablePadding sx={{ py: 0.5 }}>
                                <Email fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2">{autoEcoleDetails.email}</Typography>
                              </ListItem>
                              <ListItem disablePadding sx={{ py: 0.5 }}>
                                <Phone fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2">{autoEcoleDetails.contact}</Typography>
                              </ListItem>
                              <ListItem disablePadding sx={{ py: 0.5 }}>
                                <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2">{autoEcoleDetails.adresse}</Typography>
                              </ListItem>
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="overline" color="text.secondary" fontWeight="bold">
                              Responsable
                            </Typography>
                            <List dense disablePadding>
                              <ListItem disablePadding sx={{ py: 0.5 }}>
                                <Person fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" fontWeight="bold">
                                  {autoEcoleDetails.responsable.prenom} {autoEcoleDetails.responsable.nom}
                                </Typography>
                              </ListItem>
                              <ListItem disablePadding sx={{ py: 0.5 }}>
                                <Email fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2">{autoEcoleDetails.responsable.email}</Typography>
                              </ListItem>
                              <ListItem disablePadding sx={{ py: 0.5 }}>
                                <Phone fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2">{autoEcoleDetails.responsable.contact}</Typography>
                              </ListItem>
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              </CardContent>
            </Card>
        </Box>
      )}
      
      {/* En-tête */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          {autoEcoleDetails ? `Candidats de ${autoEcoleDetails.nom_auto_ecole}` : 'Candidats Inscrits'}
        </Typography>
      </Box>

      {/* Statistiques dynamiques (recalculées selon les dossiers filtrés) */}
      {!loading && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {hasActiveFilters && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Statistiques sur les candidats affichés (filtres actifs)
              </Typography>
            </Grid>
          )}
          <Grid item xs={12} sm={6} md={2.4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  {statistiquesAffichage.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  En attente
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {statistiquesAffichage.en_attente}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  En cours
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {statistiquesAffichage.en_cours}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Validés
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {statistiquesAffichage.valide}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Rejetés
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="error.main">
                  {statistiquesAffichage.rejete}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Barres de recherche et filtres */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Rechercher un candidat..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        <TextField
          select
          label="Filtrer par statut"
          value={statutFilter}
          onChange={handleStatutFilterChange}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Tous les statuts</MenuItem>
          <MenuItem value="en_attente">En attente</MenuItem>
          <MenuItem value="en_cours">En cours</MenuItem>
          <MenuItem value="valide">Validé</MenuItem>
          <MenuItem value="rejete">Rejeté</MenuItem>
        </TextField>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCandidatFormOpen(true)}
        >
          Nouveau Candidat
        </Button>
      </Box>

      {/* Message d'erreur */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Candidat</TableCell>
                <TableCell>Formation</TableCell>
                <TableCell>Type de demandes</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Documents</TableCell>
                <TableCell>Date d'inscription</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredDossiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Aucun candidat trouvé
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDossiers.map((dossier) => (
                  <TableRow key={dossier.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {dossier.candidat.personne.prenom[0]}{dossier.candidat.personne.nom[0]}
                        </Avatar>
                        <Box>
                          <Typography 
                            variant="subtitle2" 
                            fontWeight="medium"
                            sx={{ 
                              cursor: 'pointer',
                              '&:hover': { 
                                color: 'primary.main',
                                textDecoration: 'underline'
                              }
                            }}
                            onClick={() => navigate(`/candidat/${dossier.id}`, { 
                              state: { dossier } 
                            })}
                          >
                            {dossier.candidat.personne.prenom} {dossier.candidat.personne.nom}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dossier.candidat.numero_candidat}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Email fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {dossier.candidat.personne.email}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <School color="action" />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {(() => {
                              const formation = dossier.formation
                                ? (formationsCache.get(dossier.formation.id) || dossier.formation)
                                : null;
                              if (!formation) return '—';

                              // 1. Nom direct de la formation
                              if (formation.nom && formation.nom.trim()) {
                                return formation.nom;
                              }

                              // 2. Description de la formation
                              if (formation.description && formation.description.trim()) {
                                return formation.description;
                              }

                              // 3. Type de permis avec libellé
                              if (formation.type_permis) {
                                const typePermis = formation.type_permis as any;
                                if (typePermis.libelle && typePermis.libelle.trim()) {
                                  return `Formation ${typePermis.libelle}`;
                                }
                                if (typePermis.nom && typePermis.nom.trim()) {
                                  return `Formation ${typePermis.nom}`;
                                }
                              }

                              // 4. TypePermis alternatif
                              if (formation.typePermis) {
                                const typePermis = formation.typePermis as any;
                                if (typePermis.libelle && typePermis.libelle.trim()) {
                                  return `Formation ${typePermis.libelle}`;
                                }
                                if (typePermis.nom && typePermis.nom.trim()) {
                                  return `Formation ${typePermis.nom}`;
                                }
                              }

                              // 5. Fallback avec montant et durée
                              const montant = formation.montant_formate || (formation.montant ? `${formation.montant} FCFA` : '');
                              const duree = formation.duree_jours ? `${formation.duree_jours} jours` : '';
                              const details = [montant, duree].filter(Boolean).join(' - ');
                              return details ? `Formation (${details})` : 'Formation';
                            })()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dossier.formation
                              ? `${dossier.formation.montant_formate || `${dossier.formation.montant ?? ''} FCFA`}${dossier.formation.duree_jours ? ` - ${dossier.formation.duree_jours} jours` : ''}`
                              : '—'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        // Vérifier d'abord si le type de demande est directement dans le dossier
                        if (dossier.type_demande) {
                          return (
                            <Chip
                              label={dossier.type_demande.name}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          );
                        }
                        
                        // Sinon, vérifier si on a l'ID et si c'est dans le cache
                        if (dossier.type_demande_id) {
                          const cachedTypeDemande = typeDemandeCache.get(dossier.type_demande_id);
                          if (cachedTypeDemande) {
                            return (
                              <Chip
                                label={cachedTypeDemande.name}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            );
                          }
                          return (
                            <Typography variant="body2" color="text.secondary">
                              Chargement...
                            </Typography>
                          );
                        }
                        
                        return (
                          <Typography variant="body2" color="text.secondary">
                            Non spécifié
                          </Typography>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatutLabel(dossier.statut)}
                        color={getStatutColor(dossier.statut) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment color="action" />
                        <Typography variant="body2">
                          {dossier.documents.length} document(s)
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(dossier.date_creation)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, dossier.id)}
                        size="small"
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Menu contextuel */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>Voir détails</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEditCandidat}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifier candidat</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEditDossier}>
          <ListItemIcon>
            <Assignment fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifier dossier</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Supprimer</ListItemText>
        </MenuItem>
      </Menu>

      {/* Formulaire de candidat */}
      <CandidatForm
        candidat={selectedCandidat}
        onSuccess={handleFormSuccess}
        onCancel={handleCandidatFormClose}
        open={candidatFormOpen}
      />

      {/* Formulaire de dossier */}
      <DossierForm
        dossier={selectedDossier}
        onSuccess={handleFormSuccess}
        onCancel={handleDossierFormClose}
        open={dossierFormOpen}
        autoEcoleId={autoEcoleId}
      />

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer le dossier de candidature ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Annuler</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CandidatsTable;
