import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { gestionDossierService } from '../services';
import { Dossier } from '../types/auto-ecole';
import { useUsagerDossierData } from './UsagerDossierPage/hooks/useUsagerDossierData';
import { DossierList, DocumentsList } from './UsagerDossierPage/components';
import { getStatutLabel, getStatutColor } from './UsagerDossierPage/utils';

const UsagerDossierPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: initialId } = useParams<{ id: string }>();
  const location = useLocation();
  const [selectedDossierId, setSelectedDossierId] = useState<string | undefined>(initialId);
  const [dossier, setDossier] = useState<Dossier | null>(location.state?.dossier || null);
  const [loading, setLoading] = useState(!dossier);
  const [error, setError] = useState<string | null>(null);
  const [closingDossier, setClosingDossier] = useState(false);

  const {
    candidatDossiers,
    allCandidatDocuments,
    piecesJustificativesMap,
    loadingDossiers,
    referentielsCache,
    typeDemandeCache,
    dossierStatusCache,
  } = useUsagerDossierData(dossier);

  // Synchroniser selectedDossierId avec l'ID initial de l'URL
  useEffect(() => {
    if (initialId) {
      setSelectedDossierId(initialId);
    }
  }, [initialId]);

  // Charger le dossier actuel uniquement au montage initial
  useEffect(() => {
    const loadDossier = async () => {
      const dossierIdToLoad = initialId;
      if (!dossierIdToLoad) {
        setError('ID du dossier manquant');
        setLoading(false);
        return;
      }

      // Si on a déjà le dossier depuis location.state, ne pas recharger
      if (dossier && dossier.id === dossierIdToLoad) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const loadedDossier = await gestionDossierService.getDossierById(dossierIdToLoad);
        setDossier(loadedDossier);
      } catch (err: any) {
        console.error('Erreur lors du chargement du dossier:', err);
        setError(err.response?.data?.message || 'Erreur lors du chargement du dossier');
      } finally {
        setLoading(false);
      }
    };

    // Charger uniquement si on n'a pas de dossier initial
    if (!dossier && initialId) {
      loadDossier();
    } else if (dossier) {
      setLoading(false);
    }
  }, [initialId]); // Ne dépendre que de initialId, pas de selectedDossierId

  const getCalculatedStatut = (d: Dossier): string => {
    return dossierStatusCache.get(d.id) || d.statut || 'en_attente';
  };

  /** Ferme le dossier (déverrouille) puis navigue vers la liste. */
  const handleCloseAndGoBack = useCallback(async () => {
    const dossierId = dossier?.id || initialId;
    setClosingDossier(true);
    try {
      if (dossierId) {
        await gestionDossierService.closeDossier(dossierId);
      }
    } catch (err: any) {
      console.error('Erreur lors de la fermeture du dossier:', err);
      setError(err?.message || err?.response?.data?.message || 'Impossible de fermer le dossier.');
    } finally {
      setClosingDossier(false);
      navigate('/gestion-dossier');
    }
  }, [dossier?.id, initialId, navigate]);

  const handleDossierClick = React.useCallback(async (dossierId: string) => {
    if (dossierId === selectedDossierId) return;
    
    // Trouver le dossier dans la liste déjà chargée
    const clickedDossier = candidatDossiers.find(d => d.id === dossierId);
    
    if (clickedDossier) {
      setDossier(clickedDossier);
    }
    
    // Mettre à jour l'ID sélectionné immédiatement pour l'effet visuel
    setSelectedDossierId(dossierId);
    
    // Mettre à jour l'URL sans recharger la page
    window.history.pushState({}, '', `/cnepc/dossiers/${dossierId}`);
  }, [candidatDossiers, selectedDossierId, typeDemandeCache]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', width: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !dossier) {
    return (
      <Box sx={{ width: '100%', p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Dossier non trouvé'}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={handleCloseAndGoBack} disabled={closingDossier}>
          Retour à la liste
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 0, borderColor: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBack />} onClick={handleCloseAndGoBack} disabled={closingDossier}>
            Retour
          </Button>
        </Box>
        <Chip
          label={getStatutLabel(getCalculatedStatut(dossier))}
          color={getStatutColor(getCalculatedStatut(dossier)) as any}
          size="medium"
        />
      </Box>

      {/* Contenu principal en 3 colonnes */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Bloc gauche - Informations personnelles et candidat 
        <Paper
          sx={{
            width: 250,
            minWidth: 250,
            height: '70%',
            overflowY: 'auto',
            borderRight: 0,
            borderColor: 'none',
            borderRadius: 0,
            p: 2,
            backgroundColor: 'transparent',
          }}
          elevation={5}
        >
          <PersonalInfoCard dossier={dossier} />
        </Paper>
*/}
        {/* Bloc centre - Liste de dossiers */}
        <DossierList
          candidatDossiers={candidatDossiers}
          selectedDossierId={selectedDossierId}
          initialId={initialId}
          loadingDossiers={loadingDossiers}
          referentielsCache={referentielsCache}
          typeDemandeCache={typeDemandeCache}
          dossierStatusCache={dossierStatusCache}
          onDossierClick={handleDossierClick}
        />

        {/* Bloc droite - Documents du dossier sélectionné */}
        <DocumentsList
          documents={allCandidatDocuments}
          piecesJustificativesMap={piecesJustificativesMap}
          candidatDossiers={candidatDossiers}
          selectedDossierId={selectedDossierId}
          initialId={initialId}
          loadingDossiers={loadingDossiers}
          referentielsCache={referentielsCache}
          typeDemandeCache={typeDemandeCache}
        />
      </Box>
    </Box>
  );
};

export default UsagerDossierPage;
