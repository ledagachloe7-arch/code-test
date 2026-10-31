import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_CONFIG } from '../constants/api';

// Lock de refresh : une seule tentative de refresh à la fois.
// Les requêtes qui arrivent pendant le refresh sont mises en file d'attente.
let isRefreshing = false;
type QueueItem = { resolve: (token: string) => void; reject: (err: unknown) => void };
let refreshQueue: QueueItem[] = [];

function processRefreshQueue(error: unknown, token: string | null = null): void {
  refreshQueue.forEach((item) => {
    if (error) item.reject(error);
    else item.resolve(token!);
  });
  refreshQueue = [];
}

function triggerSessionExpired(): void {
  // Ne pas effacer le token ni forcer un rechargement de page :
  // le store React gère la déconnexion proprement via l'événement.
  window.dispatchEvent(new CustomEvent('auth:session-expired'));
}

class AxiosConfig {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      (config) => {
        const method = String(config.method || 'get').toLowerCase();
        const headers = config.headers as Record<string, unknown> | undefined;
        const skipAuth = headers?.['X-Skip-Auth'] === '1';

        const existingAuth = String(headers?.['Authorization'] ?? headers?.['authorization'] ?? '');
        const alreadyHasAuth = existingAuth.startsWith('Bearer ') && existingAuth.length > 10;

        if (!skipAuth && !alreadyHasAuth) {
          let token = localStorage.getItem('access_token');
          if (!token || token === 'undefined' || token === 'null') {
            token = localStorage.getItem('auth_token');
          }
          if (token && token !== 'undefined' && token !== 'null') {
            config.headers.Authorization = `Bearer ${token}`;
          } else {
            delete config.headers.Authorization;
          }
        }
        delete config.headers['X-Skip-Auth'];
        if (method === 'get' || method === 'head') {
          delete config.headers['Content-Type'];
        } else if (!(config.data instanceof FormData)) {
          config.headers['Content-Type'] = 'application/json';
        }
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
          return Promise.reject(error);
        }

        // Si un refresh est déjà en cours, mettre la requête en file d'attente
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
          })
            .then((newToken) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.instance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            // Pas de refresh token : rejeter sans déconnecter
            isRefreshing = false;
            processRefreshQueue(error, null);
            return Promise.reject(error);
          }

          const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const newToken: string | undefined =
            response.data?.access_token ?? response.data?.token;
          const newRefreshToken: string | undefined =
            response.data?.refresh_token ?? response.data?.refreshToken;

          if (!newToken) throw new Error('Refresh response missing token');

          localStorage.setItem('access_token', newToken);
          localStorage.setItem('auth_token', newToken);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }

          isRefreshing = false;
          processRefreshQueue(null, newToken);

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return this.instance(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          processRefreshQueue(refreshError, null);
          // Ne pas déconnecter automatiquement : laisser le composant gérer l'erreur.
          // Seul un logout explicite (bouton) ou une absence totale de token au chargement
          // doit rediriger vers /login.
          return Promise.reject(refreshError);
        }
      },
    );
  }

  public getInstance(): AxiosInstance {
    return this.instance;
  }
}

export default new AxiosConfig().getInstance();
