// Page de planification des examens
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Schedule,
  CheckCircle,
  PlayArrow,
  Stop,
  CalendarToday,
  AccessTime,
  Group,
} from '@mui/icons-material';
import { PlanificationCreneaux, PlanificationResult } from '../types';
import { useCreneau, useEpreuve, useSessionExamen } from '../hooks';

const PlanificationPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [planificationData, setPlanificationData] = useState<PlanificationCreneaux>({
    epreuve_session_id: '',
    date_debut: '',
    date_fin: '',
    duree_creneau_minutes: 30,
    pause_entre_creneaux_minutes: 15,
    heure_debut_journee: '08:00',
    heure_fin_journee: '17:00',
    capacite_par_creneau: 20,
    jours_travailles: [1, 2, 3, 4, 5], // Lundi à Vendredi
  });
  const [resultat, setResultat] = useState<PlanificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { epreuvesSession } = useEpreuve();
  const { planifierCreneaux } = useCreneau();
  const { sessions } = useSessionExamen();

  const handleInputChange = (field: keyof PlanificationCreneaux, value: any) => {
    setPlanificationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleJoursTravaillesChange = (jour: number) => {
    setPlanificationData(prev => ({
      ...prev,
      jours_travailles: prev.jours_travailles.includes(jour)
        ? prev.jours_travailles.filter(j => j !== jour)
        : [...prev.jours_travailles, jour]
    }));
  };

  const handlePlanifier = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await planifierCreneaux(planificationData);
      setResultat(result);
      setActiveStep(2);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la planification');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      label: 'Configuration de base',
      description: 'Définir les paramètres de base de la planification',
    },
    {
      label: 'Horaires et créneaux',
      description: 'Configurer les horaires et la durée des créneaux',
    },
    {
      label: 'Résultats',
      description: 'Consulter les résultats de la planification',
    },
  ];

  const joursSemaine = [
    { value: 0, label: 'Dimanche' },
    { value: 1, label: 'Lundi' },
    { value: 2, label: 'Mardi' },
    { value: 3, label: 'Mercredi' },
    { value: 4, label: 'Jeudi' },
    { value: 5, label: 'Vendredi' },
    { value: 6, label: 'Samedi' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Planification des Examens
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Planifiez automatiquement les créneaux d'examen en fonction de vos paramètres
      </Typography>

      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* Étape 1: Configuration de base */}
            <Step>
              <StepLabel>Configuration de base</StepLabel>
              <StepContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Session d'examen</InputLabel>
                      <Select
                        value={planificationData.epreuve_session_id}
                        onChange={(e) => handleInputChange('epreuve_session_id', e.target.value)}
                        label="Session d'examen"
                      >
                        {sessions.map((session) => (
                          <MenuItem key={session.id} value={session.id}>
                            {session.nom} - {session.type_permis.libelle}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Date de début"
                      value={planificationData.date_debut}
                      onChange={(e) => handleInputChange('date_debut', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Date de fin"
                      value={planificationData.date_fin}
                      onChange={(e) => handleInputChange('date_fin', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Capacité par créneau"
                      value={planificationData.capacite_par_creneau}
                      onChange={(e) => handleInputChange('capacite_par_creneau', parseInt(e.target.value))}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Jours travaillés
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {joursSemaine.map((jour) => (
                        <Chip
                          key={jour.value}
                          label={jour.label}
                          color={planificationData.jours_travailles.includes(jour.value) ? 'primary' : 'default'}
                          onClick={() => handleJoursTravaillesChange(jour.value)}
                          variant={planificationData.jours_travailles.includes(jour.value) ? 'filled' : 'outlined'}
                        />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(1)}
                    disabled={!planificationData.epreuve_session_id || !planificationData.date_debut || !planificationData.date_fin}
                  >
                    Continuer
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Étape 2: Horaires et créneaux */}
            <Step>
              <StepLabel>Horaires et créneaux</StepLabel>
              <StepContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="time"
                      label="Heure de début de journée"
                      value={planificationData.heure_debut_journee}
                      onChange={(e) => handleInputChange('heure_debut_journee', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="time"
                      label="Heure de fin de journée"
                      value={planificationData.heure_fin_journee}
                      onChange={(e) => handleInputChange('heure_fin_journee', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Durée d'un créneau (minutes)"
                      value={planificationData.duree_creneau_minutes}
                      onChange={(e) => handleInputChange('duree_creneau_minutes', parseInt(e.target.value))}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Pause entre créneaux (minutes)"
                      value={planificationData.pause_entre_creneaux_minutes}
                      onChange={(e) => handleInputChange('pause_entre_creneaux_minutes', parseInt(e.target.value))}
                    />
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setActiveStep(0)}
                    sx={{ mr: 1 }}
                  >
                    Retour
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handlePlanifier}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Schedule />}
                  >
                    Planifier
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Étape 3: Résultats */}
            <Step>
              <StepLabel>Résultats</StepLabel>
              <StepContent>
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}
                
                {resultat && (
                  <Box>
                    <Alert severity="success" sx={{ mb: 3 }}>
                      Planification terminée avec succès !
                    </Alert>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Statistiques
                            </Typography>
                            <List dense>
                              <ListItem>
                                <ListItemIcon>
                                  <CalendarToday color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Créneaux créés"
                                  secondary={resultat.statistiques.nombre_creneaux}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <Group color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Candidats affectés"
                                  secondary={resultat.statistiques.nombre_candidats_affectes}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <AccessTime color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Capacité totale"
                                  secondary={resultat.statistiques.capacite_totale}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <CheckCircle color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Taux d'occupation moyen"
                                  secondary={`${resultat.statistiques.taux_occupation_moyen.toFixed(1)}%`}
                                />
                              </ListItem>
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Aperçu des créneaux
                            </Typography>
                            <List dense>
                              {resultat.creneaux_crees.slice(0, 5).map((creneau, index) => (
                                <ListItem key={creneau.id}>
                                  <ListItemIcon>
                                    <Schedule color="action" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={`${creneau.date} - ${creneau.heure_debut} à ${creneau.heure_fin}`}
                                    secondary={`Capacité: ${creneau.capacite_maximale}`}
                                  />
                                </ListItem>
                              ))}
                              {resultat.creneaux_crees.length > 5 && (
                                <ListItem>
                                  <ListItemText
                                    primary={`... et ${resultat.creneaux_crees.length - 5} autres créneaux`}
                                    color="text.secondary"
                                  />
                                </ListItem>
                              )}
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                )}
                
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setActiveStep(1)}
                    sx={{ mr: 1 }}
                  >
                    Retour
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      setActiveStep(0);
                      setResultat(null);
                      setError(null);
                    }}
                  >
                    Nouvelle planification
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PlanificationPage;
