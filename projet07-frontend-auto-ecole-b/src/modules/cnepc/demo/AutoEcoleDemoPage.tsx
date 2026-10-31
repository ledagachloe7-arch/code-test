import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import { AutoEcoleDemo } from '../components';

const AutoEcoleDemoPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box>
        <Typography variant="h2" component="h1" gutterBottom align="center">
          🏫 Module CNEPC - Gestion des Auto-Écoles
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom align="center" color="text.secondary" sx={{ mb: 4 }}>
          Démonstration complète des fonctionnalités
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3 }}>
          <AutoEcoleDemo />
        </Paper>
      </Box>
    </Container>
  );
};

export default AutoEcoleDemoPage;
