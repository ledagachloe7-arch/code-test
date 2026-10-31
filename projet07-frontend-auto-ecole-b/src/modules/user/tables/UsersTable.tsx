import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  Stack,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Delete,
  Edit,
  Visibility,
  FilterList,
  Clear,
} from '@mui/icons-material';
import { useUsers } from '../hooks';
import { User } from '../types';
import { userService } from '../services';
import { UserForm } from '../forms';
import { roleService } from '../../circuit/services/role.service';
import { useNavigate } from 'react-router-dom';

/** Normalise la réponse API des rôles en tableau de chaînes (codes rôle). */
function normalizeRolesFromApi(raw: unknown): string[] {
  const wrapper = raw as {
    roles?: unknown[];
    data?: unknown[];
    items?: unknown[];
    results?: unknown[];
  };
  const arr = Array.isArray(raw)
    ? raw
    : wrapper?.roles ?? wrapper?.data ?? wrapper?.items ?? wrapper?.results ?? [];
  const mapped = arr
    .map((r) => {
      if (typeof r === 'string') return r.trim();
      if (!r || typeof r !== 'object') return '';
      const roleObj = r as {
        authority?: string;
        role?: string;
        name?: string;
        code?: string;
        libelle?: string;
        label?: string;
      };
      return (
        roleObj.authority ||
        roleObj.role ||
        roleObj.name ||
        roleObj.code ||
        roleObj.libelle ||
        roleObj.label ||
        ''
      ).trim();
    })
    .filter(Boolean);
  return Array.from(new Set(mapped));
}

interface UsersTableProps {
  refreshTrigger?: number;
}

