import React from 'react';
import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';

interface SubmitActionBarProps {
  canSubmit: boolean;
  /** Ouvert depuis Mes dossiers / réclamation avec `dossier_id` : mise à jour possible. */
  isEditingExistingDossier: boolean;
  dossierLockedAfterCreation: boolean;
  completedCount: number;
  createdDossierId: string;
  typeDemandeName: string;
  isNouveauPermis: boolean;
  numeroPermis: string;
  submitting: boolean;
  navyColor: string;
  onReset: () => void;
  onSubmit: () => void;
}

const SubmitActionBar: React.FC<SubmitActionBarProps> = ({
  canSubmit,
  isEditingExistingDossier,
  dossierLockedAfterCreation,
  completedCount,
  createdDossierId,
  typeDemandeName,
  isNouveauPermis,
  numeroPermis,
  submitting,
  navyColor,
  onReset,
  onSubmit,
}) => (
  <Paper
    variant="outlined"
    sx={{
      mt: 3,
      p: 2.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
      flexWrap: 'wrap',
      bgcolor: canSubmit ? 'success.50' : alpha('#1976d2', 0.04),
      borderColor: canSubmit ? 'success.main' : alpha(navyColor, 0.2),
      transition: 'all .2s',
      boxShadow: canSubmit ? undefined : `0 2px 12px ${alpha(navyColor, 0.06)}`,
    }}
  >
    <Box>
      <Typography variant="subtitle2" fontWeight={600}>
        {dossierLockedAfterCreation
          ? 'Dossier déjà créé'
          : isEditingExistingDossier
            ? canSubmit
              ? 'Prêt à enregistrer les modifications'
              : `Sections manquantes : ${3 - completedCount}`
            : canSubmit
              ? 'Prêt à soumettre'
              : `Sections manquantes : ${3 - completedCount}`}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {dossierLockedAfterCreation
          ? `Dossier ${createdDossierId} en cours de traitement.`
          : isEditingExistingDossier
            ? canSubmit
              ? `Dossier ${createdDossierId} — ${typeDemandeName}`
              : 'Complétez toutes les sections obligatoires.'
            : canSubmit
              ? `${typeDemandeName} · ${isNouveauPermis ? 'Nouveau permis' : numeroPermis}`
              : 'Complétez toutes les sections obligatoires.'}
      </Typography>
    </Box>
    <Stack direction="row" spacing={1.5}>
      <Button variant="outlined" color="inherit" disabled={submitting} onClick={onReset}>
        Réinitialiser
      </Button>
      <Button
        variant="contained"
        size="large"
        disabled={!canSubmit}
        onClick={onSubmit}
        startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <DocumentPlusIcon style={{ width: 18 }} />}
      >
        {dossierLockedAfterCreation
          ? 'Dossier déjà créé'
          : submitting
            ? isEditingExistingDossier
              ? 'Mise à jour…'
              : 'Création…'
            : isEditingExistingDossier
              ? 'Mettre à jour'
              : 'Créer le dossier'}
      </Button>
    </Stack>
  </Paper>
);

export default SubmitActionBar;

