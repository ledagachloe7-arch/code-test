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
  FormControlLabel,
  Switch,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import { pieceJustificativeService } from '../services/piece-justificative.service';
import { PieceJustificative, PieceJustificativeFormData } from '../types/piece-justificative';
import { circuitSuiviService, EtapeCircuit } from '../../reception/services/circuit-suivi.service';
import { referentielService } from '../../cnepc/services/referentiel.service';
import { Referentiel } from '../../cnepc/types/auto-ecole';

interface PieceJustificativeFormProps {
  pieceJustificative?: PieceJustificative;
  open: boolean;
  onSuccess: (pieceJustificative: PieceJustificative) => void;
  onCancel: () => void;
}

const PieceJustificativeForm: React.FC<PieceJustificativeFormProps> = ({
  pieceJustificative,
  open,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<PieceJustificativeFormData>({
    etape_id: '',
    type_document_id: '',
    code: '',
    libelle: '',
    format_attendu: '',
    obligatoire: false,
    delivery_date: '',
    expiration_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [etapes, setEtapes] = useState<EtapeCircuit[]>([]);
  const [typeDocuments, setTypeDocuments] = useState<Referentiel[]>([]);
  const [loadingEtapes, setLoadingEtapes] = useState(false);
  const [loadingTypeDocuments, setLoadingTypeDocuments] = useState(false);

  // Charger les étapes (tous circuits) et les types de document (référentiels type_document)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadEtapes = async () => {
      setLoadingEtapes(true);
      try {
        const circuits = await circuitSuiviService.getCircuitsActifs();
        const byId = new Map<string, EtapeCircuit>();
        for (const circuit of circuits) {
          if (!circuit.id || cancelled) continue;
          const list = await circuitSuiviService.getEtapesByCircuitId(circuit.id);
          list.forEach((e: EtapeCircuit) => byId.set(e.id, e));
        }
        if (!cancelled) setEtapes(Array.from(byId.values()));
      } catch (err) {
        console.error('Erreur chargement étapes:', err);
        if (!cancelled) setEtapes([]);
      } finally {
        if (!cancelled) setLoadingEtapes(false);
      }
    };
    const loadTypeDocuments = async () => {
      setLoadingTypeDocuments(true);
      try {
        const list = await referentielService.getAllReferentielsByType('type_document');
        if (!cancelled) setTypeDocuments(list || []);
      } catch (err) {
        console.error('Erreur chargement types de document (référentiels):', err);
        if (!cancelled) setTypeDocuments([]);
      } finally {
        if (!cancelled) setLoadingTypeDocuments(false);
      }
    };
    loadEtapes();
    loadTypeDocuments();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (pieceJustificative) {
      setFormData({
        etape_id: pieceJustificative.etape_id || '',
        type_document_id: pieceJustificative.type_document_id || '',
        code: pieceJustificative.code || '',
        libelle: pieceJustificative.libelle || '',
        format_attendu: pieceJustificative.format_attendu || '',
        obligatoire: pieceJustificative.obligatoire || false,
        delivery_date: pieceJustificative.delivery_date || '',
        expiration_date: pieceJustificative.expiration_date || '',
      });
    } else {
      setFormData({
        etape_id: '',
        type_document_id: '',
        code: '',
        libelle: '',
        format_attendu: '',
        obligatoire: false,
        delivery_date: '',
        expiration_date: '',
      });
    }
    setError(null);
    setSuccess(null);
  }, [pieceJustificative, open]);

  const handleChange = (field: keyof PieceJustificativeFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(null);
  };

  const handleSwitchChange = (field: keyof PieceJustificativeFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.checked,
    }));
    setError(null);
  };

  const handleSelectChange = (field: keyof PieceJustificativeFormData) => (
    event: SelectChangeEvent<string>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.code || formData.code.trim() === '') {
      setError('Le code est requis');
      return false;
    }
    if (!formData.libelle || formData.libelle.trim() === '') {
      setError('Le libellé est requis');
      return false;
    }
    if (!formData.etape_id || formData.etape_id.trim() === '') {
      setError('L\'ID de l\'étape est requis');
      return false;
    }
    if (!formData.type_document_id || formData.type_document_id.trim() === '') {
      setError('L\'ID du type de document est requis');
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
      if (pieceJustificative) {
        // Mise à jour d'une pièce justificative existante
        console.log('🔄 Mise à jour de la pièce justificative:', pieceJustificative.id);
        response = await pieceJustificativeService.updatePieceJustificative(pieceJustificative.id, formData);
      } else {
        // Création d'une nouvelle pièce justificative
        console.log('➕ Création d\'une nouvelle pièce justificative');
        response = await pieceJustificativeService.createPieceJustificative(formData);
      }

      // Vérification de la réponse
      if (response.success && response.data) {
        console.log('✅ Pièce justificative sauvegardée:', response.data);
        setSuccess(response.message || 'Pièce justificative sauvegardée avec succès !');

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
    setFormData({
      etape_id: '',
      type_document_id: '',
      code: '',
      libelle: '',
      format_attendu: '',
      obligatoire: false,
      delivery_date: '',
      expiration_date: '',
    });
    setError(null);
    setSuccess(null);
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column' }}>
        <DialogTitle>
          {pieceJustificative ? 'Modifier la pièce justificative' : 'Nouvelle pièce justificative'}
        </DialogTitle>
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

            <FormControl fullWidth required disabled={loading || loadingEtapes}>
              <InputLabel id="etape-select-label">Étape</InputLabel>
              <Select
                labelId="etape-select-label"
                id="etape_id"
                value={formData.etape_id}
                label="Étape"
                onChange={handleSelectChange('etape_id')}
                displayEmpty
                renderValue={(v) => {
                  if (!v) return '';
                  const e = etapes.find((x) => x.id === v);
                  return e ? e.libelle : v;
                }}
              >
                <MenuItem value="">
                  <em>{loadingEtapes ? 'Chargement…' : 'Sélectionner une étape'}</em>
                </MenuItem>
                {etapes.map((etape) => (
                  <MenuItem key={etape.id} value={etape.id}>
                    {etape.libelle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required disabled={loading || loadingTypeDocuments}>
              <InputLabel id="type-document-select-label">Type de document</InputLabel>
              <Select
                labelId="type-document-select-label"
                id="type_document_id"
                value={formData.type_document_id}
                label="Type de document"
                onChange={handleSelectChange('type_document_id')}
                displayEmpty
                renderValue={(v) => {
                  if (!v) return '';
                  const r = typeDocuments.find((x) => x.id === v);
                  return r ? r.libelle : v;
                }}
              >
                <MenuItem value="">
                  <em>{loadingTypeDocuments ? 'Chargement…' : 'Sélectionner un type de document'}</em>
                </MenuItem>
                {typeDocuments.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.libelle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Code"
              value={formData.code}
              onChange={handleChange('code')}
              required
              fullWidth
              disabled={loading}
              helperText="Entrez le code de la pièce justificative"
            />

            <TextField
              label="Libellé"
              value={formData.libelle}
              onChange={handleChange('libelle')}
              required
              fullWidth
              disabled={loading}
              helperText="Entrez le libellé de la pièce justificative"
            />

            <TextField
              label="Format attendu"
              value={formData.format_attendu}
              onChange={handleChange('format_attendu')}
              fullWidth
              disabled={loading}
              helperText="Entrez le format attendu (ex: PDF, JPG, etc.)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.obligatoire}
                  onChange={handleSwitchChange('obligatoire')}
                  disabled={loading}
                />
              }
              label="Obligatoire"
            />

            <TextField
              label="Date de livraison"
              type="date"
              value={formData.delivery_date}
              onChange={handleChange('delivery_date')}
              fullWidth
              disabled={loading}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Date de livraison prévue"
            />

            <TextField
              label="Date d'expiration"
              type="date"
              value={formData.expiration_date}
              onChange={handleChange('expiration_date')}
              fullWidth
              disabled={loading}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Date d'expiration de la pièce justificative"
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
            {loading ? 'Enregistrement...' : pieceJustificative ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default PieceJustificativeForm;

