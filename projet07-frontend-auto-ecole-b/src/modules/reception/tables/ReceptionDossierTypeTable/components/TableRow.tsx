import React from 'react';
import {
  TableRow,
  TableCell,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
  Button,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import { Description, Delete } from '@mui/icons-material';
import { EyeIcon } from '@heroicons/react/24/outline';
import { ReceptionDossier, EpreuveStatut } from '../../../types';
import { DossierSuivi } from '../types';
import { getStatutEpreuveInfo, getSuiviIcon, getSuiviColor } from '../helpers.tsx';

interface DossierTableRowProps {
  dossier: ReceptionDossier;
  isNouveauPermis: boolean;
  epreuveStatut?: EpreuveStatut;
  suivi?: DossierSuivi;
  loadingSuivi: boolean;
  onOpenDetails: (dossier: ReceptionDossier) => void;
  onOpenDocuments?: (dossier: ReceptionDossier) => void;
  onOpenEpreuve: (dossier: ReceptionDossier) => void;
  onDelete?: (dossier: ReceptionDossier) => void;
}

export const DossierTableRow: React.FC<DossierTableRowProps> = ({
  dossier,
  isNouveauPermis,
  epreuveStatut,
  suivi,
  loadingSuivi,
  onOpenDetails,
  onOpenDocuments,
  onOpenEpreuve,
  onDelete
}) => {
  const formationDetails = dossier.details?.formation_complete || dossier.details?.dossier?.formation;
  const formationNom = formationDetails?.type_permis?.libelle || formationDetails?.nom || 'Formation';
  const statutInfo = getStatutEpreuveInfo(epreuveStatut);

  return (
    <TableRow 
      hover
      sx={{ 
        backgroundColor: 'white',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        '&:hover': {
          backgroundColor: '#f8f9fa',
          transition: 'background-color 0.2s ease'
        }
      }}
    >
      <TableCell sx={{ py: 2, backgroundColor: 'white' }}>
        <Typography variant="body2" fontWeight={600} color="text.primary">
          {dossier.reference}
        </Typography>
      </TableCell>
      <TableCell sx={{ py: 2, backgroundColor: 'white' }}>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          {dossier.candidatNom} {dossier.candidatPrenom}
        </Typography>
      </TableCell>
      {isNouveauPermis ? (
        <>
          <TableCell sx={{ py: 2, backgroundColor: 'white' }}>
            <Box>
              <Typography variant="body2" fontWeight={600} color="primary.main">
                {formationNom}
              </Typography>
            </Box>
          </TableCell>
          <TableCell sx={{ py: 2, backgroundColor: 'white' }}>
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
              {dossier.autoEcoleNom}
            </Typography>
          </TableCell>
        </>
      ) : (
        <TableCell sx={{ py: 2, backgroundColor: 'white' }}>
          <Typography variant="body2" fontWeight={600} color="primary.main">
            {suivi?.circuit?.type_permis || 'Non spécifié'}
          </Typography>
        </TableCell>
      )}
      <TableCell sx={{ py: 2, backgroundColor: 'white', minWidth: 200 }}>
        {loadingSuivi ? (
          <CircularProgress size={20} />
        ) : suivi ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {getSuiviIcon(suivi.status)}
              <Typography variant="caption" fontWeight={600}>
                {suivi.progress}%
              </Typography>
              <Chip 
                label={suivi.status === 'completed' ? 'Terminé' : 
                       suivi.status === 'in_progress' ? 'En cours' :
                       suivi.status === 'blocked' ? 'Bloqué' : 'En attente'}
                size="small"
                color={getSuiviColor(suivi.status) as any}
                variant="outlined"
              />
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={suivi.progress} 
              sx={{ height: 6, borderRadius: 3 }}
              color={getSuiviColor(suivi.status) as any}
            />
            {suivi.currentEtape && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {suivi.currentEtape}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" display="block">
              {suivi.documentsValides}/{suivi.documentsCount} documents validés
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Chargement...
          </Typography>
        )}
      </TableCell>
      {isNouveauPermis && (
        <TableCell sx={{ py: 2, backgroundColor: 'white' }}>
          <Chip
            label={statutInfo.label}
            color={statutInfo.color}
            size="small"
            variant={epreuveStatut === 'non_saisi' ? 'outlined' : 'filled'}
            sx={{ fontWeight: 600, fontSize: '0.75rem', height: 24 }}
          />
        </TableCell>
      )}
      <TableCell align="right" sx={{ py: 2, backgroundColor: 'white' }}>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Tooltip title="Voir les détails">
            <IconButton
              size="small"
              onClick={() => onOpenDetails(dossier)}
              sx={{ color: '#1976d2' }}
            >
              <EyeIcon className="w-4 h-4" />
            </IconButton>
          </Tooltip>
          {onOpenDocuments && (
            <Tooltip title="Documents et suivi">
              <IconButton
                size="small"
                onClick={() => onOpenDocuments(dossier)}
                sx={{ color: '#9c27b0' }}
              >
                <Description />
              </IconButton>
            </Tooltip>
          )}
          {isNouveauPermis && (
            <Button
              variant="contained"
              size="small"
              onClick={() => onOpenEpreuve(dossier)}
              sx={{
                textTransform: 'none',
                backgroundColor: '#1976d2',
                fontWeight: 600,
                px: 2,
                py: 0.75
              }}
            >
              Épreuves
            </Button>
          )}
          {onDelete && (
            <Tooltip title="Supprimer le dossier">
              <IconButton
                size="small"
                onClick={() => onDelete(dossier)}
                sx={{ color: '#d32f2f' }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
};

