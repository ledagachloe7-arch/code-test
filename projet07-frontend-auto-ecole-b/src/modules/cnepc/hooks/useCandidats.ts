import { useState, useEffect } from 'react';
import { Dossier, MesDossiersResponse, autoEcoleService } from '../services';

export const useCandidats = (filters?: { statut?: string }) => {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [statistiques, setStatistiques] = useState({
    total: 0,
    en_attente: 0,
    en_cours: 0,
    valide: 0,
    rejete: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCandidats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response: MesDossiersResponse = await autoEcoleService.getMesDossiers(filters);
      setDossiers(response.dossiers);
      setStatistiques(response.statistiques);
    } catch (err: any) {
      console.error('Erreur lors du chargement des candidats:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des candidats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidats();
  }, [filters]);

  const refresh = () => {
    loadCandidats();
  };

  return {
    dossiers,
    statistiques,
    loading,
    error,
    refresh,
  };
};
