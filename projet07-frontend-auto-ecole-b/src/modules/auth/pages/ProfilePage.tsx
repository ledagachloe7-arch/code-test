import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  Button,
  TextField,
  Avatar,
  Grid,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ROUTES } from '../../../shared/constants';
import { useAppStore } from '../../../store';
import tokenService from '../services/tokenService';
import { authService } from '../services/authService';
import { Person } from '../../cnepc/forms/updateinfoAutoEcole';
import { ChangePasswordForm } from '../../eleves/types/changepassword';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const [userInfo, setUserInfo] = useState<any>(null);
  const [formData, setFormData] = useState<Person>({ 
    nom: '', 
    prenom: '', 
    adresse: '', 
    contact: '' 
  });
  const [errors, setErrors] = useState<Partial<Person>>({});

  const [passwordData, setPasswordData] = useState<ChangePasswordForm>({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<Partial<ChangePasswordForm>>({});

  useEffect(() => {
    const loadUserInfo = () => {
      try {
        const userData = tokenService.getUser();
        setUserInfo(userData);
        if (userData?.personne) {
          setFormData({
            nom: userData.personne.nom || '',
            prenom: userData.personne.prenom || '',
            adresse: userData.personne.adresse || '',
            contact: userData.personne.contact || ''
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des informations utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserInfo();
  }, []);

  const handleInputChange = (field: keyof Person) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePasswordChange = (field: keyof ChangePasswordForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({ ...prev, [field]: event.target.value }));
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validatePersonForm = (): boolean => {
    const newErrors: Partial<Person> = {};

    if (!formData.nom || formData.nom.trim().length < 2) {
      newErrors.nom = 'Le nom est requis (min. 2 caractères)';
    }

    if (!formData.prenom || formData.prenom.trim().length < 2) {
      newErrors.prenom = 'Le prénom est requis (min. 2 caractères)';
    }

    if (!formData.contact || formData.contact.trim().length < 6) {
      newErrors.contact = 'Le contact est requis (min. 6 caractères)';
    }

    if (!formData.adresse || formData.adresse.trim().length < 5) {
      newErrors.adresse = 'L\'adresse est requise (min. 5 caractères)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: Partial<ChangePasswordForm> = {};

    if (!passwordData.current_password) {
      newErrors.current_password = 'Le mot de passe actuel est requis';
    }

    if (!passwordData.new_password || passwordData.new_password.length < 6) {
      newErrors.new_password = 'Le nouveau mot de passe doit contenir au moins 6 caractères';
    }

    if (!passwordData.new_password_confirmation) {
      newErrors.new_password_confirmation = 'La confirmation est requise';
    } else if (passwordData.new_password !== passwordData.new_password_confirmation) {
      newErrors.new_password_confirmation = 'Les mots de passe ne correspondent pas';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validatePersonForm()) return;

    try {
      setSaving(true);
      await authService.updateProfile(formData);
      setSnackbar({
        open: true,
        message: 'Informations personnelles mises à jour avec succès',
        severity: 'success'
      });
      // Recharger les données utilisateur
      const userData = tokenService.getUser();
      setUserInfo(userData);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Erreur lors de la mise à jour',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validatePasswordForm()) return;

    try {
      setChangingPassword(true);
      await authService.changePassword(passwordData);
      setSnackbar({
        open: true,
        message: 'Mot de passe modifié avec succès',
        severity: 'success'
      });
      // Réinitialiser le formulaire
      setPasswordData({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Erreur lors de la modification du mot de passe',
        severity: 'error'
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: '#f5f5f5', minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton
            onClick={() => navigate(ROUTES.DASHBOARD)}
            sx={{ 
              color: '#6b7280',
              '&:hover': { 
                backgroundColor: '#f3f4f6',
                color: '#3A75C4'
              }
            }}
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Mon Profil
          </Typography>
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column - Profile Photo & Info */}
        <Grid item xs={12} md={8}>
          {/* Profile Card */}
          <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                Informations Personnelles
              </Typography>
              <Grid container spacing={3}>
                {/* Left Side - Profile Photo */}
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Avatar
                      sx={{
                        width: 100,
                        height: 100,
                        bgcolor: '#3A75C4',
                        fontSize: '2.5rem',
                        mb: 2
                      }}
                    >
                      {userInfo?.personne?.prenom?.charAt(0) || user?.name?.charAt(0) || 'U'}
                      {userInfo?.personne?.nom?.charAt(0) || ''}
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {userInfo?.personne?.nom_complet || user?.name || 'Utilisateur'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {userInfo?.personne?.email || user?.email || ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user?.role || ''}
                    </Typography>
                  </Box>
                </Grid>

                {/* Right Side - Form */}
                <Grid item xs={12} sm={8}>
                  <form onSubmit={handleSaveProfile}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Nom"
                          fullWidth
                          value={formData.nom}
                          onChange={handleInputChange('nom')}
                          error={!!errors.nom}
                          helperText={errors.nom}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Prénom"
                          fullWidth
                          value={formData.prenom}
                          onChange={handleInputChange('prenom')}
                          error={!!errors.prenom}
                          helperText={errors.prenom}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Email"
                          fullWidth
                          value={userInfo?.personne?.email || user?.email || ''}
                          disabled
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Contact"
                          fullWidth
                          value={formData.contact}
                          onChange={handleInputChange('contact')}
                          error={!!errors.contact}
                          helperText={errors.contact}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Adresse"
                          fullWidth
                          multiline
                          rows={2}
                          value={formData.adresse}
                          onChange={handleInputChange('adresse')}
                          error={!!errors.adresse}
                          helperText={errors.adresse}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={saving}
                          sx={{
                            backgroundColor: '#3A75C4',
                            textTransform: 'none',
                            '&:hover': { backgroundColor: '#2A5A9A' },
                            minWidth: 150
                          }}
                        >
                          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Change Password */}
        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                Changer le mot de passe
              </Typography>
              <form onSubmit={handleChangePassword}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Mot de passe actuel"
                    type="password"
                    fullWidth
                    value={passwordData.current_password}
                    onChange={handlePasswordChange('current_password')}
                    error={!!passwordErrors.current_password}
                    helperText={passwordErrors.current_password}
                    size="small"
                  />
                  <TextField
                    label="Nouveau mot de passe"
                    type="password"
                    fullWidth
                    value={passwordData.new_password}
                    onChange={handlePasswordChange('new_password')}
                    error={!!passwordErrors.new_password}
                    helperText={passwordErrors.new_password}
                    size="small"
                  />
                  <TextField
                    label="Confirmation du nouveau mot de passe"
                    type="password"
                    fullWidth
                    value={passwordData.new_password_confirmation}
                    onChange={handlePasswordChange('new_password_confirmation')}
                    error={!!passwordErrors.new_password_confirmation}
                    helperText={passwordErrors.new_password_confirmation}
                    size="small"
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={changingPassword}
                    fullWidth
                    sx={{
                      backgroundColor: '#3A75C4',
                      textTransform: 'none',
                      '&:hover': { backgroundColor: '#2A5A9A' },
                      mt: 1
                    }}
                  >
                    {changingPassword ? 'Modification...' : 'Modifier le mot de passe'}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfilePage;

