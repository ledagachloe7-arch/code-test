// Service Worker pour les notifications push
// Ce fichier doit être accessible à la racine du domaine : /sw.js

const CACHE_NAME = 'push-notifications-v1';

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation...');
  // Forcer l'activation immédiate
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation...');
  // Prendre le contrôle de toutes les pages immédiatement
  event.waitUntil(
    clients.claim().then(() => {
      console.log('[Service Worker] Contrôle pris sur toutes les pages');
    })
  );
});

// Écouter les événements push (notifications reçues)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Notification push reçue:', event);

  let notificationData = {
    title: 'Nouvelle notification',
    body: 'Vous avez reçu une nouvelle notification',
    icon: '/assets/img/blason.png',
    badge: '/assets/img/blason.png',
    tag: 'notification',
    requireInteraction: false,
    data: {
      url: '/',
      timestamp: Date.now(),
    },
  };

  // Si des données sont fournies avec l'événement push
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[Service Worker] Données reçues:', payload);

      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || payload.message || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        requireInteraction: payload.requireInteraction || false,
        data: {
          url: payload.url || payload.data?.url || '/',
          ...payload.data,
          timestamp: Date.now(),
        },
        // Options supplémentaires
        ...(payload.options || {}),
      };
    } catch (error) {
      console.error('[Service Worker] Erreur parsing données push:', error);
      // Utiliser les données textuelles si JSON échoue
      const text = event.data.text();
      if (text) {
        notificationData.body = text;
      }
    }
  }

  // Afficher la notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      // Actions de notification (optionnel)
      actions: notificationData.actions || [],
      // Vibrations (mobile)
      vibrate: notificationData.vibrate || [200, 100, 200],
      // Son (optionnel)
      silent: notificationData.silent || false,
    })
  );
});

// Gérer les clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification cliquée:', event);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/';

  // Envoyer un message au client (window) pour gérer la redirection
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre est déjà ouverte, la focus et naviguer vers l'URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus().then(() => {
            // Envoyer un message au client pour déclencher la navigation
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: notificationData,
            });
          });
        }
      }

      // Si aucune fenêtre n'est ouverte, ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen).then((windowClient) => {
          if (windowClient) {
            // Envoyer un message au nouveau client
            windowClient.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: notificationData,
            });
          }
        });
      }

      // Fallback : envoyer un message à tous les clients
      return Promise.all(
        clientList.map((client) => {
          return client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: notificationData,
          });
        })
      );
    })
  );
});

// Gérer la fermeture des notifications
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification fermée:', event);
  // Vous pouvez envoyer des analytics ici si nécessaire
});

// Écouter les messages du client (window)
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message reçu du client:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Gérer les erreurs
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Erreur:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Promesse rejetée non gérée:', event.reason);
});




