import React from 'react';
import { Box, Typography, Container, Paper, alpha } from '@mui/material';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import { FraisDossierTable } from '../tables';

const FraisDossierPage: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100%',
        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
        pb: 4,
        pt: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="xl">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            background: (theme) =>
              `linear-gradient(125deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.dark, 0.06)} 45%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: '50%',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
              pointerEvents: 'none',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, position: 'relative', zIndex: 1 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                color: 'primary.main',
                flexShrink: 0,
              }}
            >
              <BanknotesIcon className="w-8 h-8" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1 }}>
                Finance
              </Typography>
              <Typography variant="h4" component="h1" fontWeight={800} sx={{ mt: 0.25, lineHeight: 1.2 }}>
                Frais de dossier
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 640 }}>
                Historique des paiements enregistrés. Consultez le détail par ligne, ouvrez la facture PDF associée à
                chaque transaction, ou exportez un rapport Excel depuis le tableau ci-dessous.
              </Typography>
            </Box>
          </Box>
        </Paper>

        <FraisDossierTable />
      </Container>
    </Box>
  );
};

export default FraisDossierPage;
