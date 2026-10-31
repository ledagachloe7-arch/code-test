import { useAppStore } from '../../../store';

/**
 * Hook pour récupérer le rôle de l'utilisateur connecté
 */
export const useUserRole = (): string | null => {
  const { user } = useAppStore();
  return user?.role || null;
};

