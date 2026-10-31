import { useState, useEffect } from 'react';
import { userService } from '../services';
import { User, UserFilters, UserListResponse, UserStats } from '../types';

interface UseUsersOptions {
  page?: number;
  perPage?: number;
  filters?: UserFilters;
  autoLoad?: boolean;
}

export const useUsers = (options: UseUsersOptions = {}) => {
  const {
    page = 1,
    perPage = 15,
    filters = {},
    autoLoad = true,
  } = options;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page,
    perPage,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState<UserStats | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response: UserListResponse = await userService.getUsers(
        pagination.page,
        pagination.perPage,
        filters
      );

      setUsers(response.users || []);
      setPagination({
        page: response.page || pagination.page,
        perPage: response.per_page || pagination.perPage,
        total: response.total || 0,
        totalPages: response.total_pages || 0,
      });
    } catch (err: any) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await userService.getUsersStats();
      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      console.warn('Les statistiques ne sont pas disponibles:', err);
      // Ne pas définir d'erreur car les stats sont optionnelles
    }
  };

  useEffect(() => {
    if (autoLoad) {
      loadUsers();
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.perPage, JSON.stringify(filters)]);

  const refresh = () => {
    loadUsers();
    loadStats();
  };

  const setPage = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const setPerPage = (newPerPage: number) => {
    setPagination(prev => ({ ...prev, perPage: newPerPage, page: 1 }));
  };

  return {
    users,
    loading,
    error,
    pagination,
    stats,
    refresh,
    setPage,
    setPerPage,
  };
};

