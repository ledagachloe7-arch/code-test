// Hook pour la gestion des candidats aux examens
import { useState, useEffect, useCallback } from 'react';
import { 
  CandidatExamen, 
  CandidatExamenFormData, 
  CandidatExamenFilters, 
  CandidatExamenStats 
} from '../types';
import { CandidatExamenService } from '../services';

export const useCandidatExamen = (filters?: CandidatExamenFilters) => {
  const [candidats, setCandidats] = useState<CandidatExamen[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CandidatExamenStats | null>(null);

  // Charger les candidats aux examens
  const loadCandidats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await CandidatExamenService.getCandidatsExamen(filters);
      setCandidats(response.data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des candidats:', err);
      setError(err.message || 'Erreur lors du chargement des candidats');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Charger les statistiques
  const loadStats = useCallback(async () => {
    try {
      const statsData = await CandidatExamenService.getCandidatExamenStats(filters);
      setStats(statsData);
    } catch (err: any) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  }, [filters]);

  // Créer un candidat aux examens
  const createCandidat = useCallback(async (data: CandidatExamenFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await CandidatExamenService.createCandidatExamen(data);
      if (response.success && response.data) {
        setCandidats(prev => [response.data!, ...prev]);
        await loadStats(); // Recharger les statistiques
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la création du candidat:', err);
      setError(err.message || 'Erreur lors de la création du candidat');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Mettre à jour un candidat aux examens
  const updateCandidat = useCallback(async (id: string, data: Partial<CandidatExamenFormData>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await CandidatExamenService.updateCandidatExamen(id, data);
      if (response.success && response.data) {
        setCandidats(prev => 
          prev.map(c => c.id === id ? response.data! : c)
        );
        await loadStats(); // Recharger les statistiques
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du candidat:', err);
      setError(err.message || 'Erreur lors de la mise à jour du candidat');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Supprimer un candidat aux examens
  const deleteCandidat = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await CandidatExamenService.deleteCandidatExamen(id);
      if (response.success) {
        setCandidats(prev => prev.filter(c => c.id !== id));
        await loadStats(); // Recharger les statistiques
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la suppression du candidat:', err);
      setError(err.message || 'Erreur lors de la suppression du candidat');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Changer le statut d'un candidat
  const updateStatut = useCallback(async (id: string, statut: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await CandidatExamenService.updateStatutCandidatExamen(id, statut);
      if (response.success && response.data) {
        setCandidats(prev => 
          prev.map(c => c.id === id ? response.data! : c)
        );
        await loadStats(); // Recharger les statistiques
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setError(err.message || 'Erreur lors de la mise à jour du statut');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Recharger les données
  const refresh = useCallback(() => {
    loadCandidats();
    loadStats();
  }, [loadCandidats, loadStats]);

  // Charger les données au montage et quand les filtres changent
  useEffect(() => {
    loadCandidats();
    loadStats();
  }, [loadCandidats, loadStats]);

  // Rafraîchir la liste quand un programme session est créé depuis la réception (ex. "Envoyer à l'examen")
  useEffect(() => {
    const handleProgrammeSessionCreated = () => {
      refresh();
    };
    window.addEventListener('programmeSessionCreated', handleProgrammeSessionCreated);
    return () => window.removeEventListener('programmeSessionCreated', handleProgrammeSessionCreated);
  }, [refresh]);

  return {
    candidats,
    loading,
    error,
    stats,
    createCandidat,
    updateCandidat,
    deleteCandidat,
    updateStatut,
    refresh
  };
};

// Hook pour un candidat spécifique
export const useCandidatExamenById = (id: string) => {
  const [candidat, setCandidat] = useState<CandidatExamen | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCandidat = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await CandidatExamenService.getCandidatExamenById(id);
      setCandidat(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement du candidat:', err);
      setError(err.message || 'Erreur lors du chargement du candidat');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const updateCandidat = useCallback(async (data: Partial<CandidatExamenFormData>) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await CandidatExamenService.updateCandidatExamen(id, data);
      if (response.success && response.data) {
        setCandidat(response.data);
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du candidat:', err);
      setError(err.message || 'Erreur lors de la mise à jour du candidat');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const updateStatut = useCallback(async (statut: string) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await CandidatExamenService.updateStatutCandidatExamen(id, statut);
      if (response.success && response.data) {
        setCandidat(response.data);
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setError(err.message || 'Erreur lors de la mise à jour du statut');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const refresh = useCallback(() => {
    loadCandidat();
  }, [loadCandidat]);

  useEffect(() => {
    loadCandidat();
  }, [loadCandidat]);

  return {
    candidat,
    loading,
    error,
    updateCandidat,
    updateStatut,
    refresh
  };
};
