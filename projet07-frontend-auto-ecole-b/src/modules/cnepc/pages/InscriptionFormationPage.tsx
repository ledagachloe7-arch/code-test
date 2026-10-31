import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { InscriptionFormationForm } from '../forms';
import { autoEcoleService } from '../services';
import type { AutoEcole } from '../types/auto-ecole';
const InscriptionFormationPage: React.FC = () => {
  const { autoEcoleId } = useParams<{ autoEcoleId: string }>();
  const navigate = useNavigate();
  const [autoEcole, setAutoEcole] = useState<AutoEcole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoEcoleId) {
      setError('Identifiant de l\'auto-école manquant.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await autoEcoleService.getAutoEcoleById(autoEcoleId);
        if (!cancelled) setAutoEcole(data);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Impossible de charger l\'auto-école.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [autoEcoleId]);

  const handleSuccess = () => {
    navigate(-1);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !autoEcole) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Auto-école introuvable.'}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Vérifiez l’URL ou revenez à la liste des auto-écoles.
        </Typography>
      </Box>
    );
  }

  return (
    <InscriptionFormationForm
      variant="page"
      autoEcole={autoEcole}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

export default InscriptionFormationPage;
