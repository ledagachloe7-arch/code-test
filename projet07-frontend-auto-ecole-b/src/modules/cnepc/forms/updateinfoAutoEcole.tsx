
import React, { useState, useEffect } from 'react';
import { Button, TextField, Card, CardContent, Typography, Box, Alert, CircularProgress, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../store';
// import { authService } from '../services/authService';
// import { tokenService } from '../services';
// import { User } from '../types';
import { ROUTES } from '../../../shared/constants';
import { authService, tokenService, User } from '../../auth';
export interface Person {
  nom: string;
  prenom: string;
  contact: string;
  adresse: string;
}
const PageUpdateAutoecole: React.FC = () => {
  const [formData, setFormData] = useState<Person>({ nom: '', prenom: '', adresse: '', contact: '' });
  const [errors, setErrors] = useState<Partial<Person>>({});
  const [user, setUser] = useState<Partial<User>>({})
  const [userUpdate, setUserUpdate] = useState<Person>({ nom: '', prenom: '', adresse: '', contact: '' })
  const [isLoadingSendEmail, setIsLoadingSendEmail] = useState<boolean>(false);
  const handleInputChange = (field: keyof Person) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
 useEffect(() => {
  getInfomationUser();
}, []);

  const getInfomationUser = () => {
    const user = tokenService.getUser();
    setUser(user);
    setUserUpdate({ nom: user.personne.nom, prenom: user.personne.prenom, adresse: user.personne.adresse, contact: user.personne.contact })
  
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      setIsLoadingSendEmail(true);
      const res = await authService.updateProfile(formData);
      if (res) {
        setIsLoadingSendEmail(false);
      }
 
    } catch (e) {
      console.log(e)
      setIsLoadingSendEmail(false);
    }

  }


  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation du nom
    if (!formData.nom) {
      newErrors.nom = 'Le nom est requis';
    } else if (formData.nom.trim().length < 2) {
      newErrors.nom = 'Le nom doit contenir au moins 2 caractères';
    } else if (!/^[a-zA-ZÀ-ÿ'\\s-]+$/.test(formData.nom)) {
      newErrors.nom = 'Le nom contient des caractères invalides';
    }

    // Validation du prénom
    if (!formData.prenom) {
      newErrors.prenom = 'Le prénom est requis';
    } else if (formData.prenom.trim().length < 2) {
      newErrors.prenom = 'Le prénom doit contenir au moins 2 caractères';
    } else if (!/^[a-zA-ZÀ-ÿ'\\s-]+$/.test(formData.prenom)) {
      newErrors.prenom = 'Le prénom contient des caractères invalides';
    }

    // Validation de l’adresse
    if (!formData.adresse) {
      newErrors.adresse = 'L’adresse est requise';
    } else if (formData.adresse.trim().length < 5) {
      newErrors.adresse = 'L’adresse doit contenir au moins 5 caractères';
    }

    // Validation du contact (optionnelle si c’est un champ texte)
    if (!formData.contact) {
      newErrors.contact = 'Le contact est requis';
    } else if (formData.contact.trim().length < 6) {
      newErrors.contact = 'Le contact doit contenir au moins 6 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
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
          <CircularProgress size={60} sx={{ color: '#50C786', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Modification cours...
          </Typography>
        </Box>
      </Box>
    );
  }
  return (<Box

  >
    {/* Section gauche - Présentation */}


    {/* Section droite - Formulaire de connexion */}
    <Box

    >
      <Card variant='outlined'> <Container maxWidth="sm">
        <Typography
          variant="h4"
          component="h1"
          sx={{
            textAlign: 'center',
            mb: 2,
            fontSize: { xs: '0.5rem', sm: '1rem', md: '1.5rem' }
          }}
          className="font-display"
        >
          Modification des informations

        </Typography>
        <form onSubmit={onSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
            <TextField
              label="Nom"
              type="text"
              fullWidth
              placeholder={userUpdate.nom}
              value={formData.nom}
              onChange={handleInputChange('nom')}
              error={!!errors.nom}
              helperText={errors.nom}
              size={window.innerWidth < 600 ? 'small' : 'medium'}
            />
            <TextField
              label="Prenom"
              type="text"
              fullWidth
               placeholder={userUpdate.prenom}
              value={formData.prenom}
              onChange={handleInputChange('prenom')}
              error={!!errors.prenom}
              helperText={errors.prenom}
              size={window.innerWidth < 600 ? 'small' : 'medium'}
            />
            <TextField
              label="contact"
              type="text"
              fullWidth
              value={formData.contact}
              placeholder={userUpdate.contact}
              onChange={handleInputChange('contact')}
              error={!!errors.contact}
              helperText={errors.contact}
              size={window.innerWidth < 600 ? 'small' : 'medium'}
            />
            <TextField
              label="Adresse"
              type="text"
              fullWidth
              value={formData.adresse}
              placeholder={userUpdate.adresse}
              onChange={handleInputChange('adresse')}
              error={!!errors.adresse}
              helperText={errors.adresse}
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
              Modifier information
            </Button>
          </Box>
          <br />
        </form>
      </Container>


      </Card>
    </Box>
  </Box>);
}
export default PageUpdateAutoecole;