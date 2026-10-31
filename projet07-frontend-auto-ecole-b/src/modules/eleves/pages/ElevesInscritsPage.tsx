import React from 'react';
import {
  Box,
  Typography
} from '@mui/material';
import StudentsTable from '../tables/StudentsTable';

const ElevesInscritsPage: React.FC = () => {
  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'gray-100' }}>
      <Typography variant="h5" component="h1" gutterBottom className="font-display" sx={{ px: 2, pt: 2, pb: 0.5 }}>
        Élèves inscrits
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, px: 2 }} className="font-primary">
        Gestion des élèves déjà inscrits dans l'auto-école
      </Typography>
      
      <StudentsTable />
    </Box>
  );
};

export default ElevesInscritsPage;
