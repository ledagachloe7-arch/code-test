// Table pour afficher la liste des candidats aux examens
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Box,
  Typography,
  Tooltip,
  Checkbox,
} from '@mui/material';
import {
  MoreVert,
  Visibility,
  Edit,
  Delete,
  Person,
  Phone,
  Email,
  School,
  CalendarToday,
  Quiz,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { CandidatExamen } from '../types';
import { ROUTES } from '../../../shared/constants';

interface CandidatExamenTableProps {
  candidats: CandidatExamen[];
  loading?: boolean;
  onView?: (candidat: CandidatExamen) => void;
  onEdit?: (candidat: CandidatExamen) => void;
  onDelete?: (candidat: CandidatExamen) => void;
  onUpdateStatut?: (candidat: CandidatExamen, statut: string) => void;
  selectedCandidats?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  selectable?: boolean;
}

const CandidatExamenTable: React.FC<CandidatExamenTableProps> = ({
  candidats,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onUpdateStatut,
  selectedCandidats = [],
  onSelectionChange,
  selectable = false,
}) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCandidat, setSelectedCandidat] = useState<CandidatExamen | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, candidat: CandidatExamen) => {
    setAnchorEl(event.currentTarget);
    setSelectedCandidat(candidat);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCandidat(null);
  };

  // Naviguer vers la page des épreuves
  const handleOpenEpreuvePage = (candidat: CandidatExamen) => {
    // Le candidat.id est l'ID du programme-session
    navigate(`${ROUTES.CANDIDATS_EXAMEN}/epreuves/${candidat.id}`);
    handleMenuClose();
  };

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? candidats.map(c => c.id) : []);
    }
  };

  const handleSelectCandidat = (candidatId: string, checked: boolean) => {
    if (onSelectionChange) {
      const newSelection = checked
        ? [...selectedCandidats, candidatId]
        : selectedCandidats.filter(id => id !== candidatId);
      onSelectionChange(newSelection);
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'inscrit': return 'primary';
      case 'en_attente': return 'warning';
      case 'programme': return 'info';
      case 'present': return 'success';
      case 'absent': return 'error';
      case 'reussi': return 'success';
      case 'echoue': return 'error';
      case 'annule': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statuts = [
    { value: 'inscrit', label: 'Inscrit' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'programme', label: 'Programmé' },
    { value: 'present', label: 'Présent' },
    { value: 'absent', label: 'Absent' },
    { value: 'reussi', label: 'Réussi' },
    { value: 'echoue', label: 'Échoué' },
    { value: 'annule', label: 'Annulé' },
  ];

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedCandidats.length > 0 && selectedCandidats.length < candidats.length}
                    checked={candidats.length > 0 && selectedCandidats.length === candidats.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
              )}
              <TableCell>Candidat</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Auto-école</TableCell>
              <TableCell>Session</TableCell>
              <TableCell>Formation</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Date d'inscription</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={selectable ? 9 : 8} align="center">
                  <Box sx={{ py: 4 }}>
                    <Typography>Chargement...</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : candidats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectable ? 9 : 8} align="center">
                  <Box sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Aucun candidat trouvé
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              candidats.map((candidat) => (
                <TableRow key={candidat.id} hover>
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedCandidats.includes(candidat.id)}
                        onChange={(e) => handleSelectCandidat(candidat.id, e.target.checked)}
                      />
                    </TableCell>
                  )}
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: 'primary.main',
                          color: 'white',
                          mr: 2,
                        }}
                      >
                        {candidat.candidat.personne.prenom[0]}{candidat.candidat.personne.nom[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {candidat.candidat.personne.prenom} {candidat.candidat.personne.nom}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {candidat.candidat.numero_candidat}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Email sx={{ fontSize: 14, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" noWrap>
                          {candidat.candidat.personne.email}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Phone sx={{ fontSize: 14, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {candidat.candidat.personne.contact}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <School sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" noWrap>
                        {candidat.auto_ecole.nom_auto_ecole}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {candidat.session_examen.nom}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {candidat.session_examen.type_permis.libelle}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {candidat.formation.nom}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {candidat.formation.montant_formate}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={candidat.statut_libelle}
                      color={getStatutColor(candidat.statut) as any}
                      size="small"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarToday sx={{ fontSize: 14, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {formatDate(candidat.date_inscription)}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Gérer les épreuves">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEpreuvePage(candidat)}
                          color="primary"
                        >
                          <Quiz fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, candidat)}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Menu contextuel */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { onView?.(selectedCandidat!); handleMenuClose(); }}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>Voir</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => { onEdit?.(selectedCandidat!); handleMenuClose(); }}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifier</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => { handleOpenEpreuvePage(selectedCandidat!); }}>
          <ListItemIcon>
            <Quiz fontSize="small" />
          </ListItemIcon>
          <ListItemText>Gérer les épreuves</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          <ListItemText>Changer le statut</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => { onDelete?.(selectedCandidat!); handleMenuClose(); }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Supprimer</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default CandidatExamenTable;
