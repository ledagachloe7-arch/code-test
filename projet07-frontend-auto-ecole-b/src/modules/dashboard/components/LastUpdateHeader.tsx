import React from 'react';
import { Typography, Box } from '@mui/material';

export interface LastUpdateHeaderProps {
  label?: string;
  value?: string;
}

const LastUpdateHeader: React.FC<LastUpdateHeaderProps> = ({
  label = 'Dernière mise à jour',
  value = 'Maintenant',
}) => (
  <Box sx={{ textAlign: 'right' }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
      {value}
    </Typography>
  </Box>
);

export default LastUpdateHeader;
