# 💻 Intégration Frontend - Notifications Push (React.js)

## 🎯 Vue d'ensemble

Guide complet pour intégrer les notifications push dans votre application React.js.

---

## 📋 Prérequis

- ✅ Application React.js
- ✅ Service Worker supporté par le navigateur
- ✅ HTTPS (ou localhost pour le développement)
- ✅ Backend Laravel configuré avec les clés VAPID

---

## 🚀 Installation

### 1. Vérifier le Service Worker

Le Service Worker est déjà créé dans le backend : `public/sw.js`

Vérifiez qu'il est accessible : `http://localhost:8000/sw.js`

---

## 📦 Structure des Fichiers Frontend

Créez cette structure dans votre projet React :

```
src/
├── hooks/
│   └── usePushNotifications.js       ← Hook personnalisé
├── context/
│   └── PushNotificationContext.jsx   ← Context global (optionnel)
├── components/
│   └── PushNotificationPrompt.jsx    ← Composant de prompt
└── utils/
    └── pushNotifications.js          ← Utilitaires
```

---

## 🔧 Étape 1 : Créer le Hook `usePushNotifications`

Créez `src/hooks/usePushNotifications.js` :

```javascript
import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(true);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);

  useEffect(() => {
    // Vérifier le support
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkPermission();
      registerServiceWorker();
      fetchVapidKey();
    } else {
      setIsSupported(false);
      setLoading(false);
    }
  }, []);

  const fetchVapidKey = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/push/vapid-public-key`);
      const data = await response.json();
      setVapidPublicKey(data.public_key);
    } catch (error) {
      console.error('Erreur récupération clé VAPID:', error);
    }
  };

  const checkPermission = async () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    setLoading(false);
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker enregistré:', registration);
    } catch (error) {
      console.error('Erreur enregistrement Service Worker:', error);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      throw new Error('Notifications non supportées');
    }

    const permission = await Notification.requestPermission();
    setPermission(permission);
    return permission;
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications non supportées');
    }

    if (!vapidPublicKey) {
      throw new Error('Clé VAPID non disponible');
    }

    if (permission !== 'granted') {
      const newPermission = await requestPermission();
      if (newPermission !== 'granted') {
        throw new Error('Permission refusée');
      }
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Récupérer le token d'authentification
      const token = localStorage.getItem('access_token') || 
                   localStorage.getItem('token') ||
                   sessionStorage.getItem('access_token');

      if (!token) {
        throw new Error('Utilisateur non authentifié');
      }

      // Envoyer la souscription au backend
      const response = await fetch(`${API_BASE_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth')),
          },
          contentEncoding: 'aesgcm',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'enregistrement');
      }

      const data = await response.json();
      setSubscription(subscription);
      return subscription;
    } catch (error) {
      console.error('Erreur souscription:', error);
      throw error;
    }
  }, [isSupported, permission, vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    if (subscription) {
      await subscription.unsubscribe();
    }

    const token = localStorage.getItem('access_token') || 
                 localStorage.getItem('token') ||
                 sessionStorage.getItem('access_token');

    if (token) {
      await fetch(`${API_BASE_URL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
    }

    setSubscription(null);
  }, [subscription]);

  const checkSubscriptionStatus = useCallback(async () => {
    const token = localStorage.getItem('access_token') || 
                 localStorage.getItem('token') ||
                 sessionStorage.getItem('access_token');

    if (!token) {
      return { subscribed: false, count: 0 };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/push/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Erreur vérification statut:', error);
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

// Helper: Convertir la clé VAPID publique
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper: Convertir ArrayBuffer en Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
```

---

## 🎨 Étape 2 : Créer le Composant de Prompt

Créez `src/components/PushNotificationPrompt.jsx` :

```jsx
import { useState, useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export const PushNotificationPrompt = ({ onEnabled, onDismissed }) => {
  const { 
    isSupported, 
    permission, 
    subscribe, 
    loading,
    checkSubscriptionStatus 
  } = usePushNotifications();
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (isSupported && permission === 'default' && !loading) {
        const status = await checkSubscriptionStatus();
        setIsSubscribed(status.subscribed);
        
        // Afficher le prompt si pas encore souscrit
        if (!status.subscribed) {
          setShowPrompt(true);
        }
      }
    };

    checkStatus();
  }, [isSupported, permission, loading, checkSubscriptionStatus]);

  const handleEnable = async () => {
    try {
      await subscribe();
      setShowPrompt(false);
      setIsSubscribed(true);
      
      if (onEnabled) {
        onEnabled();
      }
    } catch (error) {
      console.error('Erreur activation notifications:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (onDismissed) {
      onDismissed();
    }
  };

  if (!isSupported || !showPrompt || isSubscribed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            Activer les notifications push
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Recevez des notifications en temps réel sur les validations, examens et mises à jour de vos dossiers.
          </p>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleEnable}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Activer
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🔄 Étape 3 : Créer le Context (Optionnel mais Recommandé)

Créez `src/context/PushNotificationContext.jsx` :

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

const PushNotificationContext = createContext(null);

export const PushNotificationProvider = ({ children }) => {
  const pushNotifications = usePushNotifications();
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const status = await pushNotifications.checkSubscriptionStatus();
      setIsSubscribed(status.subscribed);
    };

    if (pushNotifications.isSupported && !pushNotifications.loading) {
      checkStatus();
    }
  }, [pushNotifications.isSupported, pushNotifications.loading]);

  const enableNotifications = async () => {
    try {
      await pushNotifications.subscribe();
      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Erreur activation:', error);
      return false;
    }
  };

  const disableNotifications = async () => {
    try {
      await pushNotifications.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Erreur désactivation:', error);
      return false;
    }
  };

  return (
    <PushNotificationContext.Provider
      value={{
        ...pushNotifications,
        isSubscribed,
        enableNotifications,
        disableNotifications,
      }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
};

export const usePushNotificationContext = () => {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotificationContext must be used within PushNotificationProvider');
  }
  return context;
};
```

---

## 📱 Étape 4 : Utiliser dans votre Application

### Dans `App.js` ou `main.jsx` :

```jsx
import { PushNotificationProvider } from './context/PushNotificationContext';
import { PushNotificationPrompt } from './components/PushNotificationPrompt';

function App() {
  return (
    <PushNotificationProvider>
      <div className="App">
        {/* Votre application */}
        
        {/* Prompt de notification (s'affiche automatiquement) */}
        <PushNotificationPrompt />
      </div>
    </PushNotificationProvider>
  );
}

export default App;
```

### Dans un composant de paramètres :

```jsx
import { usePushNotificationContext } from '../context/PushNotificationContext';

export const NotificationSettings = () => {
  const { 
    isSupported, 
    isSubscribed, 
    enableNotifications, 
    disableNotifications,
    permission 
  } = usePushNotificationContext();

  if (!isSupported) {
    return <p>Les notifications push ne sont pas supportées sur ce navigateur.</p>;
  }

  return (
    <div>
      <h2>Notifications Push</h2>
      <p>Statut : {isSubscribed ? 'Activées' : 'Désactivées'}</p>
      <p>Permission : {permission}</p>
      
      {isSubscribed ? (
        <button onClick={disableNotifications}>
          Désactiver les notifications
        </button>
      ) : (
        <button onClick={enableNotifications}>
          Activer les notifications
        </button>
      )}
    </div>
  );
};
```

---

## 🎯 Étape 5 : Écouter les Notifications Reçues

Le Service Worker (`public/sw.js`) gère automatiquement l'affichage des notifications.

Pour écouter les clics sur les notifications dans votre app React :

```jsx
import { useEffect } from 'react';

export const useNotificationClick = () => {
  useEffect(() => {
    // Écouter les messages du Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        if (type === 'NOTIFICATION_CLICKED') {
          // Rediriger vers l'URL de la notification
          if (data.url) {
            window.location.href = data.url;
          }
        }
      });
    }
  }, []);
};
```

---

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` dans votre projet React :

