import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

interface AuthLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  ip: string;
  status: 'success' | 'failed';
}

const AuthLogsTable: React.FC = () => {
  // Mock data
  const logs: AuthLog[] = [
    { id: '1', user: 'admin@example.com', action: 'Login', timestamp: '2024-01-01 10:00:00', ip: '192.168.1.1', status: 'success' },
    { id: '2', user: 'instructor@example.com', action: 'Login', timestamp: '2024-01-01 11:00:00', ip: '192.168.1.2', status: 'failed' },
  ];

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Utilisateur</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Timestamp</TableCell>
            <TableCell>IP</TableCell>
            <TableCell>Statut</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{log.user}</TableCell>
              <TableCell>{log.action}</TableCell>
              <TableCell>{log.timestamp}</TableCell>
              <TableCell>{log.ip}</TableCell>
              <TableCell>
                <Chip 
                  label={log.status} 
                  color={log.status === 'success' ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AuthLogsTable;
