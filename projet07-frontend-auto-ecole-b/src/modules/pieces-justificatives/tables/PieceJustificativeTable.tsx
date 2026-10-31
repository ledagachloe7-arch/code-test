import React, { useState, useEffect, useRef } from 'react';
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
  Button,
  TextField,
  InputAdornment,
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
  Chip,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
} from '@mui/icons-material';
import { API_ENDPOINTS } from '../../../shared/constants/api';
import { PieceJustificative, PieceJustificativeListResponse } from '../types/piece-justificative';
import { pieceJustificativeService } from '../services/piece-justificative.service';
import PieceJustificativeForm from '../forms/PieceJustificativeForm';

const DELETE_PIECE_ENABLED = API_ENDPOINTS.PIECES_JUSTIFICATIVES.DELETE_ENABLED;

interface PieceJustificativeTableProps {
  refreshTrigger?: number;
}

const PieceJustificativeTable: React.FC<PieceJustificativeTableProps> = ({ refreshTrigger }) => {
  const [piecesJustificatives, setPiecesJustificatives] = useState<PieceJustificative[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // États pour les modales
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPieceJustificative, setSelectedPieceJustificative] = useState<PieceJustificative | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pieceJustificativeToDelete, setPieceJustificativeToDelete] = useState<PieceJustificative | null>(null);

  // Menu contextuel
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  /** Id récemment supprimé : on l'exclut du prochain chargement au cas où le backend renverrait encore l'item (cache). */
  const lastDeletedIdRef = useRef<string | null>(null);

  // Charger les pièces justificatives
  const loadPiecesJustificatives = async () => {
    setLoading(true);
    setError(null);

    try {
      const response: PieceJustificativeListResponse = await pieceJustificativeService.getPiecesJustificatives(
        page + 1,
        rowsPerPage,
        { search: searchTerm }
      );

      const excludedId = lastDeletedIdRef.current;
      if (excludedId) lastDeletedIdRef.current = null;

      // Gérer les cas où la réponse n'a pas la structure attendue
      if (response && response.data) {
        const list = Array.isArray(response.data) ? response.data : [];
        const excludedIdStr = excludedId ? String(excludedId) : null;
        const filtered =
          excludedIdStr ? list.filter((p: PieceJustificative) => String(p.id) !== excludedIdStr) : list;
        const serverStillHadDeleted =
          excludedIdStr && list.some((p: PieceJustificative) => String(p.id) === excludedIdStr);
        const totalCount =
          response.meta?.total != null
            ? serverStillHadDeleted
              ? Math.max(0, response.meta.total - 1)
              : response.meta.total
            : filtered.length;
        setPiecesJustificatives(filtered);
        setTotal(totalCount);
      } else {
        setPiecesJustificatives([]);
        setTotal(0);
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des pièces justificatives:', err);
      setError(err.response?.data?.message || err.message || 'Erreur lors du chargement des pièces justificatives');
      setPiecesJustificatives([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Effet pour charger les données
  useEffect(() => {
    loadPiecesJustificatives();
  }, [page, rowsPerPage, searchTerm, refreshTrigger]);

  // Gestion de la pagination
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Gestion de la recherche
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // Gestion du menu contextuel
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, pieceJustificativeId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(pieceJustificativeId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
  };

  // Actions du menu
  const handleEdit = () => {
    const pieceJustificative = piecesJustificatives.find((pj) => pj.id === selectedRowId);
    if (pieceJustificative) {
      setSelectedPieceJustificative(pieceJustificative);
      setFormOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (!DELETE_PIECE_ENABLED) return;
    const pieceJustificative = piecesJustificatives.find((pj) => pj.id === selectedRowId);
    if (pieceJustificative) {
      setPieceJustificativeToDelete(pieceJustificative);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  // Confirmer la suppression (le backend attend l'UUID dans l'URL)
  const confirmDelete = async () => {
    if (!pieceJustificativeToDelete) return;

    const uuid =
      pieceJustificativeToDelete.pieces_justificative ??
      pieceJustificativeToDelete.id;
    const deletedId = String(uuid);

    try {
      await pieceJustificativeService.deletePieceJustificative(deletedId);
      lastDeletedIdRef.current = deletedId;
      setDeleteDialogOpen(false);
      setPieceJustificativeToDelete(null);
      setError(null);
      setPiecesJustificatives((prev) => prev.filter((p) => String(p.id) !== deletedId));
      setTotal((prev) => Math.max(0, prev - 1));
      // pouvait réafficher la pièce (cache backend) et donner l’impression qu’elle se doublait.
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // Gestion du formulaire
  const handleFormSuccess = () => {
    setFormOpen(false);
    setSelectedPieceJustificative(undefined);
    loadPiecesJustificatives();
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setSelectedPieceJustificative(undefined);
  };

  const handleAddNew = () => {
    setSelectedPieceJustificative(undefined);
    setFormOpen(true);
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Pièces justificatives</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
            Ajouter
          </Button>
        </Box>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Rechercher une pièce justificative..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Libellé</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Obligatoire</TableCell>
                <TableCell>Date de livraison</TableCell>
                <TableCell>Date d'expiration</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : !piecesJustificatives || piecesJustificatives.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Aucune pièce justificative trouvée
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                piecesJustificatives.map((pieceJustificative) => (
                  <TableRow key={pieceJustificative.id} hover>
                    <TableCell>{pieceJustificative.code}</TableCell>
                    <TableCell>{pieceJustificative.libelle}</TableCell>
                    <TableCell>{pieceJustificative.format_attendu || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={pieceJustificative.obligatoire ? 'Oui' : 'Non'}
                        color={pieceJustificative.obligatoire ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {pieceJustificative.delivery_date
                        ? new Date(pieceJustificative.delivery_date).toLocaleDateString('fr-FR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {pieceJustificative.expiration_date
                        ? new Date(pieceJustificative.expiration_date).toLocaleDateString('fr-FR')
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, pieceJustificative.id)}
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
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifier</ListItemText>
        </MenuItem>
        {DELETE_PIECE_ENABLED && (
          <MenuItem onClick={handleDelete}>
            <ListItemIcon>
              <Delete fontSize="small" />
            </ListItemIcon>
            <ListItemText>Supprimer</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Formulaire */}
      <PieceJustificativeForm
        pieceJustificative={selectedPieceJustificative}
        open={formOpen}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <Box>
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <DialogContent>
            <Typography>
              Êtes-vous sûr de vouloir supprimer la pièce justificative &quot;{pieceJustificativeToDelete?.libelle}&quot; ?
              Cette action est irréversible.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              Supprimer
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default PieceJustificativeTable;

