import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { CandidatFormData, Candidat, autoEcoleService } from '../services';

interface CandidatFormProps {
  candidat?: Candidat;
  onSuccess: (candidat: Candidat) => void;
  onCancel: () => void;
  open: boolean;
}

const CandidatForm: React.FC<CandidatFormProps> = ({
  candidat,
  onSuccess,
  onCancel,
  open,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CandidatFormData>({
    defaultValues: {
      personne_id: '',
      numero_candidat: '',
      date_naissance: '',
      lieu_naissance: '',
      nip: '',
      type_piece: 'CNI',
      numero_piece: '',
      nationalite: 'Sénégalaise',
      genre: 'M',
    },
  });

  // Réinitialiser le formulaire quand le candidat change
  useEffect(() => {
    if (candidat) {
      reset({
        personne_id: candidat.personne_id,
        numero_candidat: candidat.numero_candidat,
        date_naissance: candidat.date_naissance,
        lieu_naissance: candidat.lieu_naissance,
        nip: candidat.nip,
        type_piece: candidat.type_piece,
        numero_piece: candidat.numero_piece,
        nationalite: candidat.nationalite,
        genre: candidat.genre,
      });
    } else {
      reset({
        personne_id: '',
        numero_candidat: '',
        date_naissance: '',
        lieu_naissance: '',
        nip: '',
        type_piece: 'CNI',
        numero_piece: '',
        nationalite: 'Sénégalaise',
        genre: 'M',
      });
    }
  }, [candidat, reset]);

  const onSubmit = async (data: CandidatFormData) => {
    setLoading(true);
    setError(null);

    try {
      let response;
      if (candidat) {
        // Mise à jour
        response = await autoEcoleService.updateCandidat(candidat.id, data);
      } else {
        // Création
        response = await autoEcoleService.createCandidat(data);
      }

      if (response.success) {
        onSuccess(response.data);
      } else {
        setError(response.message || 'Une erreur est survenue');
      }
    } catch (err: any) {
      console.error('Erreur lors de la soumission:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Une erreur est survenue lors de la sauvegarde'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {candidat ? 'Modifier le candidat' : 'Créer un candidat'}
      </DialogTitle>
      
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="numero_candidat"
                control={control}
                rules={{ required: 'Le numéro candidat est requis' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Numéro candidat"
                    fullWidth
                    error={!!errors.numero_candidat}
                    helperText={errors.numero_candidat?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="personne_id"
                control={control}
                rules={{ required: 'L\'ID de la personne est requis' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="ID de la personne"
                    fullWidth
                    error={!!errors.personne_id}
                    helperText={errors.personne_id?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="date_naissance"
                control={control}
                rules={{ required: 'La date de naissance est requise' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date de naissance"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.date_naissance}
                    helperText={errors.date_naissance?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="lieu_naissance"
                control={control}
                rules={{ required: 'Le lieu de naissance est requis' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Lieu de naissance"
                    fullWidth
                    error={!!errors.lieu_naissance}
                    helperText={errors.lieu_naissance?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="nip"
                control={control}
                rules={{ required: 'Le NIP est requis' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="NIP"
                    fullWidth
                    error={!!errors.nip}
                    helperText={errors.nip?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="nationalite"
                control={control}
                rules={{ required: 'La nationalité est requise' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nationalité"
                    fullWidth
                    error={!!errors.nationalite}
                    helperText={errors.nationalite?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="type_piece"
                control={control}
                rules={{ required: 'Le type de pièce est requis' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.type_piece}>
                    <InputLabel>Type de pièce</InputLabel>
                    <Select
                      {...field}
                      label="Type de pièce"
                    >
                      <MenuItem value="CNI">CNI</MenuItem>
                      <MenuItem value="Passeport">Passeport</MenuItem>
                      <MenuItem value="Permis">Permis de conduire</MenuItem>
                    </Select>
                    {errors.type_piece && (
                      <Typography variant="caption" color="error">
                        {errors.type_piece.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="numero_piece"
                control={control}
                rules={{ required: 'Le numéro de pièce est requis' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Numéro de pièce"
                    fullWidth
                    error={!!errors.numero_piece}
                    helperText={errors.numero_piece?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="genre"
                control={control}
                rules={{ required: 'Le genre est requis' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.genre}>
                    <InputLabel>Genre</InputLabel>
                    <Select
                      {...field}
                      label="Genre"
                    >
                      <MenuItem value="M">Masculin</MenuItem>
                      <MenuItem value="F">Féminin</MenuItem>
                    </Select>
                    {errors.genre && (
                      <Typography variant="caption" color="error">
                        {errors.genre.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Sauvegarde...' : (candidat ? 'Modifier' : 'Créer')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CandidatForm;
