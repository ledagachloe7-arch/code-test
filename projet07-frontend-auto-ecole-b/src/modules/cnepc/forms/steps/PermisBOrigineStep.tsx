import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Grid, TextField, FormControl, FormLabel, RadioGroup, Radio, FormControlLabel, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Chip } from '@mui/material';
import { CheckCircle, Verified, Info, Warning, Assignment } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { NumeroPermisParts, PermisFormatType, PermisData } from '../types';
import { buildNumeroOriginePermis, parseNumeroOriginePermisToParts } from '../utils';
import { PermisFromApi } from './NumeroPermisStep';

interface PermisBOrigineStepProps {
  numeroBOriginePermisParts: NumeroPermisParts;
  permisBOrigineFormat: PermisFormatType;
  permisBOrigineData: PermisData;
  loading: boolean;
  /** Fiche d'enregistrement : saisie libre sans appel API « Vérifier le permis » */
  skipVerification?: boolean;
  verifyingPermis?: boolean;
  permisVerified?: boolean;
  verificationError?: string | null;
  candidatNonTrouve?: boolean;
  /** Liste des permis de l'usager (issus de NumeroPermisStep) pour pré-sélection */
  permisListForSelection?: PermisFromApi[] | null;
  onNumeroBOriginePermisPartsChange: (parts: NumeroPermisParts) => void;
  onPermisBOrigineFormatChange: (format: PermisFormatType) => void;
  onPermisBOrigineDataChange: (data: PermisData) => void;
  onVerifyPermis?: () => void;
}

