import React from 'react';
import { Box } from '@mui/material';
import { UsersTable } from '../tables';

const UserManagementPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <UsersTable />
    </Box>
  );
};

export default UserManagementPage;

