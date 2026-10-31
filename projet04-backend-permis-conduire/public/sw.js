// Service Worker pour les notifications push
// Ce fichier doit être accessible à l'URL : /sw.js

const CACHE_NAME = 'push-notifications-v1';

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installation');
    self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activation');
    event.waitUntil(self.clients.claim());
});

// Écouter les notifications push
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Notification push reçue');

    let notificationData = {
        title: 'Nouvelle notification',
        body: 'Vous avez une nouvelle notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: {},
        url: '/',
    };

    // Parser les données reçues
    if (event.data) {
        try {
            const data = event.data.json();
            notificationData = {
                title: data.title || notificationData.title,
                body: data.body || notificationData.body,
                icon: data.icon || notificationData.icon,
                badge: data.badge || notificationData.badge,
                data: data.data || {},
                url: data.url || data.data?.url || notificationData.url,
            };
        } catch (e) {
            console.error('[Service Worker] Erreur parsing données:', e);
            notificationData.body = event.data.text() || notificationData.body;
        }
    }

    // Afficher la notification
    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            data: notificationData.data,
            tag: notificationData.data?.type || 'notification',
            requireInteraction: false,
            vibrate: [200, 100, 200],
            actions: [
                {
                    action: 'open',
                    title: 'Ouvrir',
                },
                {
                    action: 'close',
                    title: 'Fermer',
                },
            ],
        })
    );
});

// Gérer le clic sur la notification
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Clic sur notification', event);

    event.notification.close();

    const action = event.action;
    const notificationData = event.notification.data || {};
    const url = notificationData.url || '/';

    if (action === 'close') {
        return;
    }

    // Ouvrir ou focus la fenêtre/onglet
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Si une fenêtre est déjà ouverte, la focus
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }

            // Sinon, ouvrir une nouvelle fenêtre
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Gérer la fermeture de la notification
self.addEventListener('notificationclose', (event) => {
    console.log('[Service Worker] Notification fermée', event);
});

