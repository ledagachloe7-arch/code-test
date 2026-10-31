import React, { useEffect, useRef, useState } from 'react';
import { Grid, Typography, TextField, Box, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Chip } from '@mui/material';
import { CheckCircle, Info, Warning, Assignment } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { NumeroPermisParts, PermisFormatType } from '../types';
import { buildNumeroOriginePermis, parseNumeroOriginePermisToParts } from '../utils';
import { PermisFromApi } from './NumeroPermisStep';

interface PermisOrigineStepProps {
  numeroOriginePermisParts: NumeroPermisParts;
  loading: boolean;
  permisOrigineFormat: PermisFormatType;
  /** Lieu d'origine (lieu_origine de l'API) */
  lieuOrigine?: string;
  /** Numéro de permis d'origine renvoyé par l'API (NumeroPermisStep) — utilisé pour pré-remplir avec le bon format (PERM ou standard) */
  numeroOriginePermis?: string;
  verifyingPermis?: boolean;
  permisVerified?: boolean;
  verificationError?: string | null;
  candidatNonTrouve?: boolean;
  /** Liste des permis de l'usager (issus de NumeroPermisStep) pour pré-sélection du permis d'origine */
  permisListForSelection?: PermisFromApi[] | null;
  onNumeroOriginePermisPartsChange: (parts: NumeroPermisParts) => void;
  onPermisOrigineFormatChange: (format: PermisFormatType) => void;
  onLieuOrigineChange?: (lieu: string) => void;
  onVerifyPermis?: () => void;
}

