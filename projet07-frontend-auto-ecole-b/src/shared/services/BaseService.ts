// Service de base pour centraliser la logique commune
import axiosInstance from '../utils/axiosConfig';
import { AxiosResponse, AxiosError } from 'axios';

// Interface pour les réponses API standardisées
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  status: number;
}

// Interface pour les erreurs API
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Classe de base pour tous les services
export abstract class BaseService {
  protected readonly api = axiosInstance;

  // Méthode générique pour les requêtes GET
  protected async get<T>(endpoint: string): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.get(endpoint);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Méthode générique pour les requêtes POST
  protected async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.post(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Méthode générique pour les requêtes PUT
  protected async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Méthode générique pour les requêtes PATCH
  protected async patch<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.patch(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Méthode générique pour les requêtes DELETE
  protected async delete<T>(endpoint: string): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.delete(endpoint);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Gestion centralisée des erreurs
  private handleError(error: any): ApiError {
    const axiosError = error as AxiosError;
    
    if (axiosError.response) {
      // Erreur de réponse du serveur
      return {
        message: axiosError.response.data?.message || 'Erreur du serveur',
        code: axiosError.response.data?.code,
        status: axiosError.response.status,
        details: axiosError.response.data,
      };
    } else if (axiosError.request) {
      // Erreur de réseau
      return {
        message: 'Erreur de connexion au serveur',
        code: 'NETWORK_ERROR',
        status: 0,
      };
    } else {
      // Autre erreur
      return {
        message: error.message || 'Erreur inconnue',
        code: 'UNKNOWN_ERROR',
      };
    }
  }
}





