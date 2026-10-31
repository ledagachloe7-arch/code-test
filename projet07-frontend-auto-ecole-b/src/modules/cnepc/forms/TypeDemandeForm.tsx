import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { typeDemandeService } from '../services/type-demande.service';
import { TypeDemande, TypeDemandeFormData } from '../types/type-demande';

interface TypeDemandeFormProps {
  typeDemande?: TypeDemande;
  open: boolean;
  onSuccess: (typeDemande: TypeDemande) => void;
  onCancel: () => void;
}

const TypeDemandeForm: React.FC<TypeDemandeFormProps> = ({
  typeDemande,
  open,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<TypeDemandeFormData>({
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeDemande) {
      setFormData({
        name: typeDemande.name || '',
      });
    } else {
      setFormData({
        name: '',
      });
    }
    setError(null);
    setSuccess(null);
  }, [typeDemande, open]);

  const handleChange = (field: keyof TypeDemandeFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name || formData.name.trim() === '') {
      setError('Le nom du type de demande est requis');
      return false;
    }
    return true;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let response;
      if (typeDemande) {
        // Mise à jour d'un type de demande existant
        console.log('🔄 Mise à jour du type de demande:', typeDemande.id);
        response = await typeDemandeService.updateTypeDemande(typeDemande.id, formData);
      } else {
        // Création d'un nouveau type de demande
        console.log('➕ Création d\'un nouveau type de demande');
        response = await typeDemandeService.createTypeDemande(formData);
      }

      // Vérification de la réponse
      if (response.success && response.data) {
        console.log('✅ Type de demande sauvegardé:', response.data);
        setSuccess(response.message || 'Type de demande sauvegardé avec succès !');

        // Attendre un peu pour que l'utilisateur voie le message de succès
        setTimeout(() => {
          onSuccess(response.data!);
        }, 1500);
      } else {
        console.error('❌ Échec de la réponse:', response);
        setError(response.message || 'Une erreur est survenue');
      }
    } catch (err: any) {
      console.error('💥 === ERREUR LORS DE LA SOUMISSION ===');
      console.error('Erreur complète:', err);

      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Une erreur inattendue est survenue lors de la sauvegarde';

      setError(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '' });
    setError(null);
    setSuccess(null);
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {typeDemande ? 'Modifier le type de demande' : 'Nouveau type de demande'}
      </DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

            <TextField
              label="Nom du type de demande"
              value={formData.name}
              onChange={handleChange('name')}
              required
              fullWidth
              disabled={loading}
              helperText="Entrez le nom du type de demande"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Enregistrement...' : typeDemande ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TypeDemandeForm;

