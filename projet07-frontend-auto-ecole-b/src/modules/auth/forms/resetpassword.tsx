import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Alert, Card, CardContent, Link } from '@mui/material';
import { authService } from '../services';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants';

export interface ResetPasswordFormData {
  email: string;
  code: string;
  password: string;
  password_confirmation: string;
}

const ResetPasswordForm: React.FC = () => {
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    email: '',
    code: '',
    password: '',
    password_confirmation: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [errors, setErrors] = useState<Partial<ResetPasswordFormData>>({});
    const [isLoadingSendEmail, setIsLoadingSendEmail] = useState<boolean>(false);
  const navigate = useNavigate();
  const handleChange =
    (field: keyof ResetPasswordFormData) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value.trim();
        setFormData(prev => ({ ...prev, [field]: value }));

        // Nettoyage de l’erreur dès qu’on modifie le champ
        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: undefined }));
        }
      };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const newErrors: Partial<ResetPasswordFormData> = {};

    if (!formData.email) newErrors.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Email invalide';

    if (!formData.code) newErrors.code = 'Code requis';
    if (!formData.password) newErrors.password = 'Mot de passe requis';
    if (formData.password !== formData.password_confirmation)
      newErrors.password_confirmation = 'Les mots de passe ne correspondent pas';

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      console.log('✅ Données prêtes à être envoyées :', formData);
      // 👉 Appel à ton API ici
    }

    try {
      const res = await authService.resetPassword(formData)
      if (res) {
        setTimeout(() => {
          navigate(ROUTES.LOGIN);
        }, 1000);
      }
    } catch (e) {

    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        backgroundColor: '#f5f5f5'
      }}
    >
      {/* Section gauche - Présentation */}
      <Box
        sx={{
          flex: { xs: 'none', lg: 1 },
          height: { xs: '40vh', lg: 'auto' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #50C786 0%, #40B676 100%)',
          color: 'white',
          p: { xs: 3, sm: 4 },
          position: 'relative'
        }}
      >
        <Box sx={{
          textAlign: 'center',
          maxWidth: { xs: '100%', sm: 500 },
          px: { xs: 2, sm: 0 }
        }}>
          {/* Images officielles */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: { xs: 2, sm: 3, md: 4 },
            mb: { xs: 2, sm: 3 },
            flexWrap: 'wrap'
          }}>
            <Box sx={{
              width: { xs: 60, sm: 80, md: 100 },
              height: { xs: 60, sm: 80, md: 100 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src="/assets/img/blason.png"
                alt="Blason du Gabon"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </Box>
            <Box sx={{
              width: { xs: 60, sm: 80, md: 100 },
              height: { xs: 60, sm: 80, md: 100 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src="/assets/img/mtt.png"
                alt="Ministère des Transports"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </Box>
          </Box>

          <Typography
            variant="h2"
            component="h1"
            sx={{
              mb: { xs: 2, sm: 3 },
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem', lg: '3rem' }
            }}
            className="font-display"
          >
            Portail Auto-École
          </Typography>

          <Typography
            variant="h5"
            sx={{
              mb: { xs: 3, sm: 4 },
              fontWeight: 400,
              lineHeight: 1.6,
              fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.3rem' },
              display: { xs: 'none', sm: 'block' }
            }}
            className="font-primary"
          >
            Logiciel officiel du Ministère des Transports, de la Marine Marchande et de la Logistique
          </Typography>

          {/* Version mobile du texte */}
          <Typography
            variant="body1"
            sx={{
              mb: { xs: 3, sm: 4 },
              fontWeight: 400,
              lineHeight: 1.4,
              fontSize: '0.9rem',
              display: { xs: 'block', sm: 'none' }
            }}
            className="font-primary"
          >
            Logiciel officiel du Ministère des Transports
          </Typography>

          {/* <Box sx={{ mt: { xs: 3, sm: 6 } }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: { xs: '0.9rem', sm: '1.1rem' }
              }}
            >
              Développé par
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 'bold',
                color: 'white',
                mt: 1,
                fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2rem' }
              }}
            >
              Rengus Digital
            </Typography>
          </Box> */}

        </Box>
      </Box>

      {/* Section droite - Formulaire de connexion */}
      <Box
        sx={{
          flex: { xs: 1, lg: 1 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 3, md: 4 },
          minHeight: { xs: '60vh', lg: 'auto' },
          position: 'relative',
          backgroundImage: 'url(/assets/img/back-driver.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/assets/img/back-driver.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(8px)',
            zIndex: -1
          }
        }}
      >
        <Card sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: 400 },
          boxShadow: { xs: 1, sm: 3 },
          mx: { xs: 1, sm: 0 },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          zIndex: 1
        }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                textAlign: 'center',
                mb: 2,
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
              }}
              className="font-display"
            >
              Réinitialisation du mot de passe

            </Typography>


            {message && (
              <Alert
                severity={message.type}
                sx={{ mb: 2 }}
                onClose={() => setMessage(null)}
              >
                {message.text}
              </Alert>
            )}
            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
                <TextField
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  error={!!errors.email}
                  helperText={errors.email}
                  fullWidth

                  size={window.innerWidth < 600 ? 'small' : 'medium'}
                />

                <TextField
                  label="Code de vérification"
                  value={formData.code}
                  onChange={handleChange('code')}
                  error={!!errors.code}
                  helperText={errors.code}
                  size={window.innerWidth < 600 ? 'small' : 'medium'}
                />

                <TextField
                  label="Nouveau mot de passe"
                  type="password"
                  value={formData.password}
                  onChange={handleChange('password')}
                  error={!!errors.password}
                  helperText={errors.password}
                  size={window.innerWidth < 600 ? 'small' : 'medium'}
                />


                <TextField
                  label="Confirmer le mot de passe"
                  type="password"
                  value={formData.password_confirmation}
                  onChange={handleChange('password_confirmation')}
                  error={!!errors.password_confirmation}
                  helperText={errors.password_confirmation}
                  size={window.innerWidth < 600 ? 'small' : 'medium'}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size={window.innerWidth < 600 ? 'medium' : 'large'}

                  sx={{
                    mt: { xs: 1.5, sm: 2 },
                    backgroundColor: '#50C786',
                    '&:hover': { backgroundColor: '#40B676' },
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    py: { xs: 1.5, sm: 2 }
                  }}
                >
                  envoyées
                </Button>

              </Box>
            </form>

          </CardContent>
        </Card>

        {/* Lignes colorées décoratives en bas de la section droite */}
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          height: 8
        }}>
          <Box sx={{ flex: 1, backgroundColor: '#2E8B57', height: '100%' }} />
          <Box sx={{ flex: 1, backgroundColor: '#FFD700', height: '100%' }} />
          <Box sx={{ flex: 1, backgroundColor: '#1E90FF', height: '100%' }} />
        </Box>
      </Box>
    </Box>
  );
  // <Box
  //   component="form"
  //   onSubmit={handleSubmit}
  //   sx={{
  //     display: 'flex',
  //     flexDirection: 'column',
  //     gap: 2,
  //     maxWidth: 400,
  //     mx: 'auto',
  //     mt: 5,
  //   }}
  // >
  //   <Typography variant="h6" align="center">
  //     Réinitialisation du mot de passe
  //   </Typography>

  // <TextField
  //   label="Email"
  //   type="email"
  //   value={formData.email}
  //   onChange={handleChange('email')}
  //   error={!!errors.email}
  //   helperText={errors.email}
  //   fullWidth
  // />

  //   <TextField
  //     label="Code de vérification"
  //     value={formData.code}
  //     onChange={handleChange('code')}
  //     error={!!errors.code}
  //     helperText={errors.code}
  //     fullWidth
  //   />

  //   <TextField
  //     label="Nouveau mot de passe"
  //     type="password"
  //     value={formData.password}
  //     onChange={handleChange('password')}
  //     error={!!errors.password}
  //     helperText={errors.password}
  //     fullWidth
  //   />

  //   <TextField
  //     label="Confirmer le mot de passe"
  //     type="password"
  //     value={formData.password_confirmation}
  //     onChange={handleChange('password_confirmation')}
  //     error={!!errors.password_confirmation}
  //     helperText={errors.password_confirmation}
  //     fullWidth
  //   />

  //   <Button type="submit" variant="contained" fullWidth>
  //     Réinitialiser
  //   </Button>
  // </Box>
  // );
};

export default ResetPasswordForm;
