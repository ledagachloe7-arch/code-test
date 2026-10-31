import React, { useState, useEffect } from 'react';
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
  TablePagination,
  IconButton,
  Chip,
  Button,
  TextField,
  InputAdornment,
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
  Drawer,
  Divider,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  School,
  Person,
  Phone,
  LocationOn,
  Close,
  Email,
  CalendarToday,
  Badge,
  MenuBook,
  FolderOpen,
  Settings,
} from '@mui/icons-material';
import { AutoEcole, AutoEcoleListResponse, autoEcoleService } from '../services';
import { AutoEcoleForm } from '../forms';

interface AutoEcoleTableProps {
  onAutoEcoleSelect?: (autoEcole: AutoEcole) => void;
  onAutoEcoleSettings?: (autoEcole: AutoEcole) => void;
  refreshTrigger?: number;
}

const AutoEcoleTable: React.FC<AutoEcoleTableProps> = ({
  onAutoEcoleSelect,
  onAutoEcoleSettings,
  refreshTrigger,
}) => {
  const [autoEcoles, setAutoEcoles] = useState<AutoEcole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // États pour les modales
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAutoEcole, setSelectedAutoEcole] = useState<AutoEcole | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [autoEcoleToDelete, setAutoEcoleToDelete] = useState<AutoEcole | null>(null);
  
  // États pour le drawer de détails
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [autoEcoleDetails, setAutoEcoleDetails] = useState<AutoEcole | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  
  // Menu contextuel
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Charger les auto-écoles
  const loadAutoEcoles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response: AutoEcoleListResponse = await autoEcoleService.getAutoEcoles(
        page + 1,
        rowsPerPage,
        { search: searchTerm }
      );
      
      setAutoEcoles(response.data);
      setTotal(response.meta.total);
    } catch (err: any) {
      console.error('Erreur lors du chargement des auto-écoles:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des auto-écoles');
    } finally {
      setLoading(false);
    }
  };

  // Effet pour charger les données
  useEffect(() => {
    loadAutoEcoles();
  }, [page, rowsPerPage, searchTerm, refreshTrigger]);

  // Gestion de la pagination
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Gestion de la recherche
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // Gestion du menu contextuel
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, autoEcoleId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(autoEcoleId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
  };

  // Actions du menu
  const handleEdit = () => {
    const autoEcole = autoEcoles.find(ae => ae.id === selectedRowId);
    if (autoEcole) {
      setSelectedAutoEcole(autoEcole);
      setFormOpen(true);
    }
    handleMenuClose();
  };

  // Charger les détails d'une auto-école
  const loadAutoEcoleDetails = async (id: string) => {
    setLoadingDetails(true);
    setDetailsError(null);
    
    try {
      console.log('📋 Chargement des détails de l\'auto-école:', id);
      const details = await autoEcoleService.getAutoEcoleById(id);
      console.log('✅ Détails chargés:', details);
      setAutoEcoleDetails(details);
      setDetailsDrawerOpen(true);
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement des détails:', err);
      setDetailsError(err.response?.data?.message || 'Erreur lors du chargement des détails');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleView = () => {
    console.log('🔍 handleView appelé, selectedRowId:', selectedRowId);
    if (selectedRowId) {
      console.log('📋 Chargement des détails pour l\'auto-école:', selectedRowId);
      loadAutoEcoleDetails(selectedRowId);
      
      // Si un callback est fourni, l'appeler aussi
      const autoEcole = autoEcoles.find(ae => ae.id === selectedRowId);
      if (autoEcole && onAutoEcoleSelect) {
        onAutoEcoleSelect(autoEcole);
      }
    } else {
      console.error('❌ Aucun ID sélectionné !');
    }
    handleMenuClose();
  };

  const handleCloseDetailsDrawer = () => {
    setDetailsDrawerOpen(false);
    setAutoEcoleDetails(null);
    setDetailsError(null);
  };

  const handleDelete = () => {
    const autoEcole = autoEcoles.find(ae => ae.id === selectedRowId);
    if (autoEcole) {
      setAutoEcoleToDelete(autoEcole);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  // Gestion des formulaires
  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedAutoEcole(undefined);
  };

  const handleFormSuccess = (_autoEcole: AutoEcole) => {
    loadAutoEcoles();
    handleFormClose();
  };

  // Gestion de la suppression
  const handleDeleteConfirm = async () => {
    if (!autoEcoleToDelete) return;

    try {
      await autoEcoleService.deleteAutoEcole(autoEcoleToDelete.id);
      loadAutoEcoles();
      setDeleteDialogOpen(false);
      setAutoEcoleToDelete(null);
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAutoEcoleToDelete(null);
  };

  // Formatage des dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <Box>
      {/* En-tête avec recherche et bouton d'ajout */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Gestion des Auto-Écoles
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setFormOpen(true)}
        >
          Nouvelle Auto-École
        </Button>
      </Box>

      {/* Barre de recherche */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher une auto-école..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
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
                <TableCell>Nom</TableCell>
                <TableCell>Responsable</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Adresse</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Créé le</TableCell>
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
              ) : autoEcoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Aucune auto-école trouvée
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                autoEcoles.map((autoEcole) => (
                  <TableRow key={autoEcole.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <School color="primary" />
                        <Box>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {autoEcole.nom_auto_ecole}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {autoEcole.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person color="action" />
                        <Box>
                          <Typography variant="body2">
                            {autoEcole.responsable.prenom} {autoEcole.responsable.nom}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {autoEcole.responsable.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone color="action" />
                        <Typography variant="body2">{autoEcole.contact}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn color="action" />
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {autoEcole.adresse}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={autoEcole.statut_libelle}
                        color={autoEcole.statut ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(autoEcole.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <IconButton
                          onClick={() => onAutoEcoleSettings?.(autoEcole)}
                          size="small"
                          color="primary"
                          title="Paramètres"
                        >
                          <Settings />
                        </IconButton>
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, autoEcole.id)}
                          size="small"
                        >
                          <MoreVert />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 15, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Lignes par page:"
        />
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
          <ListItemText>Voir</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifier</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Supprimer</ListItemText>
        </MenuItem>
      </Menu>

      {/* Formulaire d'auto-école */}
      <AutoEcoleForm
        autoEcole={selectedAutoEcole}
        onSuccess={handleFormSuccess}
        onCancel={handleFormClose}
        open={formOpen}
      />

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer l'auto-école "{autoEcoleToDelete?.nom_auto_ecole}" ?
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

      {/* Drawer des détails de l'auto-école */}
      <Drawer
        anchor="right"
        open={detailsDrawerOpen}
        onClose={handleCloseDetailsDrawer}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 500, md: 600 } }
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* En-tête du drawer */}
          <Box
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <School sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {autoEcoleDetails?.nom_auto_ecole || 'Détails Auto-École'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Informations complètes
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleCloseDetailsDrawer} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>

          {/* Contenu du drawer */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            {loadingDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : detailsError ? (
              <Alert severity="error">{detailsError}</Alert>
            ) : autoEcoleDetails ? (
              <>
                {/* Statut */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight="bold">
                        Statut
                      </Typography>
                      <Chip
                        label={autoEcoleDetails.statut_libelle}
                        color={autoEcoleDetails.statut ? 'success' : 'error'}
                        size="medium"
                      />
                    </Box>
                  </CardContent>
                </Card>

                {/* Informations générales */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <School color="primary" />
                      Informations Générales
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <List disablePadding>
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary" fontWeight="medium">
                              Nom
                            </Typography>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2" fontWeight="bold">
                              {autoEcoleDetails.nom_auto_ecole}
                            </Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                      
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Email fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                Email
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2">{autoEcoleDetails.email}</Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                      
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Phone fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                Contact
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2">{autoEcoleDetails.contact}</Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                      
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationOn fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                Adresse
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2">{autoEcoleDetails.adresse}</Typography>
                          </Grid>
                        </Grid>
                      </ListItem>

                      <ListItem sx={{ px: 0, py: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                Créé le
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2">
                              {formatDate(autoEcoleDetails.created_at)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>

                {/* Informations du responsable */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person color="primary" />
                      Responsable
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <List disablePadding>
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary" fontWeight="medium">
                              Nom complet
                            </Typography>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2" fontWeight="bold">
                              {autoEcoleDetails.responsable.prenom} {autoEcoleDetails.responsable.nom}
                            </Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                      
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Email fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                Email
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2">{autoEcoleDetails.responsable.email}</Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                      
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Phone fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                Contact
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2">{autoEcoleDetails.responsable.contact}</Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                      
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationOn fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                Adresse
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2">{autoEcoleDetails.responsable.adresse}</Typography>
                          </Grid>
                        </Grid>
                      </ListItem>

                      <ListItem sx={{ px: 0, py: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Badge fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                ID
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {autoEcoleDetails.responsable.id}
                            </Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>

                {/* Statistiques */}
                {autoEcoleDetails.formations || autoEcoleDetails.dossiers ? (
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        📊 Statistiques
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Card variant="outlined">
                            <CardContent sx={{ textAlign: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                                <MenuBook color="primary" />
                                <Typography variant="h4" color="primary" fontWeight="bold">
                                  {autoEcoleDetails.formations?.length || 0}
                                </Typography>
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                Formations
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Card variant="outlined">
                            <CardContent sx={{ textAlign: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                                <FolderOpen color="secondary" />
                                <Typography variant="h4" color="secondary" fontWeight="bold">
                                  {autoEcoleDetails.dossiers?.length || 0}
                                </Typography>
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                Dossiers
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Identifiants techniques */}
                <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ mb: 1, display: 'block' }}>
                      INFORMATIONS TECHNIQUES
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <List disablePadding>
                      <ListItem sx={{ px: 0, py: 0.5 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={5}>
                            <Typography variant="caption" color="text.secondary">
                              ID Auto-École
                            </Typography>
                          </Grid>
                          <Grid item xs={7}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {autoEcoleDetails.id}
                            </Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                      
                      <ListItem sx={{ px: 0, py: 0.5 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={5}>
                            <Typography variant="caption" color="text.secondary">
                              ID Responsable
                            </Typography>
                          </Grid>
                          <Grid item xs={7}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {autoEcoleDetails.responsable_id}
                            </Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                      
                      <ListItem sx={{ px: 0, py: 0.5 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={5}>
                            <Typography variant="caption" color="text.secondary">
                              Dernière MAJ
                            </Typography>
                          </Grid>
                          <Grid item xs={7}>
                            <Typography variant="caption">
                              {formatDate(autoEcoleDetails.updated_at)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert severity="info">Aucune information disponible</Alert>
            )}
          </Box>

          {/* Actions du drawer */}
          {autoEcoleDetails && (
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => {
                      setSelectedAutoEcole(autoEcoleDetails);
                      setFormOpen(true);
                      handleCloseDetailsDrawer();
                    }}
                  >
                    Modifier
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleCloseDetailsDrawer}
                  >
                    Fermer
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default AutoEcoleTable;
