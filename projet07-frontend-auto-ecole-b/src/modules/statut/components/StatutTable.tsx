import React, {
  // useState,
  useEffect
} from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  // Box,
  Typography,
  Checkbox,
  // CircularProgress,
} from '@mui/material';
import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Statut } from '../types/statut';
// import { statutService } from '../services/statut.service';

interface StatutTableProps {
  onStatutSelect?: (statut: Statut) => void;
  onEdit?: (statut: Statut) => void;
  onDelete?: (id: string) => void;
  refreshTrigger?: number; // pour rafraîchir la table après création ou suppression
  data: Statut[]
}

const StatutTable: React.FC<StatutTableProps> = ({
  onStatutSelect,
  onEdit,
  onDelete,
  refreshTrigger,
  data
}) => {
  // const [statuts, setStatuts] = useState<Statut[]>([]);
  // const [loading, setLoading] = useState(true);

  useEffect(() => {
    
  }, [refreshTrigger]);

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Libellé</TableCell>
            <TableCell>Final</TableCell>
            <TableCell>Annulable</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Typography color="text.secondary" sx={{ py: 3 }}>
                  Aucun statut enregistré
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            data.map((statut) => (
              <TableRow key={statut.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {statut.code}
                  </Typography>
                </TableCell>
                <TableCell>{statut.libelle}</TableCell>
                <TableCell>
                  <Checkbox checked={statut.final} disabled />
                </TableCell>
                <TableCell>
                  <Checkbox checked={!!statut.annulable} disabled />
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    color="secondary"
                    onClick={() => onEdit?.(statut)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete?.(statut.id)}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StatutTable;