export const PermisBOrigineStep: React.FC<PermisBOrigineStepProps> = ({
  numeroBOriginePermisParts,
  permisBOrigineFormat,
  permisBOrigineData,
  loading,
  skipVerification = false,
  verifyingPermis = false,
  permisVerified = false,
  verificationError = null,
  candidatNonTrouve = false,
  permisListForSelection = null,
  onNumeroBOriginePermisPartsChange,
  onPermisBOrigineFormatChange,
  onPermisBOrigineDataChange,
  onVerifyPermis,
}) => {
  const numPermisBOrigineComplet = buildNumeroOriginePermis(numeroBOriginePermisParts, permisBOrigineFormat);

  // Modal de sélection du permis B d'origine depuis la liste de l'usager
  const [openPickerModal, setOpenPickerModal] = useState(false);
  const [pickerSelectedId, setPickerSelectedId] = useState<string>('');

  const handlePermisPickerConfirm = () => {
    if (!permisListForSelection || !pickerSelectedId) return;
    const selected = permisListForSelection.find(
      (p) => (p.id ?? p.numero_permis ?? '').toString() === pickerSelectedId
    );
    if (!selected) return;
    const { format, parts } = parseNumeroOriginePermisToParts(selected.numero_permis);
    onNumeroBOriginePermisPartsChange(parts);
    onPermisBOrigineFormatChange(format);
    const fmtDate = (d: string | undefined) => (d ? d.split('T')[0] : '');
    onPermisBOrigineDataChange({
      ...permisBOrigineData,
      numero_origine_permis: selected.numero_permis,
      lieu_de_dobtention_du_permis: selected.lieu_obtention || permisBOrigineData.lieu_de_dobtention_du_permis,
      date_de_dobtention_du_permis: fmtDate(selected.date_obtention) || permisBOrigineData.date_de_dobtention_du_permis,
      date_de_delivrance_du_permis: fmtDate(selected.date_obtention) || permisBOrigineData.date_de_delivrance_du_permis,
    });
    setOpenPickerModal(false);
    setPickerSelectedId('');
  };

  // Récupérer numero_origine_permis renvoyé par NumeroPermisStep : pré-remplir avec le bon format (PERM si chiffres seuls, standard si 20051C00014)
  useEffect(() => {
    const fromApi = (permisBOrigineData?.numero_origine_permis || '').trim();
    if (!fromApi) return;
    const currentBuilt = buildNumeroOriginePermis(numeroBOriginePermisParts, permisBOrigineFormat);
    const fromApiNorm = fromApi.replace(/-/g, '').toUpperCase();
    const currentNorm = (currentBuilt || '').replace(/-/g, '').toUpperCase();
    if (fromApiNorm === currentNorm) return;
    const { format, parts } = parseNumeroOriginePermisToParts(fromApi);
    onNumeroBOriginePermisPartsChange(parts);
    onPermisBOrigineFormatChange(format);
  }, [permisBOrigineData?.numero_origine_permis]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Refs pour éviter les déclenchements multiples
  const permisVerifiedRef = useRef(false);
  const verificationErrorRef = useRef<string | null>(null);
  const candidatNonTrouveRef = useRef(false);
  
  
  // Afficher des toasts pour les résultats de vérification
  useEffect(() => {
    if (permisVerified && !permisVerifiedRef.current) {
      permisVerifiedRef.current = true;
      toast.custom(
        (t) => (
          <Box
            onClick={() => toast.dismiss(t.id)}
            sx={{
              p: 3,
              borderRadius: 0,
              background: '#ffffff',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              cursor: 'pointer',
              minWidth: '300px',
              maxWidth: '500px',
              animation: t.visible
                ? 'slideInRight 0.3s ease-out forwards'
                : 'slideOutRight 0.3s ease-in forwards',
              '@keyframes slideInRight': {
                '0%': {
                  transform: 'translateX(100%)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
              },
              '@keyframes slideOutRight': {
                '0%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
                '100%': {
                  transform: 'translateX(100%)',
                  opacity: 0,
                },
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: 3,
                height: '100%',
                background: '#4caf50',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <CheckCircle
                sx={{
                  color: '#4caf50',
                  fontSize: 24,
                  mt: 0.5,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 400,
                    lineHeight: 1.6,
                  }}
                >
                  Le permis B d'origine a été vérifié avec succès et est authentifié.
                </Typography>
              </Box>
            </Box>
          </Box>
        ),
        {
          position: 'bottom-right',
          duration: 5000,
        }
      );
    } else if (!permisVerified) {
      permisVerifiedRef.current = false;
    }
  }, [permisVerified]);

  useEffect(() => {
    if (verificationError && verificationError !== verificationErrorRef.current) {
      verificationErrorRef.current = verificationError;
      toast.custom(
        (t) => (
          <Box
            onClick={() => toast.dismiss(t.id)}
            sx={{
              p: 3,
              borderRadius: 0,
              background: '#ffffff',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              cursor: 'pointer',
              minWidth: '300px',
              maxWidth: '500px',
              animation: t.visible
                ? 'slideInRight 0.3s ease-out forwards'
                : 'slideOutRight 0.3s ease-in forwards',
              '@keyframes slideInRight': {
                '0%': {
                  transform: 'translateX(100%)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
              },
              '@keyframes slideOutRight': {
                '0%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
                '100%': {
                  transform: 'translateX(100%)',
                  opacity: 0,
                },
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: 3,
                height: '100%',
                background: '#d32f2f',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Info
                sx={{
                  color: 'text.secondary',
                  fontSize: 24,
                  mt: 0.5,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 400,
                    lineHeight: 1.6,
                  }}
                >
                  {verificationError}
                </Typography>
              </Box>
            </Box>
          </Box>
        ),
        {
          position: 'bottom-right',
          duration: 5000,
        }
      );
    } else if (!verificationError) {
      verificationErrorRef.current = null;
    }
  }, [verificationError]);

  useEffect(() => {
    if (candidatNonTrouve && permisVerified && !candidatNonTrouveRef.current) {
      candidatNonTrouveRef.current = true;
      toast.custom(
        (t) => (
          <Box
            onClick={() => toast.dismiss(t.id)}
            sx={{
              p: 3,
              borderRadius: 0,
              background: '#ffffff',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              cursor: 'pointer',
              minWidth: '300px',
              maxWidth: '500px',
              animation: t.visible
                ? 'slideInRight 0.3s ease-out forwards'
                : 'slideOutRight 0.3s ease-in forwards',
              '@keyframes slideInRight': {
                '0%': {
                  transform: 'translateX(100%)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
              },
              '@keyframes slideOutRight': {
                '0%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
                '100%': {
                  transform: 'translateX(100%)',
                  opacity: 0,
                },
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: 3,
                height: '100%',
                background: '#ff9800',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Warning
                sx={{
                  color: '#ff9800',
                  fontSize: 24,
                  mt: 0.5,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 600,
                    lineHeight: 1.6,
                    mb: 1,
                  }}
                >
                  Candidat non enregistré
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 400,
                    lineHeight: 1.6,
                  }}
                >
                  Ce candidat n'est pas encore enregistré dans la base de données. Vous devrez créer un compte pour ce candidat. Les prochaines étapes vous permettront de saisir ses informations personnelles et de candidat.
                </Typography>
              </Box>
            </Box>
          </Box>
        ),
        {
          position: 'bottom-right',
          duration: 6000,
        }
      );
    } else if (!candidatNonTrouve || !permisVerified) {
      candidatNonTrouveRef.current = false;
    }
  }, [candidatNonTrouve, permisVerified]);
  
  // Réinitialiser les champs quand on change de format
  const handleFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFormat = event.target.value as PermisFormatType;
    
    // Ne rien faire si le format est le même
    if (newFormat === permisBOrigineFormat) {
      return;
    }
    
    if (newFormat === 'op') {
      // Pour le format PERM, on garde seulement le numéro et on vide les autres champs
      onNumeroBOriginePermisPartsChange({
        annee: '',
        province: '',
        categorie: '',
        numero: numeroBOriginePermisParts.numero || '', // Garder le numéro si déjà saisi
      });
    } else {
      // Pour le format standard, on vide tout si on passait de PERM à standard
      if (permisBOrigineFormat === 'op') {
        onNumeroBOriginePermisPartsChange({
          annee: '',
          province: '',
          categorie: '',
          numero: '',
        });
      }
    }
    // Changer le format
    onPermisBOrigineFormatChange(newFormat);
  };

  // Mettre à jour le numéro d'origine dans permisBOrigineData quand le numéro complet change
  React.useEffect(() => {
    if (numPermisBOrigineComplet && permisBOrigineData.numero_origine_permis !== numPermisBOrigineComplet) {
      onPermisBOrigineDataChange({
        ...permisBOrigineData,
        numero_origine_permis: numPermisBOrigineComplet,
      });
    }
  }, [numPermisBOrigineComplet]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box>
      <Typography variant="subtitle2" color="primary" gutterBottom>
        Informations du permis B d'origine
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Pour obtenir un permis de catégorie C, vous devez fournir les informations de votre permis B d'origine.
      </Typography>

      {/* Bouton de sélection rapide depuis la liste de permis de l'usager */}
      {permisListForSelection && permisListForSelection.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<Assignment />}
            onClick={() => setOpenPickerModal(true)}
            disabled={loading}
          >
            Sélectionner depuis les permis de l'usager ({permisListForSelection.length})
          </Button>
        </Box>
      )}

      {/* Modal de sélection simplifié : numéro permis + nom/prénom */}
      <Dialog open={openPickerModal} onClose={() => { setOpenPickerModal(false); setPickerSelectedId(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>Sélectionner le permis B d'origine</DialogTitle>
        <DialogContent dividers>
          <List disablePadding>
            {permisListForSelection?.map((p) => {
              const id = (p.id ?? p.numero_permis ?? '').toString();
              const nomComplet = [p.nom, p.prenom].filter(Boolean).join(' ') || '—';
              return (
                <ListItem key={id} disablePadding divider>
                  <ListItemButton onClick={() => setPickerSelectedId(id)} selected={pickerSelectedId === id}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Radio checked={pickerSelectedId === id} size="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography fontWeight={600}>{p.numero_permis}</Typography>}
                      secondary={nomComplet}
                    />
                    {p.categorie && <Chip label={`Cat. ${p.categorie}`} size="small" sx={{ ml: 1 }} />}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenPickerModal(false); setPickerSelectedId(''); }} color="inherit">
            Annuler
          </Button>
          <Button onClick={handlePermisPickerConfirm} variant="contained" disabled={!pickerSelectedId}>
            Confirmer la sélection
          </Button>
        </DialogActions>
      </Dialog>

      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">Format du numéro de permis B d'origine</FormLabel>
        <RadioGroup
          row
          value={permisBOrigineFormat}
          onChange={handleFormatChange}
        >
          <FormControlLabel 
            value="standard" 
            control={<Radio />} 
            label="Format standard (AAAA-P-C-NNNN)" 
            disabled={loading}
          />
          <FormControlLabel 
            value="op" 
            control={<Radio />} 
            label="Format PERM (PERM-XXXXXX)" 
            disabled={loading}
          />
        </RadioGroup>
      </FormControl>
      
      {permisBOrigineFormat === 'standard' ? (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Format: AAAA-P-C-NNNN (ex: 2024-1-B-1234) - Minimum 4 chiffres pour le numéro
        </Typography>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Saisissez le numéro de permis B d'origine exact tel qu'il apparaît (ex: PERM-12345678, PERM12345678, ou 12345678)
        </Typography>
      )}
      
      <Grid container spacing={2}>
        {permisBOrigineFormat === 'standard' ? (
          <>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Année d'obtention"
                value={numeroBOriginePermisParts.annee}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  onNumeroBOriginePermisPartsChange({ ...numeroBOriginePermisParts, annee: value });
                }}
                fullWidth
                required
                disabled={loading}
                placeholder="2024"
                helperText="4 chiffres"
                inputProps={{ maxLength: 4 }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                label="Province"
                value={numeroBOriginePermisParts.province}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^1-9]/g, '').slice(0, 1);
                  onNumeroBOriginePermisPartsChange({ ...numeroBOriginePermisParts, province: value });
                }}
                fullWidth
                required
                disabled={loading}
                placeholder="1"
                helperText="1 à 9"
                inputProps={{ maxLength: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                label="Catégorie"
                value={numeroBOriginePermisParts.categorie}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 1);
                  // Seule la catégorie B est acceptée
                  if (value === '' || value === 'B') {
                    onNumeroBOriginePermisPartsChange({ ...numeroBOriginePermisParts, categorie: value });
                  }
                }}
                fullWidth
                required
                disabled={loading}
                placeholder="B"
                helperText={
                  numeroBOriginePermisParts.categorie !== '' && numeroBOriginePermisParts.categorie !== 'B'
                    ? 'Seule la catégorie B est acceptée pour le permis B d\'origine'
                    : 'Catégorie B uniquement'
                }
                inputProps={{ maxLength: 1 }}
                error={numeroBOriginePermisParts.categorie !== '' && numeroBOriginePermisParts.categorie !== 'B'}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                label="Numéro"
                value={numeroBOriginePermisParts.numero}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  onNumeroBOriginePermisPartsChange({ ...numeroBOriginePermisParts, numero: value });
                }}
                fullWidth
                required
                disabled={loading}
                placeholder="1234"
                helperText="Minimum 4 chiffres"
                inputProps={{ minLength: 4, maxLength: 10 }}
              />
            </Grid>
          </>
        ) : (
          <Grid item xs={12} sm={6}>
            <TextField
              label="Numéro de permis B d'origine complet"
              value={numeroBOriginePermisParts.numero}
              onChange={(e) => {
                // Accepter lettres, chiffres et tirets - laisser l'utilisateur saisir exactement ce qu'il veut
                const value = e.target.value.toUpperCase();
                onNumeroBOriginePermisPartsChange({ ...numeroBOriginePermisParts, numero: value });
              }}
              fullWidth
              required
              disabled={loading}
              placeholder="PERM-12345678 ou 12345678"
              helperText="Saisissez le numéro complet exact (ex: PERM-12345678 ou 12345678)"
            />
          </Grid>
        )}
        {numPermisBOrigineComplet && (
          <Grid item xs={12}>
            <Box sx={{ 
              p: 2,
              borderRadius: 0,
              background: '#ffffff',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              display: 'inline-block',
              maxWidth: 'fit-content',
            }}>
              <Box sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: 3,
                height: '100%',
                background: permisVerified ? '#4caf50' : '#1976d2',
              }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography 
                  variant="body1" 
                  sx={{
                    color: 'text.primary',
                    fontWeight: 400,
                    lineHeight: 1.6,
                    pl: 1,
                  }}
                >
                  Numéro de permis B d'origine: <strong>{numPermisBOrigineComplet}</strong>
                  {permisVerified && ' ✓ Vérifié'}
                </Typography>
                {onVerifyPermis && !permisVerified && !skipVerification && (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={onVerifyPermis}
                      disabled={
                        !numPermisBOrigineComplet || 
                        verifyingPermis || 
                        loading || 
                        (permisBOrigineFormat === 'standard' && numeroBOriginePermisParts.categorie !== 'B')
                      }
                      startIcon={verifyingPermis ? <CircularProgress size={16} /> : <Verified />}
                      sx={{ ml: 2 }}
                    >
                      {verifyingPermis ? 'Vérification...' : 'Vérifier le permis'}
                    </Button>
                    {permisBOrigineFormat === 'standard' && numeroBOriginePermisParts.categorie !== 'B' && numeroBOriginePermisParts.categorie !== '' && (
                      <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5, display: 'block' }}>
                        Seule la catégorie B est acceptée pour le permis B d'origine
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            </Box>
          </Grid>
        )}
        
        <Grid item xs={12}>
          <TextField
            label="Lieu d'obtention du permis B"
            value={permisBOrigineData.lieu_de_dobtention_du_permis || ''}
            onChange={(e) => onPermisBOrigineDataChange({ ...permisBOrigineData, lieu_de_dobtention_du_permis: e.target.value })}
            fullWidth
            required
            disabled={loading}
            placeholder="Ex: Dakar, Sénégal"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Date d'obtention du permis B"
            type="date"
            value={permisBOrigineData.date_de_dobtention_du_permis || ''}
            onChange={(e) => onPermisBOrigineDataChange({ ...permisBOrigineData, date_de_dobtention_du_permis: e.target.value })}
            fullWidth
            required
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Date de délivrance du permis B"
            type="date"
            value={permisBOrigineData.date_de_delivrance_du_permis || ''}
            onChange={(e) => onPermisBOrigineDataChange({ ...permisBOrigineData, date_de_delivrance_du_permis: e.target.value })}
            fullWidth
            required
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

