
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
  getReadinessErrors?: () => string[];
  referencielRequired?: boolean;
  dossierLieuFromAgent?: boolean;
  agentLieuLabels?: { province: string; centre: string };
  agentLieuLoading?: boolean;
  agentLieuError?: string | null;
  showCnepcTraining?: boolean;
  autoEcoleId?: string;
  onAutoEcoleChange?: (autoEcoleId: string) => void;
  onFormationChange?: (formationId: string) => void;
}

interface FormationSession {
  id?: string;
  libelle?: string;
  code?: string;
}

function formationTypePermisId(f: Formation): string {
  return (
    f.type_permis_id ||
    (f.type_permis as { id?: string } | undefined)?.id ||
    (f.typePermis as { id?: string } | undefined)?.id ||
    ''
  );
}

function formationSessionId(f: Formation): string {
  const session = (f as Formation & {
    session?: FormationSession;
    session_id?: string;
  }).session;

  return (
    (f as Formation & { session_id?: string }).session_id ||
    session?.id ||
    ''
  );
}

function getTypePermisLabel(f: Formation): string {
  const tp = f.type_permis ?? f.typePermis;

  if (tp && typeof tp === 'object') {
    const libelle = 'libelle' in tp ? tp.libelle : '';
    const code = 'code' in tp ? tp.code : '';

    if (typeof libelle === 'string' && libelle.trim()) return libelle;
    if (typeof code === 'string' && code.trim()) return `Permis ${code}`;
  }

  return f.nom?.trim() || f.description?.trim() || 'Type de permis';
}

function getSessionLabel(f: Formation): string {
  const session = (f as Formation & {
    session?: FormationSession;
  }).session;

  if (session?.libelle?.trim()) return session.libelle;
  if (session?.code?.trim()) return session.code;

  return 'Session sans libellé';
}

function getFormationLabel(f: Formation): string {
  return getTypePermisLabel(f);
}

