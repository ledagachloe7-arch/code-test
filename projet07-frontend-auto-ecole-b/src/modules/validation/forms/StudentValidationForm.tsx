import React from 'react';
import { Card, CardContent, Typography, Button, Box, Chip } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'pending' | 'validated' | 'rejected';
}

interface StudentValidationFormProps {
  student: Student;
  onValidate: (studentId: string) => void;
  onReject: (studentId: string) => void;
}

const StudentValidationForm: React.FC<StudentValidationFormProps> = ({
  student,
  onValidate,
  onReject,
}) => {
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

  return (
    <Card className="mb-4">
      <CardContent>
        <Box className="flex justify-between items-start mb-4">
          <Box>
            <Typography variant="h6">
              {student.firstName} {student.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {student.email}
            </Typography>
          </Box>
          <Chip
            label={getStatusLabel(student.status)}
            color={getStatusColor(student.status) as any}
            size="small"
          />
        </Box>

        {student.status === 'pending' && (
          <Box className="flex gap-2">
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => onValidate(student.id)}
              size="small"
            >
              Valider
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<Cancel />}
              onClick={() => onReject(student.id)}
              size="small"
            >
              Rejeter
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentValidationForm;
