import React from 'react';
import { Box, Typography } from '@mui/material';
import DossiersCompletsPage from '../modules/validation/pages/DossiersCompletsPage';

const ValidationPage: React.FC = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <DossiersCompletsPage />
    </Box>
  );
};

export default ValidationPage;