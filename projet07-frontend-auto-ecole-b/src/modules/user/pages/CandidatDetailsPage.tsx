import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  Assignment,
  School,
  ExpandMore,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { userService } from '../services';
import { CandidatDetails } from '../types/candidat-details';

const CandidatDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidat, setCandidat] = useState<CandidatDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCandidatDetails = async () => {
      if (!id) {
        setError('ID du candidat manquant');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await userService.getCandidatDetails(id);
        console.log('✅ Données du candidat chargées:', data);
        console.log('📁 Nombre de dossiers:', data.dossiers?.length || 0);
        
        // Vérifier et logger la structure des dossiers
        if (data.dossiers && Array.isArray(data.dossiers)) {
          data.dossiers.forEach((dossier: any, idx: number) => {
            console.log(`📁 Dossier ${idx + 1}:`, {
              id: dossier.id,
              type_demande_id: dossier.type_demande_id,
              has_type_demande: !!dossier.type_demande,
              type_demande_name: dossier.type_demande?.name,
              statut: dossier.statut,
              has_auto_ecole: !!dossier.auto_ecole,
              has_formation: !!dossier.formation,
              documents_count: dossier.documents?.length || 0,
            });
          });
        }
        
        setCandidat(data);
      } catch (err: any) {
        console.error('Erreur lors du chargement des détails:', err);
        setError(err.response?.data?.message || 'Erreur lors du chargement des détails du candidat');
      } finally {
        setLoading(false);
      }
    };

    loadCandidatDetails();
  }, [id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatutColor = (statut: string) => {
    switch (statut?.toLowerCase()) {
      case 'valide':
      case 'validé':
        return 'success';
      case 'en_cours':
      case 'en cours':
        return 'info';
      case 'en_attente':
      case 'en attente':
        return 'warning';
      case 'rejete':
      case 'rejeté':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !candidat) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Retour
        </Button>
        <Alert severity="error">{error || 'Candidat non trouvé'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête avec bouton retour */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
        >
          Retour
        </Button>
        <Typography variant="h4" component="h1">
          Détails du Candidat
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Informations personnelles */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Person color="primary" fontSize="large" />
                <Typography variant="h5" component="h2">
                  Informations Personnelles
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <List>
                <ListItem>
                  <ListItemIcon>
                    <Person />
                  </ListItemIcon>
                  <ListItemText
                    primary="Nom complet"
                    secondary={candidat.personne?.nom_complet || `${candidat.personne?.prenom} ${candidat.personne?.nom}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Email />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={candidat.personne?.email || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Phone />
                  </ListItemIcon>
                  <ListItemText
                    primary="Contact"
                    secondary={candidat.personne?.contact || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LocationOn />
                  </ListItemIcon>
                  <ListItemText
                    primary="Adresse"
                    secondary={candidat.personne?.adresse || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Assignment />
                  </ListItemIcon>
                  <ListItemText
                    primary="Numéro candidat"
                    secondary={candidat.numero_candidat || 'N/A'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Informations de naissance et identification */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <CalendarToday color="primary" fontSize="large" />
                <Typography variant="h5" component="h2">
                  Informations de Naissance
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <List>
                <ListItem>
                  <ListItemText
                    primary="Date de naissance"
                    secondary={formatDate(candidat.date_naissance)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Lieu de naissance"
                    secondary={candidat.lieu_naissance || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Âge"
                    secondary={candidat.age || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Genre"
                    secondary={candidat.genre === 'M' ? 'Masculin' : candidat.genre === 'F' ? 'Féminin' : candidat.genre || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Nationalité"
                    secondary={candidat.nationalite || 'N/A'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Informations d'identification */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pièce d'Identité
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <List>
                <ListItem>
                  <ListItemText
                    primary="Type de pièce"
                    secondary={candidat.type_piece || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Numéro de pièce"
                    secondary={candidat.numero_piece || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="NIP"
                    secondary={candidat.nip || 'N/A'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Dossiers */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Assignment color="primary" fontSize="large" />
                <Typography variant="h5" component="h2">
                  Dossiers ({candidat.dossiers?.length || 0})
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {!candidat.dossiers || candidat.dossiers.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  Aucun dossier trouvé
                </Typography>
              ) : (
                candidat.dossiers.map((dossier, index) => {
                  // Debug: afficher les informations du dossier
                  console.log(`📁 Dossier ${index + 1}:`, {
                    id: dossier.id,
                    type_demande_id: dossier.type_demande_id,
                    type_demande: dossier.type_demande,
                    statut: dossier.statut,
                    auto_ecole: dossier.auto_ecole,
                    formation: dossier.formation,
                  });
                  
                  const typeDemandeName = dossier.type_demande?.name || 
                                        (dossier.type_demande_id ? `Type ID: ${dossier.type_demande_id}` : 'Sans type');
                  
                  return (
                    <Accordion key={dossier.id || index} sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Typography variant="subtitle1" sx={{ flex: 1 }}>
                            Dossier #{index + 1} - {typeDemandeName}
                          </Typography>
                          <Chip
                            label={dossier.statut || 'N/A'}
                            color={getStatutColor(dossier.statut) as any}
                            size="small"
                          />
                        </Box>
                      </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Auto-École
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemIcon>
                                <School />
                              </ListItemIcon>
                              <ListItemText
                                primary={dossier.auto_ecole?.nom_auto_ecole || 'N/A'}
                                secondary={dossier.auto_ecole?.adresse || ''}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText
                                primary="Contact"
                                secondary={dossier.auto_ecole?.contact || 'N/A'}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText
                                primary="Email"
                                secondary={dossier.auto_ecole?.email || 'N/A'}
                              />
                            </ListItem>
                          </List>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Formation
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemText
                                primary={dossier.formation?.type_permis?.libelle || 'N/A'}
                                secondary={dossier.formation?.description || ''}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText
                                primary="Montant"
                                secondary={dossier.formation?.montant_formate || 'N/A'}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText
                                primary="Session"
                                secondary={dossier.formation?.session?.libelle || 'N/A'}
                              />
                            </ListItem>
                          </List>
                        </Grid>

                        {dossier.documents && dossier.documents.length > 0 && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                              Documents ({dossier.documents.length})
                            </Typography>
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Nom du fichier</TableCell>
                                    <TableCell>Taille</TableCell>
                                    <TableCell>Statut</TableCell>
                                    <TableCell>Date</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {dossier.documents.map((doc) => (
                                    <TableRow key={doc.id}>
                                      <TableCell>{doc.nom_fichier}</TableCell>
                                      <TableCell>{doc.taille_fichier_formate}</TableCell>
                                      <TableCell>
                                        {doc.valide ? (
                                          <Chip
                                            icon={<CheckCircle />}
                                            label={doc.valide_libelle}
                                            color="success"
                                            size="small"
                                          />
                                        ) : (
                                          <Chip
                                            icon={<Cancel />}
                                            label="Non validé"
                                            color="error"
                                            size="small"
                                          />
                                        )}
                                      </TableCell>
                                      <TableCell>{formatDate(doc.created_at)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Grid>
                        )}

                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>
                            Informations supplémentaires
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemText
                                primary="Numéro de permis"
                                secondary={dossier.numero_permis || 'N/A'}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText
                                primary="Numéro d'origine permis"
                                secondary={dossier.numero_origine_permis || 'N/A'}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText
                                primary="Date de création"
                                secondary={formatDate(dossier.date_creation)}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText
                                primary="Date de modification"
                                secondary={formatDate(dossier.date_modification)}
                              />
                            </ListItem>
                          </List>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                  );
                })
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CandidatDetailsPage;

