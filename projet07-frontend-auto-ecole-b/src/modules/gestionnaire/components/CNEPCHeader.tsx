import React from 'react';
import {
  Typography,
  Box,
  Avatar,
  CircularProgress,
} from '@mui/material';
import {
  School,
  People,
  Schedule,
  Quiz,
} from '@mui/icons-material';
import { CNEPCStats } from '../types';

interface CNEPCHeaderProps {
  stats: CNEPCStats;
  loading: boolean;
}

interface StatItemProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  loading: boolean;
}

const StatItem: React.FC<StatItemProps> = ({ icon, value, label, loading }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 32, height: 32 }}>
      {icon}
    </Avatar>
    <Box>
      {loading ? (
        <CircularProgress size={16} sx={{ color: 'white' }} />
      ) : (
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, lineHeight: 1 }}>
          {value}
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.7rem' }}>
        {label}
      </Typography>
    </Box>
  </Box>
);

const CNEPCHeader: React.FC<CNEPCHeaderProps> = ({  }) => {
  return (
    <Box sx={{ flexWrap: 'wrap', py: 1 }}>
     

    </Box>
  );
};

export default CNEPCHeader;

