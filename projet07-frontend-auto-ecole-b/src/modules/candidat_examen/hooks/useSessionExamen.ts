// Hook pour la gestion des sessions d'examen
import { useState, useEffect, useCallback } from 'react';
import { 
  SessionExamen, 
  SessionExamenFormData, 
  SessionExamenFilters, 
  SessionExamenStats 
} from '../types';
import { SessionExamenService } from '../services';

export const useSessionExamen = (filters?: SessionExamenFilters) => {
  const [sessions, setSessions] = useState<SessionExamen[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SessionExamenStats | null>(null);

  // Charger les sessions d'examen
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await SessionExamenService.getSessionsExamen(filters);
      setSessions(response.data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des sessions:', err);
      setError(err.message || 'Erreur lors du chargement des sessions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Charger les statistiques
  const loadStats = useCallback(async () => {
    try {
      const statsData = await SessionExamenService.getSessionExamenStats(filters);
      setStats(statsData);
    } catch (err: any) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  }, [filters]);

  // Créer une session d'examen
  const createSession = useCallback(async (data: SessionExamenFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await SessionExamenService.createSessionExamen(data);
      if (response.success && response.data) {
        setSessions(prev => [response.data!, ...prev]);
        await loadStats(); // Recharger les statistiques
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la création de la session:', err);
      setError(err.message || 'Erreur lors de la création de la session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Mettre à jour une session d'examen
  const updateSession = useCallback(async (id: string, data: Partial<SessionExamenFormData>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await SessionExamenService.updateSessionExamen(id, data);
      if (response.success && response.data) {
        setSessions(prev => 
          prev.map(s => s.id === id ? response.data! : s)
        );
        await loadStats(); // Recharger les statistiques
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour de la session:', err);
      setError(err.message || 'Erreur lors de la mise à jour de la session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Supprimer une session d'examen
  const deleteSession = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await SessionExamenService.deleteSessionExamen(id);
      if (response.success) {
        setSessions(prev => prev.filter(s => s.id !== id));
        await loadStats(); // Recharger les statistiques
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la suppression de la session:', err);
      setError(err.message || 'Erreur lors de la suppression de la session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Changer le statut d'une session
  const updateStatut = useCallback(async (id: string, statut: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await SessionExamenService.updateStatutSessionExamen(id, statut);
      if (response.success && response.data) {
        setSessions(prev => 
          prev.map(s => s.id === id ? response.data! : s)
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

  // Ouvrir les inscriptions
  const ouvrirInscriptions = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await SessionExamenService.ouvrirInscriptions(id);
      if (response.success && response.data) {
        setSessions(prev => 
          prev.map(s => s.id === id ? response.data! : s)
        );
        await loadStats(); // Recharger les statistiques
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de l\'ouverture des inscriptions:', err);
      setError(err.message || 'Erreur lors de l\'ouverture des inscriptions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Fermer les inscriptions
  const fermerInscriptions = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await SessionExamenService.fermerInscriptions(id);
      if (response.success && response.data) {
        setSessions(prev => 
          prev.map(s => s.id === id ? response.data! : s)
        );
        await loadStats(); // Recharger les statistiques
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la fermeture des inscriptions:', err);
      setError(err.message || 'Erreur lors de la fermeture des inscriptions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // Recharger les données
  const refresh = useCallback(() => {
    loadSessions();
    loadStats();
  }, [loadSessions, loadStats]);

  // Charger les données au montage et quand les filtres changent
  useEffect(() => {
    loadSessions();
    loadStats();
  }, [loadSessions, loadStats]);

  return {
    sessions,
    loading,
    error,
    stats,
    createSession,
    updateSession,
    deleteSession,
    updateStatut,
    ouvrirInscriptions,
    fermerInscriptions,
    refresh
  };
};

// Hook pour une session spécifique
export const useSessionExamenById = (id: string) => {
  const [session, setSession] = useState<SessionExamen | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await SessionExamenService.getSessionExamenById(id);
      setSession(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement de la session:', err);
      setError(err.message || 'Erreur lors du chargement de la session');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const updateSession = useCallback(async (data: Partial<SessionExamenFormData>) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await SessionExamenService.updateSessionExamen(id, data);
      if (response.success && response.data) {
        setSession(response.data);
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour de la session:', err);
      setError(err.message || 'Erreur lors de la mise à jour de la session');
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
      const response = await SessionExamenService.updateStatutSessionExamen(id, statut);
      if (response.success && response.data) {
        setSession(response.data);
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

  const ouvrirInscriptions = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await SessionExamenService.ouvrirInscriptions(id);
      if (response.success && response.data) {
        setSession(response.data);
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de l\'ouverture des inscriptions:', err);
      setError(err.message || 'Erreur lors de l\'ouverture des inscriptions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fermerInscriptions = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await SessionExamenService.fermerInscriptions(id);
      if (response.success && response.data) {
        setSession(response.data);
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la fermeture des inscriptions:', err);
      setError(err.message || 'Erreur lors de la fermeture des inscriptions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const refresh = useCallback(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return {
    session,
    loading,
    error,
    updateSession,
    updateStatut,
    ouvrirInscriptions,
    fermerInscriptions,
    refresh
  };
};
