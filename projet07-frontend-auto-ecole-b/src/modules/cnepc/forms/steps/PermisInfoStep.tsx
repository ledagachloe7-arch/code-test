import React from 'react';
import { Grid, Typography, TextField } from '@mui/material';
import { PermisData } from '../types';

interface PermisInfoStepProps {
  permisData: PermisData;
  numeroPermis: string;
  loading: boolean;
  onPermisDataChange: (data: PermisData) => void;
}

export const PermisInfoStep: React.FC<PermisInfoStepProps> = ({
  permisData,
  numeroPermis,
  loading,
  onPermisDataChange,
}) => {

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="subtitle2" color="primary" gutterBottom>
          Informations du permis
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Veuillez remplir les informations concernant le permis du candidat.
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Numéro de permis"
          value={permisData.numero_permis || numeroPermis}
          onChange={(e) => onPermisDataChange({ ...permisData, numero_permis: e.target.value })}
          fullWidth
          required
          disabled={loading}
           
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Lieu d'obtention du permis"
          value={permisData.lieu_de_dobtention_du_permis}
          onChange={(e) => onPermisDataChange({ ...permisData, lieu_de_dobtention_du_permis: e.target.value })}
          fullWidth
          required
          disabled={loading}
          placeholder="Ex: Dakar, Sénégal"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Date d'obtention du permis"
          type="date"
          value={permisData.date_de_dobtention_du_permis}
          onChange={(e) => onPermisDataChange({ ...permisData, date_de_dobtention_du_permis: e.target.value })}
          fullWidth
          required
          disabled={loading}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Date de délivrance du permis"
          type="date"
          value={permisData.date_de_delivrance_du_permis}
          onChange={(e) => onPermisDataChange({ ...permisData, date_de_delivrance_du_permis: e.target.value })}
          fullWidth
          required
          disabled={loading}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
    </Grid>
  );
};

