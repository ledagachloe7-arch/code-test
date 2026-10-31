import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Button,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import { CheckCircle, ArrowBack, ErrorOutline, School } from '@mui/icons-material';
import { Referentiel, Formation, autoEcoleService } from '../../services';
import { FormationData } from '../types';
import { useCnepcBundle } from '../hooks';

interface FinalisationStepProps {
  formationData: FormationData;
  referentiels: Referentiel[];
  loadingReferentiels: boolean;
  loading: boolean;
  onFormationDataChange: (data: FormationData) => void;
  onSubmit: () => Promise<void>;
  onBack?: () => void;
  error?: string | null;
  /** Si défini, bloque la création tant que la liste retournée n’est pas vide */
  getReadinessErrors?: () => string[];
  /** Référentiel type permis requis (liste métier dossier) */
  referencielRequired?: boolean;
  /** Province / centre du dossier = ceux de l’agent (affichage lecture seule, remplis par le parent) */
  dossierLieuFromAgent?: boolean;
  agentLieuLabels?: { province: string; centre: string };
  agentLieuLoading?: boolean;
  agentLieuError?: string | null;
  /** Renouvellement / duplicata : sélection manuelle CNEPC (GET /auto-ecoles/cnepc) */
  showCnepcTraining?: boolean;
  autoEcoleId?: string;
  onAutoEcoleChange?: (autoEcoleId: string) => void;
  onFormationChange?: (formationId: string) => void;
}

function formationTypePermisId(f: Formation): string {
  return (
    f.type_permis_id ||
    (f.type_permis as { id?: string } | undefined)?.id ||
    (f.typePermis as { id?: string } | undefined)?.id ||
    ''
  );
}

function getFormationLabel(f: Formation): string {
  const tp = f.type_permis ?? f.typePermis;
  if (f.nom?.trim()) return f.nom;
  if (f.description?.trim()) return f.description;
  if (tp && typeof tp === 'object') {
    const lib = 'libelle' in tp ? tp.libelle : 'nom' in tp ? (tp as { nom?: string }).nom : '';
    if (typeof lib === 'string' && lib.trim()) return lib;
    const code = 'code' in tp ? tp.code : '';
    if (typeof code === 'string' && code.trim()) return code;
  }
  return f.id;
}

function getFormationPrice(f: Formation): string | null {
  const raw = f.montant_formate ?? f.montant;
  if (raw == null || raw === '') return null;
  const s = String(raw);
  if (!s.trim()) return null;
  if (s.includes('€') || s.toLowerCase().includes('cfa')) return s;
  const num = Number(raw);
  if (Number.isNaN(num)) return s;
  return String(num);
}

