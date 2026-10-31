import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

type PushNotificationContextValue = ReturnType<typeof usePushNotifications> & {
  isSubscribed: boolean;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<boolean>;
};

const PushNotificationContext = createContext<PushNotificationContextValue | undefined>(undefined);

export const PushNotificationProvider = ({ children }: { children: ReactNode }) => {
  const pushNotifications = usePushNotifications();
  const { isSupported, loading, checkSubscriptionStatus, subscribe, unsubscribe, permission, subscription } = pushNotifications;
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Vérifier la souscription locale (côté navigateur) et serveur
  const checkLocalAndServerSubscription = useCallback(async () => {
    if (!isSupported) {
      setIsCheckingStatus(false);
      return;
    }

    let mounted = true;
    let hasLocalSubscription = false;

    try {
      // Vérifier d'abord la souscription locale (côté navigateur)
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const localSubscription = await registration.pushManager.getSubscription();
        hasLocalSubscription = localSubscription !== null;
      }

      // Vérifier aussi le statut serveur
      const serverStatus = await checkSubscriptionStatus();
      const hasServerSubscription = Boolean(serverStatus.subscribed);

      if (mounted) {
        // L'utilisateur est considéré comme souscrit s'il a une souscription locale OU serveur
        // et que la permission est accordée
        const subscribed = (hasLocalSubscription || hasServerSubscription) && permission === 'granted';
        setIsSubscribed(subscribed);
        setIsCheckingStatus(false);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erreur vérification souscription:', error);
      if (mounted) {
        // En cas d'erreur, on considère que l'utilisateur est souscrit s'il a une permission accordée
        // et une souscription locale
        setIsSubscribed(hasLocalSubscription && permission === 'granted');
        setIsCheckingStatus(false);
      }
    }
  }, [isSupported, checkSubscriptionStatus, permission]);

  useEffect(() => {
    if (!isSupported || loading) {
      return;
    }

    let mounted = true;
    setIsCheckingStatus(true);

    checkLocalAndServerSubscription();

    return () => {
      mounted = false;
    };
  }, [isSupported, loading, checkLocalAndServerSubscription]);

  // Mettre à jour isSubscribed immédiatement si subscription existe et permission est accordée
  useEffect(() => {
    if (subscription && permission === 'granted') {
      setIsSubscribed(true);
      setIsCheckingStatus(false);
    }
  }, [subscription, permission]);

  const enableNotifications = useCallback(async () => {
    try {
      await subscribe();
      // Vérifier à nouveau le statut local et serveur après souscription
      await checkLocalAndServerSubscription();
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erreur activation notifications:', error);
      return false;
    }
  }, [subscribe, checkLocalAndServerSubscription]);

  const disableNotifications = useCallback(async () => {
    try {
      await unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erreur désactivation notifications:', error);
      return false;
    }
  }, [unsubscribe]);

  // Le loading est true si le hook est en train de charger OU si on vérifie le statut
  const effectiveLoading = loading || isCheckingStatus;

  const value = useMemo(
    () => ({
      ...pushNotifications,
      loading: effectiveLoading,
      isSubscribed,
      enableNotifications,
      disableNotifications,
    }),
    [pushNotifications, effectiveLoading, isSubscribed, enableNotifications, disableNotifications],
  );

  const safeChildren = (children != null && typeof children !== 'boolean') ? children : null;
  return <PushNotificationContext.Provider value={value}>{safeChildren}</PushNotificationContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePushNotificationContext = () => {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotificationContext must be used within PushNotificationProvider');
  }
  return context;
};

