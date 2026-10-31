import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert
} from '@mui/material';
import DemandesInscriptionTable from '../tables/DemandesInscriptionTable';
import type { AutoEcole } from '../../cnepc/types/auto-ecole';
import { authService } from '../../auth/services/authService';
import { DemandeInscription } from '../types/inscription';
import { ROUTES } from '../../../shared/constants';

const DemandesInscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [autoEcole, setAutoEcole] = useState<AutoEcole | null>(null);
  const [loadingAutoEcole, setLoadingAutoEcole] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);

  const handleCandidatSelect = (candidat: DemandeInscription) => {
    // Naviguer vers la page de détails au lieu d'ouvrir un sheet
    navigate(ROUTES.DEMANDE_DETAILS.replace(':id', candidat.id));
  };

  const handleDeleteSuccess = () => {
    console.log('Demande supprimée avec succès');
    // Rafraîchir la liste des demandes pour supprimer la demande supprimée
    setRefreshTrigger(prev => prev + 1);
  };

  // Charger l'auto-école du responsable connecté (nécessaire pour le formulaire)
  useEffect(() => {
    const loadAutoEcole = async () => {
      try {
        setLoadingAutoEcole(true);
        // 1) Essayer via les infos déjà stockées au login
        const cached = localStorage.getItem('auto_ecole_info');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.id) {
              setAutoEcole(parsed as any);
              return;
            }
          } catch { /* ignore parse error */ }
        }

        // 2) Sinon, récupérer via /auth/me puis rechercher par personne.id
        const token = localStorage.getItem('access_token') || '';
        if (!token) return;
        const me = await authService.getCurrentUser(token);
        const responsablePersonneId = me?.user?.personne?.id;
        if (!responsablePersonneId) return;
        const resp = await authService.findAutoEcoleByResponsableId(responsablePersonneId, token);
        if (resp && resp.data) {
          setAutoEcole(resp.data as any);
        }
      } catch (_e) {
        // noop: l'utilisateur peut ne pas être un responsable auto-école
      } finally {
        setLoadingAutoEcole(false);
      }
    };
    loadAutoEcole();
  }, []);

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'gray-100' }}>
      <Typography variant="h5" component="h1" gutterBottom className="font-display" sx={{ px: 2, pt: 2, pb: 0.5 }}>
        Demandes d'inscriptions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, px: 2 }} className="font-primary">
        Gestion des demandes d'inscription des élèves
      </Typography>

      {/* Bouton pour ouvrir le formulaire d'inscription (même que CNEPC) */}
      <Box sx={{ px: 2, pb: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {uiError && (
          <Alert severity="warning" sx={{ mr: 2 }} onClose={() => setUiError(null)}>
            {uiError}
          </Alert>
        )}
        <Button
          variant="contained"
          onClick={() => {
            if (!autoEcole) {
              setUiError('Aucune auto-école associée à votre compte.');
              return;
            }
            setUiError(null);
            navigate(ROUTES.INSCRIPTION_FORMATION.replace(':autoEcoleId', autoEcole.id));
          }}
        >
          Inscrire un candidat
        </Button>
      </Box>

      <DemandesInscriptionTable 
        onCandidatSelect={handleCandidatSelect} 
        refreshTrigger={refreshTrigger}
        onDelete={handleDeleteSuccess}
      />
    </Box>
  );
};

export default DemandesInscriptionPage;
