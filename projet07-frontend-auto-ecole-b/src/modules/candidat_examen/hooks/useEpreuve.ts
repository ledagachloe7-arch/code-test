// Hook pour la gestion des épreuves
import { useState, useEffect, useCallback } from 'react';
import { 
  Epreuve, 
  EpreuveFormData, 
  EpreuveSession,
  EpreuveSessionFormData
} from '../types';
import { EpreuveService, EpreuveSessionService } from '../services';

export const useEpreuve = () => {
  const [epreuves, setEpreuves] = useState<Epreuve[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les épreuves
  const loadEpreuves = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await EpreuveService.getEpreuves();
      setEpreuves(response.data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des épreuves:', err);
      setError(err.message || 'Erreur lors du chargement des épreuves');
    } finally {
      setLoading(false);
    }
  }, []);

  // Créer une épreuve
  const createEpreuve = useCallback(async (data: EpreuveFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await EpreuveService.createEpreuve(data);
      if (response.success && response.data) {
        setEpreuves(prev => [response.data!, ...prev]);
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la création de l\'épreuve:', err);
      setError(err.message || 'Erreur lors de la création de l\'épreuve');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mettre à jour une épreuve
  const updateEpreuve = useCallback(async (id: string, data: Partial<EpreuveFormData>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await EpreuveService.updateEpreuve(id, data);
      if (response.success && response.data) {
        setEpreuves(prev => 
          prev.map(e => e.id === id ? response.data! : e)
        );
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour de l\'épreuve:', err);
      setError(err.message || 'Erreur lors de la mise à jour de l\'épreuve');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Supprimer une épreuve
  const deleteEpreuve = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await EpreuveService.deleteEpreuve(id);
      if (response.success) {
        setEpreuves(prev => prev.filter(e => e.id !== id));
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la suppression de l\'épreuve:', err);
      setError(err.message || 'Erreur lors de la suppression de l\'épreuve');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Recharger les données
  const refresh = useCallback(() => {
    loadEpreuves();
  }, [loadEpreuves]);

  // Charger les données au montage
  useEffect(() => {
    loadEpreuves();
  }, [loadEpreuves]);

  return {
    epreuves,
    loading,
    error,
    createEpreuve,
    updateEpreuve,
    deleteEpreuve,
    refresh
  };
};

// Hook pour une épreuve spécifique
export const useEpreuveById = (id: string) => {
  const [epreuve, setEpreuve] = useState<Epreuve | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEpreuve = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await EpreuveService.getEpreuveById(id);
      setEpreuve(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement de l\'épreuve:', err);
      setError(err.message || 'Erreur lors du chargement de l\'épreuve');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const updateEpreuve = useCallback(async (data: Partial<EpreuveFormData>) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await EpreuveService.updateEpreuve(id, data);
      if (response.success && response.data) {
        setEpreuve(response.data);
      }
      return response;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour de l\'épreuve:', err);
      setError(err.message || 'Erreur lors de la mise à jour de l\'épreuve');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const refresh = useCallback(() => {
    loadEpreuve();
  }, [loadEpreuve]);

  useEffect(() => {
    loadEpreuve();
  }, [loadEpreuve]);

  return {
    epreuve,
    loading,
    error,
    updateEpreuve,
    refresh
  };
};

// Hook pour les épreuves de session
export const useEpreuveSession = (sessionId?: string) => {
  const [epreuvesSession, setEpreuvesSession] = useState<EpreuveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les épreuves d'une session
  const loadEpreuvesSession = useCallback(async () => {
    if (!sessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await EpreuveSessionService.getEpreuvesBySession(sessionId);
      setEpreuvesSession(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des épreuves de session:', err);
      setError(err.message || 'Erreur lors du chargement des épreuves de session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Créer une épreuve de session
  const createEpreuveSession = useCallback(async (data: EpreuveSessionFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const newEpreuveSession = await EpreuveSessionService.createEpreuveSession(data);
      setEpreuvesSession(prev => [...prev, newEpreuveSession]);
      return newEpreuveSession;
    } catch (err: any) {
      console.error('Erreur lors de la création de l\'épreuve de session:', err);
      setError(err.message || 'Erreur lors de la création de l\'épreuve de session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mettre à jour une épreuve de session
  const updateEpreuveSession = useCallback(async (id: string, data: Partial<EpreuveSessionFormData>) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedEpreuveSession = await EpreuveSessionService.updateEpreuveSession(id, data);
      setEpreuvesSession(prev => 
        prev.map(es => es.id === id ? updatedEpreuveSession : es)
      );
      return updatedEpreuveSession;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour de l\'épreuve de session:', err);
      setError(err.message || 'Erreur lors de la mise à jour de l\'épreuve de session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Supprimer une épreuve de session
  const deleteEpreuveSession = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await EpreuveSessionService.deleteEpreuveSession(id);
      setEpreuvesSession(prev => prev.filter(es => es.id !== id));
    } catch (err: any) {
      console.error('Erreur lors de la suppression de l\'épreuve de session:', err);
      setError(err.message || 'Erreur lors de la suppression de l\'épreuve de session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Changer le statut d'une épreuve de session
  const updateStatutEpreuveSession = useCallback(async (id: string, statut: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedEpreuveSession = await EpreuveSessionService.updateStatutEpreuveSession(id, statut);
      setEpreuvesSession(prev => 
        prev.map(es => es.id === id ? updatedEpreuveSession : es)
      );
      return updatedEpreuveSession;
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setError(err.message || 'Erreur lors de la mise à jour du statut');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Recharger les données
  const refresh = useCallback(() => {
    loadEpreuvesSession();
  }, [loadEpreuvesSession]);

  // Charger les données quand sessionId change
  useEffect(() => {
    loadEpreuvesSession();
  }, [loadEpreuvesSession]);

  return {
    epreuvesSession,
    loading,
    error,
    createEpreuveSession,
    updateEpreuveSession,
    deleteEpreuveSession,
    updateStatutEpreuveSession,
    refresh
  };
};
