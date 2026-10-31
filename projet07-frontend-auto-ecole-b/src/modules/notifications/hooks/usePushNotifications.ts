import { useCallback, useEffect, useState } from 'react';
import { API_CONFIG } from '../../../shared/constants/api';
import { logger } from '../../../shared/utils/logger';

const API_BASE_URL = (API_CONFIG.BASE_URL || '').replace(/\/$/, '');

type SubscriptionStatus = {
  subscribed: boolean;
  count?: number;
};

const getStoredToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  // Récupérer le token depuis localStorage (priorité à access_token)
  const token = localStorage.getItem('access_token') ||
                localStorage.getItem('token') ||
                sessionStorage.getItem('access_token');

  // Pas de log quand absent : normal sur la page de login
  return token;
};

// Éviter requête et logs en double (ex. React Strict Mode)
let vapidUnavailableLogged = false;
let vapidEffectRun = false;

const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;

  try {
    // Vérifier si c'est un JWT (contient 3 parties séparées par des points)
    const parts = token.split('.');
    if (parts.length !== 3) return true; // Si ce n'est pas un JWT, on considère qu'il est valide

    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch {
    // Si on ne peut pas décoder, on considère que le token est valide
    return true;
  }
};

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(true);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  const checkPermission = useCallback(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
    setLoading(false);
  }, []);

  const registerServiceWorker = useCallback(async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (error) {
      logger.error('Erreur enregistrement Service Worker:', error);
    }
  }, []);

  const fetchVapidKey = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/push/vapid-public-key`, {
        headers: {
          Accept: 'application/json',
          // Note: Le header 'ngrok-skip-browser-warning' a été retiré car il n'est pas autorisé
          // par le backend dans Access-Control-Allow-Headers
        },
      });
      if (!response.ok) {
        if (response.status >= 500 && !vapidUnavailableLogged) {
          vapidUnavailableLogged = true;
          logger.warn('⚠️ Service notifications temporairement indisponible (backend 5xx).');
        }
        throw new Error('Impossible de récupérer la clé VAPID');
      }
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const payload = await response.text();
        throw new Error(`Réponse inattendue (content-type ${contentType ?? 'inconnu'}): ${payload}`);
      }
      const data = await response.json();
      const key = data.public_key as string | undefined;
      if (key) {
        setVapidPublicKey(key);
        return key;
      }
    } catch (error: any) {
      const isCorsError = error?.message?.includes('CORS') ||
                         error?.message?.includes('Failed to fetch') ||
                         error?.name === 'TypeError';
      if (isCorsError) {
        logger.warn('⚠️ Erreur CORS lors de la récupération de la clé VAPID. Vérifiez la configuration CORS du serveur.');
      } else if (!vapidUnavailableLogged) {
        vapidUnavailableLogged = true;
        logger.warn('⚠️ Notifications push non disponibles (clé VAPID indisponible).');
      }
    }

    return null;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkPermission();
      registerServiceWorker();
      // Une seule requête VAPID au montage (évite doublon React Strict Mode)
      if (!vapidEffectRun) {
        vapidEffectRun = true;
        fetchVapidKey();
      }
    } else {
      setIsSupported(false);
      setLoading(false);
    }
  }, [checkPermission, registerServiceWorker, fetchVapidKey]);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      throw new Error('Notifications non supportées');
    }

    const newPermission = await Notification.requestPermission();
    setPermission(newPermission);
    return newPermission;
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications non supportées');
    }

    // Vérifier d'abord si la permission est déjà refusée
    if (permission === 'denied') {
      throw new Error('Les notifications sont bloquées dans les paramètres de votre navigateur. Veuillez les autoriser dans les paramètres pour activer les notifications push.');
    }

    const key = vapidPublicKey ?? (await fetchVapidKey());
    if (!key) {
      throw new Error('Clé VAPID non disponible');
    }

    if (permission !== 'granted') {
      const newPermission = await requestPermission();
      if (newPermission !== 'granted') {
        if (newPermission === 'denied') {
          throw new Error('Les notifications sont bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.');
        }
        throw new Error('Permission refusée');
      }
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      const token = getStoredToken();
      if (!token) {
        logger.error('❌ Token manquant pour la souscription push');
        logger.log('Vérification localStorage:', {
          access_token: localStorage.getItem('access_token'),
          token: localStorage.getItem('token'),
          auth_token: localStorage.getItem('auth_token'),
        });
        throw new Error('Utilisateur non authentifié');
      }

      // Vérifier si le token est valide
      if (!isTokenValid(token)) {
        logger.warn('⚠️ Token invalide ou expiré');
        throw new Error('Token invalide ou expiré. Veuillez vous reconnecter.');
      }

      logger.log('🔐 Token récupéré pour push subscription:', token.substring(0, 20) + '...');

      const response = await fetch(`${API_BASE_URL}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          // Note: Le header 'ngrok-skip-browser-warning' a été retiré car il n'est pas autorisé
          // par le backend dans Access-Control-Allow-Headers
        },
        body: JSON.stringify({
          endpoint: pushSubscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')),
            auth: arrayBufferToBase64(pushSubscription.getKey('auth')),
          },
          contentEncoding: 'aesgcm',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('❌ Erreur souscription push:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        
        if (response.status === 401) {
          logger.error('🔐 Erreur d\'authentification - Token peut-être invalide ou expiré');
          logger.log('Token utilisé:', token ? `${token.substring(0, 30)}...` : 'null');
        }
        
        throw new Error(errorData.message || "Erreur lors de l'enregistrement");
      }

      setSubscription(pushSubscription);
      return pushSubscription;
    } catch (error) {
      logger.error('Erreur souscription:', error);
      throw error;
    }
  }, [isSupported, permission, vapidPublicKey, requestPermission, fetchVapidKey]);

  const unsubscribe = useCallback(async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
      }

      const token = getStoredToken();
      if (token) {
        await fetch(`${API_BASE_URL}/push/unsubscribe`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            // Note: Le header 'ngrok-skip-browser-warning' a été retiré car il n'est pas autorisé
            // par le backend dans Access-Control-Allow-Headers
          },
        });
      }

      setSubscription(null);
    } catch (error) {
      logger.error('Erreur désinscription:', error);
      throw error;
    }
  }, [subscription]);

  const checkSubscriptionStatus = useCallback(async (): Promise<SubscriptionStatus> => {
    const token = getStoredToken();
    if (!token) {
      return { subscribed: false, count: 0 };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/push/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          // Note: Le header 'ngrok-skip-browser-warning' a été retiré car il n'est pas autorisé
          // par le backend dans Access-Control-Allow-Headers
        },
      });

      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      logger.error('Erreur vérification statut:', error);
    }

    return { subscribed: false, count: 0 };
  }, []);

  return {
    isSupported,
    subscription,
    permission,
    loading,
    vapidPublicKey,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscriptionStatus,
  };
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer | null) => {
  if (!buffer) {
    throw new Error('Clé de souscription manquante');
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
};

