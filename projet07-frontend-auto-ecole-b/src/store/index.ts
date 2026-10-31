// Store global avec React Context (alternative à Zustand)
import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import axios from 'axios';
import { MeResponse, User } from '../modules/auth/types';
import tokenService from '../modules/auth/services/tokenService';
import { logger } from '../shared/utils/logger';
import { API_CONFIG } from '../shared/constants/api';

// Interface pour l'état d'authentification
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Types d'actions
type AuthAction =
  | { type: 'LOGIN'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESTORE_AUTH'; payload: { user: User; token: string } };

// État initial
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Commencer en loading pour vérifier l'auth
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'RESTORE_AUTH':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

// Context
interface AppContextType extends AuthState {
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Une seule exécution de la restauration (évite doublon React Strict Mode)
let authRestoreRun = false;

/** Tente un silent refresh du token. Retourne le nouveau token ou null. */
async function trySilentRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    const newToken: string | undefined = res.data?.access_token ?? res.data?.token;
    const newRefresh: string | undefined = res.data?.refresh_token ?? res.data?.refreshToken;
    if (!newToken) return null;
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('auth_token', newToken);
    if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
    return newToken;
  } catch {
    return null;
  }
}

function buildUserFromMe(meResponse: MeResponse): User {
  const u = meResponse.user;
  return {
    id: u.id,
    email: u.email,
    name: u.personne?.nom_complet ?? u.email,
    role: u.role as User['role'],
    centre_id: u.centre_id,
    createdAt: u.created_at ? new Date(u.created_at) : undefined,
    created_at: u.created_at,
    personne: u.personne,
  };
}

// Provider
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const restoreAuth = async () => {
      if (authRestoreRun) return;
      authRestoreRun = true;

      let token = tokenService.getTokenApi();
      if (!token) token = tokenService.getToken();

      let userData = tokenService.getUser();
      if (!userData) {
        const raw = localStorage.getItem('user_data');
        userData = raw ? JSON.parse(raw) : null;
      }

      logger.log('🔄 Restauration auth — token:', !!token, '— userData:', !!userData);

      if (!token) {
        logger.log('❌ Pas de token en localStorage');
        tokenService.clearAll();
        localStorage.removeItem('user_data');
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Ne pas invalider la session sur le format du token.
      // Certains environnements renvoient des tokens opaques (non JWT).

      // Si le token est expiré, essayer un silent refresh AVANT de restaurer
      // pour que les providers qui montent juste après aient un token frais.
      const isExpired = !tokenService.isTokenValid();
      if (isExpired) {
        logger.warn('⚠️ Token expiré au démarrage, tentative de silent refresh...');
        const refreshed = await trySilentRefresh();
        if (refreshed) {
          logger.log('✅ Silent refresh réussi');
          token = refreshed;
        } else {
          logger.warn('⚠️ Silent refresh échoué, on restaure quand même la session');
          // On restaure quand même : les API calls échoueront mais l'utilisateur
          // reste connecté dans le state React (pas de déconnexion automatique).
        }
      }

      // Si user manquant/corrompu, le reconstruire via /auth/me pour éviter la déconnexion au refresh.
      if (!userData) {
        try {
          const meResponse = await axios.get<MeResponse>(`${API_CONFIG.BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          userData = buildUserFromMe(meResponse.data);
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('user_data', JSON.stringify(userData));
          logger.log('✅ Utilisateur reconstruit via /auth/me');
        } catch (error) {
          logger.warn('⚠️ Impossible de reconstruire user via /auth/me', error);
          // Dernier fallback à partir du payload JWT.
          try {
            const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
            userData = {
              id: String(payload.sub ?? payload.id ?? 'unknown'),
              email: String(payload.email ?? ''),
              role: String(payload.role ?? 'candidat') as User['role'],
            } as User;
          } catch {
            userData = {
              id: 'unknown',
              email: '',
              role: 'candidat',
            } as User;
          }
        }
      }

      dispatch({ type: 'RESTORE_AUTH', payload: { user: userData as User, token } });
    };

    restoreAuth();
  }, []);

  const login = (user: User, token: string) => {
    // Sauvegarder dans localStorage avec les deux clés pour compatibilité
    tokenService.setToken(token); // auth_token
    tokenService.setAuthData(token, user); // access_token + user
    localStorage.setItem('user_data', JSON.stringify(user)); // user_data (fallback)
    dispatch({ type: 'LOGIN', payload: { user, token } });
  };

  const logout = () => {
    // Nettoyer le localStorage
    tokenService.clearAll();
    localStorage.removeItem('user_data');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('auto_ecole_info');
    dispatch({ type: 'LOGOUT' });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const value: AppContextType = {
    ...state,
    login,
    logout,
    setLoading,
  };

  return React.createElement(AppContext.Provider, { value }, children);
};

// Hook pour utiliser le store
export const useAppStore = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
