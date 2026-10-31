import React from 'react';
import { Alert, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { RecapLines } from './types';

interface SummaryRecapCardsProps {
  recapLines: RecapLines;
  isNouveauPermis: boolean;
  requiresNumeroOriginePermis: boolean;
  numeroOriginePermis: string;
  recapDemandMissingFields: string[];
  recapTrainingMissingFields: string[];
  navyColor: string;
}

const isRecapMissingValue = (v: unknown): boolean => String(v ?? '').trim().length === 0;

const SummaryRecapCards: React.FC<SummaryRecapCardsProps> = ({
  recapLines,
  isNouveauPermis,
  requiresNumeroOriginePermis,
  numeroOriginePermis,
  recapDemandMissingFields,
  recapTrainingMissingFields,
  navyColor,
}) => (
  <Stack spacing={2} sx={{ mb: 2 }}>
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: recapDemandMissingFields.length > 0 ? alpha('#ed6c02', 0.55) : alpha(navyColor, 0.2),
        bgcolor: recapDemandMissingFields.length > 0 ? alpha('#ffb74d', 0.16) : undefined,
      }}
    >
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
        Demande et candidat
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Type de dossier et identité sélectionnés.
      </Typography>
      {recapDemandMissingFields.length > 0 && (
        <Alert
          severity="warning"
          icon={<ExclamationTriangleIcon style={{ width: 18 }} />}
          sx={{ mb: 1.25, py: 0.3, '& .MuiAlert-message': { py: 0.2 } }}
        >
          <Typography variant="caption" fontWeight={700}>
            {recapDemandMissingFields.length} élément(s) à renseigner
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            {recapDemandMissingFields.join(' · ')}
          </Typography>
        </Alert>
      )}
      <Stack spacing={0.8}>
        <Typography variant="caption" color={isRecapMissingValue(recapLines.typeDemande) ? 'warning.dark' : 'text.primary'}>
          <strong>Type de demande:</strong> {recapLines.typeDemande || 'À renseigner'}
        </Typography>
        <Typography variant="caption" color={isRecapMissingValue(recapLines.candidat) ? 'warning.dark' : 'text.primary'}>
          <strong>Candidat:</strong> {recapLines.candidat || 'À renseigner'}
        </Typography>
        {!isNouveauPermis && (
          <>
            <Typography variant="caption" color={isRecapMissingValue(recapLines.numeroPermis) ? 'warning.dark' : 'text.primary'}>
              <strong>N° permis principal:</strong> {recapLines.numeroPermis || 'À renseigner'}
            </Typography>
            <Typography variant="caption" color={isRecapMissingValue(recapLines.categoriePermis) ? 'warning.dark' : 'text.primary'}>
              <strong>Catégorie permis:</strong> {recapLines.categoriePermis || 'À renseigner'}
            </Typography>
            {requiresNumeroOriginePermis && (
              <Typography variant="caption" color={isRecapMissingValue(numeroOriginePermis) ? 'warning.dark' : 'text.primary'}>
                <strong>N° permis d'origine:</strong> {numeroOriginePermis || 'À renseigner'}
              </Typography>
            )}
          </>
        )}
      </Stack>
    </Paper>

    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: recapTrainingMissingFields.length > 0 ? alpha('#ed6c02', 0.55) : alpha(navyColor, 0.2),
        bgcolor: recapTrainingMissingFields.length > 0 ? alpha('#ffb74d', 0.16) : undefined,
      }}
    >
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
        Formation, lieu et dossier
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Auto-école, formation, référentiel et lieu.
      </Typography>
      {recapTrainingMissingFields.length > 0 && (
        <Alert
          severity="warning"
          icon={<ExclamationTriangleIcon style={{ width: 18 }} />}
          sx={{ mb: 1.25, py: 0.3, '& .MuiAlert-message': { py: 0.2 } }}
        >
          <Typography variant="caption" fontWeight={700}>
            {recapTrainingMissingFields.length} élément(s) à renseigner
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            {recapTrainingMissingFields.join(' · ')}
          </Typography>
        </Alert>
      )}
      <Stack spacing={0.8}>
        <Typography variant="caption" color={isRecapMissingValue(recapLines.autoEcole) ? 'warning.dark' : 'text.primary'}>
          <strong>Auto-école:</strong> {recapLines.autoEcole || 'À renseigner'}
        </Typography>
        <Typography variant="caption" color={isRecapMissingValue(recapLines.autoEcoleId) ? 'warning.dark' : 'text.primary'}>
          <strong>auto_ecole_id:</strong> {recapLines.autoEcoleId || 'À renseigner'}
        </Typography>
        <Typography variant="caption" color={isRecapMissingValue(recapLines.formation) ? 'warning.dark' : 'text.primary'}>
          <strong>Formation:</strong> {recapLines.formation || 'À renseigner'}
        </Typography>
        <Typography variant="caption" color={isRecapMissingValue(recapLines.formationId) ? 'warning.dark' : 'text.primary'}>
          <strong>formation_id:</strong> {recapLines.formationId || 'À renseigner'}
        </Typography>
        <Typography variant="caption" color={isRecapMissingValue(recapLines.referenciel) ? 'warning.dark' : 'text.primary'}>
          <strong>Référentiel:</strong> {recapLines.referenciel || 'À renseigner'}
        </Typography>
        <Typography variant="caption" color={isRecapMissingValue(recapLines.referencielId) ? 'warning.dark' : 'text.primary'}>
          <strong>referenciel_id:</strong> {recapLines.referencielId || 'À renseigner'}
        </Typography>
        <Typography variant="caption"><strong>Province:</strong> {recapLines.province || '—'}</Typography>
        <Typography variant="caption"><strong>Centre:</strong> {recapLines.centre || '—'}</Typography>
        <Typography variant="caption"><strong>Commentaires:</strong> {recapLines.commentaires || '—'}</Typography>
      </Stack>
    </Paper>
  </Stack>
);

export default SummaryRecapCards;

