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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Send, Refresh, Visibility, Delete, Add } from '@mui/icons-material';
import { cnepcService, batchService } from './index';
import { Batch, CNEPCStatus, BatchStatus } from '../types';

const CNEPCServiceExample: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [cnepcStatus, setCNEPCStatus] = useState<CNEPCStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  // Charger les lots
  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const data = await batchService.getBatches();
      setBatches(data);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier le statut CNEPC
  const checkCNEPCStatus = async () => {
    try {
      const status = await cnepcService.getCNEPCStatus();
      setCNEPCStatus(status);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // Charger les données au montage
  useEffect(() => {
    loadBatches();
    checkCNEPCStatus();
  }, []);

  // Envoyer un lot au CNEPC
  const handleSendBatch = async (batchId: string) => {
    try {
      const response = await cnepcService.sendBatch(batchId);
      setMessage({ type: 'success', text: `Lot envoyé: ${response.message}` });
      loadBatches();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // Vérifier le statut d'un lot
  const handleCheckBatchStatus = async (batchId: string) => {
    try {
      const status = await cnepcService.getBatchStatus(batchId);
      setBatchStatus(status);
      setSelectedBatch(batches.find(b => b.id === batchId) || null);
      setOpenDialog(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // Relancer un lot échoué
  const handleRetryBatch = async (batchId: string) => {
    try {
      const response = await cnepcService.retryFailedBatch(batchId);
      setMessage({ type: 'success', text: `Nouvelle tentative: ${response.message}` });
      loadBatches();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // Supprimer un lot
  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce lot ?')) {
      return;
    }

    try {
      await batchService.deleteBatch(batchId);
      setMessage({ type: 'success', text: 'Lot supprimé avec succès !' });
      loadBatches();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'info';
      case 'sent': return 'primary';
      case 'ready': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'ready': return 'Prêt';
      case 'sent': return 'Envoyé';
      case 'processing': return 'En cours';
      case 'completed': return 'Terminé';
      case 'failed': return 'Échoué';
      default: return 'Inconnu';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Service CNEPC - Exemple
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

      {/* Statut CNEPC */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Statut CNEPC
          </Typography>
          
          {cnepcStatus ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={cnepcStatus.isOnline ? 'En ligne' : 'Hors ligne'}
                color={cnepcStatus.isOnline ? 'success' : 'error'}
              />
              <Typography variant="body2">
                Dernière vérification: {new Date(cnepcStatus.lastCheck).toLocaleString()}
              </Typography>
              {cnepcStatus.version && (
                <Typography variant="body2" color="text.secondary">
                  Version: {cnepcStatus.version}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography color="text.secondary">Vérification du statut...</Typography>
          )}
          
          <Button 
            variant="outlined" 
            onClick={checkCNEPCStatus}
            sx={{ mt: 2 }}
          >
            <Refresh sx={{ mr: 1 }} />
            Vérifier le statut
          </Button>
        </CardContent>
      </Card>

      {/* Liste des lots */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Lots CNEPC ({batches.length})
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={() => {/* TODO: Ouvrir formulaire de création */}}
            >
              Nouveau lot
            </Button>
          </Box>
          
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : batches.length === 0 ? (
            <Typography color="text.secondary">
              Aucun lot trouvé
            </Typography>
          ) : (
            <List>
              {batches.map((batch) => (
                <ListItem key={batch.id} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">{batch.name}</Typography>
                        <Chip 
                          label={getStatusLabel(batch.status)} 
                          size="small" 
                          color={getStatusColor(batch.status) as any}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {batch.students.length} élève(s) | Créé le: {new Date(batch.createdAt).toLocaleDateString()}
                        </Typography>
                        {batch.description && (
                          <Typography variant="body2" color="text.secondary">
                            {batch.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {batch.status === 'ready' && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleSendBatch(batch.id)}
                        title="Envoyer au CNEPC"
                      >
                        <Send />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleCheckBatchStatus(batch.id)}
                      title="Vérifier le statut"
                    >
                      <Visibility />
                    </IconButton>
                    {batch.status === 'failed' && (
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => handleRetryBatch(batch.id)}
                        title="Relancer"
                      >
                        <Refresh />
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
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Dialog de statut */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Statut du lot: {selectedBatch?.name}
        </DialogTitle>
        <DialogContent>
          {batchStatus && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Progression: {batchStatus.progress}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={batchStatus.progress} 
                sx={{ mb: 2 }}
              />
              <Typography variant="body1" gutterBottom>
                Statut: {batchStatus.status}
              </Typography>
              {batchStatus.message && (
                <Typography variant="body2" color="text.secondary">
                  Message: {batchStatus.message}
                </Typography>
              )}
              {batchStatus.completedAt && (
                <Typography variant="body2" color="text.secondary">
                  Terminé le: {new Date(batchStatus.completedAt).toLocaleString()}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CNEPCServiceExample;
