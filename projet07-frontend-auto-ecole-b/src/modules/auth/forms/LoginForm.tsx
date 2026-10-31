import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants';
import { useAppStore } from '../../../store';
import { tokenService } from '../services';
import { authService } from '../services/authService';

import { User, MeResponse } from '../types';
import { AutoEcoleDetailResponse } from '../../cnepc/types/auto-ecole';
import { userService } from '../../user/services';
import { setAutoEcoleInfo } from '../../../shared/utils/autoEcoleUtils';


interface LoginFormData {
  identifier: string;
  password: string;
}

/** Construit un User à partir de la réponse /auth/me */
function buildUserFromMe(meResponse: MeResponse, centreId?: string): User {
  const u = meResponse.user;
  return {
    id: u.id,
    email: u.email,
    name: u.personne.nom_complet,
    role: u.role as User['role'],
    centre_id: centreId ?? (u as any).centre_id ?? (u as any).utilisateur?.centre_id,
    createdAt: new Date(u.created_at),
    created_at: u.created_at,
    personne: u.personne,
  };
}
export interface FormDataEmail {
  email: string;
}

const LoginForm: React.FC = () => {
  const { login, isAuthenticated } = useAppStore();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoadingSendEmail,] = useState<boolean>(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({ identifier: '', password: '' });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);


  // Redirection automatique si déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, navigate]);

  // Afficher l'envoi des email
  if (isLoadingSendEmail) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ color: '#1976D2', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Envoi de Mail En cours...
          </Typography>
        </Box>
      </Box>
    );
  }

  //   if (isLoadingSendEmailError) {
  //   return (
  //     <Box
  //       sx={{
  //         minHeight: '100vh',
  //         display: 'flex',
  //         alignItems: 'center',
  //         justifyContent: 'center',
  //         backgroundColor: '#f5f5f5'
  //       }}
  //     >
  //       <Box sx={{ textAlign: 'center' }}>
  //         <CircularProgress size={60} sx={{ color: '#50C786', mb: 2 }} />
  //         <Typography variant="h6" color="text.secondary">
  //           Envoi de Mail En cours...
  //         </Typography>
  //       </Box>
  //     </Box>
  //   );
  // }

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.identifier) {
      newErrors.identifier = 'L\'identifiant (email ou numéro de téléphone) est requis';
    } else if (formData.identifier.includes('@') && !/\S+@\S+\.\S+/.test(formData.identifier)) {
      newErrors.identifier = 'Email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof LoginFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };



  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (formData.identifier != "" && formData.password != "") {
        setIsLoading(true);
      }

      setMessage(null);

      // Utilisation du service mocké
      const authResponse = await authService.login({
        identifier: formData.identifier,
        password: formData.password,
      });

      //console.log(authResponse);

      // Vérifier si le token est bien un JWT
      const token = authResponse.data.access_token;
      const refreshToken = authResponse.data.refresh_token;
      
      // Sauvegarder le refresh_token si présent
      if (refreshToken) {
        tokenService.setRefreshToken(refreshToken);
        console.log('✅ Refresh token sauvegardé');
      } else {
        // Évite d'utiliser un ancien refresh token devenu invalide
        tokenService.removeRefreshToken();
      }
      
      // Vérifier le rôle utilisateur via l'endpoint /auth/me
      const meResponse: MeResponse = await authService.getCurrentUser(token);
      
      if (!meResponse.success) {
        throw new Error('Erreur lors de la vérification du rôle utilisateur');
      }

      const rawUser = meResponse.user as Record<string, unknown>;
      const meEmail = String(rawUser.email ?? (rawUser.personne as Record<string, unknown>)?.email ?? '').trim().toLowerCase();

      // Pour les agents (non candidat) : récupérer les infos complètes depuis /utilisateurs/agents
      let user: User;
      const isAgent = rawUser.role !== 'candidat' && rawUser.role !== 'ROLE_AUTO_ECOLE';

      if (isAgent && meEmail) {
        try {
          const agentsResponse = await userService.getUsers(1, 1000);
          const currentAgent = agentsResponse.users.find(
            (u) =>
              (u.email?.toLowerCase() === meEmail) ||
              (u.personne?.email?.toLowerCase() === meEmail) ||
              u.id === rawUser.id ||
              u.personne?.id === (rawUser.personne as Record<string, unknown>)?.id
          );

          if (currentAgent) {
            // Utiliser les données complètes de l'agent (centre_id, centre, personne, etc.)
            const p = currentAgent.personne;
            const nomComplet = p ? `${p.prenom || ''} ${p.nom || ''}`.trim() || currentAgent.email : currentAgent.email;
            user = {
              id: currentAgent.id,
              email: currentAgent.email,
              name: nomComplet,
              role: currentAgent.role as User['role'],
              centre_id: currentAgent.centre_id ?? currentAgent.centre?.id,
              createdAt: new Date(currentAgent.created_at || meResponse.user.created_at),
              created_at: currentAgent.created_at || meResponse.user.created_at,
              personne: p
                ? {
                    id: p.id,
                    nom: p.nom,
                    prenom: p.prenom,
                    nom_complet: nomComplet,
                    email: p.email,
                    contact: p.contact || '',
                    adresse: p.adresse ?? '',
                  }
                : meResponse.user.personne,
            };
          } else {
            user = buildUserFromMe(meResponse, undefined);
          }
        } catch (err) {
          user = buildUserFromMe(meResponse, undefined);
        }
      } else {
        user = buildUserFromMe(meResponse, (rawUser.centre_id as string) ?? (rawUser.centre as { id?: string })?.id);
      }

      // Si l'utilisateur est responsable d'auto-école, récupérer les informations de l'auto-école
      let autoEcoleInfo: AutoEcoleDetailResponse | null = null;
      if (user.role === 'ROLE_AUTO_ECOLE') {
        try {
          // Trouver l'ID du responsable dans les données utilisateur
          const responsableId = meResponse.user.personne.id;
          autoEcoleInfo = await authService.findAutoEcoleByResponsableId(responsableId, token);
          
          if (autoEcoleInfo) {
            // Stocker les informations de l'auto-école via les utilitaires dédiés
            setAutoEcoleInfo(autoEcoleInfo.data);
          } else {
          }
        } catch (error) {
          // Ne pas bloquer la connexion si la récupération de l'auto-école échoue
        }
      }

      // login(user, token);
      // setMessage({ type: 'success', text: 'Connexion réussie !' });
      // tokenService.setAuthData(token, user);
   
      if (user.role !== 'candidat') {
        // Mettre à jour le contexte d'authentification avec l'utilisateur connecté
        login(user, token);
        setMessage({ type: 'success', text: 'Connexion réussie !' });
        // Sauvegarde du token et de l'utilisateur déléguée au contexte / tokenService
        tokenService.setAuthData(token, user);
        // Redirection vers le dashboard après connexion réussie
        setTimeout(() => {
          navigate(ROUTES.DASHBOARD);
        }, 1000);
      }else{
        setMessage({ type: 'error', text: 'Accès refusé. Vous n\'êtes pas autorisé à accéder à cette application.' });
        tokenService.clearAll()
        //authService.logoutBackEnd();
      }

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erreur de connexion' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        backgroundColor: '#eee'
      }}
    >
      {/* Panneau gauche avec image + voile bleu */}
      <Box
        sx={{
          flex: 1,
          minHeight: { xs: 300, md: '100vh' },
          backgroundImage: 'url(/assets/img/img1.avif)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          color: 'white',
          overflow: 'hidden'
        }}
      >
        {/* Voile bleu */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(25, 118, 210, 0.85)',
            opacity: 0.85
          }}
        />

        {/* Contenu */}
        <Box
          sx={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 4,
            zIndex: 1,
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="img"
              src="/assets/img/drapeau_sceau.jpg"
              alt="Drapeau Gabon"
              sx={{
                width: 90,
                height: 60,
                borderRadius: '2px',
              }}
            />
            <Typography
              variant="body1"
              component="div"
              sx={{
                color: 'white',
                fontWeight: 600,
                fontSize: '1.5rem',
              }}
            >
              Centre National d'Examen
              <br />
              des Permis de Conduire
            </Typography>
          </Box>

          {/* Main Content */}
          <Box sx={{ maxWidth: '600px' }}>
            <Typography
              variant="h3"
              sx={{
                color: 'white',
                fontWeight: 600,
                fontSize: { md: '2rem', lg: '3rem' },
                lineHeight: 1,
                mb: 8,
                textAlign: 'justify'
                
                
              }}
            >
              Bienvenue dans l'espace de gestion des examens
              de permis de conduire !
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: 'white',
                fontSize: '1rem',
                lineHeight: 1.5,
                opacity: 0.95,
                textAlign: 'justify',
          
              }}
            >
             Connectez-vous pour gérer vos dossiers,
             inscrire des candidats, suivre les examens
             et accéder à vos documents officiels en ligne, 
             simplement et efficacement.
            </Typography>
          </Box>


          {/* Footer */}
          <Typography
            variant="body2"
            sx={{
              color: 'white',
              fontSize: '0.875rem',
              opacity: 0.8,
            }}
          >
            Copyright © {new Date().getFullYear()}. Ministère des Transports , de la Marine Marchande et Chargé de la Logistique, tous droits reservés.
          </Typography>
        </Box>
      </Box>

      {/* Panneau droit: formulaire sur fond blanc */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 6 }
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 520 }}>
          <Typography
            variant="h5"
            sx={{ mb: 3, fontWeight: 700 }}
          >
            Se connecter
          </Typography>

          {message ? (
            <Alert
              severity={message.type}
              sx={{ mb: 2 }}
              onClose={() => setMessage(null)}
            >
              {message.text}
            </Alert>
          ) : undefined}

          <form onSubmit={onSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={formData.identifier}
                  onChange={handleInputChange('identifier')}
                  error={!!errors.identifier}
                  helperText={errors.identifier ?? ''}
                  size={window.innerWidth < 600 ? 'small' : 'medium'}
                />

                <TextField
                  label="Mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  error={!!errors.password}
                  helperText={errors.password ?? ''}
                  size={window.innerWidth < 600 ? 'small' : 'medium'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size={window.innerWidth < 600 ? 'medium' : 'large'}
                  disabled={isLoading}
                  sx={{
                    mt: 1,
                    backgroundColor: '#1976D2',
                    '&:hover': { backgroundColor: '#1565C0' }
                  }}
                >
                  {isLoading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </Box>
            </form>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginForm;
