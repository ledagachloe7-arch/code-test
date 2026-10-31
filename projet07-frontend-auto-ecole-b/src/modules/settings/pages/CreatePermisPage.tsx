import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { createPermis, CreatePermisPayload } from '../services/permisManagementService';

type FormState = {
  numero_identite: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  nationalite: string;
  date_naissance: string;
  lieu_naissance: string;
  numero_permis: string;
  type_permis: string;
  categorie: string;
  date_obtention: string;
  lieu_obtention: string;
  date_validite: string;
  numero_origine_permis: string;
  lieu_origine: string;
  date_renou1: string;
  date_renou2: string;
  date_renou3: string;
};

const initialForm: FormState = {
  numero_identite: '',
  nom: '',
  prenom: '',
  sexe: 'M',
  nationalite: 'GABONAISE',
  date_naissance: '',
  lieu_naissance: '',
  numero_permis: '',
  type_permis: 'PERMIS ROSE',
  categorie: 'B',
  date_obtention: '',
  lieu_obtention: '',
  date_validite: '',
  numero_origine_permis: '',
  lieu_origine: '',
  date_renou1: '',
  date_renou2: '',
  date_renou3: '',
};

const requiredFields: Array<keyof FormState> = [
  'nom',
  'prenom',
  'sexe',
  'nationalite',
  'lieu_naissance',
  'numero_permis',
  'type_permis',
  'categorie',
  'lieu_obtention',
];

const CreatePermisPage: React.FC = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const missingRequired = useMemo(
    () => requiredFields.filter((field) => !String(form[field] ?? '').trim()),
    [form]
  );

  const onChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const toNullable = (value: string): string | null => (value.trim() ? value.trim() : null);

  const buildPayload = (): CreatePermisPayload => ({
    numero_identite: toNullable(form.numero_identite),
    nom: form.nom.trim().toUpperCase(),
    prenom: form.prenom.trim().toUpperCase(),
    sexe: form.sexe,
    nationalite: form.nationalite.trim().toUpperCase(),
    date_naissance: toNullable(form.date_naissance),
    lieu_naissance: form.lieu_naissance.trim().toUpperCase(),
    numero_permis: form.numero_permis.trim().toUpperCase(),
    type_permis: form.type_permis.trim().toUpperCase(),
    categorie: form.categorie.trim().toUpperCase(),
    date_obtention: toNullable(form.date_obtention),
    lieu_obtention: form.lieu_obtention.trim().toUpperCase(),
    date_validite: toNullable(form.date_validite),
    numero_origine_permis: form.numero_origine_permis.trim(),
    lieu_origine: form.lieu_origine.trim().toUpperCase(),
    date_renou1: toNullable(form.date_renou1),
    date_renou2: toNullable(form.date_renou2),
    date_renou3: toNullable(form.date_renou3),
  });

  const handleSubmit = async () => {
    if (missingRequired.length > 0) {
      setError('Veuillez renseigner tous les champs obligatoires avant de valider.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createPermis(buildPayload());
      setSuccess('Permis ajouté avec succès.');
      setForm(initialForm);
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      setError(apiMessage || "Erreur lors de l'ajout du permis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Ajouter un permis
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Création d&apos;un permis via l&apos;endpoint `/create`.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Nom *" value={form.nom} onChange={(e) => onChange('nom', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Prénom *" value={form.prenom} onChange={(e) => onChange('prenom', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select label="Sexe *" value={form.sexe} onChange={(e) => onChange('sexe', e.target.value)} fullWidth>
              <MenuItem value="M">M</MenuItem>
              <MenuItem value="F">F</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Nationalité *" value={form.nationalite} onChange={(e) => onChange('nationalite', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Numéro d'identité" value={form.numero_identite} onChange={(e) => onChange('numero_identite', e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="Date de naissance" type="date" value={form.date_naissance} onChange={(e) => onChange('date_naissance', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Lieu de naissance *" value={form.lieu_naissance} onChange={(e) => onChange('lieu_naissance', e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="Numéro permis *" value={form.numero_permis} onChange={(e) => onChange('numero_permis', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField label="Type permis *" value={form.type_permis} onChange={(e) => onChange('type_permis', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField label="Catégorie *" value={form.categorie} onChange={(e) => onChange('categorie', e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="Date d'obtention" type="date" value={form.date_obtention} onChange={(e) => onChange('date_obtention', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Lieu d'obtention *" value={form.lieu_obtention} onChange={(e) => onChange('lieu_obtention', e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="Date validité" type="date" value={form.date_validite} onChange={(e) => onChange('date_validite', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Numéro permis d'origine" value={form.numero_origine_permis} onChange={(e) => onChange('numero_origine_permis', e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12}>
            <TextField label="Lieu d'origine" value={form.lieu_origine} onChange={(e) => onChange('lieu_origine', e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField label="Date renouvellement 1" type="date" value={form.date_renou1} onChange={(e) => onChange('date_renou1', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Date renouvellement 2" type="date" value={form.date_renou2} onChange={(e) => onChange('date_renou2', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Date renouvellement 3" type="date" value={form.date_renou3} onChange={(e) => onChange('date_renou3', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer le permis'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default CreatePermisPage;

