import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Chip,
  IconButton,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { DossierComplet } from '../services/dossierService';

interface DossiersCompletsTableProps {
  dossiers: DossierComplet[];
  onViewDossier: (dossier: DossierComplet) => void;
}

const DossiersCompletsTable: React.FC<DossiersCompletsTableProps> = ({
  dossiers,
  onViewDossier
}) => {
  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'en_cours': return 'warning';
      case 'complet': return 'success';
      case 'envoye_cnepc': return 'info';
      default: return 'default';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'en_cours': return 'En cours';
      case 'complet': return 'Complet';
      case 'envoye_cnepc': return 'Envoyé CNEPC';
      default: return statut;
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Élève</TableCell>
            <TableCell>Auto-École</TableCell>
            <TableCell>Documents</TableCell>
            <TableCell>Heures</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Date de complétion</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dossiers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Box sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary" className="font-primary">
                    Aucun dossier complété trouvé
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            dossiers.map((dossier) => (
              <TableRow key={dossier.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 32, height: 32 }}>
                      <PersonIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="body1" className="font-primary">
                        {dossier.eleve.firstName} {dossier.eleve.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" className="font-primary">
                        {dossier.eleve.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SchoolIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" className="font-primary">
                      {dossier.eleve.autoEcole.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DescriptionIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" className="font-primary">
                      {dossier.documentsCours.length} documents
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ScheduleIcon sx={{ mr: 0.5, fontSize: 14, color: 'primary.main' }} />
                      <Typography variant="body2" className="font-primary">
                        {dossier.heuresTheoriques.length}T
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ScheduleIcon sx={{ mr: 0.5, fontSize: 14, color: 'success.main' }} />
                      <Typography variant="body2" className="font-primary">
                        {dossier.heuresPratiques.length}P
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatutLabel(dossier.statut)}
                    color={getStatutColor(dossier.statut) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" className="font-primary">
                    {new Date(dossier.dateCompletion).toLocaleDateString('fr-FR')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Voir le dossier">
                      <IconButton
                        size="small"
                        onClick={() => onViewDossier(dossier)}
                        color="primary"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Gérer le dossier">
                      <IconButton
                        size="small"
                        onClick={() => onViewDossier(dossier)}
                        color="secondary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DossiersCompletsTable;
