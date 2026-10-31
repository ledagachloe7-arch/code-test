import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Chip, 
  TextField, 
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Search, Visibility } from '@mui/icons-material';
import StudentValidationForm from '../forms/StudentValidationForm';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'pending' | 'validated' | 'rejected';
  createdAt: string;
}

const StudentsListTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  // Mock data
  const students: Student[] = [
    { 
      id: '1', 
      firstName: 'Jean', 
      lastName: 'Dupont', 
      email: 'jean.dupont@email.com', 
      phone: '0123456789',
      status: 'pending', 
      createdAt: '2024-01-01' 
    },
    { 
      id: '2', 
      firstName: 'Marie', 
      lastName: 'Martin', 
      email: 'marie.martin@email.com', 
      phone: '0987654321',
      status: 'validated', 
      createdAt: '2024-01-02' 
    },
  ];

  const filteredStudents = students.filter(student =>
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'success';
      case 'rejected': return 'error';
      default: return 'warning';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated': return 'Validé';
      case 'rejected': return 'Rejeté';
      default: return 'En attente';
    }
  };

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setOpenDialog(true);
  };

  const handleValidate = (studentId: string) => {
    console.log('Valider élève:', studentId);
    // Logique de validation
  };

  const handleReject = (studentId: string) => {
    console.log('Rejeter élève:', studentId);
    // Logique de rejet
  };

  return (
    <Box>
      <Box className="mb-4 flex gap-4 items-center">
        <TextField
          label="Rechercher un élève"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search className="mr-2" />
          }}
          className="flex-1"
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Téléphone</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Date d'inscription</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>{student.firstName} {student.lastName}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>{student.phone}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(student.status)}
                    color={getStatusColor(student.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{student.createdAt}</TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => handleViewDetails(student)}
                  >
                    Voir détails
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Détails de l'élève</DialogTitle>
        <DialogContent>
          {selectedStudent && (
            <StudentValidationForm
              student={selectedStudent}
              onValidate={handleValidate}
              onReject={handleReject}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentsListTable;
