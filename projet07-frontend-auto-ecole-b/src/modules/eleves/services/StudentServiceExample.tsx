import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  TextField,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Edit, Delete, Visibility, Search, Add } from '@mui/icons-material';
import studentService from './studentService';
import { Student } from '../types/student';
import StudentForm from '../forms/StudentForm';
import { StudentFormData } from '../types/student';

const StudentServiceExample: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

  // Charger les élèves
  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const data = await studentService.getStudents();
      setStudents(data);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Rechercher des élèves
  const searchStudents = async () => {
    if (!searchQuery.trim()) {
      loadStudents();
      return;
    }

    setIsLoading(true);
    try {
      const data = await studentService.searchStudents(searchQuery);
      setStudents(data);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les élèves au montage
  useEffect(() => {
    loadStudents();
  }, []);

  // Gestion des formulaires
  const handleCreateStudent = () => {
    setSelectedStudent(null);
    setDialogMode('create');
    setOpenDialog(true);
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setDialogMode('edit');
    setOpenDialog(true);
  };

  const handleSubmitStudent = async (data: StudentFormData) => {
    try {
      if (dialogMode === 'create') {
        await studentService.createStudent(data);
        setMessage({ type: 'success', text: 'Élève créé avec succès !' });
      } else if (selectedStudent) {
        await studentService.updateStudent(selectedStudent.id, data);
        setMessage({ type: 'success', text: 'Élève mis à jour avec succès !' });
      }
      setOpenDialog(false);
      loadStudents();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) {
      return;
    }

    try {
      await studentService.deleteStudent(studentId);
      setMessage({ type: 'success', text: 'Élève supprimé avec succès !' });
      loadStudents();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleValidateStudent = async (studentId: string) => {
    try {
      await studentService.validateStudent(studentId);
      setMessage({ type: 'success', text: 'Élève validé avec succès !' });
      loadStudents();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'success';
      case 'complete': return 'info';
      case 'incomplete': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated': return 'Validé';
      case 'complete': return 'Complet';
      case 'incomplete': return 'Incomplet';
      default: return 'Inconnu';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Service des Élèves - Exemple
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

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Actions
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                label="Rechercher un élève"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchStudents()}
                fullWidth
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="outlined" 
                  onClick={searchStudents}
                  disabled={isLoading}
                >
                  Rechercher
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={<Add />}
                  onClick={handleCreateStudent}
                >
                  Nouvel élève
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Élèves ({students.length})
          </Typography>
          
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Typography color="text.secondary">
              Aucun élève trouvé
            </Typography>
          ) : (
            <List>
              {students.map((student) => (
                <ListItem key={student.id} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {student.firstName} {student.lastName}
                        </Typography>
                        <Chip 
                          label={getStatusLabel(student.status)} 
                          size="small" 
                          color={getStatusColor(student.status) as any}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Email: {student.email} | Téléphone: {student.phone}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Documents: {student.documentsCount}/4 | Créé le: {new Date(student.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditStudent(student)}
                      title="Modifier"
                    >
                      <Edit />
                    </IconButton>
                    {student.status === 'complete' && (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleValidateStudent(student.id)}
                        title="Valider"
                      >
                        <Visibility />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteStudent(student.id)}
                      title="Supprimer"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Créer un nouvel élève' : 'Modifier l\'élève'}
        </DialogTitle>
        <DialogContent>
          <StudentForm
            onSubmit={handleSubmitStudent}
            initialData={selectedStudent ? {
              firstName: selectedStudent.firstName,
              lastName: selectedStudent.lastName,
              email: selectedStudent.email,
              phone: selectedStudent.phone,
              address: selectedStudent.address,
              birthDate: selectedStudent.birthDate,
              nationality: selectedStudent.nationality,
            } : undefined}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentServiceExample;
