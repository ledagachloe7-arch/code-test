import { useState, useEffect } from 'react';
import { AutoEcole, autoEcoleService } from '../services';

export const useAutoEcole = (autoEcoleId?: string) => {
  const [autoEcole, setAutoEcole] = useState<AutoEcole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAutoEcole = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await autoEcoleService.getAutoEcoleById(id);
      setAutoEcole(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement de l\'auto-école:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoEcoleId) {
      loadAutoEcole(autoEcoleId);
    }
  }, [autoEcoleId]);

  const refresh = () => {
    if (autoEcoleId) {
      loadAutoEcole(autoEcoleId);
    }
  };

  return {
    autoEcole,
    loading,
    error,
    refresh,
  };
};
