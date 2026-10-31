import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { ReceptionDossier, EpreuvesResultat } from '../types';
import { receptionService } from '../services/reception.service';

interface EpreuveDialogProps {
  open: boolean;
  onClose: () => void;
  dossier: ReceptionDossier | null;
  onSaved?: (results: EpreuvesResultat) => void;
}

const EpreuveDialog: React.FC<EpreuveDialogProps> = ({ open, onClose, dossier, onSaved }) => {
  const [saving, setSaving] = React.useState(false);
  const [values, setValues] = React.useState<EpreuvesResultat>({});

  React.useEffect(() => {
    if (open && dossier) {
      // Utiliser uniquement les épreuves depuis les données du dossier (depuis l'API)
      setValues(dossier.epreuves || {});
    }
  }, [open, dossier]);

  const handleChange = (key: keyof EpreuvesResultat) => (e: any) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
  };

  const handleSave = async () => {
    if (!dossier) return;
    setSaving(true);
    try {
      const payload: EpreuvesResultat = {
        ...values,
        dateSaisie: new Date().toISOString(),
      };
      await receptionService.saveEpreuves(dossier.id, payload);
      onSaved && onSaved(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const SelectField = (
    props: { label: string; value?: string; onChange: (e: any) => void }
  ) => (
    <FormControl fullWidth size="small">
      <InputLabel>{props.label}</InputLabel>
      <Select label={props.label} value={props.value || ''} onChange={props.onChange}>
        <MenuItem value="">Non saisi</MenuItem>
        <MenuItem value="reussi">Réussi</MenuItem>
        <MenuItem value="echoue">Échoué</MenuItem>
        <MenuItem value="absent">Absent</MenuItem>
      </Select>
    </FormControl>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Saisir les résultats d'épreuves</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {dossier ? `${dossier.candidatNom} ${dossier.candidatPrenom} • ${dossier.reference}` : ''}
          </Typography>
          {SelectField({ label: 'Créneaux', value: values.creneaux, onChange: handleChange('creneaux') })}
          {SelectField({ label: 'Code de conduite', value: values.codeConduite, onChange: handleChange('codeConduite') })}
          {SelectField({ label: 'Tour de ville', value: values.tourVille, onChange: handleChange('tourVille') })}
          <TextField
            label="Notes (optionnel)"
            size="small"
            value={values.notes || ''}
            onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            multiline
            minRows={2}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Fermer</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EpreuveDialog;


