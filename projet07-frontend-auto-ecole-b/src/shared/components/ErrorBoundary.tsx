// Composant de gestion des erreurs avec boundary
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert, Paper } from '@mui/material';
import { AppError, ErrorType } from '../utils/errorHandler';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Appeler le callback d'erreur si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Logger l'erreur (dans un vrai projet, utiliser un service de logging)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Si un fallback est fourni, l'utiliser
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Rendu par défaut en cas d'erreur
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Une erreur s'est produite
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {this.state.error?.message || 'Une erreur inattendue s\'est produite.'}
            </Typography>
            <Button
              variant="outlined"
              color="inherit"
              onClick={this.handleRetry}
              sx={{ mr: 1 }}
            >
              Réessayer
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => window.location.reload()}
            >
              Recharger la page
            </Button>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;





