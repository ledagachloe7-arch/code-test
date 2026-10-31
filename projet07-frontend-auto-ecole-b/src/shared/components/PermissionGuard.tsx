import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { hasPermission } from '../utils/permissions';
import { useAppStore } from '../../store';
import { ErrorType } from '../utils/errorHandler';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
  showError?: boolean;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  children, 
  permission, 
  fallback,
  redirectTo = '/login',
  showError = true
}) => {
  const { user } = useAppStore();

  // Si l'utilisateur n'est pas connecté, rediriger vers login
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Vérifier si l'utilisateur a la permission
  if (!hasPermission(user, permission)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showError) {
      return null;
    }

    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Accès Refusé
          </Typography>
          <Typography variant="body2">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;
