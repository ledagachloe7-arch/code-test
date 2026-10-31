import React, { lazy, Suspense, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Stack, 
  Typography, 
  TextField, 
  Card, 
  CardContent, 
  Grid,
  Chip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tabs,
  Tab,
  Paper,
  Skeleton,
  Fade,
  TablePagination,
  LinearProgress,
} from '@mui/material';
import { Search, Refresh, Close } from '@mui/icons-material';
import { receptionService } from '../services/reception.service';
import { ReceptionDossier } from '../types';
import { circuitSuiviService, CircuitSuivi } from '../services/circuit-suivi.service';
import { TypeDemande } from '../../cnepc/types/type-demande';
import {
  useReceptionCache,
  useReceptionData,
  RECEPTION_DOSSIERS_PER_PAGE,
} from '../tables/ReceptionDossierTypeTable/context';
import axiosClient from '../../../shared/utils/axiosConfig';
import { useAppStore } from '../../../store';
import { normalizeRole } from '../utils/roleHelpers';

const ReceptionDossierTypeTableLazy = lazy(() => import('../tables/ReceptionDossierTypeTable'));
const CircuitEtapesViewLazy = lazy(() => import('../components/CircuitEtapesView'));

// Composants Skeleton pour le chargement transparent
const ReceptionDossierTableSkeleton = () => (
  <Fade in={true} timeout={300}>
    <Card>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Skeleton variant="text" width="30%" height={40} />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
          ))}
        </Box>
      </CardContent>
    </Card>
  </Fade>
);

const CircuitEtapesViewSkeleton = () => (
  <Fade in={true} timeout={300}>
    <Box>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
        ))}
      </Box>
    </Box>
  </Fade>
);

const MainContentSkeleton = () => (
  <Fade in={true} timeout={300}>
    <Box>
      {/* Skeleton pour les onglets */}
      <Paper sx={{ mb: 3, borderRadius: 0 }}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" width={150} height={40} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        </Box>
      </Paper>
      
      {/* Skeleton pour le tableau */}
      <ReceptionDossierTableSkeleton />
    </Box>
  </Fade>
);

