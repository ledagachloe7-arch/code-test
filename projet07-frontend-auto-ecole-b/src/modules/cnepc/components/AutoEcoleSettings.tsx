import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  School,
  Settings,
  Person,
  Refresh,
  Search,
} from '@mui/icons-material';
import { CandidatsTable } from '../tables';
import { ROUTES } from '../../../shared/constants';
import { 
  AutoEcole, 
  Formation, 
  Referentiel,
  autoEcoleService, 
  referentielService,
  FormationFormData,
} from '../services';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface AutoEcoleSettingsProps {
  autoEcole: AutoEcole;
  refreshTrigger?: number;
}

const AutoEcoleSettings: React.FC<AutoEcoleSettingsProps> = ({ 
  autoEcole, 
  refreshTrigger 
}) => {
  const [tabValue, setTabValue] = useState(0);
  
  // États pour les formations
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loadingFormations, setLoadingFormations] = useState(false);
  const [formationsError, setFormationsError] = useState<string | null>(null);
  
  // États pour les référentiels
  const [referentiels, setReferentiels] = useState<Referentiel[]>([]);
  const [loadingReferentiels, setLoadingReferentiels] = useState(false);
  const [referentielsError, setReferentielsError] = useState<string | null>(null);
  const [selectedTypeRef, setSelectedTypeRef] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // États pour les types de permis et sessions (référentiels)
  const [typesPermis, setTypesPermis] = useState<Referentiel[]>([]);
  const [sessions, setSessions] = useState<Referentiel[]>([]);
  
  // États pour les dialogues
  const [formationDialogOpen, setFormationDialogOpen] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [formationFormData, setFormationFormData] = useState<FormationFormData>({
    auto_ecole_id: autoEcole.id,
    type_permis_id: '',
    montant: 0,
    description: '',
    session_id: '',
    statut: true,
  });
  
  const navigate = useNavigate();

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
  }>({
    libelle: '',
    code: '',
    type_ref: '',
    description: '',
    statut: true,
  });
  const [isCustomType, setIsCustomType] = useState(false);

  // Charger les formations
  const loadFormations = async () => {
    setLoadingFormations(true);
    setFormationsError(null);
    
    try {
      const data = await autoEcoleService.getFormationsByAutoEcole(autoEcole.id);
      setFormations(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des formations:', err);
      setFormationsError(err.response?.data?.message || 'Erreur lors du chargement des formations');
    } finally {
      setLoadingFormations(false);
    }
  };

  // Charger les référentiels
  const loadReferentiels = async (typeRef?: string) => {
    setLoadingReferentiels(true);
    setReferentielsError(null);
    
    try {
      const response = await referentielService.getReferentiels(1, 100, {
        type_ref: typeRef,
        statut: true,
      });
      setReferentiels(response.data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des référentiels:', err);
      setReferentielsError(err.response?.data?.message || 'Erreur lors du chargement des référentiels');
    } finally {
      setLoadingReferentiels(false);
    }
  };

  // Charger les types de permis
  const loadTypesPermis = async () => {
    try {
      const types = await referentielService.getReferentielsByType('type_permis');
      setTypesPermis(types);
    } catch (err) {
      console.error('Erreur lors du chargement des types de permis:', err);
    }
  };

  // Charger les sessions
  const loadSessions = async () => {
    try {
      const sessionsData = await referentielService.getReferentielsByType('session');
      setSessions(sessionsData);
    } catch (err) {
      console.error('Erreur lors du chargement des sessions:', err);
    }
  };

  // Effet pour charger les données au montage
  useEffect(() => {
    loadFormations();
    loadReferentiels();
    loadTypesPermis();
    loadSessions();
  }, [autoEcole.id, refreshTrigger]);

  // Effet pour filtrer par type de référentiel
  useEffect(() => {
    if (selectedTypeRef) {
      loadReferentiels(selectedTypeRef);
    } else {
      loadReferentiels();
    }
  }, [selectedTypeRef]);

  // Gestion du changement d'onglet
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Gestion du formulaire de formation
  const handleFormationDialogOpen = (formation?: Formation) => {
    if (formation) {
      setSelectedFormation(formation);
      setFormationFormData({
        auto_ecole_id: autoEcole.id,
        type_permis_id: formation.type_permis_id,
        montant: formation.montant || formation.prix || 0,
        description: formation.description || '',
        session_id: formation.session_id || '',
        statut: formation.statut,
      });
    } else {
      setSelectedFormation(null);
      setFormationFormData({
        auto_ecole_id: autoEcole.id,
        type_permis_id: '',
        montant: 0,
        description: '',
        session_id: '',
        statut: true,
      });
    }
    setFormationDialogOpen(true);
  };

  const handleFormationDialogClose = () => {
    setFormationDialogOpen(false);
    setSelectedFormation(null);
  };

  const handleFormationSubmit = async () => {
    try {
      if (selectedFormation) {
        await autoEcoleService.updateFormation(selectedFormation.id, formationFormData);
      } else {
        await autoEcoleService.createFormation(formationFormData);
      }
      loadFormations();
      handleFormationDialogClose();
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde de la formation:', err);
      alert(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
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
    });
    setReferentielDialogOpen(true);
  };

  const handleReferentielEdit = (referentiel: Referentiel) => {
    setSelectedReferentiel(referentiel);
    setIsCreatingReferentiel(false);
    setReferentielFormData({
      libelle: referentiel.libelle || '',
      code: referentiel.code || '',
      type_ref: referentiel.type_ref || '',
      description: referentiel.description || '',
      statut: referentiel.statut ?? true,
    });
    setReferentielDialogOpen(true);
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
          loadReferentiels(selectedTypeRef);
          handleReferentielDialogClose();
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
    <Box>
      {/* Sous-onglets */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
          <Tab icon={<Person />} label="Candidats Inscrits" iconPosition="start" />
          <Tab icon={<School />} label="Formations" iconPosition="start" />
          <Tab icon={<Settings />} label="Paramètres (Référentiels)" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Onglet 1: Candidats Inscrits */}
      <TabPanel value={tabValue} index={0}>
        <Box>
          {/* Bouton d'inscription */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" fontWeight="bold">
              Candidats Inscrits
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate(ROUTES.INSCRIPTION_FORMATION.replace(':autoEcoleId', autoEcole.id))}
            >
              Inscrire un candidat
            </Button>
          </Box>
          
          <CandidatsTable 
            autoEcoleId={autoEcole.id} 
            refreshTrigger={refreshTrigger} 
          />
        </Box>
      </TabPanel>

      {/* Onglet 2: Formations */}
      <TabPanel value={tabValue} index={1}>
        <Box>
          {/* En-tête */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight="bold">
              Formations Proposées
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleFormationDialogOpen()}
            >
              Nouvelle Formation
            </Button>
          </Box>

          {/* Message d'erreur */}
          {formationsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formationsError}
            </Alert>
          )}

          {/* Liste des formations */}
          {loadingFormations ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : formations.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <School sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucune formation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Créez votre première formation pour commencer
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleFormationDialogOpen()}
              >
                Créer une formation
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {formations.map((formation) => (
                <Grid item xs={12} md={6} lg={4} key={formation.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {formation.nom || `Formation ${(() => {
                            const typePermis = formation.typePermis || formation.type_permis;
                            if (!typePermis) return '';
                            // Vérifier si c'est un Referentiel (a libelle) ou TypePermis (a nom)
                            return 'libelle' in typePermis ? typePermis.libelle : typePermis.nom;
                          })()}`}
                        </Typography>
                        <Chip
                          label={formation.statut_libelle || (formation.statut ? 'Active' : 'Inactive')}
                          color={formation.statut ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      
                      {formation.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {formation.description}
                        </Typography>
                      )}
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            Type de permis:
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {(() => {
                              const typePermis = formation.typePermis || formation.type_permis;
                              if (!typePermis) return 'N/A';
                              // Vérifier si c'est un Referentiel (a libelle) ou TypePermis (a nom)
                              return 'libelle' in typePermis ? typePermis.libelle : typePermis.nom;
                            })()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            Montant:
                          </Typography>
                          <Typography variant="body2" fontWeight="medium" color="primary">
                            {formation.montant_formate || `${formation.montant || formation.prix || 0} FCFA`}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            Session:
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formation.session?.libelle || 'N/A'}
                          </Typography>
                        </Box>
                        {formation.duree_jours && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">
                              Durée:
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {formation.duree_jours} jours
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => handleFormationDialogOpen(formation)}
                          fullWidth
                        >
                          Modifier
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </TabPanel>

      {/* Onglet 3: Paramètres (Référentiels) */}
      <TabPanel value={tabValue} index={2}>
        <Box>
          {/* En-tête */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Paramètres et Référentiels
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Consultez les référentiels disponibles pour configurer votre auto-école
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
              Ajouter un référentiel
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
                      <TableCell>Code</TableCell>
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
                            <IconButton
                              size="small"
                              onClick={() => handleReferentielEdit(ref)}
                              color="primary"
                            >
                              <Edit fontSize="small" />
                            </IconButton>
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

      {/* Dialogue de création/modification de formation */}
      <Dialog 
        open={formationDialogOpen} 
        onClose={handleFormationDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedFormation ? 'Modifier la formation' : 'Nouvelle formation'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Type de permis</InputLabel>
              <Select
                value={formationFormData.type_permis_id}
                onChange={(e) => setFormationFormData({ ...formationFormData, type_permis_id: e.target.value })}
                label="Type de permis"
              >
                {typesPermis.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.libelle} ({type.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Session</InputLabel>
              <Select
                value={formationFormData.session_id}
                onChange={(e) => setFormationFormData({ ...formationFormData, session_id: e.target.value })}
                label="Session"
              >
                {sessions.map((session) => (
                  <MenuItem key={session.id} value={session.id}>
                    {session.libelle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Montant (FCFA)"
              type="number"
              value={formationFormData.montant}
              onChange={(e) => setFormationFormData({ ...formationFormData, montant: Number(e.target.value) })}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={formationFormData.description}
              onChange={(e) => setFormationFormData({ ...formationFormData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
              placeholder="Description de la formation (optionnel)"
            />
            
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                value={formationFormData.statut ? 'true' : 'false'}
                onChange={(e) => setFormationFormData({ ...formationFormData, statut: e.target.value === 'true' })}
                label="Statut"
              >
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFormationDialogClose}>Annuler</Button>
          <Button onClick={handleFormationSubmit} variant="contained">
            {selectedFormation ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

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
        <DialogActions>
          <Button onClick={handleReferentielDialogClose}>Annuler</Button>
          <Button onClick={handleReferentielSubmit} variant="contained">
            {isCreatingReferentiel ? 'Créer' : 'Modifier'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutoEcoleSettings;

