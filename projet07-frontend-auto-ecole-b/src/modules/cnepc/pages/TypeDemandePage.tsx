import React from 'react';
import { Container, Box, Typography, Paper } from '@mui/material';
import { Description } from '@mui/icons-material';
import TypeDemandeTable from '../tables/TypeDemandeTable';

const TypeDemandePage: React.FC = () => {
  return (
    <Box
      sx={{
        flexGrow: 1,
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)',
              }}
            >
              <Description sx={{ color: 'white', fontSize: 32 }} />
            </Box>
            <Box>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                Typage de Dossier
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  fontSize: '1.1rem',
                  fontWeight: 500,
                }}
              >
                Gérez les types de demande pour les dossiers candidats
              </Typography>
            </Box>
          </Box>
        </Paper>

        <TypeDemandeTable />
      </Container>
    </Box>
  );
};

export default TypeDemandePage;

