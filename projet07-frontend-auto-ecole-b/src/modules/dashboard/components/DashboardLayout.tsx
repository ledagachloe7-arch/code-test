import React from 'react';
import { Box } from '@mui/material';

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => (
  <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <Box sx={{ p: 3 }}>{children}</Box>
  </Box>
);

export default DashboardLayout;
