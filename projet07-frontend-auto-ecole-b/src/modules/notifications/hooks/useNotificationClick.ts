import { useEffect } from 'react';

export const useNotificationClick = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined;
    }

    const handler = (event: MessageEvent) => {
      if (!event.data) {
        return;
      }

      const { type, data } = event.data as { type?: string; data?: { url?: string } };

      if (type === 'NOTIFICATION_CLICKED' && data?.url) {
        window.location.href = data.url;
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handler);
    };
  }, []);
};