export const FinalisationStep: React.FC<FinalisationStepProps> = ({
  formationData,
  referentiels,
  loadingReferentiels,
  loading,
  onFormationDataChange,
  onSubmit,
  onBack,
  error,
  getReadinessErrors,
  referencielRequired,
  dossierLieuFromAgent,
  agentLieuLabels,
  agentLieuLoading,
  agentLieuError,
  showCnepcTraining = false,
  autoEcoleId = '',
  onAutoEcoleChange,
  onFormationChange,
}) => {
  const [readinessErrors, setReadinessErrors] = useState<string[]>([]);
  const [formationsList, setFormationsList] = useState<Formation[]>([]);
  const [loadingFormations, setLoadingFormations] = useState(false);
  const {
    autoEcole: cnepcAutoEcole,
    formations: cnepcFormations,
    loading: loadingCnepc,
    error: cnepcError,
  } = useCnepcBundle(showCnepcTraining);

  const patchFormationData = useCallback(
    (data: FormationData) => {
      setReadinessErrors([]);
      onFormationDataChange(data);
    },
    [onFormationDataChange]
  );

  /** Même logique que DossierForm : formations du bundle CNEPC ou GET /formations?auto_ecole_id= */
  useEffect(() => {
    if (!showCnepcTraining) {
      setFormationsList([]);
      return;
    }

    const cnepcId = cnepcAutoEcole?.id;
    if (autoEcoleId && cnepcId && autoEcoleId === cnepcId && cnepcFormations.length > 0) {
      setFormationsList(cnepcFormations);
      return;
    }

    if (!autoEcoleId) {
      setFormationsList(cnepcFormations);
      return;
    }

    let cancelled = false;
    setLoadingFormations(true);
    void autoEcoleService
      .getFormationsByAutoEcole(autoEcoleId)
      .then((list) => {
        if (cancelled) return;
        const active = (Array.isArray(list) ? list : []).filter((f) => f.statut !== false);
        setFormationsList(active.length > 0 ? active : cnepcFormations);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Erreur chargement formations:', err);
          setFormationsList(cnepcFormations);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFormations(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showCnepcTraining, autoEcoleId, cnepcAutoEcole?.id, cnepcFormations]);

  useEffect(() => {
    if (!showCnepcTraining || autoEcoleId || !cnepcAutoEcole?.id || !onAutoEcoleChange) return;
    onAutoEcoleChange(cnepcAutoEcole.id);
  }, [showCnepcTraining, autoEcoleId, cnepcAutoEcole?.id, onAutoEcoleChange]);

  const handleFormationPick = useCallback(
    (formationId: string) => {
      onFormationChange?.(formationId);
      const f = formationsList.find((x) => x.id === formationId);
      const refId = f ? formationTypePermisId(f) : '';
      patchFormationData({
        ...formationData,
        formation_id: formationId,
        ...(refId ? { referenciel_id: refId } : {}),
      });
    },
    [onFormationChange, formationsList, formationData, patchFormationData]
  );

  const handleSubmitClick = async () => {
    if (getReadinessErrors) {
      const issues = getReadinessErrors();
      if (issues.length > 0) {
        setReadinessErrors(issues);
        return;
      }
      setReadinessErrors([]);
    }
    await onSubmit();
  };

  const referencielLabel =
    referencielRequired ? 'Type de permis (référentiel) *' : 'Type de permis (référentiel)';

  const cnepcSelectDisabled =
    loading || loadingCnepc || loadingFormations || loadingReferentiels;
  const formationsLoading = loadingCnepc || loadingFormations;

  return (
    <Box>
      {getReadinessErrors && readinessErrors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setReadinessErrors([])}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Dossier incomplet — corrigez les points suivants avant de créer le dossier
          </Typography>
          <List dense disablePadding>
            {readinessErrors.map((msg, i) => (
              <ListItem key={i} sx={{ py: 0, alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
                  <ErrorOutline color="warning" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={msg} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {showCnepcTraining && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Auto-école &amp; formation (CNEPC)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Auto-école via GET /auto-ecoles/cnepc, formations comme dans la modification de dossier.
            La catégorie (référentiel type permis) se met à jour lorsque vous choisissez une formation.
          </Typography>
          {cnepcError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cnepcError}
            </Alert>
          )}

          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel id="finalisation-auto-ecole-label">Auto-école</InputLabel>
            <Select
              labelId="finalisation-auto-ecole-label"
              value={autoEcoleId}
              onChange={(e) => onAutoEcoleChange?.(e.target.value)}
              label="Auto-école"
              disabled={cnepcSelectDisabled || !onAutoEcoleChange}
            >
              <MenuItem value="">
                <em>Sélectionnez une auto-école</em>
              </MenuItem>
              {loadingCnepc ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Chargement CNEPC…
                </MenuItem>
              ) : cnepcAutoEcole ? (
                <MenuItem value={cnepcAutoEcole.id}>
                  {cnepcAutoEcole.nom_auto_ecole}
                </MenuItem>
              ) : (
                <MenuItem disabled>Aucune auto-école CNEPC</MenuItem>
              )}
              {autoEcoleId &&
                cnepcAutoEcole?.id !== autoEcoleId && (
                  <MenuItem value={autoEcoleId}>{autoEcoleId}</MenuItem>
                )}
            </Select>
          </FormControl>

          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel id="finalisation-formation-label">Formation</InputLabel>
            <Select
              labelId="finalisation-formation-label"
              value={formationData.formation_id}
              onChange={(e) => handleFormationPick(e.target.value)}
              label="Formation"
              disabled={cnepcSelectDisabled || !onFormationChange || !autoEcoleId}
            >
              <MenuItem value="">
                <em>Sélectionnez une formation</em>
              </MenuItem>
              {formationsLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Chargement des formations…
                </MenuItem>
              ) : formationsList.length === 0 ? (
                <MenuItem disabled>Aucune formation</MenuItem>
              ) : (
                formationsList.map((f) => {
                  const typePermisLabel =
                    (f.type_permis as { libelle?: string; code?: string } | undefined)?.libelle ||
                    (f.type_permis as { code?: string } | undefined)?.code ||
                    (f.typePermis as { libelle?: string } | undefined)?.libelle;
                  const price = getFormationPrice(f);
                  return (
                    <MenuItem key={f.id} value={f.id}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <School fontSize="small" />
                          <Typography variant="body1" fontWeight="medium">
                            {getFormationLabel(f)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          {typePermisLabel ? (
                            <Chip label={typePermisLabel} size="small" variant="outlined" />
                          ) : null}
                          {price ? (
                            <Chip label={`${price} CFA`} size="small" color="primary" variant="outlined" />
                          ) : null}
                        </Box>
                      </Box>
                    </MenuItem>
                  );
                })
              )}
              {formationData.formation_id &&
                !formationsList.some((f) => f.id === formationData.formation_id) && (
                  <MenuItem value={formationData.formation_id}>
                    {formationData.formation_id}
                  </MenuItem>
                )}
            </Select>
          </FormControl>

          <FormControl fullWidth required={!!referencielRequired} sx={{ mb: 0 }}>
            <InputLabel id="finalisation-referentiel-label">{referencielLabel}</InputLabel>
            <Select
              labelId="finalisation-referentiel-label"
              value={formationData.referenciel_id}
              onChange={(e) =>
                patchFormationData({ ...formationData, referenciel_id: e.target.value })
              }
              label={referencielLabel}
              disabled={loadingReferentiels || loading}
            >
              <MenuItem value="">
                <em>{referencielRequired ? 'Sélectionnez un type de permis' : 'Aucun référentiel'}</em>
              </MenuItem>
              {loadingReferentiels ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Chargement des référentiels...
                </MenuItem>
              ) : referentiels.length === 0 ? (
                <MenuItem disabled>Aucun référentiel disponible</MenuItem>
              ) : (
                referentiels.map((referentiel) => (
                  <MenuItem key={referentiel.id} value={referentiel.id}>
                    {referentiel.libelle || referentiel.code || referentiel.id}
                  </MenuItem>
                ))
              )}
              {formationData.referenciel_id &&
                !referentiels.some((r) => r.id === formationData.referenciel_id) && (
                  <MenuItem value={formationData.referenciel_id}>
                    {formationData.referenciel_id}
                  </MenuItem>
                )}
            </Select>
          </FormControl>
        </Box>
      )}

      {!showCnepcTraining && (
      <FormControl fullWidth sx={{ mb: 3 }} required={!!referencielRequired}>
        <InputLabel id="finalisation-referentiel-label">{referencielLabel}</InputLabel>
        <Select
          labelId="finalisation-referentiel-label"
          value={formationData.referenciel_id}
          onChange={(e) =>
            patchFormationData({ ...formationData, referenciel_id: e.target.value })
          }
          label={referencielLabel}
          disabled={loadingReferentiels || loading}
        >
          <MenuItem value="">
            <em>{referencielRequired ? 'Sélectionnez un type de permis' : 'Aucun référentiel'}</em>
          </MenuItem>
          {loadingReferentiels ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Chargement des référentiels...
            </MenuItem>
          ) : referentiels.length === 0 ? (
            <MenuItem disabled>
              Aucun référentiel disponible
            </MenuItem>
          ) : (
            referentiels.map((referentiel) => (
              <MenuItem key={referentiel.id} value={referentiel.id}>
                {referentiel.libelle}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>
      )}

      {dossierLieuFromAgent && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 1,
            bgcolor: 'action.hover',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Lieu du dossier
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Province et centre sont ceux de votre affectation (centre de l’agent créateur).
          </Typography>
          {agentLieuError && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              {agentLieuError}
            </Alert>
          )}
          {agentLieuLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Chargement de votre centre…</Typography>
            </Box>
          ) : (
            <Typography variant="body2">
              {agentLieuLabels?.province || agentLieuLabels?.centre
                ? [agentLieuLabels.province, agentLieuLabels.centre].filter(Boolean).join(' · ')
                : '—'}
            </Typography>
          )}
        </Box>
      )}

      <TextField
        label="Commentaires"
        value={formationData.commentaires}
        onChange={(e) => patchFormationData({ ...formationData, commentaires: e.target.value })}
        multiline
        rows={3}
        fullWidth
        placeholder="Ajoutez des notes ou commentaires concernant ce dossier..."
        disabled={loading}
      />

      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        {onBack && (
          <Button
            startIcon={<ArrowBack />}
            onClick={onBack}
            disabled={
              loading ||
              loadingReferentiels ||
              loadingCnepc ||
              loadingFormations ||
              (dossierLieuFromAgent && !!agentLieuLoading)
            }
          >
            Retour
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
          onClick={() => void handleSubmitClick()}
          disabled={
            loading ||
            loadingReferentiels ||
            loadingCnepc ||
            loadingFormations ||
            (dossierLieuFromAgent && (!!agentLieuLoading || !!agentLieuError))
          }
          size="large"
          sx={{ ml: onBack ? 'auto' : 0 }}
        >
          {loading ? 'Création en cours...' : 'Finaliser la création'}
        </Button>
      </Box>
    </Box>
  );
};
