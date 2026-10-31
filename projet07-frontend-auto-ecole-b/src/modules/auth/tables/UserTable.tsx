import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const UserTable: React.FC = () => {
  // Mock data
  const users: User[] = [
    { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'admin', createdAt: '2024-01-01' },
    { id: '2', name: 'Instructor 1', email: 'instructor1@example.com', role: 'instructor', createdAt: '2024-01-02' },
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'instructor': return 'primary';
      case 'student': return 'success';
      default: return 'default';
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nom</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Rôle</TableCell>
            <TableCell>Date de création</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Chip 
                  label={user.role} 
                  color={getRoleColor(user.role) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>{user.createdAt}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default UserTable;
