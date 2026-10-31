import React, { useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Checkbox,
} from '@mui/material';
import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Circuit } from '../types/circuit';
import { useNavigate } from 'react-router-dom'

interface CircuitTableProps {
  onCircuitSelect?: (circuit: Circuit) => void;
  onEdit?: (circuit: Circuit) => void;
  onDelete?: (id: string) => void;
  refreshTrigger?: number;
  data: Circuit[];
}

const CircuitTable: React.FC<CircuitTableProps> = ({
  onEdit,
  onDelete,
  refreshTrigger,
  data,
}) => {
  useEffect(() => {
    // si besoin, déclenche un refresh à chaque fois que refreshTrigger change
  }, [refreshTrigger]);

  const navigate = useNavigate()
  const circuits = Array.isArray(data) ? data : []


  // const showDetails = (circuit: Circuit) => {
  //   console.log('Détails du circuit :', circuit);
  //   onCircuitSelect?.(circuit);

  //   // navigate(`/circuits/${circuit.id}`)}

  //   console.log(10);
    
  // };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nom</TableCell>
            <TableCell>Entité concernée</TableCell>
            <TableCell>Type de permis</TableCell>
            <TableCell>Etranger ?</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Actif</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {circuits.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography color="text.secondary" sx={{ py: 3 }}>
                  Aucun circuit enregistré
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            circuits.map((circuit) => (
              <TableRow key={circuit.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {circuit.libelle}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Typography variant="body2">{circuit.nom_entite}</Typography>
                </TableCell>

                <TableCell>
                  <Typography variant="body2">{circuit.type_permis?.toUpperCase()}</Typography>
                </TableCell>

                <TableCell>
                  <Typography variant="body2">{circuit.nationalite?.toUpperCase()}</Typography>
                </TableCell>

                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {circuit.description || '—'}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Checkbox checked={!!circuit.actif} disabled />
                </TableCell>

                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/workflow/circuits/detail/${circuit.id}`)}
                    color="primary"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </IconButton>

                  <IconButton
                    size="small"
                    color="secondary"
                    onClick={() => onEdit?.(circuit)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </IconButton>

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete?.(circuit.id)}
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

export default CircuitTable;
