import React, { createContext, useContext } from 'react';

export interface DashboardCacheValue {
  AdminDashboardView: React.ComponentType | null;
  AutoEcoleDashboardView: React.ComponentType | null;
  TodoListByEtape: React.ComponentType | null;
  isReady: boolean;
}

const defaultValue: DashboardCacheValue = {
  AdminDashboardView: null,
  AutoEcoleDashboardView: null,
  TodoListByEtape: null,
  isReady: false,
};

const DashboardCacheContext =
  createContext<DashboardCacheValue>(defaultValue);

export const DashboardCacheProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <DashboardCacheContext.Provider value={defaultValue}>
      {children}
    </DashboardCacheContext.Provider>
  );
};

export function useDashboardCache(): DashboardCacheValue {
  return useContext(DashboardCacheContext);
}