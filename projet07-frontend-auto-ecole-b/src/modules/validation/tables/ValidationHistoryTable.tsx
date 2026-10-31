import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

interface ValidationHistory {
  id: string;
  studentName: string;
  action: 'validated' | 'rejected';
  timestamp: string;
  validator: string;
  reason?: string;
}

const ValidationHistoryTable: React.FC = () => {
  // Mock data
  const history: ValidationHistory[] = [
    { 
      id: '1', 
      studentName: 'Jean Dupont', 
      action: 'validated', 
      timestamp: '2024-01-01 10:00:00', 
      validator: 'Admin User' 
    },
    { 
      id: '2', 
      studentName: 'Marie Martin', 
      action: 'rejected', 
      timestamp: '2024-01-01 11:00:00', 
      validator: 'Admin User',
      reason: 'Documents incomplets'
    },
  ];

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Élève</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Timestamp</TableCell>
            <TableCell>Validateur</TableCell>
            <TableCell>Raison</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {history.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.studentName}</TableCell>
              <TableCell>
                <Chip
                  label={item.action === 'validated' ? 'Validé' : 'Rejeté'}
                  color={item.action === 'validated' ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
              <TableCell>{item.timestamp}</TableCell>
              <TableCell>{item.validator}</TableCell>
              <TableCell>{item.reason || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ValidationHistoryTable;
