// Hook pour la gestion des créneaux
import { useState, useEffect, useCallback } from 'react';
import { 
  Creneau, 
  CreneauFormData, 
  CreneauFilters, 
  CreneauStats,
  CandidatCreneau,
  CandidatCreneauFormData,
  PlanificationCreneaux,
  PlanificationResult
} from '../types';
import { CreneauService, CandidatCreneauService } from '../services';

export const useCreneau = (filters?: CreneauFilters) => {
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CreneauStats | null>(null);

  // Charger les créneaux
  const loadCreneaux = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await CreneauService.getCreneaux(filters);
      setCreneaux(response.data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des créneaux:', err);
      setError(err.message || 'Erreur lors du chargement des créneaux');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Charger les statistiques
  const loadStats = useCallback(async () => {
    try {
      const statsData = await CreneauService.getCreneauStats(filters);
      setStats(statsData);
    } catch (err: any) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  }, [filters]);

  // Créer un créneau
  const createCreneau = useCallback(async (data: CreneauFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await CreneauService.createCreneau(data);
      if (response.success && response.data) {
        setCreneaux(prev => [response.data!, ...prev]);
        await loadStats(); // Recharger les statistiques
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la création du créneau:', err);
      setError(err.message || 'Erreur lors de la création du créneau');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Mettre à jour un créneau
  const updateCreneau = useCallback(async (id: string, data: Partial<CreneauFormData>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await CreneauService.updateCreneau(id, data);
      if (response.success && response.data) {
        setCreneaux(prev => 
          prev.map(c => c.id === id ? response.data! : c)
        );
        await loadStats(); // Recharger les statistiques
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du créneau:', err);
      setError(err.message || 'Erreur lors de la mise à jour du créneau');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Supprimer un créneau
  const deleteCreneau = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await CreneauService.deleteCreneau(id);
      if (response.success) {
        setCreneaux(prev => prev.filter(c => c.id !== id));
        await loadStats(); // Recharger les statistiques
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la suppression du créneau:', err);
      setError(err.message || 'Erreur lors de la suppression du créneau');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Planifier automatiquement les créneaux
  const planifierCreneaux = useCallback(async (data: PlanificationCreneaux) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await CreneauService.planifierCreneaux(data);
      if (result.creneaux_crees.length > 0) {
        setCreneaux(prev => [...result.creneaux_crees, ...prev]);
        await loadStats(); // Recharger les statistiques
      }
      return result;
    } catch (err: any) {
      console.error('Erreur lors de la planification des créneaux:', err);
      setError(err.message || 'Erreur lors de la planification des créneaux');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Recharger les données
  const refresh = useCallback(() => {
    loadCreneaux();
    loadStats();
  }, [loadCreneaux, loadStats]);

  // Charger les données au montage et quand les filtres changent
  useEffect(() => {
    loadCreneaux();
    loadStats();
  }, [loadCreneaux, loadStats]);

  return {
    creneaux,
    loading,
    error,
    stats,
    createCreneau,
    updateCreneau,
    deleteCreneau,
    planifierCreneaux,
    refresh
  };
};

// Hook pour un créneau spécifique
export const useCreneauById = (id: string) => {
  const [creneau, setCreneau] = useState<Creneau | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCreneau = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await CreneauService.getCreneauById(id);
      setCreneau(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement du créneau:', err);
      setError(err.message || 'Erreur lors du chargement du créneau');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const updateCreneau = useCallback(async (data: Partial<CreneauFormData>) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await CreneauService.updateCreneau(id, data);
      if (response.success && response.data) {
        setCreneau(response.data);
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du créneau:', err);
      setError(err.message || 'Erreur lors de la mise à jour du créneau');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const refresh = useCallback(() => {
    loadCreneau();
  }, [loadCreneau]);

  useEffect(() => {
    loadCreneau();
  }, [loadCreneau]);

  return {
    creneau,
    loading,
    error,
    updateCreneau,
    refresh
  };
};

// Hook pour la gestion des candidats de créneaux
export const useCandidatCreneau = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inscrire un candidat à un créneau
  const inscrireCandidat = useCallback(async (data: CandidatCreneauFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const candidatCreneau = await CandidatCreneauService.inscrireCandidatCreneau(data);
      return candidatCreneau;
    } catch (err: any) {
      console.error('Erreur lors de l\'inscription du candidat:', err);
      setError(err.message || 'Erreur lors de l\'inscription du candidat');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Désinscrire un candidat d'un créneau
  const desinscrireCandidat = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await CandidatCreneauService.desinscrireCandidatCreneau(id);
    } catch (err: any) {
      console.error('Erreur lors de la désinscription du candidat:', err);
      setError(err.message || 'Erreur lors de la désinscription du candidat');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Changer le statut d'un candidat de créneau
  const updateStatutCandidat = useCallback(async (id: string, statut: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const candidatCreneau = await CandidatCreneauService.updateStatutCandidatCreneau(id, statut);
      return candidatCreneau;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setError(err.message || 'Erreur lors de la mise à jour du statut');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    inscrireCandidat,
    desinscrireCandidat,
    updateStatutCandidat
  };
};
