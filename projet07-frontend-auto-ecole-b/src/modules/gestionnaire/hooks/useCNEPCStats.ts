import { useState, useEffect } from 'react';
import { autoEcoleService } from '../../cnepc/services';
import { CNEPCStats } from '../types';

export const useCNEPCStats = () => {
  const [stats, setStats] = useState<CNEPCStats>({
    totalAutoEcoles: 0,
    totalCandidats: 0,
    totalSessions: 0,
    totalExamensReussis: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        
        // Récupérer le nombre total d'auto-écoles
        const autoEcolesResponse = await autoEcoleService.getAutoEcoles(1, 1);
        const totalAutoEcoles = autoEcolesResponse.meta?.total || 0;

        // Récupérer le nombre total de candidats
        const candidatsResponse = await autoEcoleService.getCandidats(1, 1);
        const totalCandidats = candidatsResponse.meta?.total || 0;

        // Pour les sessions et examens réussis, on laisse 0 pour l'instant
        // (ces données nécessiteraient des endpoints spécifiques)
        
        setStats({
          totalAutoEcoles,
          totalCandidats,
          totalSessions: 0,
          totalExamensReussis: 0,
        });
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return { stats, loading };
};

