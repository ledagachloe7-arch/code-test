import React from 'react';
import { Alert, Box, CircularProgress, Grid, MenuItem, Paper, TextField } from '@mui/material';

interface ProvinceLike {
  id: string;
  libelle?: string;
  nom?: string;
}

interface AutoEcoleLike {
  id: string;
  nom_auto_ecole: string;
}

interface FormationLike {
  id: string;
  type_permis?: { code?: string; libelle?: string };
  montant?: number;
}

interface ReferentielLike {
  id: string;
  libelle?: string;
  code?: string;
}

interface ManualTrainingBlocProps {
  autoEcoles: AutoEcoleLike[];
  formations: FormationLike[];
  referentiels: ReferentielLike[];
  autoEcoleId: string;
  formationId: string;
  referencielId: string;
  loadingAutoEcoles: boolean;
  loadingFormations: boolean;
  loadError: string | null;
  onAutoEcoleChange: (id: string) => void;
  onFormationChange: (id: string) => void;
  onReferencielChange: (id: string) => void;
}

interface FinalisationSectionProps {
  canEditFinalisation: boolean;
  isNouveauPermis: boolean;
  /** Message si la section est bloquée (sinon message par défaut selon isNouveauPermis). */
  blockedHint?: string;
  titleNode: React.ReactNode;
  /** Affiché si l'auto-école n'a pas été attribuée automatiquement (renouvellement / duplicata). */
  manualTrainingBloc?: ManualTrainingBlocProps;
  provinces: ProvinceLike[];
  provinceId: string;
  provinceDisabled: boolean;
  onProvinceChange: (value: string) => void;
  centreValue: string;
  centreHelperText: string;
  commentaires: string;
  onCommentairesChange: (value: string) => void;
}

const FinalisationSection: React.FC<FinalisationSectionProps> = ({
  canEditFinalisation,
  isNouveauPermis,
  blockedHint,
  titleNode,
  manualTrainingBloc,
  provinces,
  provinceId,
  provinceDisabled,
  onProvinceChange,
  centreValue,
  centreHelperText,
  commentaires,
  onCommentairesChange,
}) => (
  <Paper variant="outlined" sx={{ p: 2, opacity: canEditFinalisation ? 1 : 0.7 }}>
    <Box sx={{ mb: 2 }}>{titleNode}</Box>
    {!canEditFinalisation && (
      <Alert severity="info" sx={{ mb: 2 }}>
        {blockedHint ??
          `Terminez d'abord la section ${isNouveauPermis ? '"Auto-école et formation"' : '"Vérification du permis de conduire"'} pour activer ce formulaire.`}
      </Alert>
    )}
    <Box sx={{ pointerEvents: canEditFinalisation ? 'auto' : 'none' }}>
      {manualTrainingBloc && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          L&apos;auto-école CNEPC n&apos;a pas pu être attribuée automatiquement. Sélectionnez l&apos;auto-école, la formation et le référentiel ci-dessous.
        </Alert>
      )}
      {manualTrainingBloc && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12}>
            <TextField
              select
              label="Auto-école"
              required
              size="small"
              fullWidth
              value={manualTrainingBloc.autoEcoleId}
              disabled={manualTrainingBloc.loadingAutoEcoles}
              onChange={(e) => manualTrainingBloc.onAutoEcoleChange(e.target.value)}
              InputProps={
                manualTrainingBloc.loadingAutoEcoles
                  ? { endAdornment: <CircularProgress size={16} /> }
                  : undefined
              }
              helperText={
                manualTrainingBloc.loadError ??
                (manualTrainingBloc.loadingAutoEcoles
                  ? 'Chargement des auto-écoles…'
                  : manualTrainingBloc.autoEcoles.length === 0
                    ? 'Aucune auto-école disponible.'
                    : undefined)
              }
              error={Boolean(manualTrainingBloc.loadError)}
            >
              <MenuItem value="">-- Choisir --</MenuItem>
              {manualTrainingBloc.autoEcoles.map((ae) => (
                <MenuItem key={ae.id} value={ae.id}>
                  {ae.nom_auto_ecole}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {manualTrainingBloc.autoEcoleId && (
            <Grid item xs={12}>
              <TextField
                select
                label="Formation"
                required
                size="small"
                fullWidth
                value={manualTrainingBloc.formationId}
                disabled={manualTrainingBloc.loadingFormations}
                onChange={(e) => manualTrainingBloc.onFormationChange(e.target.value)}
                InputProps={
                  manualTrainingBloc.loadingFormations
                    ? { endAdornment: <CircularProgress size={16} /> }
                    : undefined
                }
              >
                <MenuItem value="">-- Choisir --</MenuItem>
                {manualTrainingBloc.formations.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.type_permis?.libelle ?? f.type_permis?.code ?? f.id}
                    {f.montant != null && ` — ${f.montant} FCFA`}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          {manualTrainingBloc.referentiels.length > 0 && (
            <Grid item xs={12}>
              <TextField
                select
                label="Référentiel"
                required
                size="small"
                fullWidth
                value={manualTrainingBloc.referencielId}
                onChange={(e) => manualTrainingBloc.onReferencielChange(e.target.value)}
              >
                <MenuItem value="">-- Choisir --</MenuItem>
                {manualTrainingBloc.referentiels.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.libelle ?? r.code ?? r.id}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
        </Grid>
      )}
      <Grid container spacing={2}>
        {provinces.length > 0 && (
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Province"
              size="small"
              fullWidth
              value={provinceId}
              disabled={provinceDisabled}
              onChange={(e) => onProvinceChange(e.target.value)}
            >
              <MenuItem value="">-- Optionnel --</MenuItem>
              {provinces.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.libelle ?? p.nom ?? p.id}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        )}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Centre"
            size="small"
            fullWidth
            value={centreValue}
            InputProps={{ readOnly: true }}
            helperText={centreHelperText}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Commentaires"
            multiline
            rows={3}
            size="small"
            fullWidth
            placeholder="Informations complémentaires…"
            value={commentaires}
            onChange={(e) => onCommentairesChange(e.target.value)}
          />
        </Grid>
      </Grid>
    </Box>
  </Paper>
);

export default FinalisationSection;