```env
REACT_APP_API_URL=http://localhost:8000
```

### Service Worker

Assurez-vous que le Service Worker est accessible à la racine de votre domaine :
- URL : `https://votre-domaine.com/sw.js`
- Ou : `http://localhost:3000/sw.js` (en développement)

**Important** : Le Service Worker doit être dans le dossier `public/` de votre build React pour être accessible à la racine.

---

## 🧪 Test

### 1. Tester l'enregistrement

```javascript
// Dans la console du navigateur
const { usePushNotifications } = require('./hooks/usePushNotifications');
// Utiliser le hook dans un composant React
```

### 2. Vérifier la souscription

```javascript
// Appeler l'API
fetch('http://localhost:8000/api/push/status', {
  headers: {
    'Authorization': 'Bearer VOTRE_TOKEN'
  }
})
.then(r => r.json())
.then(console.log);
```

### 3. Tester une notification

Déclencher une action qui envoie une notification (ex: valider un document) et vérifier que la notification push apparaît.

---

## 🐛 Troubleshooting

### Service Worker ne se charge pas

1. Vérifiez que `sw.js` est dans `public/`
2. Vérifiez les permissions du fichier
3. Vérifiez la console du navigateur pour les erreurs

### Permission refusée

- L'utilisateur doit cliquer sur "Autoriser" dans la popup du navigateur
- Vérifiez que vous êtes en HTTPS (ou localhost)

### Souscription échoue

- Vérifiez que le token d'authentification est valide
- Vérifiez que la clé VAPID publique est correcte
- Vérifiez les logs du backend

---

## 📚 Ressources

- [Web Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notifications API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

---

## ✅ Checklist d'Intégration

- [ ] Hook `usePushNotifications` créé
- [ ] Composant `PushNotificationPrompt` créé
- [ ] Context `PushNotificationContext` créé (optionnel)
- [ ] Service Worker accessible (`/sw.js`)
- [ ] Variable `REACT_APP_API_URL` configurée
- [ ] Composant prompt intégré dans `App.js`
- [ ] Test d'enregistrement réussi
- [ ] Test de réception de notification réussi

---

**Tout est prêt pour l'intégration !** 🚀

