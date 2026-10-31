import React, { useState } from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import StudentForm from './StudentForm';
import { StudentFormData } from '../types/student';

const StudentFormExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: StudentFormData) => {
    setIsLoading(true);
    
    try {
      // Simulation d'un appel API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Données de l\'élève:', data);
      
      // Ici vous pourriez appeler votre service
      // await studentService.createStudent(data);
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      throw error; // Re-throw pour que le formulaire gère l'erreur
    } finally {
      setIsLoading(false);
    }
  };

  const initialData: Partial<StudentFormData> = {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '0123456789',
    address: '123 Rue de la Paix, Paris',
    birthDate: '1990-01-01',
    nationality: 'Française',
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Formulaire d'élève
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Exemple d'utilisation du formulaire de création/modification d'élève.
        </Typography>
      </Box>

      <StudentForm
        onSubmit={handleSubmit}
        initialData={initialData}
        isLoading={isLoading}
      />

      <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={() => window.location.reload()}>
          Réinitialiser
        </Button>
        <Button variant="contained" onClick={() => console.log('Test du formulaire')}>
          Tester la validation
        </Button>
      </Box>
    </Container>
  );
};

export default StudentFormExample;