function getFormationPrice(f: Formation): string | null {
  const raw = f.montant_formate ?? f.montant;

  if (raw == null || raw === '') return null;

  const value = String(raw).trim();

  if (!value) return null;

  if (value.toLowerCase().includes('cfa')) {
    return value;
  }

  const amount = Number(raw);

  if (Number.isNaN(amount)) return value;

  return `${amount.toLocaleString('fr-FR')} FCFA`;
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

  // Sélection indépendante du permis et de la session
  const [selectedTypePermisId, setSelectedTypePermisId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');

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

  // Chargement des formations de l'auto-école
  useEffect(() => {
    if (!showCnepcTraining) {
      setFormationsList([]);
      return;
    }

    const cnepcId = cnepcAutoEcole?.id;

    if (
      autoEcoleId &&
      cnepcId &&
      autoEcoleId === cnepcId &&
      cnepcFormations.length > 0
    ) {
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

        const active = (Array.isArray(list) ? list : []).filter(
          (f) => f.statut !== false
        );

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
  }, [
    showCnepcTraining,
    autoEcoleId,
    cnepcAutoEcole?.id,
    cnepcFormations,
  ]);

  // Sélection automatique de l'auto-école CNEPC
  useEffect(() => {
    if (
      !showCnepcTraining ||
      autoEcoleId ||
      !cnepcAutoEcole?.id ||
      !onAutoEcoleChange
    ) {
      return;
    }

    onAutoEcoleChange(cnepcAutoEcole.id);
  }, [
    showCnepcTraining,
    autoEcoleId,
    cnepcAutoEcole?.id,
    onAutoEcoleChange,
  ]);

  // Types de permis uniques
  const uniquePermis = Array.from(
    new Map(
      formationsList
        .filter((f) => formationTypePermisId(f))
        .map((f) => [formationTypePermisId(f), f])
    ).values()
  );

  // Sessions disponibles pour le permis sélectionné
  const formationsForSelectedPermis = formationsList.filter(
    (f) => formationTypePermisId(f) === selectedTypePermisId
  );

  const uniqueSessions = Array.from(
    new Map(
      formationsForSelectedPermis
        .filter((f) => formationSessionId(f))
        .map((f) => [formationSessionId(f), f])
    ).values()
  );

  // Formation correspondant exactement au permis et à la session
  const selectedFormation = formationsList.find(
    (f) =>
      formationTypePermisId(f) === selectedTypePermisId &&
      formationSessionId(f) === selectedSessionId
  );

  // Synchronisation si une formation existe déjà dans le dossier
  useEffect(() => {
    if (!formationData.formation_id || formationsList.length === 0) return;

    const existing = formationsList.find(
      (f) => f.id === formationData.formation_id
    );

    if (existing) {
      setSelectedTypePermisId(formationTypePermisId(existing));
      setSelectedSessionId(formationSessionId(existing));
    }
  }, [formationData.formation_id, formationsList]);

  // Sélection de la formation réelle
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
    [
      onFormationChange,
      formationsList,
      formationData,
      patchFormationData,
    ]
  );

  // Changement d'auto-école
  const handleAutoEcoleChange = (id: string) => {
    setSelectedTypePermisId('');
    setSelectedSessionId('');

    handleFormationPick('');

    onAutoEcoleChange?.(id);
  };

  // Changement de type de permis
  const handleTypePermisChange = (typePermisId: string) => {
    setSelectedTypePermisId(typePermisId);
    setSelectedSessionId('');

    // L'ancienne formation ne doit plus être conservée
    onFormationChange?.('');

    const selected = formationsList.find(
      (f) => formationTypePermisId(f) === typePermisId
    );

    patchFormationData({
      ...formationData,
      formation_id: '',
      referenciel_id: typePermisId,
    });
  };

  // Changement de session
  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId);

    const formation = formationsList.find(
      (f) =>
        formationTypePermisId(f) === selectedTypePermisId &&
        formationSessionId(f) === sessionId
    );

    if (formation) {
      handleFormationPick(formation.id);
    } else {
      handleFormationPick('');
    }
  };

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

  const referencielLabel = referencielRequired
    ? 'Type de permis (référentiel) *'
    : 'Type de permis (référentiel)';

  const cnepcSelectDisabled =
    loading || loadingCnepc || loadingFormations || loadingReferentiels;

  const formationsLoading = loadingCnepc || loadingFormations;

  return (
    <Box>
      {getReadinessErrors && readinessErrors.length > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          onClose={() => setReadinessErrors([])}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Dossier incomplet — corrigez les points suivants avant de créer le dossier
          </Typography>

          <List dense disablePadding>
            {readinessErrors.map((msg, i) => (
              <ListItem
                key={i}
                sx={{ py: 0, alignItems: 'flex-start' }}
              >
                <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
                  <ErrorOutline color="warning" fontSize="small" />
                </ListItemIcon>

                <ListItemText
                  primary={msg}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
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

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mb: 2 }}
          >
            Sélectionnez le type de permis puis la session de formation.
            Le montant sera calculé automatiquement.
          </Typography>

          {cnepcError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cnepcError}
            </Alert>
          )}

          {/* Auto-école */}
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel id="finalisation-auto-ecole-label">
              Auto-école
            </InputLabel>

            <Select
              labelId="finalisation-auto-ecole-label"
              value={autoEcoleId}
              onChange={(e) => handleAutoEcoleChange(e.target.value)}
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
                <MenuItem disabled>
                  Aucune auto-école CNEPC
                </MenuItem>
              )}

              {autoEcoleId &&
                cnepcAutoEcole?.id !== autoEcoleId && (
                  <MenuItem value={autoEcoleId}>
                    {autoEcoleId}
                  </MenuItem>
                )}
            </Select>
          </FormControl>

          {/* Type de permis */}
          <FormControl
            fullWidth
            required
            sx={{ mb: 2 }}
            disabled={cnepcSelectDisabled || !autoEcoleId}
          >
            <InputLabel id="finalisation-type-permis-label">
              Type de permis
            </InputLabel>

            <Select
              labelId="finalisation-type-permis-label"
              value={selectedTypePermisId}
              onChange={(e) => handleTypePermisChange(e.target.value)}
              label="Type de permis"
            >
              <MenuItem value="">
                <em>Sélectionnez un type de permis</em>
              </MenuItem>

              {formationsLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Chargement…
                </MenuItem>
              ) : uniquePermis.length === 0 ? (
                <MenuItem disabled>
                  Aucun type de permis disponible
                </MenuItem>
              ) : (
                uniquePermis.map((f) => (
                  <MenuItem
                    key={formationTypePermisId(f)}
                    value={formationTypePermisId(f)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <School fontSize="small" />
                      {getFormationLabel(f)}
                    </Box>
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Session */}
          <FormControl
            fullWidth
            required
            sx={{ mb: 2 }}
            disabled={
              cnepcSelectDisabled ||
              !selectedTypePermisId
            }
          >
            <InputLabel id="finalisation-session-label">
              Session de formation
            </InputLabel>

            <Select
              labelId="finalisation-session-label"
              value={selectedSessionId}
              onChange={(e) => handleSessionChange(e.target.value)}
              label="Session de formation"
            >
              <MenuItem value="">
                <em>Sélectionnez une session</em>
              </MenuItem>

              {uniqueSessions.length === 0 ? (
                <MenuItem disabled>
                  Aucune session disponible pour ce permis
                </MenuItem>
              ) : (
                uniqueSessions.map((f) => (
                  <MenuItem
                    key={formationSessionId(f)}
                    value={formationSessionId(f)}
                  >
                    {getSessionLabel(f)}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Montant automatique */}
          {selectedFormation && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Montant de la formation
              </Typography>

              <Typography
                variant="h5"
                fontWeight={700}
                color="primary.main"
              >
                {getFormationPrice(selectedFormation) || 'Montant non renseigné'}
              </Typography>

              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={getTypePermisLabel(selectedFormation)}
                  size="small"
                  variant="outlined"
                />

                <Chip
                  label={getSessionLabel(selectedFormation)}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>
          )}

          {/* Référentiel du permis */}
          <FormControl
            fullWidth
            required={!!referencielRequired}
            sx={{ mb: 0 }}
          >
            <InputLabel id="finalisation-referentiel-label">
              {referencielLabel}
            </InputLabel>

            <Select
              labelId="finalisation-referentiel-label"
              value={formationData.referenciel_id}
              onChange={(e) =>
                patchFormationData({
                  ...formationData,
                  referenciel_id: e.target.value,
                })
              }
              label={referencielLabel}
              disabled={loadingReferentiels || loading}
            >
              <MenuItem value="">
                <em>
                  {referencielRequired
                    ? 'Sélectionnez un type de permis'
                    : 'Aucun référentiel'}
                </em>
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
                  <MenuItem
                    key={referentiel.id}
                    value={referentiel.id}
                  >
                    {referentiel.libelle || referentiel.code || referentiel.id}
                  </MenuItem>
                ))
              )}

              {formationData.referenciel_id &&
                !referentiels.some(
                  (r) => r.id === formationData.referenciel_id
                ) && (
                  <MenuItem value={formationData.referenciel_id}>
                    {formationData.referenciel_id}
                  </MenuItem>
                )}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Cas sans formation CNEPC */}
      {!showCnepcTraining && (
        <FormControl
          fullWidth
          sx={{ mb: 3 }}
          required={!!referencielRequired}
        >
          <InputLabel id="finalisation-referentiel-label">
            {referencielLabel}
          </InputLabel>

          <Select
            labelId="finalisation-referentiel-label"
            value={formationData.referenciel_id}
            onChange={(e) =>
              patchFormationData({
                ...formationData,
                referenciel_id: e.target.value,
              })
            }
            label={referencielLabel}
            disabled={loadingReferentiels || loading}
          >
            <MenuItem value="">
              <em>
                {referencielRequired
                  ? 'Sélectionnez un type de permis'
                  : 'Aucun référentiel'}
              </em>
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
                <MenuItem
                  key={referentiel.id}
                  value={referentiel.id}
                >
                  {referentiel.libelle}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      )}

      {/* Lieu du dossier */}
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

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mb: 1 }}
          >
            Province et centre sont ceux de votre affectation
            (centre de l’agent créateur).
          </Typography>

          {agentLieuError && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              {agentLieuError}
            </Alert>
          )}

          {agentLieuLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">
                Chargement de votre centre…
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2">
              {agentLieuLabels?.province || agentLieuLabels?.centre
                ? [agentLieuLabels.province, agentLieuLabels.centre]
                    .filter(Boolean)
                    .join(' · ')
                : '—'}
            </Typography>
          )}
        </Box>
      )}

      {/* Commentaires */}
      <TextField
        label="Commentaires"
        value={formationData.commentaires}
        onChange={(e) =>
          patchFormationData({
            ...formationData,
            commentaires: e.target.value,
          })
        }
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

      {/* Boutons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 3,
        }}
      >
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
          startIcon={
            loading ? <CircularProgress size={20} /> : <CheckCircle />
          }
          onClick={() => void handleSubmitClick()}
          disabled={
            loading ||
            loadingReferentiels ||
            loadingCnepc ||
            loadingFormations ||
            (dossierLieuFromAgent &&
              (!!agentLieuLoading || !!agentLieuError))
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
