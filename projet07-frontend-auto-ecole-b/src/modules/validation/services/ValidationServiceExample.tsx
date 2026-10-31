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
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { CheckCircle, Cancel, Visibility, Refresh } from '@mui/icons-material';
import { validationService, studentService } from './index';
import { Student, ValidationHistoryEntry } from '../types';

const ValidationServiceExample: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [history, setHistory] = useState<ValidationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'validate' | 'reject'>('validate');
  const [reason, setReason] = useState('');

  // Charger les élèves
  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const data = await validationService.getStudents();
      setStudents(data);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Charger l'historique
  const loadHistory = async () => {
    try {
      const data = await validationService.getValidationHistory();
      setHistory(data);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // Charger les données au montage
  useEffect(() => {
    loadStudents();
    loadHistory();
  }, []);

  // Ouvrir dialog de validation
  const handleValidate = (student: Student) => {
    setSelectedStudent(student);
    setDialogMode('validate');
    setReason('');
    setOpenDialog(true);
  };

  // Ouvrir dialog de rejet
  const handleReject = (student: Student) => {
    setSelectedStudent(student);
    setDialogMode('reject');
    setReason('');
    setOpenDialog(true);
  };

  // Confirmer l'action
  const handleConfirmAction = async () => {
    if (!selectedStudent) return;

    try {
      if (dialogMode === 'validate') {
        await validationService.validateStudent(selectedStudent.id, reason || undefined);
        setMessage({ type: 'success', text: 'Élève validé avec succès !' });
      } else {
        if (!reason.trim()) {
          setMessage({ type: 'error', text: 'La raison du rejet est requise' });
          return;
        }
        await validationService.rejectStudent(selectedStudent.id, reason);
        setMessage({ type: 'success', text: 'Élève rejeté avec succès !' });
      }
      
      setOpenDialog(false);
      loadStudents();
      loadHistory();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // Voir les documents d'un élève
  const handleViewDocuments = async (studentId: string) => {
    try {
      const documents = await studentService.getStudentDocuments(studentId);
      console.log('Documents de l\'élève:', documents);
      setMessage({ type: 'success', text: `Documents chargés (${documents.length}) - Voir la console` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated': return 'Validé';
      case 'rejected': return 'Rejeté';
      case 'pending': return 'En attente';
      default: return 'Inconnu';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Service de Validation - Exemple
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

      <Grid container spacing={3}>
        {/* Liste des élèves */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Élèves à valider ({students.length})
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={loadStudents}
                  disabled={isLoading}
                >
                  <Refresh sx={{ mr: 1 }} />
                  Actualiser
                </Button>
              </Box>
              
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
                          onClick={() => handleViewDocuments(student.id)}
                          title="Voir les documents"
                        >
                          <Visibility />
                        </IconButton>
                        {student.status === 'pending' && (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleValidate(student)}
                              title="Valider"
                            >
                              <CheckCircle />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleReject(student)}
                              title="Rejeter"
                            >
                              <Cancel />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Historique des validations */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Historique ({history.length})
              </Typography>
              
              {history.length === 0 ? (
                <Typography color="text.secondary">
                  Aucun historique
                </Typography>
              ) : (
                <List>
                  {history.slice(0, 5).map((entry) => (
                    <ListItem key={entry.id} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={entry.action === 'validated' ? 'Validé' : 'Rejeté'} 
                              size="small" 
                              color={entry.action === 'validated' ? 'success' : 'error'}
                            />
                            <Typography variant="body2">
                              {new Date(entry.validatedAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Par: {entry.validatedBy}
                            </Typography>
                            {entry.reason && (
                              <Typography variant="body2" color="text.secondary">
                                Raison: {entry.reason}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de validation/rejet */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'validate' ? 'Valider l\'élève' : 'Rejeter l\'élève'}
        </DialogTitle>
        <DialogContent>
          {selectedStudent && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedStudent.firstName} {selectedStudent.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Email: {selectedStudent.email}
              </Typography>
              
              <TextField
                label={dialogMode === 'validate' ? 'Raison (optionnelle)' : 'Raison du rejet *'}
                fullWidth
                multiline
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                sx={{ mt: 2 }}
                required={dialogMode === 'reject'}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button 
            onClick={handleConfirmAction}
            variant="contained"
            color={dialogMode === 'validate' ? 'success' : 'error'}
            disabled={dialogMode === 'reject' && !reason.trim()}
          >
            {dialogMode === 'validate' ? 'Valider' : 'Rejeter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ValidationServiceExample;
