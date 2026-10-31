import React from 'react';
import { TableRow, TableCell, Typography } from '@mui/material';

interface EmptyStateProps {
  colSpan: number;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ colSpan }) => {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} sx={{ py: 6, textAlign: 'center', backgroundColor: 'white', border: 'none' }}>
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
          Aucun dossier pour ce type de demande.
        </Typography>
      </TableCell>
    </TableRow>
  );
};

