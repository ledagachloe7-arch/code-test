import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
} from '@mui/material';

interface DateExamenDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (dateExamen: string) => Promise<void>;
  loading?: boolean;
}

// Fonction pour vérifier si une date est un mercredi (3) ou samedi (6)
const isMercrediOuSamedi = (dateString: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const dayOfWeek = date.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
  return dayOfWeek === 3 || dayOfWeek === 6; // 3 = Mercredi, 6 = Samedi
};

// Fonction pour obtenir le prochain mercredi ou samedi disponible
const getNextAvailableDate = (): string => {
  const today = new Date();
  const daysUntilWednesday = (3 - today.getDay() + 7) % 7 || 7;
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
  
  const nextWednesday = new Date(today);
  nextWednesday.setDate(today.getDate() + daysUntilWednesday);
  
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  
  // Retourner le plus proche
  return nextWednesday <= nextSaturday 
    ? nextWednesday.toISOString().split('T')[0]
    : nextSaturday.toISOString().split('T')[0];
};

export const DateExamenDialog: React.FC<DateExamenDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading = false
}) => {
  const [dateExamen, setDateExamen] = useState<string>('');
  const [dateExamenError, setDateExamenError] = useState<string>('');

  useEffect(() => {
    if (open) {
      setDateExamen(getNextAvailableDate());
      setDateExamenError('');
    }
  }, [open]);

  const handleDateExamenChange = (value: string) => {
    setDateExamen(value);
    setDateExamenError('');
    
    if (value && !isMercrediOuSamedi(value)) {
      setDateExamenError('La date doit être un mercredi ou un samedi');
    }
  };

  const handleConfirm = async () => {
    if (!dateExamen) {
      setDateExamenError('Veuillez sélectionner une date');
      return;
    }

    if (!isMercrediOuSamedi(dateExamen)) {
      setDateExamenError('La date doit être un mercredi ou un samedi');
      return;
    }

    await onConfirm(dateExamen);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Sélectionner la date d'examen</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Veuillez sélectionner une date d'examen. Seuls les mercredis et samedis sont autorisés.
        </Alert>
        <TextField
          fullWidth
          label="Date d'examen"
          type="date"
          value={dateExamen}
          onChange={(e) => handleDateExamenChange(e.target.value)}
          error={!!dateExamenError}
          helperText={dateExamenError || 'Sélectionnez un mercredi ou un samedi'}
          InputLabelProps={{ shrink: true }}
          inputProps={{
            min: new Date().toISOString().split('T')[0],
          }}
          sx={{ mt: 2 }}
        />
        {dateExamen && isMercrediOuSamedi(dateExamen) && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Date valide : {new Date(dateExamen).toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Annuler</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!dateExamen || !!dateExamenError || !isMercrediOuSamedi(dateExamen) || loading}
        >
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

