import React, { useCallback } from 'react';
import { Grid, Typography, TextField, Divider, FormControl, InputLabel, Select, MenuItem, Button, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { PersonAdd, ArrowBack } from '@mui/icons-material';
import { CandidatData } from '../types';
import { NIP_REGEX } from '../validation';

/** Saisie masquée XX-XXXX-XXXXXXXX : 2 premiers caractères (chiffre+lettre ou 2 chiffres), puis uniquement des chiffres. */
function formatNipMaskedInput(raw: string): string {
  const upper = raw.toUpperCase();
  let body = '';
  for (const c of upper) {
    if (c === '-') continue;
    if (body.length === 0) {
      if (/\d/.test(c)) body += c;
    } else if (body.length === 1) {
      if (/[\dA-Z]/.test(c)) body += c;
    } else if (body.length < 14) {
      if (/\d/.test(c)) body += c;
    }
  }
  if (body.length <= 2) return body;
  if (body.length <= 6) return `${body.slice(0, 2)}-${body.slice(2)}`;
  return `${body.slice(0, 2)}-${body.slice(2, 6)}-${body.slice(6, 14)}`;
}

export interface CandidatFormStepProps {
  candidatData: CandidatData;
  loading: boolean;
  onCandidatDataChange: (data: CandidatData) => void;
  onCreateCandidat: () => Promise<void>;
  onBack?: () => void;
  error?: string | null;
}

export const CandidatFormStep: React.FC<CandidatFormStepProps> = ({
  candidatData,
  loading,
  onCandidatDataChange,
  onCreateCandidat,
  onBack,
  error,
}) => {
  const handleNipChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onCandidatDataChange({ ...candidatData, nip: formatNipMaskedInput(e.target.value) });
    },
    [candidatData, onCandidatDataChange]
  );

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="subtitle2" color="primary" gutterBottom>
          Informations de naissance
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Date de naissance"
          type="date"
          value={candidatData.date_naissance}
          onChange={(e) => onCandidatDataChange({ ...candidatData, date_naissance: e.target.value })}
          fullWidth
          required
          disabled={loading}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Lieu de naissance"
          value={candidatData.lieu_naissance}
          onChange={(e) => onCandidatDataChange({ ...candidatData, lieu_naissance: e.target.value })}
          fullWidth
          required
          disabled={loading}
        />
      </Grid>
      <Grid item xs={12}>
        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle2" color="primary" gutterBottom>
          Identification
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="NIP (Numéro d'Identification Personnel)"
          value={candidatData.nip}
          onChange={handleNipChange}
          fullWidth
          disabled={loading}
          placeholder="2B-0000-00000000 ou 00-0000-00000000"
          inputProps={{ pattern: NIP_REGEX.source, maxLength: 16, inputMode: 'text', autoComplete: 'off' }}
          helperText="Formats : 2B-0000-00000000 ou 00-0000-00000000 (exemples fictifs, tirets insérés automatiquement)."
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Type de pièce</InputLabel>
          <Select
            value={candidatData.type_piece}
            onChange={(e) => onCandidatDataChange({ ...candidatData, type_piece: e.target.value })}
            label="Type de pièce"
            disabled={loading}
          >
            <MenuItem value="Passeport">Passeport</MenuItem>
            <MenuItem value="CNI">Carte d'identité</MenuItem>
            <MenuItem value="Carte_sejour">Carte de séjour</MenuItem>
            <MenuItem value="Carte_resident">Carte de résident</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Numéro de pièce"
          value={candidatData.numero_piece}
          onChange={(e) => onCandidatDataChange({ ...candidatData, numero_piece: e.target.value })}
          fullWidth
          required
          disabled={loading}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Nationalité"
          value={candidatData.nationalite}
          onChange={(e) => onCandidatDataChange({ ...candidatData, nationalite: e.target.value })}
          fullWidth
          required
          disabled={loading}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} component="label">
          Genre
        </Typography>
        <ToggleButtonGroup
          value={candidatData.genre}
          exclusive
          onChange={(_e, value: string | null) => value != null && onCandidatDataChange({ ...candidatData, genre: value })}
          disabled={loading}
          fullWidth
          sx={{
            '& .MuiToggleButtonGroup-grouped': { border: '1px solid', borderColor: '#e0e0e0' },
            '& .MuiToggleButton-root': {
              py: 1.25,
              textTransform: 'none',
              color: '#757575',
              '&.Mui-selected': { bgcolor: '#1976d2', color: '#fff', '&:hover': { bgcolor: '#1565c0' } },
            },
          }}
        >
          <ToggleButton value="M">Masculin</ToggleButton>
          <ToggleButton value="F">Féminin</ToggleButton>
        </ToggleButtonGroup>
      </Grid>
      {error && (
        <Grid item xs={12}>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        </Grid>
      )}
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          {onBack && (
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={onBack} disabled={loading} sx={{ borderColor: '#9e9e9e', color: '#616161' }}>
              Retour
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={onCreateCandidat}
            disabled={loading}
            size="large"
            sx={{ ml: onBack ? 'auto' : 0, bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
          >
            {loading ? 'Création...' : 'Enregistrer & Suivant'}
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
};

