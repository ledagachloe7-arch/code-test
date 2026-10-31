import React, { useState } from 'react';
import {
  Box,
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
import { userService } from '../services';
import type { UserFormData } from '../services/user.service';

interface UserFormProps {
  onSuccess: (user: any) => void;
  onCancel: () => void;
  open: boolean;
}

const UserForm: React.FC<UserFormProps> = ({
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
  } = useForm<UserFormData>({
    defaultValues: {
      email: '',
      password: '',
      password_confirmation: '',
      nom: '',
      prenom: '',
      contact: '',
      telephone: '',
      adresse: '',
      role: 'ROLE_AUTO_ECOLE',
    },
  });

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    setError(null);

    console.log('👤 Création d\'un utilisateur responsable:', data);

    try {
      const response = await userService.createUser(data);
      
      if (response.success) {
        console.log('✅ Utilisateur créé avec succès:', response);
        onSuccess(response.user);
      } else {
        setError(response.message || 'Une erreur est survenue');
      }
    } catch (err: any) {
      console.error('💥 Erreur lors de la création:', err);
      setError(err.message || 'Une erreur est survenue lors de la création');
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
        Créer un responsable d'auto-école
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
                name="nom"
                control={control}
                rules={{ required: 'Le nom est requis' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nom"
                    fullWidth
                    error={!!errors.nom}
                    helperText={errors.nom?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="prenom"
                control={control}
                rules={{ required: 'Le prénom est requis' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Prénom"
                    fullWidth
                    error={!!errors.prenom}
                    helperText={errors.prenom?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                rules={{ 
                  required: 'L\'email est requis',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email invalide'
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    type="email"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="contact"
                control={control}
                rules={{ required: 'Le contact est requis' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Contact"
                    fullWidth
                    error={!!errors.contact}
                    helperText={errors.contact?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="telephone"
                control={control}
                rules={{ required: 'Le téléphone est requis' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Téléphone"
                    fullWidth
                    error={!!errors.telephone}
                    helperText={errors.telephone?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="adresse"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Adresse"
                    fullWidth
                    multiline
                    rows={2}
                    error={!!errors.adresse}
                    helperText={errors.adresse?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="password"
                control={control}
                rules={{ 
                  required: 'Le mot de passe est requis',
                  minLength: {
                    value: 8,
                    message: 'Le mot de passe doit contenir au moins 8 caractères'
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Mot de passe"
                    type="password"
                    fullWidth
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="password_confirmation"
                control={control}
                rules={{ 
                  required: 'La confirmation du mot de passe est requise',
                  validate: (value, formValues) => 
                    value === formValues.password || 'Les mots de passe ne correspondent pas'
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Confirmer le mot de passe"
                    type="password"
                    fullWidth
                    error={!!errors.password_confirmation}
                    helperText={errors.password_confirmation?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Rôle</InputLabel>
                    <Select
                      {...field}
                      label="Rôle"
                    >
                      <MenuItem value="ROLE_AUTO_ECOLE">Responsable d'Auto-École</MenuItem>
                      <MenuItem value="ROLE_ADMIN">Administrateur</MenuItem>
                    </Select>
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
          {loading ? 'Création...' : 'Créer l\'utilisateur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserForm;
