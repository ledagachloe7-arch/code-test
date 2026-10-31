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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Search, Send, Visibility, Delete, Add } from '@mui/icons-material';
import SendForm from '../forms/SendForm';

interface Batch {
  id: string;
  name: string;
  studentsCount: number;
  status: 'pending' | 'sent' | 'confirmed';
  createdAt: string;
  sentAt?: string;
  confirmedAt?: string;
}

const BatchTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [openSendDialog, setOpenSendDialog] = useState(false);

  // Mock data
  const batches: Batch[] = [
    { 
      id: '1', 
      name: 'Lot Janvier 2024', 
      studentsCount: 15,
      status: 'pending', 
      createdAt: '2024-01-01' 
    },
    { 
      id: '2', 
      name: 'Lot Février 2024', 
      studentsCount: 12,
      status: 'sent', 
      createdAt: '2024-02-01',
      sentAt: '2024-02-01 10:00:00'
    },
    { 
      id: '3', 
      name: 'Lot Mars 2024', 
      studentsCount: 18,
      status: 'confirmed', 
      createdAt: '2024-03-01',
      sentAt: '2024-03-01 09:00:00',
      confirmedAt: '2024-03-02 14:30:00'
    },
  ];

  const filteredBatches = batches.filter(batch =>
    batch.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'sent': return 'info';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmé';
      case 'sent': return 'Envoyé';
      case 'pending': return 'En attente';
      default: return 'Inconnu';
    }
  };

  const handleSendBatch = (batch: Batch) => {
    setSelectedBatch(batch);
    setOpenSendDialog(true);
  };

  const handleConfirmSend = () => {
    console.log('Envoi du lot:', selectedBatch?.id);
    setOpenSendDialog(false);
    setSelectedBatch(null);
  };

  const handleCancelSend = () => {
    setOpenSendDialog(false);
    setSelectedBatch(null);
  };

  const handleViewBatch = (batchId: string) => {
    console.log('Voir lot:', batchId);
  };

  const handleDeleteBatch = (batchId: string) => {
    console.log('Supprimer lot:', batchId);
  };

  return (
    <Box>
      <Box className="mb-4 flex gap-4 items-center justify-between">
        <TextField
          label="Rechercher un lot"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search className="mr-2" />
          }}
          className="flex-1"
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{
            backgroundColor: '#50C786',
            '&:hover': { backgroundColor: '#40B676' },
          }}
        >
          Nouveau lot
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom du lot</TableCell>
              <TableCell>Nombre d'élèves</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Date de création</TableCell>
              <TableCell>Date d'envoi</TableCell>
              <TableCell>Date de confirmation</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBatches.map((batch) => (
              <TableRow key={batch.id}>
                <TableCell>{batch.name}</TableCell>
                <TableCell>{batch.studentsCount}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(batch.status)}
                    color={getStatusColor(batch.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{batch.createdAt}</TableCell>
                <TableCell>{batch.sentAt || '-'}</TableCell>
                <TableCell>{batch.confirmedAt || '-'}</TableCell>
                <TableCell>
                  <Box className="flex gap-1">
                    <IconButton
                      size="small"
                      onClick={() => handleViewBatch(batch.id)}
                      title="Voir détails"
                    >
                      <Visibility />
                    </IconButton>
                    {batch.status === 'pending' && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleSendBatch(batch)}
                        title="Envoyer"
                      >
                        <Send />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteBatch(batch.id)}
                      title="Supprimer"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openSendDialog} onClose={handleCancelSend} maxWidth="md" fullWidth>
        <DialogTitle>Confirmation d'envoi</DialogTitle>
        <DialogContent>
          {selectedBatch && (
            <SendForm
              batchId={selectedBatch.id}
              batchName={selectedBatch.name}
              studentsCount={selectedBatch.studentsCount}
              onSend={handleConfirmSend}
              onCancel={handleCancelSend}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default BatchTable;
