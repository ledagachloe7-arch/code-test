import React, { useState, lazy, Suspense } from 'react';
import { Box, Typography, Paper, Skeleton, Fade, Button } from '@mui/material';
import { ArrowBack, Inventory } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ArchivedDossiersTable = lazy(() => import('../tables/ArchivedDossiersTable'));

const TableSkeleton = () => (
  <Fade in timeout={300}>
    <Paper sx={{ p: 3 }}>
      <Skeleton variant="text" width="30%" height={40} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
        ))}
      </Box>
    </Paper>
  </Fade>
);

const ArchivedDossiersPage: React.FC = () => {
  const navigate = useNavigate();
  const [refreshTrigger] = useState(0);

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', width: '100%', height: '100%' }}>
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 3, py: 4 }}>
        {/* En-tête */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/gestion-dossier')}
            sx={{ mb: 2, textTransform: 'none' }}
            color="inherit"
          >
            Retour à la gestion des dossiers
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Inventory sx={{ fontSize: 36, color: 'success.main' }} />
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Archivage
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Dossiers envoyés à la biométrie — archivés et consultables ici.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Table */}
        <Suspense fallback={<TableSkeleton />}>
          <ArchivedDossiersTable refreshTrigger={refreshTrigger} />
        </Suspense>
      </Box>
    </Box>
  );
};

export default ArchivedDossiersPage;