export const PermisOrigineStep: React.FC<PermisOrigineStepProps> = ({
  numeroOriginePermisParts,
  loading,
  permisOrigineFormat,
  lieuOrigine = '',
  numeroOriginePermis,
  verifyingPermis: _verifyingPermis = false,
  permisVerified = false,
  verificationError = null,
  candidatNonTrouve = false,
  permisListForSelection = null,
  onNumeroOriginePermisPartsChange,
  onPermisOrigineFormatChange,
  onLieuOrigineChange,
  onVerifyPermis: _onVerifyPermis,
}) => {
  const numPermisOrigineComplet = buildNumeroOriginePermis(numeroOriginePermisParts, permisOrigineFormat);

  // Modal de sélection du permis d'origine depuis la liste de l'usager
  const [openPickerModal, setOpenPickerModal] = useState(false);
  const [pickerSelectedId, setPickerSelectedId] = useState<string>('');

  const handlePermisPickerConfirm = () => {
    if (!permisListForSelection || !pickerSelectedId) return;
    const selected = permisListForSelection.find(
      (p) => (p.id ?? p.numero_permis ?? '').toString() === pickerSelectedId
    );
    if (!selected) return;
    const { format, parts } = parseNumeroOriginePermisToParts(selected.numero_permis);
    onNumeroOriginePermisPartsChange(parts);
    onPermisOrigineFormatChange(format);
    if (selected.lieu_obtention) {
      onLieuOrigineChange?.(selected.lieu_obtention);
    }
    setOpenPickerModal(false);
    setPickerSelectedId('');
  };

  // Log des données reçues à l'ouverture de l'étape
  useEffect(() => {
    console.log('[PermisOrigineStep] Données reçues à l\'ouverture de l\'étape:', {
      numeroOriginePermisParts,
      permisOrigineFormat,
      lieuOrigine,
      numeroOriginePermis,
      numPermisOrigineComplet,
      loading,
      permisVerified,
      verificationError,
      candidatNonTrouve,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Récupérer numero_origine_permis renvoyé par NumeroPermisStep : pré-remplir avec le bon format (PERM si chiffres seuls, standard si 20051C00014)
  useEffect(() => {
    const fromApi = (numeroOriginePermis ?? '').trim();
    if (!fromApi) return;
    const currentBuilt = buildNumeroOriginePermis(numeroOriginePermisParts, permisOrigineFormat);
    const fromApiNorm = fromApi.replace(/-/g, '').toUpperCase();
    const currentNorm = (currentBuilt || '').replace(/-/g, '').toUpperCase();
    if (fromApiNorm === currentNorm) return;
    const { format, parts } = parseNumeroOriginePermisToParts(fromApi);
    onNumeroOriginePermisPartsChange(parts);
    onPermisOrigineFormatChange(format);
  }, [numeroOriginePermis]); // eslint-disable-line react-hooks/exhaustive-deps

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
                  Le permis d'origine a été vérifié avec succès.
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
                  Usager non enregistré
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 400,
                    lineHeight: 1.6,
                  }}
                >
                  Cet usager n'est pas enregistré dans le système. Vous devrez créer un compte pour cet usager. Les prochaines étapes vous permettront de saisir ses informations personnelles et de candidat.
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

  // Réinitialiser les champs quand on change de format pour le numéro d'origine
  const handleFormatChange = (newFormat: PermisFormatType) => {
    onPermisOrigineFormatChange(newFormat);
    if (newFormat === 'op') {
      onNumeroOriginePermisPartsChange({
        annee: '',
        province: '',
        categorie: '',
        numero: numeroOriginePermisParts.numero, // Garder le numéro si déjà saisi
      });
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="subtitle2" color="primary" gutterBottom>
          Numéro de permis d'origine (obligatoire)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Le numéro de permis d'origine est requis pour les permis de catégorie C, D ou E.
        </Typography>
      </Grid>

      {/* Bouton de sélection rapide depuis la liste de permis de l'usager */}
      {permisListForSelection && permisListForSelection.length > 0 && (
        <Grid item xs={12}>
          <Button
            variant="outlined"
            startIcon={<Assignment />}
            onClick={() => setOpenPickerModal(true)}
            disabled={loading}
          >
            Sélectionner depuis les permis de l'usager ({permisListForSelection.length})
          </Button>
        </Grid>
      )}

      {/* Modal de sélection simplifié : numéro permis + nom/prénom */}
      <Dialog open={openPickerModal} onClose={() => { setOpenPickerModal(false); setPickerSelectedId(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>Sélectionner le permis d'origine</DialogTitle>
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

      <Grid item xs={12}>
        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel component="legend">Format du numéro de permis d'origine</FormLabel>
          <RadioGroup
            row
            value={permisOrigineFormat}
            onChange={(e) => handleFormatChange(e.target.value as PermisFormatType)}
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
      </Grid>
      
      {permisOrigineFormat === 'standard' ? (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block', ml: 2 }}>
          Format: AAAA-P-C-NNNN (ex: 2024-1-A-1234) - Minimum 4 chiffres pour le numéro
        </Typography>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block', ml: 2 }}>
          Saisissez le numéro de permis d'origine exact tel qu'il apparaît (ex: PERM-12345678, PERM12345678, ou 12345678)
        </Typography>
      )}
      
      <Grid container spacing={2}>
        {permisOrigineFormat === 'standard' ? (
          <>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Année d'obtention"
                value={numeroOriginePermisParts.annee}
                onChange={(e) => onNumeroOriginePermisPartsChange({ ...numeroOriginePermisParts, annee: e.target.value })}
                fullWidth
                required
                disabled={loading}
                placeholder="2024"
                helperText="4 chiffres"
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                label="Province"
                value={numeroOriginePermisParts.province}
                onChange={(e) => onNumeroOriginePermisPartsChange({ ...numeroOriginePermisParts, province: e.target.value })}
                fullWidth
                required
                disabled={loading}
                placeholder="1"
                helperText="1 à 9"
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                label="Catégorie"
                value={numeroOriginePermisParts.categorie}
                onChange={(e) => onNumeroOriginePermisPartsChange({ ...numeroOriginePermisParts, categorie: e.target.value.toUpperCase().slice(0, 1) })}
                fullWidth
                required
                disabled={loading}
                placeholder="B"
                helperText={
                  numeroOriginePermisParts.categorie !== '' && numeroOriginePermisParts.categorie !== 'B'
                    ? 'Seule la catégorie B est acceptée pour le permis d\'origine'
                    : 'Catégorie B uniquement'
                }
                error={numeroOriginePermisParts.categorie !== '' && numeroOriginePermisParts.categorie !== 'B'}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                label="Numéro"
                value={numeroOriginePermisParts.numero}
                onChange={(e) => onNumeroOriginePermisPartsChange({ ...numeroOriginePermisParts, numero: e.target.value })}
                fullWidth
                required
                disabled={loading}
                placeholder="1234"
                helperText="Minimum 4 chiffres"
              />
            </Grid>
          </>
        ) : (
          <Grid item xs={12} sm={6}>
            <TextField
              label="Numéro de permis d'origine complet"
              value={numeroOriginePermisParts.numero}
              onChange={(e) => onNumeroOriginePermisPartsChange({ ...numeroOriginePermisParts, numero: e.target.value })}
              fullWidth
              required
              disabled={loading}
              placeholder="PERM-12345678 ou 12345678"
              helperText="Saisissez le numéro complet exact (ex: PERM-12345678 ou 12345678)"
            />
          </Grid>
        )}
        {buildNumeroOriginePermis(numeroOriginePermisParts, permisOrigineFormat) && (
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
              <Typography 
                variant="body1" 
                sx={{
                  color: 'text.primary',
                  fontWeight: 400,
                  lineHeight: 1.6,
                  pl: 1,
                }}
              >
                Numéro de permis d'origine: <strong>{buildNumeroOriginePermis(numeroOriginePermisParts, permisOrigineFormat)}</strong>
                {permisVerified && ' ✓ Vérifié'}
              </Typography>
            </Box>
          </Grid>
        )}
        
        {/* Champ Lieu d'origine */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Lieu d'origine"
            value={lieuOrigine}
            onChange={(e) => onLieuOrigineChange?.(e.target.value)}
            fullWidth
            required
            disabled={loading}
            placeholder="Libreville"
            helperText="Lieu d'obtention du permis d'origine"
          />
        </Grid>
      </Grid>
    </Grid>
  );
};