const ReceptionDossiersPage: React.FC = () => {
  const cache = useReceptionCache();
  const {
    dossiers,
    circuits,
    circuitCache,
    typeDemandeCache,
    loading,
    error,
    dossiersPagination,
    loadReceptionDataIfNeeded,
    refreshReceptionData,
    loadCircuitEtapes,
    changeDossiersListPage,
  } = useReceptionData();

  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [selectedTypeDemandeTab, setSelectedTypeDemandeTab] = React.useState<string>('');
  const [selectedDossierForDocuments, setSelectedDossierForDocuments] = React.useState<ReceptionDossier | null>(null);
  const [circuit, setCircuit] = React.useState<CircuitSuivi | undefined>(undefined);
  const [loadingCircuit, setLoadingCircuit] = React.useState(false);
  const [documentsDialogOpen, setDocumentsDialogOpen] = React.useState(false);
  const [receiveError, setReceiveError] = React.useState<string | null>(null);

  const { user } = useAppStore();
  const normalizedUserRole = normalizeRole(String((user as any)?.role || ''));
  const isRoleCnepc = normalizedUserRole === 'cnepc' || normalizedUserRole === 'admin' || normalizedUserRole === 'superadmin';

  /** Mode recherche globale : on charge toutes les pages et on affiche tous les matchs. */
  const [searchResults, setSearchResults] = React.useState<ReceptionDossier[] | null>(null);
  const [searchingAllPages, setSearchingAllPages] = React.useState(false);
  const searchAllTokenRef = React.useRef(0);

  React.useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setSearchResults(null);
      setSearchingAllPages(false);
      return;
    }
    if (term.length < 2) {
      setSearchResults([]);
      setSearchingAllPages(false);
      return;
    }
    if (!dossiersPagination?.total) {
      setSearchResults([]);
      setSearchingAllPages(false);
      return;
    }

    const termLower = term.toLowerCase();
    const token = ++searchAllTokenRef.current;
    setSearchingAllPages(true);

    const timeoutId = window.setTimeout(async () => {
      const mapRawToReception = (dossierRaw: any): ReceptionDossier => ({
        id: dossierRaw.id,
        reference: dossierRaw.reference || `DOS-${dossierRaw.id?.substring(0, 8)?.toUpperCase() ?? ''}`,
        candidatNom: dossierRaw.candidat?.personne?.nom || dossierRaw.candidat_nom || 'N/A',
        candidatPrenom: dossierRaw.candidat?.personne?.prenom || dossierRaw.candidat_prenom || 'N/A',
        autoEcoleNom: dossierRaw.auto_ecole?.nom_auto_ecole || dossierRaw.auto_ecole_nom || 'N/A',
        dateEnvoi: dossierRaw.date_creation || dossierRaw.created_at || new Date().toISOString(),
        statut: (dossierRaw.statut || 'en_attente') as ReceptionDossier['statut'],
        details: {
          dossier_complet: dossierRaw,
          formation_complete: dossierRaw.formation,
          candidat_complet: dossierRaw.candidat,
        },
        epreuves: dossierRaw.epreuves || { general: 'non_saisi' },
      });

      // Recherche côté API (comme GestionDossierTable : param `search`)
      const params: Record<string, string> = {
        page: '1',
        per_page: '1000',
        all_statuts: 'true',
        search: termLower,
      };
      if (isRoleCnepc) params.all_centres = 'true';

      const response = await axiosClient.get('/dossiers', { params });
      const dossiersRaw: any[] = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data?.dossiers)
            ? response.data.dossiers
            : [];

      const found = dossiersRaw
        .filter((dr) => dr && dr.id)
        .map(mapRawToReception);

      if (token !== searchAllTokenRef.current) return;
      setSearchResults(found);
      setSearchingAllPages(false);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, dossiersPagination?.total, dossiersPagination?.last_page, isRoleCnepc]);

  useEffect(() => {
    loadReceptionDataIfNeeded();
  }, [loadReceptionDataIfNeeded]);

  const handleReceive = async (id: string) => {
    setReceiveError(null);
    try {
      await receptionService.receiveDossier(id);
      await refreshReceptionData();
    } catch (e: any) {
      setReceiveError(e?.message || 'Erreur lors de la réception du dossier');
    }
  };

  // Gérer l'ouverture du dialog des documents connexes
  const handleOpenDocumentsDialog = async (dossier: ReceptionDossier) => {
    setSelectedDossierForDocuments(dossier);
    setDocumentsDialogOpen(true);
    setLoadingCircuit(true);

    try {
      // Déterminer le nom_entite du circuit (par défaut PERMIS_CONDUIRE)
      const nomEntite = 'PERMIS_CONDUIRE';
      
      // Vérifier d'abord le cache
      let circuitData = circuitCache.get(nomEntite);
      
      if (!circuitData) {
        // Charger le circuit correspondant
        const loadedCircuit = await circuitSuiviService.getCircuitByNomEntite(nomEntite);
        if (loadedCircuit) {
          // Charger les étapes si elles ne sont pas présentes
          if (loadedCircuit.id && (!loadedCircuit.etapes || loadedCircuit.etapes.length === 0)) {
            try {
              const etapes = await circuitSuiviService.getEtapesByCircuitId(loadedCircuit.id);
              if (etapes.length > 0) {
                loadedCircuit.etapes = etapes;
                console.log(`✅ ${etapes.length} étapes chargées pour le circuit ${loadedCircuit.libelle}`);
              }
            } catch (err) {
              console.warn(`⚠️ Impossible de charger les étapes pour le circuit ${loadedCircuit.id}:`, err);
            }
          }
          circuitData = loadedCircuit;
          if (circuitData.id) {
            setCircuitCache(prev => new Map(prev).set(nomEntite, circuitData!));
            if (circuitData.id) {
              setCircuitCache(prev => new Map(prev).set(circuitData!.id!, circuitData!));
            }
          }
        }
      }
      
      if (circuitData) {
        setCircuit(circuitData);
      } else {
        console.warn('⚠️ Aucun circuit trouvé pour nom_entite:', nomEntite);
        setCircuit(undefined);
      }
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement du circuit:', err);
    } finally {
      setLoadingCircuit(false);
    }
  };

  const handleCloseDocumentsDialog = () => {
    setDocumentsDialogOpen(false);
    setSelectedDossierForDocuments(null);
    setCircuit(undefined);
  };

  const dossiersForDisplay = React.useMemo(() => {
    const term = searchTerm.trim();
    if (!term) return dossiers;
    // En mode recherche globale : afficher uniquement les matchs chargés.
    if (searchResults) return searchResults;
    // Pendant le scan : afficher vide (on affiche un état de chargement).
    return [];
  }, [dossiers, searchTerm, searchResults]);

  // Filtrer les dossiers (recherche déjà appliquée en amont si active)
  const filteredDossiers = React.useMemo(() => dossiersForDisplay, [dossiersForDisplay]);

  // Calculer les statistiques
  const statistics = React.useMemo(() => {
    const total = dossiersPagination?.total ?? dossiers.length;
    const recu = dossiers.filter(d => d.statut === 'recu').length;
    const enAttente = dossiers.filter(d => d.statut === 'en_attente' || d.statut === 'transmis' || d.statut === 'Cnepc').length;
    const valide = dossiers.filter(d => d.statut === 'valide').length;

    // Statistiques par circuit
    const parCircuit = new Map<string, number>();
    dossiers.forEach(() => {
      // Pour l'instant, on groupe par nom_entite par défaut (PERMIS_CONDUIRE)
      // Vous pouvez adapter cette logique selon votre structure de données
      const nomEntite = 'PERMIS_CONDUIRE';
      const circuit = circuitCache.get(nomEntite);
      const circuitName = circuit?.libelle || 'Circuit non défini';
      parCircuit.set(circuitName, (parCircuit.get(circuitName) || 0) + 1);
    });

    return {
      total,
      recu,
      enAttente,
      valide,
      parCircuit: Object.fromEntries(parCircuit)
    };
  }, [dossiers, circuitCache, dossiersPagination?.total]);

  // Grouper les dossiers par circuit
  const dossiersParCircuit = React.useMemo(() => {
    const grouped = new Map<string, { circuit: CircuitSuivi; dossiers: ReceptionDossier[] }>();
    
    console.log('📊 Groupement des dossiers par circuit:', {
      totalDossiers: filteredDossiers.length,
      circuitsCount: circuits.length
    });
    
    filteredDossiers.forEach((dossier) => {
      const dossierComplet = dossier.details?.dossier_complet || dossier.details?.dossier;
      const typeDemandeId = dossierComplet?.type_demande_id;
      
      let circuitForDossier: CircuitSuivi | null = null;
      
      if (typeDemandeId) {
        // Récupérer le type de demande
        const typeDemande = typeDemandeCache.get(typeDemandeId);
        
        if (typeDemande && typeDemande.name) {
          const nomEntite = typeDemande.name;
          
          // Chercher le circuit correspondant via nom_entite
          circuitForDossier = circuits.find(c => c.nom_entite === nomEntite) || null;
          
          // Si pas trouvé, chercher dans le cache
          if (!circuitForDossier) {
            circuitForDossier = circuitCache.get(nomEntite) || null;
          }
        }
      }
      
      // Utiliser le circuit du dossier si disponible (déjà enrichi)
      if (!circuitForDossier && (dossierComplet as any)?.circuit) {
        circuitForDossier = (dossierComplet as any).circuit;
      }
      
      // Si aucun circuit trouvé et qu'un seul circuit est disponible, l'utiliser par défaut
      // (AVANT de créer "non_specifie")
      if (!circuitForDossier && circuits.length === 1) {
        circuitForDossier = circuits[0];
        console.log(`📌 Utilisation du circuit par défaut (unique disponible):`, {
          id: circuitForDossier.id,
          libelle: circuitForDossier.libelle,
          nom_entite: circuitForDossier.nom_entite,
          etapesCount: circuitForDossier.etapes?.length || 0
        });
        
        // S'assurer que les étapes sont chargées
        if (circuitForDossier.id && (!circuitForDossier.etapes || circuitForDossier.etapes.length === 0)) {
          console.warn(`⚠️ Circuit par défaut sans étapes, elles devraient être chargées dans loadCircuits()`);
        }
      }
      
      // Utiliser le circuit trouvé ou créer "non_specifie" seulement si vraiment aucun circuit n'est disponible
      if (circuitForDossier && circuitForDossier.id && circuitForDossier.id !== 'non_specifie') {
        const circuitKey = circuitForDossier.id;
        
        if (!grouped.has(circuitKey)) {
          grouped.set(circuitKey, {
            circuit: circuitForDossier,
            dossiers: []
          });
        }
        
        grouped.get(circuitKey)!.dossiers.push(dossier);
      } else {
        // Dossier sans circuit assigné - grouper dans "Non spécifié" seulement si aucun circuit n'est disponible
        const defaultKey = 'non_specifie';
        if (!grouped.has(defaultKey)) {
          grouped.set(defaultKey, {
            circuit: {
              id: 'non_specifie',
              libelle: 'Non spécifié',
              nom_entite: typeDemandeId || 'N/A',
              actif: true
            } as CircuitSuivi,
            dossiers: []
          });
        }
        grouped.get(defaultKey)!.dossiers.push(dossier);
      }
    });

    console.log('✅ Dossiers groupés par circuit:', Array.from(grouped.entries()).map(([, data]) => ({
      circuit: data.circuit.libelle,
      circuitId: data.circuit.id,
      nom_entite: data.circuit.nom_entite,
      etapesCount: data.circuit.etapes?.length || 0,
      count: data.dossiers.length
    })));

    return grouped;
  }, [filteredDossiers, circuitCache, circuits, typeDemandeCache]);

  // Initialiser le premier onglet si disponible et charger ses étapes
  React.useEffect(() => {
    if (dossiersParCircuit.size > 0 && !selectedTypeDemandeTab) {
      const firstCircuitKey = Array.from(dossiersParCircuit.keys())[0];
      setSelectedTypeDemandeTab(firstCircuitKey);
      
      // Charger les étapes du premier circuit
      const firstCircuitData = dossiersParCircuit.get(firstCircuitKey);
      if (firstCircuitData?.circuit?.id) {
        loadCircuitEtapes(firstCircuitData.circuit.id);
      }
    }
  }, [dossiersParCircuit, selectedTypeDemandeTab, loadCircuitEtapes]);

  // Gestion du changement d'onglet de type de demande
  const handleTypeDemandeTabChange = React.useCallback((_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTypeDemandeTab(newValue);
    
    // Charger les étapes du circuit de l'onglet sélectionné
    const circuitData = dossiersParCircuit.get(newValue);
    if (circuitData?.circuit?.id) {
      loadCircuitEtapes(circuitData.circuit.id);
    }
  }, [dossiersParCircuit, loadCircuitEtapes]);

  // Obtenir les dossiers du type de demande sélectionné
  // S'assurer que selectedTypeDemandeTab est valide, sinon utiliser le premier circuit disponible
  const validSelectedTab = React.useMemo(() => {
    if (selectedTypeDemandeTab && dossiersParCircuit.has(selectedTypeDemandeTab)) {
      return selectedTypeDemandeTab;
    }
    if (dossiersParCircuit.size > 0) {
      const firstKey = Array.from(dossiersParCircuit.keys())[0];
      // Mettre à jour le state si nécessaire (mais pas dans le render, donc on retourne juste la valeur)
      return firstKey;
    }
    return '';
  }, [selectedTypeDemandeTab, dossiersParCircuit]);

  // Synchroniser validSelectedTab avec selectedTypeDemandeTab si différent
  React.useEffect(() => {
    if (validSelectedTab && validSelectedTab !== selectedTypeDemandeTab) {
      setSelectedTypeDemandeTab(validSelectedTab);
    }
  }, [validSelectedTab, selectedTypeDemandeTab]);

  const currentTypeDemandeData = validSelectedTab ? dossiersParCircuit.get(validSelectedTab) : null;

  return (
    <Box sx={{ p: 2 }}>
      {/* En-tête */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Réception des dossiers</Typography>
        <Button 
          onClick={() => refreshReceptionData()} 
          variant="outlined" 
          size="small"
          startIcon={<Refresh />}
        >
          Rafraîchir
        </Button>
      </Stack>

      {/* Cartes statistiques */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {statistics.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Reçus
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {statistics.recu}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                En attente
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {statistics.enAttente}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Validés
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {statistics.valide}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {dossiersPagination && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Reçus, en attente et validés : comptés sur la page courante. Le total correspond à l’ensemble des dossiers (API).
        </Typography>
      )}

      {/* Barre de recherche */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Rechercher par nom, prénom, référence ou auto-école..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            size="small"
          />
          {searchTerm.trim() && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {searchingAllPages
                ? 'Recherche en cours…'
                : `Résultats: ${(searchResults ?? []).length} dossier(s)`}
            </Typography>
          )}
        </CardContent>
      </Card>

      {!searchTerm.trim() && dossiersPagination && dossiersPagination.total > 0 && (
        <TablePagination
          component="div"
          count={dossiersPagination.total}
          page={Math.max(0, dossiersPagination.current_page - 1)}
          onPageChange={(_, newPage) => changeDossiersListPage(newPage + 1)}
          rowsPerPage={RECEPTION_DOSSIERS_PER_PAGE}
          onRowsPerPageChange={() => undefined}
          rowsPerPageOptions={[RECEPTION_DOSSIERS_PER_PAGE]}
          labelRowsPerPage="Dossiers par page"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 2,
            '& .MuiTablePagination-selectLabel': { display: 'none' },
            '& .MuiTablePagination-select': { display: 'none' },
            '& .MuiTablePagination-actions': { ml: 0 },
          }}
        />
      )}

      {/* Onglets pour chaque type de demande */}
      {loading ? (
        <MainContentSkeleton />
      ) : searchTerm.trim() && searchingAllPages ? (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              Recherche en cours…
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Merci de patienter, nous récupérons les dossiers correspondants à votre recherche.
            </Typography>
            <LinearProgress />
          </CardContent>
        </Card>
      ) : (
        <Box>
          {dossiersParCircuit.size > 0 ? (
            <>
              <Paper sx={{ mb: 3, borderRadius: 0 }}>
                <Tabs
                  value={validSelectedTab ?? ''}
                  onChange={handleTypeDemandeTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    borderRadius: 0,
                    '& .MuiTab-root': {
                      borderRadius: 0
                    },
                    '& .MuiTabs-indicator': {
                      borderRadius: 0
                    }
                  }}
                >
                  {Array.from(dossiersParCircuit.entries()).map(([circuitKey, { circuit, dossiers: dossiersDuCircuit }]) => (
                    <Tab
                      key={circuitKey}
                      label={`${circuit.libelle} (${dossiersDuCircuit.length})`}
                      value={circuitKey}
                      sx={{ borderRadius: 0 }}
                    />
                  ))}
                </Tabs>
              </Paper>

              {/* Affichage des dossiers du type de demande sélectionné */}
              {currentTypeDemandeData ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Typography variant="h5" fontWeight="bold">
                      {currentTypeDemandeData.circuit.libelle}
                    </Typography>
                    {currentTypeDemandeData.circuit.nom_entite && (
                      <Chip 
                        label={currentTypeDemandeData.circuit.nom_entite} 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                      />
                    )}
                    <Chip 
                      label={`${currentTypeDemandeData.dossiers.length} dossier(s)`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    {!currentTypeDemandeData.circuit.actif && (
                      <Chip 
                        label="Inactif" 
                        size="small" 
                        color="default" 
                        variant="outlined"
                      />
                    )}
                    {currentTypeDemandeData.circuit.etapes && currentTypeDemandeData.circuit.etapes.length > 0 && (
                      <Chip 
                        label={`${currentTypeDemandeData.circuit.etapes.length} étape(s)`} 
                        size="small" 
                        color="info" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                  {cache.isReady && cache.ReceptionDossierTypeTable ? (
                    <cache.ReceptionDossierTypeTable
                      dossiers={currentTypeDemandeData.dossiers}
                      typeDemandeName={currentTypeDemandeData.circuit.nom_entite || currentTypeDemandeData.circuit.libelle}
                      typeDemandeId={currentTypeDemandeData.circuit.id}
                      circuit={currentTypeDemandeData.circuit}
                      onReceive={handleReceive}
                      onOpenDocuments={handleOpenDocumentsDialog}
                    />
                  ) : (
                    <Suspense fallback={<ReceptionDossierTableSkeleton />}>
                      <ReceptionDossierTypeTableLazy
                        dossiers={currentTypeDemandeData.dossiers}
                        typeDemandeName={currentTypeDemandeData.circuit.nom_entite || currentTypeDemandeData.circuit.libelle}
                        typeDemandeId={currentTypeDemandeData.circuit.id}
                        circuit={currentTypeDemandeData.circuit}
                        onReceive={handleReceive}
                        onOpenDocuments={handleOpenDocumentsDialog}
                      />
                    </Suspense>
                  )}
                </Box>
              ) : (
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      Sélectionnez un type de demande pour afficher les dossiers.
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {dossiers.length === 0 
                    ? 'Aucun dossier trouvé. Cliquez sur "Rafraîchir" pour charger les dossiers.'
                    : 'Aucun dossier ne correspond aux filtres sélectionnés.'}
                </Typography>
                {dossiers.length > 0 && (
                  <Button 
                    variant="outlined" 
                    onClick={() => {
                      setSearchTerm('');
                    }}
                    sx={{ mt: 2 }}
                  >
                    Réinitialiser la recherche
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {(error || receiveError) && (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>{receiveError || error}</Typography>
      )}

      {/* Dialog pour les documents connexes */}
      <Dialog
        open={documentsDialogOpen}
        onClose={handleCloseDocumentsDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '70vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Documents connexes - {selectedDossierForDocuments?.candidatNom} {selectedDossierForDocuments?.candidatPrenom}
            </Typography>
            <IconButton onClick={handleCloseDocumentsDialog} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingCircuit ? (
            <CircuitEtapesViewSkeleton />
          ) : circuit ? (
            cache.isReady && cache.CircuitEtapesView ? (
              <cache.CircuitEtapesView
                circuit={circuit}
                dossierId={selectedDossierForDocuments?.id}
                onEtapeChange={(etape) => {
                  console.log('Étape changée:', etape);
                }}
              />
            ) : (
              <Suspense fallback={<CircuitEtapesViewSkeleton />}>
                <CircuitEtapesViewLazy
                  circuit={circuit}
                  dossierId={selectedDossierForDocuments?.id}
                  onEtapeChange={(etape) => {
                    console.log('Étape changée:', etape);
                  }}
                />
              </Suspense>
            )
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Aucun circuit trouvé pour ce dossier.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ReceptionDossiersPage;


