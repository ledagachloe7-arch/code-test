// Table pour afficher la liste des sessions d'examen
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
  Box,
  Typography,
  LinearProgress,
  Checkbox,
} from '@mui/material';
import {
  MoreVert,
  Visibility,
  Edit,
  Delete,
  School,
  CalendarToday,
  LocationOn,
  Group,
  PlayArrow,
  Stop,
} from '@mui/icons-material';
import { SessionExamen } from '../types';

interface SessionExamenTableProps {
  sessions: SessionExamen[];
  loading?: boolean;
  onView?: (session: SessionExamen) => void;
  onEdit?: (session: SessionExamen) => void;
  onDelete?: (session: SessionExamen) => void;
  onOuvrirInscriptions?: (session: SessionExamen) => void;
  onFermerInscriptions?: (session: SessionExamen) => void;
  selectedSessions?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  selectable?: boolean;
}

const SessionExamenTable: React.FC<SessionExamenTableProps> = ({
  sessions,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onOuvrirInscriptions,
  onFermerInscriptions,
  selectedSessions = [],
  onSelectionChange,
  selectable = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSession, setSelectedSession] = useState<SessionExamen | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, session: SessionExamen) => {
    setAnchorEl(event.currentTarget);
    setSelectedSession(session);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSession(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? sessions.map(s => s.id) : []);
    }
  };

  const handleSelectSession = (sessionId: string, checked: boolean) => {
    if (onSelectionChange) {
      const newSelection = checked
        ? [...selectedSessions, sessionId]
        : selectedSessions.filter(id => id !== sessionId);
      onSelectionChange(newSelection);
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'planifiee': return 'default';
      case 'ouverte': return 'success';
      case 'fermee': return 'warning';
      case 'en_cours': return 'info';
      case 'terminee': return 'success';
      case 'annulee': return 'error';
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

  const getTauxOccupation = (session: SessionExamen) => {
    return session.capacite_maximale > 0 
      ? (session.capacite_utilisee / session.capacite_maximale) * 100 
      : 0;
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedSessions.length > 0 && selectedSessions.length < sessions.length}
                    checked={sessions.length > 0 && selectedSessions.length === sessions.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
              )}
              <TableCell>Session</TableCell>
              <TableCell>Type de permis</TableCell>
              <TableCell>Période</TableCell>
              <TableCell>Lieu</TableCell>
              <TableCell>Capacité</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={selectable ? 8 : 7} align="center">
                  <Box sx={{ py: 4 }}>
                    <Typography>Chargement...</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectable ? 8 : 7} align="center">
                  <Box sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Aucune session trouvée
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => {
                const tauxOccupation = getTauxOccupation(session);
                
                return (
                  <TableRow key={session.id} hover>
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedSessions.includes(session.id)}
                          onChange={(e) => handleSelectSession(session.id, e.target.checked)}
                        />
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {session.nom}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {session.description || 'Aucune description'}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <School sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2">
                            {session.type_permis.libelle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {session.type_permis.categorie}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarToday sx={{ fontSize: 14, mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2">
                            Du {formatDate(session.date_debut)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Au {formatDate(session.date_fin)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationOn sx={{ fontSize: 14, mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" noWrap>
                            {session.lieu}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {session.adresse}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    
                    <TableCell>
                      <Box sx={{ minWidth: 100 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">
                            {session.capacite_utilisee} / {session.capacite_maximale}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tauxOccupation.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={tauxOccupation}
                          color={tauxOccupation >= 100 ? 'error' : tauxOccupation >= 80 ? 'warning' : 'primary'}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={session.statut_libelle}
                        color={getStatutColor(session.statut) as any}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, session)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
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
        <MenuItem onClick={() => { onView?.(selectedSession!); handleMenuClose(); }}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>Voir</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => { onEdit?.(selectedSession!); handleMenuClose(); }}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifier</ListItemText>
        </MenuItem>
        
        {selectedSession?.statut === 'planifiee' && (
          <MenuItem onClick={() => { onOuvrirInscriptions?.(selectedSession!); handleMenuClose(); }}>
            <ListItemIcon>
              <PlayArrow fontSize="small" />
            </ListItemIcon>
            <ListItemText>Ouvrir les inscriptions</ListItemText>
          </MenuItem>
        )}
        
        {selectedSession?.statut === 'ouverte' && (
          <MenuItem onClick={() => { onFermerInscriptions?.(selectedSession!); handleMenuClose(); }}>
            <ListItemIcon>
              <Stop fontSize="small" />
            </ListItemIcon>
            <ListItemText>Fermer les inscriptions</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem 
          onClick={() => { onDelete?.(selectedSession!); handleMenuClose(); }}
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

export default SessionExamenTable;
