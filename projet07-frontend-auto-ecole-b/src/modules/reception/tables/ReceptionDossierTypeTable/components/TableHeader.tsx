import React from 'react';
import { TableHead, TableRow, TableCell } from '@mui/material';

interface TableHeaderProps {
  isNouveauPermis: boolean;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ isNouveauPermis }) => {
  return (
    <TableHead>
      <TableRow sx={{ 
        backgroundColor: 'white',
        borderBottom: '2px solid rgba(0, 0, 0, 0.12)'
      }}>
        <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', py: 2, fontSize: '0.875rem' }}>
          Référence
        </TableCell>
        <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', py: 2, fontSize: '0.875rem' }}>
          Candidat
        </TableCell>
        {isNouveauPermis ? (
          <>
            <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', py: 2, fontSize: '0.875rem' }}>
              Formation
            </TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', py: 2, fontSize: '0.875rem' }}>
              Auto-école
            </TableCell>
          </>
        ) : (
          <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', py: 2, fontSize: '0.875rem' }}>
            Type de permis
          </TableCell>
        )}
        <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', py: 2, fontSize: '0.875rem' }}>
          Suivi
        </TableCell>
        {isNouveauPermis && (
          <TableCell sx={{ fontWeight: 700, color: '#1a1a1a', py: 2, fontSize: '0.875rem' }}>
            Statut Épreuves
          </TableCell>
        )}
        <TableCell align="right" sx={{ fontWeight: 700, color: '#1a1a1a', py: 2, fontSize: '0.875rem' }}>
          Actions
        </TableCell>
      </TableRow>
    </TableHead>
  );
};

