import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Chip, 
  Button,
  Box
} from '@mui/material';
import { Visibility, Delete, Download } from '@mui/icons-material';

interface Document {
  id: string;
  type: string;
  name: string;
  size: string;
  uploadedAt: string;
  status: 'uploaded' | 'processing' | 'error';
}

const DocumentsTable: React.FC = () => {
  // Mock data
  const documents: Document[] = [
    { 
      id: '1', 
      type: 'Carte d\'identité', 
      name: 'carte_identite.pdf', 
      size: '2.3 MB',
      uploadedAt: '2024-01-01 10:00:00',
      status: 'uploaded'
    },
    { 
      id: '2', 
      type: 'Photo', 
      name: 'photo.jpg', 
      size: '1.2 MB',
      uploadedAt: '2024-01-01 10:30:00',
      status: 'uploaded'
    },
    { 
      id: '3', 
      type: 'Certificat médical', 
      name: 'certificat_medical.pdf', 
      size: '1.8 MB',
      uploadedAt: '2024-01-01 11:00:00',
      status: 'processing'
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'success';
      case 'processing': return 'info';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'uploaded': return 'Uploadé';
      case 'processing': return 'En cours';
      case 'error': return 'Erreur';
      default: return 'Inconnu';
    }
  };

  const handleViewDocument = (documentId: string) => {
    console.log('Voir document:', documentId);
  };

  const handleDownloadDocument = (documentId: string) => {
    console.log('Télécharger document:', documentId);
  };

  const handleDeleteDocument = (documentId: string) => {
    console.log('Supprimer document:', documentId);
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Nom du fichier</TableCell>
            <TableCell>Taille</TableCell>
            <TableCell>Date d'upload</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell>{document.type}</TableCell>
              <TableCell>{document.name}</TableCell>
              <TableCell>{document.size}</TableCell>
              <TableCell>{document.uploadedAt}</TableCell>
              <TableCell>
                <Chip
                  label={getStatusLabel(document.status)}
                  color={getStatusColor(document.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Box className="flex gap-1">
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => handleViewDocument(document.id)}
                  >
                    Voir
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Download />}
                    onClick={() => handleDownloadDocument(document.id)}
                  >
                    Télécharger
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDeleteDocument(document.id)}
                  >
                    Supprimer
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DocumentsTable;
