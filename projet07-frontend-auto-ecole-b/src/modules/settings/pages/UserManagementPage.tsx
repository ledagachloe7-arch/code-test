import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  useTheme,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from '@mui/icons-material';
import { getOperators, createOperator, updateOperator, toggleOperatorStatus, deleteOperator } from '../services/userManagementService';
import { Operator, OperatorFormData } from '../types';

const UserManagementPage: React.FC = () => {
  const theme = useTheme();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [formData, setFormData] = useState<OperatorFormData>({
    email: '',
    name: '',
    password: '',
    permissions: []
  });

  const availablePermissions = [
    'manage_autoecoles',
    'manage_autoecole_users',
    'view_candidates',
    'manage_reports',
    'system_settings'
  ];

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    try {
      setLoading(true);
      const data = await getOperators();
      setOperators(data);
    } catch (err) {
      setError('Erreur lors du chargement des opérateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (operator?: Operator) => {
    if (operator) {
      setEditingOperator(operator);
      setFormData({
        email: operator.email,
        name: operator.name,
        password: '',
        permissions: operator.permissions
      });
    } else {
      setEditingOperator(null);
      setFormData({
        email: '',
        name: '',
        password: '',
        permissions: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOperator(null);
    setFormData({
      email: '',
      name: '',
      password: '',
      permissions: []
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingOperator) {
        await updateOperator(editingOperator.id, formData);
      } else {
        await createOperator(formData);
      }
      await loadOperators();
      handleCloseDialog();
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleOperatorStatus(id);
      await loadOperators();
    } catch (err) {
      setError('Erreur lors de la modification du statut');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet opérateur ?')) {
      try {
        await deleteOperator(id);
        await loadOperators();
      } catch (err) {
        setError('Erreur lors de la suppression');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gestion des Utilisateurs
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Créer et gérer les comptes opérateurs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ height: 40 }}
        >
          Nouvel Opérateur
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell>Dernière connexion</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operators.map((operator) => (
                <TableRow key={operator.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonAddIcon color="primary" />
                      {operator.name}
                    </Box>
                  </TableCell>
                  <TableCell>{operator.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={operator.isActive ? 'Actif' : 'Inactif'}
                      color={operator.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {operator.permissions.map((permission) => (
                        <Chip
                          key={permission}
                          label={permission.replace('_', ' ')}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {operator.lastLogin 
                      ? new Date(operator.lastLogin).toLocaleDateString()
                      : 'Jamais'
                    }
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={1} justifyContent="center">
                      <Tooltip title="Modifier">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(operator)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={operator.isActive ? 'Désactiver' : 'Activer'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleStatus(operator.id)}
                        >
                          {operator.isActive ? <ToggleOffIcon /> : <ToggleOnIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(operator.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog pour créer/modifier un opérateur */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingOperator ? 'Modifier l\'opérateur' : 'Nouvel opérateur'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Nom complet"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Mot de passe"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              margin="normal"
              helperText={editingOperator ? "Laisser vide pour ne pas changer" : ""}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Permissions</InputLabel>
              <Select
                multiple
                value={formData.permissions}
                onChange={(e) => setFormData({ ...formData, permissions: e.target.value as string[] })}
                input={<OutlinedInput label="Permissions" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value.replace('_', ' ')} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availablePermissions.map((permission) => (
                  <MenuItem key={permission} value={permission}>
                    <Checkbox checked={formData.permissions.indexOf(permission) > -1} />
                    <ListItemText primary={permission.replace('_', ' ')} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingOperator ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagementPage;
