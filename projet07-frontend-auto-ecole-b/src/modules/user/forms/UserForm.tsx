import React, { useState, useEffect, useMemo } from 'react';
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
import { UserFormData, User } from '../types';
import { roleService } from '../../circuit/services/role.service';
import { referentielService } from '../../cnepc/services';
import type { Referentiel } from '../../cnepc/types/auto-ecole';

interface UserFormProps {
  user?: User;
  onSuccess: (user: User) => void;
  onCancel: () => void;
  open: boolean;
}

// Extrait récursivement un tableau depuis n'importe quelle forme de réponse API
// (tableau direct, { roles }, { data }, { data: { roles } }, { data: { data } }, etc.)
function extractArray(v: any): unknown[] {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== 'object') return [];
  for (const key of ['roles', 'data', 'items', 'results', 'content']) {
    const found = extractArray(v[key]);
    if (found.length) return found;
  }
  return [];
}

function normalizeRolesFromApi(raw: unknown): string[] {
  const mapped = extractArray(raw)
    .map((r: any) =>
      typeof r === 'string'
        ? r.trim()
        : String(
            r?.authority ?? r?.role ?? r?.name ?? r?.code ?? r?.libelle ?? r?.label ?? ''
          ).trim()
    )
    .filter(Boolean);

  return Array.from(new Set(mapped));
}

