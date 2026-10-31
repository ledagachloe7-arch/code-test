import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceptionDossier, EpreuveStatut, EpreuveAttempt } from '../types';
import { Box, Button, Typography, Chip, Snackbar, Alert, Paper, Tabs, Tab, Card, CardContent, Grid, Divider } from '@mui/material';
import EpreuveSheet from '../components/EpreuveSheet';
import { EyeIcon } from '@heroicons/react/24/outline';
import { ROUTES } from '../../../shared/constants';
import { Description } from '@mui/icons-material';
import axiosClient from '../../../shared/utils/axiosConfig';
import { logger } from '../../../shared/utils/logger';

interface ReceptionDossiersTableProps {
  dossiers: ReceptionDossier[];
  onReceive: (id: string) => void;
  onOpenDocuments?: (dossier: ReceptionDossier) => void;
}

// Fonctions de calcul du statut (copiées depuis EpreuveSheet)
const MAX_ATTEMPTS = 3;

function computeOverall(attempts?: EpreuveAttempt[], legacy?: EpreuveStatut): EpreuveStatut {
  if (legacy && legacy !== 'non_saisi') return legacy;
  if (!attempts || attempts.length === 0) return 'non_saisi';
  if (attempts.some(a => a.result === 'reussi')) return 'reussi';
  if (attempts.length >= MAX_ATTEMPTS && attempts.every(a => a.result !== 'reussi')) return 'echoue';
  return attempts[attempts.length - 1].result;
}

function computeGeneral(
  creneaux: EpreuveStatut,
  codeConduite: EpreuveStatut,
  tourVille: EpreuveStatut
): EpreuveStatut {
  const statuses: EpreuveStatut[] = [creneaux, codeConduite, tourVille];
  
  if (statuses.every(s => s === 'reussi')) return 'reussi';
  if (statuses.some(s => s === 'echoue')) return 'echoue';
  if (statuses.some(s => s === 'absent')) return 'absent';
  
  return 'non_saisi';
}

