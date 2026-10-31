import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const AuthLoader: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        gap: 2
      }}
    >
      <CircularProgress size={60} sx={{ color: '#50C786' }} />
      <Typography variant="h6" color="text.secondary">
        Vérification de l&apos;authentification...
      </Typography>
    </Box>
  );
};

export default AuthLoader;
