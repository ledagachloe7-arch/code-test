import React from 'react';
import {
  Grid,
  Typography,
  Paper,
  Button,
  Box,
  Divider,
  Alert,
} from '@mui/material';
import { CheckCircle, Person, Edit, Search } from '@mui/icons-material';

interface CandidatRecapStepProps {
  candidat: any;
  loading: boolean;
  onConfirm: () => void;
  onRefineSearch: () => void;
  onCreateNew: () => void;
}

export const CandidatRecapStep: React.FC<CandidatRecapStepProps> = ({
  candidat,
  loading,
  onConfirm,
  onRefineSearch,
  onCreateNew,
}) => {
  if (!candidat) return null;

  const personne = candidat.personne || {};

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold">
          Candidat trouvé dans la base de données
        </Typography>
        <Typography variant="body2">
          Veuillez vérifier que les informations ci-dessous correspondent bien au candidat concerné.
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Person color="primary" />
          <Typography variant="h6">
            Récapitulatif du candidat
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Informations personnelles
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Nom complet
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {personne.nom} {personne.prenom}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Numéro candidat
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {candidat.numero_candidat}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {personne.email || 'Non renseigné'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Contact
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {personne.contact || 'Non renseigné'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Téléphone
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {personne.telephone || 'Non renseigné'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Adresse
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {personne.adresse || 'Non renseigné'}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Informations du candidat
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Date de naissance
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {candidat.date_naissance ? new Date(candidat.date_naissance).toLocaleDateString('fr-FR') : 'Non renseigné'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Lieu de naissance
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {candidat.lieu_naissance || 'Non renseigné'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              NIP
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {candidat.nip || 'Non renseigné'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Type de pièce
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {candidat.type_piece || 'Non renseigné'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Numéro de pièce
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {candidat.numero_piece || 'Non renseigné'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Nationalité
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {candidat.nationalite || 'Non renseigné'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Genre
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {candidat.genre === 'M' ? 'Masculin' : candidat.genre === 'F' ? 'Féminin' : 'Non renseigné'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={onCreateNew}
          disabled={loading}
        >
          Créer un nouveau candidat
        </Button>
        <Button
          variant="contained"
          startIcon={<CheckCircle />}
          onClick={onConfirm}
          disabled={loading}
        >
          Confirmer - C'est bien ce candidat
        </Button>
      </Box>
    </Box>
  );
};

