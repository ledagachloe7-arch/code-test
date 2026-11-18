import React from 'react';
import { FormControlLabel, FormLabel, Grid, Radio, RadioGroup, TextField, Typography } from '@mui/material';
import type { NumeroPermisParts, PermisFormatType } from '../../cnepc/forms/types';

interface Props {
  format: PermisFormatType;
  parts: NumeroPermisParts;
  onFormatChange: (f: PermisFormatType) => void;
  onPartsChange: (p: NumeroPermisParts) => void;
  /** Numéro complet construit (affiché en aperçu), vide si incomplet. */
  numeroComplet: string;
  disabled?: boolean;
}

export const PARTS_VIDES: NumeroPermisParts = { annee: '', province: '', categorie: '', numero: '' };

/**
 * Saisie structurée du numéro de permis, mêmes règles que le parcours « Nouvelle demande » :
 * - Format standard AAAA-P-C-NNNN : année (4 chiffres), province (1 à 9), catégorie (1 lettre), numéro (4 à 10 chiffres) ;
 * - Format PERM : numéro complet (ex. PERM-12345678).
 * Chaque case n'accepte que les caractères autorisés et une longueur fixe.
 */
const SaisieNumeroPermis: React.FC<Props> = ({ format, parts, onFormatChange, onPartsChange, numeroComplet, disabled }) => (
  <>
    <FormLabel component="legend" sx={{ mb: 0.5 }}>Format du numéro de permis</FormLabel>
    <RadioGroup row value={format} onChange={(e) => onFormatChange(e.target.value as PermisFormatType)} sx={{ mb: 2 }}>
      <FormControlLabel value="standard" control={<Radio />} label="Format standard (2024-1-A-1234)" disabled={disabled} />
      <FormControlLabel value="op" control={<Radio />} label="Format PERM (PERM-12345678)" disabled={disabled} />
    </RadioGroup>

    <Grid container spacing={2}>
      {format === 'standard' ? (
        <>
          <Grid item xs={6} sm={3}>
            <TextField fullWidth required label="Année d'obtention" placeholder="2024" helperText="4 chiffres"
              value={parts.annee} disabled={disabled} inputProps={{ maxLength: 4, inputMode: 'numeric' }}
              onChange={(e) => onPartsChange({ ...parts, annee: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth required label="Province" placeholder="1" helperText="1 à 9"
              value={parts.province} disabled={disabled} inputProps={{ maxLength: 1, inputMode: 'numeric' }}
              onChange={(e) => onPartsChange({ ...parts, province: e.target.value.replace(/[^1-9]/g, '').slice(0, 1) })} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth required label="Catégorie" placeholder="A" helperText="1 lettre"
              value={parts.categorie} disabled={disabled} inputProps={{ maxLength: 1 }}
              onChange={(e) => onPartsChange({ ...parts, categorie: e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 1) })} />
          </Grid>
          <Grid item xs={6} sm={5}>
            <TextField fullWidth required label="Numéro" placeholder="1234" helperText="Minimum 4 chiffres"
              value={parts.numero} disabled={disabled} inputProps={{ minLength: 4, maxLength: 10, inputMode: 'numeric' }}
              onChange={(e) => onPartsChange({ ...parts, numero: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
          </Grid>
        </>
      ) : (
        <Grid item xs={12} sm={6}>
          <TextField fullWidth required label="Numéro de permis complet" placeholder="PERM-12345678"
            helperText="Saisissez le numéro complet exact (ex : PERM-12345678)"
            value={parts.numero} disabled={disabled} inputProps={{ maxLength: 30 }}
            onChange={(e) => onPartsChange({ ...parts, numero: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })} />
        </Grid>
      )}
    </Grid>

    <Typography variant="body2" sx={{ mt: 1.5 }} color={numeroComplet ? 'text.primary' : 'text.secondary'}>
      Numéro recherché : <strong>{numeroComplet || '— (compléter les champs)'}</strong>
    </Typography>
  </>
);

export default SaisieNumeroPermis;
