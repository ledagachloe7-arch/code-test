import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography,
  Box,
  Chip,
  Checkbox,
  FormControlLabel,
  Alert
} from '@mui/material';

interface BatchFormData {
  name: string;
  description?: string;
  students: string[];
}

interface BatchFormErrors {
  name?: string;
  description?: string;
  students?: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
}

interface BatchFormProps {
  onSubmit: (data: BatchFormData) => void;
  students: Student[];
  isLoading?: boolean;
}

const BatchForm: React.FC<BatchFormProps> = ({ 
  onSubmit, 
  students,
  isLoading = false 
}) => {
  const [formData, setFormData] = useState<BatchFormData>({
    name: '',
    description: '',
    students: [],
  });
  const [errors, setErrors] = useState<BatchFormErrors>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const validateForm = (): boolean => {
    const newErrors: BatchFormErrors = {};
    
    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Le nom du lot doit contenir au moins 3 caractères';
    }
    
    if (!formData.students || formData.students.length === 0) {
      newErrors.students = 'Au moins un élève doit être sélectionné';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof BatchFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleStudentToggle = (studentId: string) => {
    const currentStudents = formData.students || [];
    const isSelected = currentStudents.includes(studentId);
    
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        students: prev.students.filter(id => id !== studentId)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        students: [...prev.students, studentId]
      }));
    }
    
    if (errors.students) {
      setErrors(prev => ({ ...prev, students: undefined }));
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
      setMessage({ type: 'success', text: 'Lot créé avec succès !' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la création du lot' });
    }
  };

  const getStudentStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'success';
      case 'validated': return 'info';
      default: return 'warning';
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Créer un nouveau lot CNEPC
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Nom du lot"
              fullWidth
              value={formData.name}
              onChange={handleInputChange('name')}
              error={!!errors.name}
              helperText={errors.name}
            />
            
            <TextField
              label="Description (optionnelle)"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={handleInputChange('description')}
              error={!!errors.description}
              helperText={errors.description}
            />

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Sélectionner les élèves ({formData.students?.length || 0} sélectionnés)
              </Typography>
              
              <Box sx={{ 
                maxHeight: '240px', 
                overflowY: 'auto', 
                border: '1px solid #ccc', 
                borderRadius: '4px', 
                p: 2 
              }}>
                {students.map((student) => (
                  <FormControlLabel
                    key={student.id}
                    control={
                      <Checkbox
                        checked={formData.students?.includes(student.id) || false}
                        onChange={() => handleStudentToggle(student.id)}
                      />
                    }
                    label={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        width: '100%' 
                      }}>
                        <span>
                          {student.firstName} {student.lastName}
                        </span>
                        <Chip
                          label={student.status}
                          color={getStudentStatusColor(student.status) as any}
                          size="small"
                        />
                      </Box>
                    }
                  />
                ))}
              </Box>
              
              {errors.students && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  {errors.students}
                </Typography>
              )}
            </Box>
          </Box>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              type="button"
              variant="outlined"
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              sx={{
                backgroundColor: '#50C786',
                '&:hover': { backgroundColor: '#40B676' },
              }}
            >
              {isLoading ? 'Création...' : 'Créer le lot'}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

export default BatchForm;