const ReceptionDossiersTable: React.FC<ReceptionDossiersTableProps> = ({ dossiers, onReceive, onOpenDocuments }) => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = React.useState(0);
  // État pour stocker les épreuves de chaque dossier
  const [epreuvesMap, setEpreuvesMap] = React.useState<Map<string, EpreuveStatut>>(new Map());

  // Charger les épreuves depuis les données du dossier (depuis l'API) ou calculer depuis /resultats
  React.useEffect(() => {
    const loadEpreuvesStatus = async () => {
      if (dossiers.length === 0) {
        setEpreuvesMap(new Map());
        return;
      }

      const newMap = new Map<string, EpreuveStatut>();
      
      // D'abord, utiliser les épreuves depuis les données du dossier si disponibles
      dossiers.forEach(dossier => {
        if (dossier.epreuves?.general) {
          newMap.set(dossier.id, dossier.epreuves.general);
        }
      });

      // Ensuite, charger les résultats depuis /resultats pour les dossiers sans statut
      const dossiersSansStatut = dossiers.filter(d => !newMap.has(d.id));
      
      if (dossiersSansStatut.length > 0) {
        logger.log(`📋 Chargement des statuts d'épreuves pour ${dossiersSansStatut.length} dossier(s)...`);
        
        await Promise.all(
          dossiersSansStatut.map(async (dossier) => {
            try {
              const response = await axiosClient.get('/resultats', {
                params: { dossier_id: dossier.id }
              });
              
              const resultats = Array.isArray(response.data?.data) ? response.data.data : [];
              
              if (resultats.length === 0) {
                newMap.set(dossier.id, 'non_saisi');
                return;
              }
              
              // Organiser les résultats par type d'examen
              const creneauxAttempts: EpreuveAttempt[] = [];
              const codeConduiteAttempts: EpreuveAttempt[] = [];
              const tourVilleAttempts: EpreuveAttempt[] = [];
              
              resultats.forEach((resultat: any) => {
                const attempt: EpreuveAttempt = {
                  result: resultat.statut as EpreuveStatut,
                  date: resultat.date,
                  note: resultat.commentaire || ''
                };
                
                const typeExamen = (resultat.typeExamen || '').toLowerCase().trim();
                
                if (typeExamen.includes('creneau') || typeExamen === 'creneaux') {
                  creneauxAttempts.push(attempt);
                } else if (typeExamen.includes('code') || typeExamen === 'codeconduite' || typeExamen === 'code_conduite') {
                  codeConduiteAttempts.push(attempt);
                } else if (typeExamen.includes('ville') || typeExamen === 'tourville' || typeExamen === 'tour_ville') {
                  tourVilleAttempts.push(attempt);
                }
              });
              
              // Trier par date
              creneauxAttempts.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateA - dateB;
              });
              codeConduiteAttempts.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateA - dateB;
              });
              tourVilleAttempts.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateA - dateB;
              });
              
              // Calculer les statuts
              const creneauxStatus = computeOverall(creneauxAttempts);
              const codeStatus = computeOverall(codeConduiteAttempts);
              const villeStatus = computeOverall(tourVilleAttempts);
              const generalStatus = computeGeneral(creneauxStatus, codeStatus, villeStatus);
              
              newMap.set(dossier.id, generalStatus);
              logger.log(`✅ Statut calculé pour dossier ${dossier.id}: ${generalStatus}`);
            } catch (err: any) {
              // En cas d'erreur (404 = pas de résultats), mettre 'non_saisi'
              if (err?.response?.status === 404) {
                newMap.set(dossier.id, 'non_saisi');
              } else {
                logger.error(`❌ Erreur lors du chargement des résultats pour dossier ${dossier.id}:`, err);
                newMap.set(dossier.id, 'non_saisi');
              }
            }
          })
        );
      }
      
      setEpreuvesMap(newMap);
    };
    
    loadEpreuvesStatus();
  }, [dossiers]);

  // Réinitialiser l'onglet si la liste change
  React.useEffect(() => {
    if (dossiers.length > 0 && currentTab >= dossiers.length) {
      setCurrentTab(Math.max(0, dossiers.length - 1));
    } else if (dossiers.length === 0) {
      setCurrentTab(0);
    }
  }, [dossiers.length, currentTab]);

  React.useEffect(() => {
    try {
      // Log compact de la liste
      logger.log('📦 ReceptionDossiersTable - dossiers (count):', dossiers?.length || 0);
      // Log détaillé des champs affichés + date examen + statut
      logger.table(
        (dossiers || []).map(d => ({
          id: d.id,
          reference: d.reference,
          candidat: `${d.candidatNom} ${d.candidatPrenom}`.trim(),
          autoEcole: d.autoEcoleNom,
          dateExamen: d.dateExamen,
          dateEnvoi: d.dateEnvoi,
          statut: d.statut,
          epreuveGeneral: epreuvesMap.get(d.id) || 'non_saisi',
        }))
      );
      // Log de la réponse brute si disponible
      (dossiers || []).forEach(d => {
        if (d.details) {
          logger.log('🔎 programme_session (raw) for', d.id, d.details);
          if ((d as any).details?.dossier_complet) {
            logger.log('🧾 dossier_complet for', d.reference, (d as any).details.dossier_complet);
          }
        }
      });
    } catch {}
  }, [dossiers, epreuvesMap]);
  // Utiliser onReceive pour éviter l'avertissement linter si non utilisé
  React.useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      onReceive;
    } catch {}
  }, [onReceive]);
  const [openEpreuve, setOpenEpreuve] = React.useState(false);
  const [selected, setSelected] = React.useState<ReceptionDossier | null>(null);
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleOpenEpreuve = (d: ReceptionDossier) => {
    setSelected(d);
    setOpenEpreuve(true);
  };

  const handleOpenDetails = (d: ReceptionDossier) => {
    // Naviguer vers la page de détails du candidat
    // Naviguer vers la page de détails du candidat en utilisant l'ID du dossier (pas la référence)
    navigate(ROUTES.RECEPTION_CANDIDAT_DETAILS.replace(':id', d.id));
  };

  const handleSaved = (results: any) => {
    try {
      logger.log('✅ Epreuves enregistrées pour', selected?.reference, results);
      // Mettre à jour le statut des épreuves dans le map
      if (selected && results?.general) {
        setEpreuvesMap(prev => {
          const newMap = new Map(prev);
          newMap.set(selected.id, results.general);
          return newMap;
        });
      }
    } catch {}
  };

  // Gestion des onglets
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Fonction pour obtenir le libellé et la couleur du statut des épreuves
  const getStatutEpreuveInfo = (statut: EpreuveStatut | undefined) => {
    switch (statut) {
      case 'reussi':
        return { label: 'Validé', color: 'success' as const };
      case 'echoue':
        return { label: 'Échoué', color: 'error' as const };
      case 'absent':
        return { label: 'Absent', color: 'warning' as const };
      case 'non_saisi':
      default:
        return { label: 'Non saisi', color: 'default' as const };
    }
  };

  const currentDossier = dossiers[currentTab];

  return (
    <Box sx={{ 
      backgroundColor: 'white', 
      borderRadius: 2, 
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(0, 0, 0, 0.08)'
    }}>
      <Paper sx={{ p: 2 }}>
        {dossiers.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Aucun dossier en attente de réception.
            </Typography>
          </Box>
        ) : (
          <>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
            >
              {dossiers.map((dossier, index) => {
                const epreuveStatut = epreuvesMap.get(dossier.id) || dossier.epreuves?.general;
                const statutInfo = getStatutEpreuveInfo(epreuveStatut);
                return (
                  <Tab
                    key={dossier.id}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {dossier.reference}
                        </Typography>
                        <Chip
                          label={statutInfo.label}
                          color={statutInfo.color}
                          size="small"
                          variant={epreuveStatut === 'non_saisi' ? 'outlined' : 'filled'}
                          sx={{ 
                            height: 20,
                            fontSize: '0.7rem',
                            '& .MuiChip-label': {
                              px: 1
                            }
                          }}
                        />
                      </Box>
                    }
                    value={index}
                  />
                );
              })}
            </Tabs>

            {currentDossier && (() => {
              const formationDetails = currentDossier.details?.formation_complete || currentDossier.details?.dossier?.formation;
              const formationNom = formationDetails?.type_permis?.libelle || formationDetails?.nom || 'Formation';
              const epreuveStatut = epreuvesMap.get(currentDossier.id) || currentDossier.epreuves?.general;
              const statutInfo = getStatutEpreuveInfo(epreuveStatut);

              return (
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                      <Box>
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                          {currentDossier.reference}
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                          {currentDossier.candidatNom} {currentDossier.candidatPrenom}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                          <Chip
                            label={statutInfo.label}
                            color={statutInfo.color}
                            size="medium"
                            variant={epreuveStatut === 'non_saisi' ? 'outlined' : 'filled'}
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EyeIcon className="w-4 h-4" />}
                          onClick={() => handleOpenDetails(currentDossier)}
                          sx={{
                            textTransform: 'none',
                            borderColor: 'rgba(0, 0, 0, 0.23)',
                            color: '#333',
                            fontWeight: 500,
                            px: 2,
                            py: 0.75,
                            '&:hover': {
                              borderColor: '#1976d2',
                              backgroundColor: 'rgba(25, 118, 210, 0.04)',
                              color: '#1976d2'
                            }
                          }}
                        >
                          Détails
                        </Button>
                        {onOpenDocuments && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Description />}
                            onClick={() => onOpenDocuments(currentDossier)}
                            sx={{
                              textTransform: 'none',
                              borderColor: 'rgba(0, 0, 0, 0.23)',
                              color: '#333',
                              fontWeight: 500,
                              px: 2,
                              py: 0.75,
                              '&:hover': {
                                borderColor: '#9c27b0',
                                backgroundColor: 'rgba(156, 39, 176, 0.04)',
                                color: '#9c27b0'
                              }
                            }}
                          >
                            Documents
                          </Button>
                        )}
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleOpenEpreuve(currentDossier)}
                          sx={{
                            textTransform: 'none',
                            backgroundColor: '#1976d2',
                            fontWeight: 600,
                            px: 2,
                            py: 0.75,
                            boxShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
                            '&:hover': {
                              backgroundColor: '#1565c0',
                              boxShadow: '0 4px 8px rgba(25, 118, 210, 0.3)'
                            }
                          }}
                        >
                          Épreuves
                        </Button>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Formation
                        </Typography>
                        <Typography variant="body1" fontWeight={600} color="primary.main">
                          {formationNom}
                        </Typography>
                        {formationDetails?.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {formationDetails.description}
                          </Typography>
                        )}
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Auto-école
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {currentDossier.autoEcoleNom}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Date d'examen
                        </Typography>
                        <Typography variant="body1">
                          {currentDossier.dateExamen ? new Date(currentDossier.dateExamen).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Date d'envoi
                        </Typography>
                        <Typography variant="body1">
                          {new Date(currentDossier.dateEnvoi).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Statut des épreuves
                        </Typography>
                        <Chip
                          label={statutInfo.label}
                          color={statutInfo.color}
                          size="medium"
                          variant={epreuveStatut === 'non_saisi' ? 'outlined' : 'filled'}
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              );
            })()}
          </>
        )}
      </Paper>
      <EpreuveSheet
        open={openEpreuve}
        onClose={() => setOpenEpreuve(false)}
        dossier={selected}
        onSaved={handleSaved}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReceptionDossiersTable;


