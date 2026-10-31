import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

interface CNEPCHistory {
  id: string;
  batchName: string;
  action: 'created' | 'sent' | 'confirmed' | 'failed';
  timestamp: string;
  details: string;
  user: string;
}

const HistoryTable: React.FC = () => {
  // Mock data
  const history: CNEPCHistory[] = [
    { 
      id: '1', 
      batchName: 'Lot Janvier 2024', 
      action: 'created', 
      timestamp: '2024-01-01 10:00:00', 
      details: 'Lot créé avec 15 élèves',
      user: 'Admin User'
    },
    { 
      id: '2', 
      batchName: 'Lot Janvier 2024', 
      action: 'sent', 
      timestamp: '2024-01-01 11:00:00', 
      details: 'Lot envoyé au CNEPC avec succès',
      user: 'Admin User'
    },
    { 
      id: '3', 
      batchName: 'Lot Février 2024', 
      action: 'confirmed', 
      timestamp: '2024-02-02 14:30:00', 
      details: 'Confirmation reçue du CNEPC',
      user: 'System'
    },
    { 
      id: '4', 
      batchName: 'Lot Mars 2024', 
      action: 'failed', 
      timestamp: '2024-03-01 09:15:00', 
      details: 'Erreur de connexion au CNEPC',
      user: 'Admin User'
    },
  ];

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'info';
      case 'sent': return 'primary';
      case 'confirmed': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return 'Créé';
      case 'sent': return 'Envoyé';
      case 'confirmed': return 'Confirmé';
      case 'failed': return 'Échec';
      default: return 'Inconnu';
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Lot</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Timestamp</TableCell>
            <TableCell>Détails</TableCell>
            <TableCell>Utilisateur</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {history.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.batchName}</TableCell>
              <TableCell>
                <Chip
                  label={getActionLabel(item.action)}
                  color={getActionColor(item.action) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>{item.timestamp}</TableCell>
              <TableCell>{item.details}</TableCell>
              <TableCell>{item.user}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default HistoryTable;
