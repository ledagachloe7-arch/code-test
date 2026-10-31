import React from 'react';
import { Grid, Typography, TextField, Box, Paper, Divider } from '@mui/material';
import { PermisData, FormationData } from '../types';
import { Referentiel } from '../../services';

interface DossierInfoStepProps {
  permisData: PermisData;
  formationData: FormationData;
  referentiels: Referentiel[];
  loading: boolean;
}

export const DossierInfoStep: React.FC<DossierInfoStepProps> = ({
  permisData,
  formationData,
  referentiels,
  loading,
}) => {
  // Trouver le libellé du référentiel
  const referentielTrouve = referentiels.find(
    (ref) => ref.id === formationData.referenciel_id
  );
  const referentielLibelle = referentielTrouve 
    ? `${referentielTrouve.libelle} (${referentielTrouve.code})`
    : formationData.referenciel_id || 'Non défini';

  // Formater les dates pour l'affichage
  const formatDateForDisplay = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Non renseigné';
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch (e) {
      console.warn('⚠️ Erreur lors du formatage de la date:', dateStr, e);
    }
    return dateStr;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Informations du permis récupéré
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Les informations suivantes ont été récupérées depuis le système. Vérifiez-les avant de continuer.
      </Typography>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Informations du permis
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Numéro de permis"
              value={permisData.numero_permis || 'Non renseigné'}
              fullWidth
              disabled
              variant="outlined"
              sx={{
                '& .MuiInputBase-input': {
                  fontWeight: 'medium',
                  color: 'text.primary'
                }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Numéro de permis d'origine"
              value={permisData.numero_origine_permis || 'Non renseigné'}
              fullWidth
              disabled
              variant="outlined"
              sx={{
                '& .MuiInputBase-input': {
                  fontWeight: 'medium',
                  color: 'text.primary'
                }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Lieu d'obtention du permis"
              value={permisData.lieu_de_dobtention_du_permis || 'Non renseigné'}
              fullWidth
              disabled
              variant="outlined"
              sx={{
                '& .MuiInputBase-input': {
                  fontWeight: 'medium',
                  color: 'text.primary'
                }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Référentiel (Catégorie du permis)"
              value={referentielLibelle}
              fullWidth
              disabled
              variant="outlined"
              sx={{
                '& .MuiInputBase-input': {
                  fontWeight: 'medium',
                  color: 'text.primary'
                }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Date d'obtention du permis"
              value={formatDateForDisplay(permisData.date_de_dobtention_du_permis)}
              fullWidth
              disabled
              variant="outlined"
              sx={{
                '& .MuiInputBase-input': {
                  fontWeight: 'medium',
                  color: 'text.primary'
                }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Date de délivrance du permis"
              value={formatDateForDisplay(permisData.date_de_delivrance_du_permis)}
              fullWidth
              disabled
              variant="outlined"
              sx={{
                '& .MuiInputBase-input': {
                  fontWeight: 'medium',
                  color: 'text.primary'
                }
              }}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