const UserForm: React.FC<UserFormProps> = ({
  user,
  onSuccess,
  onCancel,
  open,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [centres, setCentres] = useState<Referentiel[]>([]);
  const [centresLoading, setCentresLoading] = useState(false);
  const isEditMode = !!user;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    defaultValues: {
      email: '',
      password: 'password',
      password_confirmation: 'password',
      nom: '',
      prenom: '',
      contact: '',
      telephone: '',
      adresse: '',
      role: 'ROLE_AUTO_ECOLE',
      centre_id: '',
    },
  });

  const nomWatch = watch('nom');
  const prenomWatch = watch('prenom');
  const roleValue = watch('role') as string | undefined;

  // Options du select : on inclut toujours la valeur courante du formulaire,
  // ce qui supprime l'avertissement MUI "out-of-range value" même si l'API est vide/lente.
  const roleOptions = useMemo(
    () => Array.from(new Set([...(roleValue ? [roleValue] : []), ...roles])),
    [roles, roleValue]
  );

  const buildAutoEmail = (nom: string, prenom: string): string => {
    const sanitize = (value: string) =>
      (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    const nomPart = sanitize(nom);
    const prenomPart = sanitize(prenom);
    return `${nomPart}${prenomPart}@rd.com`;
  };

  useEffect(() => {
    if (user && open) {
      reset({
        email: user.email || '',
        password: '',
        password_confirmation: '',
        nom: user.personne?.nom || '',
        prenom: user.personne?.prenom || '',
        contact: user.personne?.contact || '',
        telephone: user.personne?.telephone || user.telephone || '',
        adresse: user.personne?.adresse || '',
        role: (user.role as any) || 'ROLE_AUTO_ECOLE',
        centre_id: (user as any).centre_id || '',
      });
    } else if (!user && open) {
      reset({
        email: '',
        password: 'password',
        password_confirmation: 'password',
        nom: '',
        prenom: '',
        contact: '',
        telephone: '',
        adresse: '',
        role: 'ROLE_AUTO_ECOLE',
        centre_id: '',
      });
    }
  }, [user, open, reset]);

  useEffect(() => {
    if (!open || isEditMode) return;
    if (!nomWatch?.trim() && !prenomWatch?.trim()) {
      setValue('email', '', { shouldValidate: true });
      return;
    }
    setValue('email', buildAutoEmail(nomWatch || '', prenomWatch || ''), { shouldValidate: true });
  }, [open, isEditMode, nomWatch, prenomWatch, setValue]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchRoles = async () => {
      try {
        setRolesLoading(true);
        const rolesData = await roleService.getAll();
        console.log('RAW roles:', rolesData);
        const rolesArray = normalizeRolesFromApi(rolesData);
        console.log('NORMALIZED roles:', rolesArray);
        if (isEditMode && user?.role && !rolesArray.includes(user.role)) {
          rolesArray.unshift(user.role);
        }
        if (!cancelled) setRoles(rolesArray);
      } catch (e) {
        console.error('Erreur chargement rôles:', e);
        if (!cancelled) setRoles(isEditMode && user?.role ? [user.role] : []);
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    };
    fetchRoles();
    return () => { cancelled = true; };
  }, [open, isEditMode, user?.role]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchCentres = async () => {
      try {
        setCentresLoading(true);
        const data = await referentielService.getReferentielsByType('centre');
        if (!cancelled) setCentres(data || []);
      } catch (e) {
        console.error('Erreur chargement centres:', e);
        if (!cancelled) setCentres([]);
      } finally {
        if (!cancelled) setCentresLoading(false);
      }
    };
    fetchCentres();
    return () => { cancelled = true; };
  }, [open]);

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    setError(null);

    const payload = { ...data };
    if (payload.centre_id === '') delete payload.centre_id;
    if (payload.telephone === '') delete payload.telephone;

    try {
      let response: User;
      if (isEditMode && user) {
        // Mise à jour - ne pas envoyer le mot de passe si vide
        const updateData: Partial<UserFormData> = { ...payload };
        if (!updateData.password) {
          delete updateData.password;
          delete updateData.password_confirmation;
        }
        response = await userService.updateUser(user.id, updateData);
      } else {
        // Création
        response = await userService.createUser(payload);
      }

      onSuccess(response);
      handleClose();
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError(err.message || 'Une erreur est survenue lors de la sauvegarde');
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
        {isEditMode ? 'Modifier l\'utilisateur' : 'Créer un nouvel utilisateur'}
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
                    required
                    error={!!errors.nom}
                    helperText={errors.nom?.message}
                    disabled={loading}
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
                    required
                    error={!!errors.prenom}
                    helperText={errors.prenom?.message}
                    disabled={loading}
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
                    message: 'Email invalide',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    type="email"
                    fullWidth
                    required
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    disabled={loading || isEditMode}
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
                    required
                    error={!!errors.contact}
                    helperText={errors.contact?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="telephone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Téléphone"
                    fullWidth
                    error={!!errors.telephone}
                    helperText={errors.telephone?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="role"
                control={control}
                rules={{ required: 'Le rôle est requis' }}
                render={({ field }) => (
                  <FormControl fullWidth required error={!!errors.role} disabled={loading}>
                    <InputLabel id="role-label">Rôle</InputLabel>
                    <Select
                      {...field}
                      labelId="role-label"
                      label="Rôle"
                      value={field.value ?? ''}
                    >
                      {roleOptions.map((role) => (
                        <MenuItem key={role} value={role}>
                          {role}
                        </MenuItem>
                      ))}
                      {roleOptions.length === 0 && (
                        <MenuItem disabled value="">
                          {rolesLoading ? 'Chargement...' : 'Aucun rôle disponible'}
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="centre_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.centre_id} disabled={loading || centresLoading}>
                    <InputLabel id="centre-label">Centre</InputLabel>
                    <Select
                      {...field}
                      labelId="centre-label"
                      label="Centre"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || undefined)}
                    >
                      <MenuItem value="">
                        <em>Aucun</em>
                      </MenuItem>
                      {centres.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.libelle || c.code || c.id}
                        </MenuItem>
                      ))}
                      {centres.length === 0 && (
                        <MenuItem disabled value="__none__">
                          {centresLoading ? 'Chargement...' : 'Aucun centre disponible'}
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
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
                    label="Adresse (optionnel)"
                    fullWidth
                    multiline
                    rows={2}
                    disabled={loading}
                  />
                )}
              />
            </Grid>

            {!isEditMode && (
              <>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="password"
                    control={control}
                    rules={{
                      required: 'Le mot de passe est requis',
                      minLength: {
                        value: 8,
                        message: 'Le mot de passe doit contenir au moins 8 caractères',
                      },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Mot de passe"
                        type="password"
                        fullWidth
                        required
                        error={!!errors.password}
                        helperText={errors.password?.message}
                        disabled={loading}
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
                        value === formValues.password || 'Les mots de passe ne correspondent pas',
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Confirmer le mot de passe"
                        type="password"
                        fullWidth
                        required
                        error={!!errors.password_confirmation}
                        helperText={errors.password_confirmation?.message}
                        disabled={loading}
                      />
                    )}
                  />
                </Grid>
              </>
            )}

            {isEditMode && (
              <>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="password"
                    control={control}
                    rules={{
                      minLength: {
                        value: 8,
                        message: 'Le mot de passe doit contenir au moins 8 caractères',
                      },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Nouveau mot de passe (optionnel)"
                        type="password"
                        fullWidth
                        error={!!errors.password}
                        helperText={errors.password?.message || 'Laissez vide pour ne pas modifier'}
                        disabled={loading}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="password_confirmation"
                    control={control}
                    rules={{
                      validate: (value, formValues) => {
                        if (formValues.password && value !== formValues.password) {
                          return 'Les mots de passe ne correspondent pas';
                        }
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Confirmer le nouveau mot de passe"
                        type="password"
                        fullWidth
                        error={!!errors.password_confirmation}
                        helperText={errors.password_confirmation?.message}
                        disabled={loading}
                      />
                    )}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Enregistrement...' : isEditMode ? 'Modifier' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserForm;