const UsersTable: React.FC<UsersTableProps> = ({ refreshTrigger }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);

  // États locaux pour les filtres
  const [localFilters, setLocalFilters] = useState({
    search: '',
    role: '',
  });

  // Menu contextuel
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Rôles disponibles (chargés depuis l'API pour le filtre)
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const { users, loading, error, stats, refresh } = useUsers({
    filters: {
      search: searchTerm || undefined,
      role: roleFilter || undefined,
    },
  });

  // Charger les rôles depuis l'API pour le filtre
  useEffect(() => {
    let cancelled = false;
    const fetchRoles = async () => {
      setRolesLoading(true);
      try {
        const rolesData = await roleService.getAll().catch(() => []);
        if (!cancelled) setAvailableRoles(normalizeRolesFromApi(rolesData));
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    };
    fetchRoles();
    return () => { cancelled = true; };
  }, []);

  // Rafraîchir quand refreshTrigger change
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      refresh();
    }
  }, [refreshTrigger, refresh]);

  // Stocker tous les utilisateurs chargés
  useEffect(() => {
    setAllUsers(users);
  }, [users]);

  // Filtrer et paginer les utilisateurs côté client
  useEffect(() => {
    let filteredUsers = [...allUsers];

    // Filtrer par terme de recherche (si le serveur ne le fait pas complètement)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.email.toLowerCase().includes(searchLower) ||
        user.personne?.nom?.toLowerCase().includes(searchLower) ||
        user.personne?.prenom?.toLowerCase().includes(searchLower) ||
        user.personne?.contact?.toLowerCase().includes(searchLower)
      );
    }

    // Appliquer la pagination côté client
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    setDisplayedUsers(paginatedUsers);
    setTotal(filteredUsers.length);
  }, [allUsers, searchTerm, roleFilter, page, rowsPerPage]);

  // Réinitialiser à la page 0 quand les filtres changent
  useEffect(() => {
    setPage(0);
  }, [searchTerm, roleFilter]);

  // Synchroniser les filtres locaux avec les filtres réels au montage
  useEffect(() => {
    setLocalFilters({
      search: searchTerm,
      role: roleFilter,
    });
  }, []);

  // Gestion de la pagination
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Gestion des filtres locaux
  const handleFilterChange = (key: string, value: any) => {
    setLocalFilters({ ...localFilters, [key]: value });
  };

  const handleApplyFilters = () => {
    setSearchTerm(localFilters.search);
    setRoleFilter(localFilters.role);
    setPage(0);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      role: '',
    };
    setLocalFilters(clearedFilters);
    setSearchTerm('');
    setRoleFilter('');
    setPage(0);
  };

  const getActiveFiltersCount = () => {
    return Object.values(localFilters).filter(
      (value) => value !== undefined && value !== null && value !== ''
    ).length;
  };

  // Gestion du menu contextuel
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, userId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(userId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
  };

  // Actions du menu
  const handleView = () => {
    const user = displayedUsers.find(u => u.id === selectedRowId);
    if (user) {
      // Naviguer vers la page de détails
      navigate(`/candidat/${user.id}`);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    const user = displayedUsers.find(u => u.id === selectedRowId);
    if (user) {
      setSelectedUser(user);
      setUserFormOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    const user = displayedUsers.find(u => u.id === selectedRowId);
    if (user) {
      setUserToDelete(user);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  // Gestion des formulaires
  const handleUserFormClose = () => {
    setUserFormOpen(false);
    setSelectedUser(undefined);
  };

  const handleFormSuccess = () => {
    refresh();
    handleUserFormClose();
  };

  // Gestion de la suppression
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await userService.deleteUser(userToDelete.id);
      refresh();
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  // Obtenir la couleur du rôle
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ROLE_ADMIN': return 'error';
      case 'ROLE_AUTO_ECOLE': return 'primary';
      case 'ROLE_CNEPC': return 'info';
      case 'ROLE_CNEDDT': return 'warning';
      case 'candidat': return 'success';
      default: return 'default';
    }
  };

  // Obtenir le libellé du rôle
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ROLE_ADMIN': return 'Administrateur';
      case 'ROLE_AUTO_ECOLE': return 'Auto-École';
      case 'ROLE_CNEPC': return 'CNEPC';
      case 'ROLE_CNEDDT': return 'CNEDDT';
      case 'candidat': return 'Candidat';
      default: return role;
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, backgroundColor: 'transparent' }} elevation={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Gestion des Utilisateurs</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setSelectedUser(undefined);
              setUserFormOpen(true);
            }}
          >
            Nouvel Utilisateur
          </Button>
        </Box>

        {/* Statistiques */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">
                    {stats.total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {Object.entries(stats.by_role || {}).map(([role, count]) => (
              <Grid item xs={12} sm={6} md={3} key={role}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      {getRoleLabel(role)}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      {count}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Panel de filtres */}
        <Card elevation={1} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FilterList sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Filtres
                </Typography>
                {getActiveFiltersCount() > 0 && (
                  <Chip
                    label={getActiveFiltersCount()}
                    color="primary"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  startIcon={<Clear />}
                  onClick={handleClearFilters}
                  disabled={getActiveFiltersCount() === 0}
                >
                  Effacer
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Search />}
                  onClick={handleApplyFilters}
                >
                  Appliquer
                </Button>
              </Stack>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Rechercher"
                  value={localFilters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Email, nom, prénom, contact..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small" disabled={rolesLoading}>
                  <InputLabel>Rôle</InputLabel>
                  <Select
                    value={localFilters.role || ''}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                    label="Rôle"
                  >
                    <MenuItem value="">Tous les rôles</MenuItem>
                    {availableRoles.map((role) => (
                      <MenuItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer>
          <Table sx={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <TableHead>
              <TableRow>
                <TableCell>Nom / Prénom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Centre</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : displayedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Aucun utilisateur trouvé
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayedUsers.map((user) => (
                  <TableRow 
                    key={user.id}
                    hover
                    sx={{
                      boxShadow: 1,
                      backgroundColor: 'white',
                      transition: 'background-color 0.2s ease',
                      border: 'none',
                      '& td': {
                        border: 'none',
                        borderBottom: 'none',
                      },
                      '&:hover': {
                        boxShadow: 3,
                        backgroundColor: 'white',
                        cursor: 'pointer',
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2">
                        {[user.personne?.prenom, user.personne?.nom].filter(Boolean).join(' ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        color={getRoleColor(user.role) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.centre?.name || user.centre_id || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.personne?.contact || user.telephone || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, user.id)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 15, 25, 50]}
          labelRowsPerPage="Lignes par page:"
        />
      </Paper>

      {/* Menu contextuel */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>Voir détails</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifier</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Supprimer</ListItemText>
        </MenuItem>
      </Menu>

      {/* Formulaire utilisateur */}
      <UserForm
        user={selectedUser}
        onSuccess={handleFormSuccess}
        onCancel={handleUserFormClose}
        open={userFormOpen}
      />

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{userToDelete?.email}</strong> ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Annuler</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersTable;

