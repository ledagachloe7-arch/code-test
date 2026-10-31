import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  TextField,
  InputAdornment,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Description,
  Settings,
  Search,
  Add,
  Edit,
  Delete,
  Refresh,
} from '@mui/icons-material';
import PieceJustificativeTable from '../tables/PieceJustificativeTable';
import { referentielService } from '../../cnepc/services';
import type { Referentiel } from '../../cnepc/types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  const isActive = value === index;
  return (
    <div
      role="tabpanel"
      hidden={!isActive}
      id={`pieces-justificatives-tabpanel-${index}`}
      aria-labelledby={`pieces-justificatives-tab-${index}`}
      {...other}
    >
      {/* Toujours monter le contenu pour que les useEffects (ex. GET /pieces-justificatives) s'exécutent au chargement */}
      <Box sx={{ p: 3, display: isActive ? 'block' : 'none' }}>{children}</Box>
    </div>
  );
}

const PieceJustificativePage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  // États pour les référentiels
  const [referentiels, setReferentiels] = useState<Referentiel[]>([]);
  const [loadingReferentiels, setLoadingReferentiels] = useState(false);
  const [referentielsError, setReferentielsError] = useState<string | null>(null);
  const [selectedTypeRef, setSelectedTypeRef] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // États pour le dialogue de création/modification de référentiel
  const [referentielDialogOpen, setReferentielDialogOpen] = useState(false);
  const [selectedReferentiel, setSelectedReferentiel] = useState<Referentiel | null>(null);
  const [isCreatingReferentiel, setIsCreatingReferentiel] = useState(false);
  const [referentielFormData, setReferentielFormData] = useState<{
    libelle: string;
    code: string;
    type_ref: string;
    description: string;
    statut: boolean;
    montant: string;
    parent_id: string;
  }>({
    libelle: '',
    code: '',
    type_ref: '',
    description: '',
    statut: true,
    montant: '',
    parent_id: '',
  });
  const [isCustomType, setIsCustomType] = useState(false);
  const [provinces, setProvinces] = useState<Referentiel[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);

  // Dialogue de confirmation de suppression
  const [referentielDeleteDialogOpen, setReferentielDeleteDialogOpen] = useState(false);
  const [referentielToDelete, setReferentielToDelete] = useState<Referentiel | null>(null);

  // Charger les référentiels
  const loadReferentiels = async (typeRef?: string) => {
    setLoadingReferentiels(true);
    setReferentielsError(null);

    try {
      const response = await referentielService.getReferentiels(1, 100, {
        ...(typeRef && { type_ref: typeRef }),
      });
      const list = Array.isArray(response.data)
        ? response.data
        : (response as any).data?.data ?? (response as any).data ?? [];
      setReferentiels(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des référentiels:', err);
      setReferentielsError(err.response?.data?.message || 'Erreur lors du chargement des référentiels');
    } finally {
      setLoadingReferentiels(false);
    }
  };

  // Effet pour charger les données au montage
  useEffect(() => {
    if (tabValue === 1) {
      loadReferentiels();
    }
  }, [tabValue]);

  // Effet pour filtrer par type de référentiel
  useEffect(() => {
    if (selectedTypeRef) {
      loadReferentiels(selectedTypeRef);
    } else {
      loadReferentiels();
    }
  }, [selectedTypeRef]);

  // Charger les provinces (type_ref=province) à l'ouverture du modal référentiel
  useEffect(() => {
    if (!referentielDialogOpen) return;
    let cancelled = false;
    setLoadingProvinces(true);
    referentielService
      .getReferentiels(1, 200, { type_ref: 'province' })
      .then((res) => {
        if (!cancelled) setProvinces(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setProvinces([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });
    return () => {
      cancelled = true;
    };
  }, [referentielDialogOpen]);

  // Gestion du changement d'onglet
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Filtrer les référentiels par terme de recherche
  const filteredReferentiels = referentiels.filter(ref => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      ref.libelle.toLowerCase().includes(searchLower) ||
      ref.code.toLowerCase().includes(searchLower) ||
      (ref.description && ref.description.toLowerCase().includes(searchLower))
    );
  });

  // Gestion du dialogue de création/modification de référentiel
  const handleReferentielCreate = () => {
    setSelectedReferentiel(null);
    setIsCreatingReferentiel(true);
    setIsCustomType(false);
    setReferentielFormData({
      libelle: '',
      code: '',
      type_ref: selectedTypeRef || '',
      description: '',
      statut: true,
      montant: '',
      parent_id: '',
    });
    setReferentielDialogOpen(true);
  };

  const handleReferentielEdit = (referentiel: Referentiel) => {
    setSelectedReferentiel(referentiel);
    setIsCreatingReferentiel(false);
    const refExt = referentiel as Referentiel & { montant?: string; parent_id?: string };
    setReferentielFormData({
      libelle: referentiel.libelle || '',
      code: referentiel.code || '',
      type_ref: referentiel.type_ref || '',
      description: referentiel.description || '',
      statut: referentiel.statut ?? true,
      montant: refExt.montant ?? '',
      parent_id: refExt.parent_id ?? '',
    });
    setReferentielDialogOpen(true);
  };

  const handleReferentielDeleteClick = (referentiel: Referentiel) => {
    setReferentielToDelete(referentiel);
    setReferentielDeleteDialogOpen(true);
  };

  const confirmReferentielDelete = async () => {
    if (!referentielToDelete) return;
    try {
      await referentielService.deleteReferentiel(String(referentielToDelete.id));
      setReferentielDeleteDialogOpen(false);
      setReferentielToDelete(null);
      setReferentielsError(null);
      setReferentiels((prev) => prev.filter((r) => r.id !== referentielToDelete.id));
      loadReferentiels(selectedTypeRef);
    } catch (err: any) {
      console.error('Erreur lors de la suppression du référentiel:', err);
      setReferentielsError(err.response?.data?.message || err.message || 'Erreur lors de la suppression');
    }
  };

  const handleReferentielDialogClose = () => {
    setReferentielDialogOpen(false);
    setSelectedReferentiel(null);
    setIsCreatingReferentiel(false);
    setIsCustomType(false);
    setReferentielFormData({
      libelle: '',
      code: '',
      type_ref: '',
      description: '',
      statut: true,
      montant: '',
      parent_id: '',
    });
  };

  const handleReferentielSubmit = async () => {
    try {
      const submitData = {
        libelle: referentielFormData.libelle,
        code: referentielFormData.code,
        type_ref: referentielFormData.type_ref,
        description: referentielFormData.description,
        statut: referentielFormData.statut,
        ...(referentielFormData.montant !== '' && { montant: referentielFormData.montant }),
        ...(referentielFormData.parent_id !== '' && { parent_id: referentielFormData.parent_id }),
      };

      if (isCreatingReferentiel) {
        // Créer un nouveau référentiel
        const response = await referentielService.createReferentiel(submitData);
        
        if (response.success) {
          loadReferentiels(selectedTypeRef);
          handleReferentielDialogClose();
        } else {
          alert(response.message || 'Erreur lors de la création');
        }
      } else {
        // Modifier un référentiel existant
        if (!selectedReferentiel) return;

        const response = await referentielService.updateReferentiel(selectedReferentiel.id.toString(), submitData);

        if (response.success) {
          const updated = response.data;
          const idStr = String(selectedReferentiel.id);
          setReferentiels((prev) =>
            prev.map((r) =>
              String(r.id) === idStr
                ? {
                    ...r,
                    ...submitData,
                    ...(updated && { ...updated }),
                    statut_libelle: (updated as Referentiel)?.statut_libelle ?? (submitData.statut ? 'Actif' : 'Inactif'),
                  }
                : r
            )
          );
          handleReferentielDialogClose();
          loadReferentiels(selectedTypeRef || undefined);
        } else {
          alert(response.message || 'Erreur lors de la mise à jour');
        }
      }
    } catch (err: any) {
      console.error(`Erreur lors de la ${isCreatingReferentiel ? 'création' : 'mise à jour'} du référentiel:`, err);
      alert(err.response?.data?.message || err.message || `Erreur lors de la ${isCreatingReferentiel ? 'création' : 'mise à jour'}`);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestion des Pièces Justificatives
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Gérez les pièces justificatives et les référentiels pour les dossiers candidats
        </Typography>

        {/* Onglets */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="pieces justificatives tabs">
            <Tab icon={<Description />} label="Pièces Justificatives" iconPosition="start" />
            <Tab icon={<Settings />} label="Référentiels" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Onglet 1: Pièces Justificatives */}
        <TabPanel value={tabValue} index={0}>
          <PieceJustificativeTable />
        </TabPanel>

        {/* Onglet 2: Référentiels */}
        <TabPanel value={tabValue} index={1}>
          <Box>
            {/* En-tête */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Paramètres et Référentiels
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Consultez les référentiels disponibles pour configurer votre système
              </Typography>
            </Box>

            {/* En-tête avec bouton d'ajout */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1 }}>
                <TextField
                  placeholder="Rechercher un référentiel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 300 }}
                />
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Type de référentiel</InputLabel>
                  <Select
                    value={selectedTypeRef}
                    onChange={(e) => setSelectedTypeRef(e.target.value)}
                    label="Type de référentiel"
                  >
                    <MenuItem value="">Tous les types</MenuItem>
                    <MenuItem value="type_permis">Types de Permis</MenuItem>
                    <MenuItem value="type_document">Types de Documents</MenuItem>
                    <MenuItem value="session">Sessions</MenuItem>
                    <MenuItem value="statut">Statuts</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => loadReferentiels(selectedTypeRef)}
                >
                  Actualiser
                </Button>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleReferentielCreate}
                sx={{ ml: 2 }}
              >
                Ajouter un référentiels
              </Button>
            </Box>

            {/* Message d'erreur */}
            {referentielsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {referentielsError}
              </Alert>
            )}

            {/* Table des référentiels */}
            {loadingReferentiels ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Paper>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Libellé</TableCell>
                        <TableCell>Codes</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredReferentiels.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              Aucun référentiel trouvé
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReferentiels.map((ref) => (
                          <TableRow key={ref.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {ref.libelle}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={ref.code} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {ref.type_ref}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {ref.description || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={ref.statut_libelle}
                                color={ref.statut ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Edit />}
                                onClick={() => handleReferentielEdit(ref)}
                                sx={{ mr: 1 }}
                              >
                                Modifier
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Delete />}
                                onClick={() => handleReferentielDeleteClick(ref)}
                              >
                                Supprimer
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </Box>
        </TabPanel>

        {/* Dialogue de création/modification de référentiel */}
        <Dialog 
          open={referentielDialogOpen} 
          onClose={handleReferentielDialogClose}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {isCreatingReferentiel ? 'Créer un nouveau référentiel' : 'Modifier le référentiel'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Libellé"
                value={referentielFormData.libelle}
                onChange={(e) => setReferentielFormData({ ...referentielFormData, libelle: e.target.value })}
                fullWidth
                required
              />
              
              <TextField
                label="Code"
                value={referentielFormData.code}
                onChange={(e) => setReferentielFormData({ ...referentielFormData, code: e.target.value })}
                fullWidth
                required
              />
              
              {!isCustomType ? (
                <FormControl fullWidth required>
                  <InputLabel>Type de référentiel</InputLabel>
                  <Select
                    value={referentielFormData.type_ref}
                    onChange={(e) => setReferentielFormData({ ...referentielFormData, type_ref: e.target.value })}
                    label="Type de référentiel"
                    disabled={!isCreatingReferentiel}
                  >
                    <MenuItem value="type_permis">Types de Permis</MenuItem>
                    <MenuItem value="type_document">Types de Documents</MenuItem>
                    <MenuItem value="session">Sessions</MenuItem>
                    <MenuItem value="statut">Statuts</MenuItem>
                  </Select>
                  {!isCreatingReferentiel && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Le type ne peut pas être modifié
                    </Typography>
                  )}
                  {isCreatingReferentiel && (
                    <Box sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setIsCustomType(true)}
                      >
                        Créer un nouveau type
                      </Button>
                    </Box>
                  )}
                </FormControl>
              ) : (
                <Box>
                  <TextField
                    label="Nouveau type de référentiel"
                    value={referentielFormData.type_ref}
                    onChange={(e) => setReferentielFormData({ ...referentielFormData, type_ref: e.target.value })}
                    fullWidth
                    required
                    placeholder="Ex: type_permis, type_document, session, statut"
                    helperText="Entrez le code du nouveau type de référentiel (en minuscules, avec underscores)"
                  />
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setIsCustomType(false);
                      setReferentielFormData({ ...referentielFormData, type_ref: selectedTypeRef || '' });
                    }}
                    sx={{ mt: 1 }}
                  >
                    Utiliser un type existant
                  </Button>
                </Box>
              )}
              
              <TextField
                label="Description"
                value={referentielFormData.description}
                onChange={(e) => setReferentielFormData({ ...referentielFormData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
                placeholder="Description du référentiel (optionnel)"
              />

              <TextField
                label="Montant"
                value={referentielFormData.montant}
                onChange={(e) => setReferentielFormData({ ...referentielFormData, montant: e.target.value })}
                fullWidth
                placeholder="Montant (optionnel)"
                type="text"
                inputProps={{ inputMode: 'decimal' }}
              />

              <FormControl fullWidth disabled={loadingProvinces}>
                <InputLabel>Parent (province)</InputLabel>
                <Select
                  value={referentielFormData.parent_id}
                  onChange={(e) => setReferentielFormData({ ...referentielFormData, parent_id: e.target.value })}
                  label="Parent (province)"
                >
                  <MenuItem value="">
                    <em>Aucun</em>
                  </MenuItem>
                  {loadingProvinces ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Chargement...
                    </MenuItem>
                  ) : (
                    provinces.map((p) => (
                      <MenuItem key={p.id} value={String(p.id)}>
                        {p.libelle}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={referentielFormData.statut ? 'true' : 'false'}
                  onChange={(e) => setReferentielFormData({ ...referentielFormData, statut: e.target.value === 'true' })}
                  label="Statut"
                >
                  <MenuItem value="true">Actif</MenuItem>
                  <MenuItem value="false">Inactif</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
            <Box>
              {!isCreatingReferentiel && selectedReferentiel && (
                <Button
                  onClick={() => {
                    setReferentielToDelete(selectedReferentiel);
                    handleReferentielDialogClose();
                    setReferentielDeleteDialogOpen(true);
                  }}
                  color="error"
                  startIcon={<Delete />}
                >
                  Supprimer
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button onClick={handleReferentielDialogClose}>Annuler</Button>
              <Button onClick={handleReferentielSubmit} variant="contained">
                {isCreatingReferentiel ? 'Créer' : 'Modifier'}
              </Button>
            </Box>
          </DialogActions>
        </Dialog>

        {/* Dialogue de confirmation de suppression du référentiel */}
        <Dialog open={referentielDeleteDialogOpen} onClose={() => setReferentielDeleteDialogOpen(false)}>
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <DialogContent>
            <Typography>
              Êtes-vous sûr de vouloir supprimer le référentiel &quot;{referentielToDelete?.libelle}&quot; ? Cette
              action est irréversible.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReferentielDeleteDialogOpen(false)}>Annuler</Button>
            <Button onClick={confirmReferentielDelete} color="error" variant="contained">
              Supprimer
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default PieceJustificativePage;

