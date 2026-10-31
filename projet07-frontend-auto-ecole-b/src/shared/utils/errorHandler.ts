// Gestionnaire d'erreurs centralisé
import { AxiosError } from 'axios';

// Types d'erreurs
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  SERVER = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

// Interface pour les erreurs personnalisées
export interface CustomError {
  type: ErrorType;
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Classe d'erreur personnalisée
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly status?: number;
  public readonly details?: any;

  constructor(error: CustomError) {
    super(error.message);
    this.name = 'AppError';
    this.type = error.type;
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }
}

// Gestionnaire d'erreurs Axios
export function handleAxiosError(error: AxiosError): AppError {
  if (error.response) {
    // Erreur de réponse du serveur
    const status = error.response.status;
    const data = error.response.data as any;
    
    let type: ErrorType;
    switch (status) {
      case 401:
        type = ErrorType.AUTHENTICATION;
        break;
      case 403:
        type = ErrorType.AUTHORIZATION;
        break;
      case 422:
        type = ErrorType.VALIDATION;
        break;
      case 500:
      case 502:
      case 503:
        type = ErrorType.SERVER;
        break;
      default:
        type = ErrorType.SERVER;
    }

    return new AppError({
      type,
      message: data?.message || `Erreur ${status}`,
      code: data?.code,
      status,
      details: data,
    });
  } else if (error.request) {
    // Erreur de réseau
    return new AppError({
      type: ErrorType.NETWORK,
      message: 'Erreur de connexion au serveur',
      code: 'NETWORK_ERROR',
    });
  } else {
    // Autre erreur
    return new AppError({
      type: ErrorType.UNKNOWN,
      message: error.message || 'Erreur inconnue',
      code: 'UNKNOWN_ERROR',
    });
  }
}

// Messages d'erreur utilisateur-friendly
export const ERROR_MESSAGES = {
  [ErrorType.NETWORK]: 'Problème de connexion. Vérifiez votre connexion internet.',
  [ErrorType.AUTHENTICATION]: 'Session expirée. Veuillez vous reconnecter.',
  [ErrorType.AUTHORIZATION]: 'Vous n\'avez pas les permissions nécessaires.',
  [ErrorType.VALIDATION]: 'Les données saisies ne sont pas valides.',
  [ErrorType.SERVER]: 'Erreur du serveur. Veuillez réessayer plus tard.',
  [ErrorType.UNKNOWN]: 'Une erreur inattendue s\'est produite.',
} as const;

// Fonction pour obtenir un message d'erreur utilisateur
export function getUserFriendlyMessage(error: AppError): string {
  return ERROR_MESSAGES[error.type] || ERROR_MESSAGES[ErrorType.UNKNOWN];
}

// Hook pour la gestion des erreurs dans les composants
export function useErrorHandler() {
  const handleError = (error: unknown): string => {
    if (error instanceof AppError) {
      return getUserFriendlyMessage(error);
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'Une erreur inattendue s\'est produite.';
  };

  return { handleError };
}






