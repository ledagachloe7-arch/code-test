import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ComponentType,
} from 'react';

export interface DashboardCacheValue {
  /** Composant vue Admin (chargé en arrière-plan, null tant que non prêt). */
  AdminDashboardView: ComponentType | null;
  /** Composant vue Auto-école (chargé en arrière-plan, null tant que non prêt). */
  AutoEcoleDashboardView: ComponentType | null;
  /** Composant liste des tâches par étape (chargé en arrière-plan, null tant que non prêt). */
  TodoListByEtape: ComponentType | null;
  /** true une fois que tous les composants sont en cache (optionnel pour afficher un état global). */
  isReady: boolean;
}

const defaultValue: DashboardCacheValue = {
  AdminDashboardView: null,
  AutoEcoleDashboardView: null,
  TodoListByEtape: null,
  isReady: false,
};

const DashboardCacheContext = createContext<DashboardCacheValue>(defaultValue);

const loadAdmin = () => import('../components/AdminDashboardView').then((m) => m.default);
const loadAutoEcole = () => import('../components/AutoEcoleDashboardView').then((m) => m.default);
const loadTodoList = () => import('../components/TodoListByEtape').then((m) => m.default);

export const DashboardCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cache, setCache] = useState<DashboardCacheValue>(defaultValue);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [AdminDashboardView, AutoEcoleDashboardView, TodoListByEtape] = await Promise.all([
        loadAdmin(),
        loadAutoEcole(),
        loadTodoList(),
      ]);
      if (!cancelled) {
        setCache({
          AdminDashboardView,
          AutoEcoleDashboardView,
          TodoListByEtape,
          isReady: true,
        });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardCacheContext.Provider value={cache}>
      {children}
    </DashboardCacheContext.Provider>
  );
};

export function useDashboardCache(): DashboardCacheValue {
  return useContext(DashboardCacheContext);
}
