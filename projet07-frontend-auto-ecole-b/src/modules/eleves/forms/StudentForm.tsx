import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Grid, 
  Typography,
  Box,
  Alert
} from '@mui/material';
import { StudentFormData, StudentFormErrors } from '../types/student';

interface StudentFormProps {
  onSubmit: (data: StudentFormData) => void;
  initialData?: Partial<StudentFormData>;
  isLoading?: boolean;
}

const StudentForm: React.FC<StudentFormProps> = ({ 
  onSubmit, 
  initialData, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState<StudentFormData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    birthDate: initialData?.birthDate || '',
    nationality: initialData?.nationality || '',
  });

  const [errors, setErrors] = useState<StudentFormErrors>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const validateForm = (): boolean => {
    const newErrors: StudentFormErrors = {};
    
    if (!formData.firstName || formData.firstName.length < 2) {
      newErrors.firstName = 'Le prénom doit contenir au moins 2 caractères';
    }
    
    if (!formData.lastName || formData.lastName.length < 2) {
      newErrors.lastName = 'Le nom doit contenir au moins 2 caractères';
    }
    
    if (!formData.email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    
    if (!formData.phone || formData.phone.length < 10) {
      newErrors.phone = 'Le téléphone doit contenir au moins 10 caractères';
    }
    
    if (!formData.address || formData.address.length < 5) {
      newErrors.address = 'L\'adresse doit contenir au moins 5 caractères';
    }
    
    if (!formData.birthDate) {
      newErrors.birthDate = 'La date de naissance est requise';
    }
    
    if (!formData.nationality || formData.nationality.length < 2) {
      newErrors.nationality = 'La nationalité est requise';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof StudentFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Veuillez corriger les erreurs dans le formulaire' });
      return;
    }

    try {
      onSubmit(formData);
      setMessage({ type: 'success', text: 'Élève sauvegardé avec succès !' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Informations personnelles
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
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Prénom"
                fullWidth
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                error={!!errors.firstName}
                helperText={errors.firstName}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nom"
                fullWidth
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                error={!!errors.lastName}
                helperText={errors.lastName}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={handleInputChange('email')}
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Téléphone"
                fullWidth
                value={formData.phone}
                onChange={handleInputChange('phone')}
                error={!!errors.phone}
                helperText={errors.phone}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Adresse"
                fullWidth
                multiline
                rows={2}
                value={formData.address}
                onChange={handleInputChange('address')}
                error={!!errors.address}
                helperText={errors.address}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date de naissance"
                type="date"
                fullWidth
                value={formData.birthDate}
                onChange={handleInputChange('birthDate')}
                InputLabelProps={{ shrink: true }}
                error={!!errors.birthDate}
                helperText={errors.birthDate}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nationalité"
                fullWidth
                value={formData.nationality}
                onChange={handleInputChange('nationality')}
                error={!!errors.nationality}
                helperText={errors.nationality}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              sx={{
                backgroundColor: '#50C786',
                '&:hover': { backgroundColor: '#40B676' },
              }}
            >
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

export default StudentForm;
