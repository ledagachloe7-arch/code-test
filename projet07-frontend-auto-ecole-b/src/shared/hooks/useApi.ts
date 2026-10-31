// Hook personnalisé pour la gestion des appels API
import { useState, useCallback } from 'react';
import { AppError, handleAxiosError } from '../utils/errorHandler';

// Interface pour l'état de l'API
export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Hook pour la gestion des appels API
export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  // Fonction pour exécuter une requête API
  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const appError = error instanceof AppError ? error : handleAxiosError(error as any);
      const errorMessage = appError.message;
      setState({ data: null, loading: false, error: errorMessage });
      throw appError;
    }
  }, []);

  // Fonction pour réinitialiser l'état
  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  // Fonction pour mettre à jour les données
  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
}

// Hook pour la gestion des listes avec pagination
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListApiState<T> extends ApiState<T[]> {
  pagination: PaginationState;
}

export function useListApi<T>() {
  const [state, setState] = useState<ListApiState<T>>({
    data: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  });

  // Fonction pour charger une liste
  const loadList = useCallback(async (
    apiCall: (page: number, limit: number) => Promise<{ data: T[]; total: number }>
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiCall(state.pagination.page, state.pagination.limit);
      const totalPages = Math.ceil(result.total / state.pagination.limit);
      
      setState(prev => ({
        ...prev,
        data: result.data,
        loading: false,
        error: null,
        pagination: {
          ...prev.pagination,
          total: result.total,
          totalPages,
        },
      }));
      
      return result;
    } catch (error) {
      const appError = error instanceof AppError ? error : handleAxiosError(error as any);
      const errorMessage = appError.message;
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw appError;
    }
  }, [state.pagination.page, state.pagination.limit]);

  // Fonction pour changer de page
  const setPage = useCallback((page: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page },
    }));
  }, []);

  // Fonction pour changer la limite
  const setLimit = useCallback((limit: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, limit, page: 1 },
    }));
  }, []);

  // Fonction pour réinitialiser
  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });
  }, []);

  return {
    ...state,
    loadList,
    setPage,
    setLimit,
    reset,
  };
}






