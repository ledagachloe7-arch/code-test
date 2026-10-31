# 🔔 Notifications Push - Documentation Complète

## 🎯 Vue d'ensemble

Système de notifications push natif utilisant **Web Push API** pour envoyer des notifications en temps réel aux utilisateurs, même quand l'application n'est pas ouverte.

**Fonctionnalités** :
- ✅ Notifications push automatiques pour toutes les actions de validation
- ✅ Support multi-navigateurs (Chrome, Firefox, Safari, Edge)
- ✅ Intégration avec le système de notifications Laravel existant
- ✅ Gestion des souscriptions par utilisateur
- ✅ Service Worker pour affichage natif des notifications

---

## 📋 Table des Matières

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Architecture](#architecture)
4. [API Backend](#api-backend)
5. [Intégration Frontend (React)](#intégration-frontend-react)
6. [Utilisation](#utilisation)
7. [Déclenchement Automatique](#déclenchement-automatique)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Installation

### 1. Installer les dépendances

```bash
composer install
```

Le package `minishlink/web-push` sera installé automatiquement.

### 2. Exécuter la migration

```bash
php artisan migrate
```

Cela créera la table `push_subscriptions` pour stocker les souscriptions des utilisateurs.

### 3. Générer les clés VAPID

```bash
php artisan webpush:vapid
```

Cette commande génère une paire de clés VAPID (publique/privée). Copiez les clés dans votre fichier `.env` :

```env
VAPID_PUBLIC_KEY=BFx...votre_clé_publique...
VAPID_PRIVATE_KEY=...votre_clé_privée...
```

**⚠️ IMPORTANT** : Ne partagez jamais votre clé privée VAPID !

---

## ⚙️ Configuration

### Variables d'environnement (.env)

```env
# Clés VAPID (générées avec php artisan webpush:vapid)
VAPID_PUBLIC_KEY=BFx...
VAPID_PRIVATE_KEY=...

# URL de l'application (utilisée pour les redirections)
APP_URL=http://localhost:8000
```

### Configuration Services

Les clés VAPID sont automatiquement chargées depuis `config/services.php` :

```php
'webpush' => [
    'public_key' => env('VAPID_PUBLIC_KEY'),
    'private_key' => env('VAPID_PRIVATE_KEY'),
],
```

---

## 🏗️ Architecture

### Backend (Laravel)

#### 1. **Table `push_subscriptions`**
Stocke les souscriptions push de chaque utilisateur :
- `id` (UUID)
- `utilisateur_id` (FK vers `utilisateurs`)
- `endpoint` (URL unique du service push)
- `public_key` (clé publique du client)
- `auth_token` (token d'authentification)
- `content_encoding` (encodage : aesgcm ou aes128gcm)
- `user_agent` (navigateur de l'utilisateur)

#### 2. **Modèle `PushSubscription`**
Relation avec `Utilisateur` pour gérer les souscriptions.

#### 3. **Service `PushNotificationService`**
- Enregistrement/désinscription des utilisateurs
- Envoi de notifications push via Web Push Protocol
- Gestion automatique des souscriptions invalides

#### 4. **Channel `PushChannel`**
Canal Laravel Notifications qui envoie automatiquement une push quand une notification est créée.

#### 5. **Contrôleur `PushSubscriptionController`**
API pour gérer les souscriptions :
- `POST /api/push/subscribe` - Enregistrer une souscription
- `POST /api/push/unsubscribe` - Désinscrire
- `GET /api/push/status` - Vérifier le statut

### Frontend (React)

#### 1. **Service Worker (`public/sw.js`)**
- Écoute les événements `push`
- Affiche les notifications natives
- Gère les clics sur les notifications

#### 2. **Hook React `usePushNotifications`** (à créer)
- Demande la permission
- Enregistre le Service Worker
- Gère les souscriptions

---

## 🔌 API Backend

### Routes API

Toutes les routes sont protégées par le middleware `auth.token` :

```php
// Enregistrer une souscription
POST /api/push/subscribe

// Désinscrire
POST /api/push/unsubscribe

// Vérifier le statut
GET /api/push/status
```

### 1. POST /api/push/subscribe

Enregistrer une souscription push pour l'utilisateur connecté.

**Request Body** :
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BFx...",
    "auth": "..."
  },
  "contentEncoding": "aesgcm"
}
```

**Response** :
```json
{
  "success": true,
  "message": "Souscription push enregistrée avec succès",
  "subscription": {
    "id": "uuid",
    "endpoint": "https://..."
  }
}
```

### 2. POST /api/push/unsubscribe

Désinscrire l'utilisateur (toutes les souscriptions ou une spécifique).

**Request Body** (optionnel) :
```json
{
  "endpoint": "https://..."
}
```

Si `endpoint` n'est pas fourni, toutes les souscriptions de l'utilisateur sont supprimées.

**Response** :
```json
{
  "success": true,
  "message": "Souscription supprimée avec succès",
  "deleted": true
}
```

### 3. GET /api/push/status

Vérifier si l'utilisateur a des souscriptions actives.

**Response** :
```json
{
  "success": true,
  "subscribed": true,
  "count": 2,
  "subscriptions": [
    {
      "id": "uuid",
      "endpoint": "https://...",
      "created_at": "2025-11-26T12:00:00Z"
    }
  ]
}
```

---

## 💻 Intégration Frontend (React)

### 1. Créer le hook `usePushNotifications`

Créez `hooks/usePushNotifications.js` :

```javascript
import { useState, useEffect, useCallback } from 'react';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier le support
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkPermission();
      registerServiceWorker();
    } else {
      setIsSupported(false);
      setLoading(false);
    }
  }, []);

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

  const subscribe = useCallback(async (vapidPublicKey) => {
    if (!isSupported) {
      throw new Error('Push notifications non supportées');
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

      // Envoyer la souscription au backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
        throw new Error('Erreur lors de l\'enregistrement');
      }

      setSubscription(subscription);
      return subscription;
    } catch (error) {
      console.error('Erreur souscription:', error);
      throw error;
    }
  }, [isSupported, permission]);

  const unsubscribe = useCallback(async () => {
    if (subscription) {
      await subscription.unsubscribe();
    }

    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    setSubscription(null);
  }, [subscription]);

  return {
    isSupported,
    subscription,
    permission,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
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

### 2. Créer un composant de prompt

Créez `components/PushNotificationPrompt.jsx` :

```jsx
import { useState, useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export const PushNotificationPrompt = () => {
  const { isSupported, permission, subscribe, loading } = usePushNotifications();
  const [vapidPublicKey, setVapidPublicKey] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Récupérer la clé publique VAPID depuis le backend
    fetch('/api/push/vapid-public-key')
      .then(res => res.json())
      .then(data => setVapidPublicKey(data.public_key))
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Afficher le prompt si supporté et permission non accordée
    if (isSupported && permission === 'default' && !loading) {
      setShowPrompt(true);
    }
  }, [isSupported, permission, loading]);

  const handleEnable = async () => {
    try {
      await subscribe(vapidPublicKey);
      setShowPrompt(false);
      alert('Notifications push activées !');
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  if (!isSupported || !showPrompt) {
    return null;
  }

  return (
    <div className="push-notification-prompt">
      <p>Activer les notifications push pour être informé en temps réel ?</p>
      <button onClick={handleEnable}>Activer</button>
      <button onClick={() => setShowPrompt(false)}>Plus tard</button>
    </div>
  );
};
```

### 3. Ajouter une route pour la clé publique VAPID

Ajoutez dans `routes/api.php` (route publique) :

```php
Route::get('/push/vapid-public-key', function () {
    return response()->json([
        'public_key' => config('services.webpush.public_key'),
    ]);
});
```

### 4. Utiliser dans votre application

```jsx
import { PushNotificationPrompt } from './components/PushNotificationPrompt';

function App() {
  return (
    <div>
      <PushNotificationPrompt />
      {/* Reste de votre app */}
    </div>
  );
}
```

---

## 🎯 Utilisation

### Déclenchement Automatique

Les notifications push sont **automatiquement envoyées** quand une notification Laravel est créée, si :
1. L'utilisateur a une souscription active
2. La notification utilise le canal `push` dans `via()`

**Exemple** : Quand un document est validé :

```php
// Dans DossierController::validerDocument()
$candidat->personne->utilisateur->notify(
    new DocumentValidatedNotification($document, $candidatName)
);
```

→ **Automatiquement** :
1. ✅ Notification stockée en base (`database`)
2. ✅ Email envoyé (`mail`)
3. ✅ **Notification push envoyée** (`push`) ← NOUVEAU !

### Notifications avec Push

Toutes les notifications suivantes envoient automatiquement une push :

**Pour les Candidats** :
- ✅ `DocumentValidatedNotification` - Document validé
- ❌ `DocumentRejectedNotification` - Document rejeté
- ✅ `DossierValidatedNotification` - Dossier validé
- ❌ `DossierRejectedNotification` - Dossier rejeté
- 🎓 `ExamenReussiNotification` - Examen réussi

**Pour les Auto-Écoles** :
- 📄 `DocumentUploadedNotification` - Nouveau document uploadé
- 📋 `DossierCreatedNotification` - Nouveau dossier créé

**Générales** :
- 🎉 `AccountCreatedNotification` - Compte créé

### Envoi Manuel

Pour envoyer une notification push manuellement :

```php
use App\Services\PushNotificationService;

$pushService = app(PushNotificationService::class);

$pushService->sendToUser(
    $user,
    'Titre de la notification',
    'Corps du message',
    [
        'type' => 'custom',
        'url' => '/dashboard',
        'icon' => '/images/icon.png',
    ]
);
```

---

## 🔍 Troubleshooting

### 1. Les notifications push ne s'affichent pas

**Vérifications** :
- ✅ Service Worker enregistré (`navigator.serviceWorker.ready`)
- ✅ Permission accordée (`Notification.permission === 'granted'`)
- ✅ Souscription enregistrée en base (`/api/push/status`)
- ✅ Clés VAPID configurées (`.env`)
- ✅ HTTPS activé (ou localhost en développement)

### 2. Erreur "VAPID keys not configured"

Ajoutez les clés dans `.env` :
```env
VAPID_PUBLIC_KEY=BFx...
VAPID_PRIVATE_KEY=...
```

Puis régénérez la config :
```bash
php artisan config:clear
```

### 3. Service Worker ne se charge pas

Vérifiez que `public/sw.js` est accessible :
- URL : `http://localhost:8000/sw.js`
- Headers : `Content-Type: application/javascript`

### 4. Souscriptions invalides supprimées automatiquement

Le service supprime automatiquement les souscriptions invalides (erreurs 410/404) lors de l'envoi. C'est normal.

### 5. Notifications non reçues sur mobile

- **iOS** : Nécessite iOS 16.4+ et Safari
- **Android** : Fonctionne avec Chrome/Firefox
- Vérifiez que le Service Worker est bien enregistré

---

## 📊 Structure des Fichiers

```
app/
├── Models/
│   └── PushSubscription.php          ✅ Modèle souscription
├── Services/
│   └── PushNotificationService.php   ✅ Service envoi push
├── Broadcasting/
│   └── PushChannel.php               ✅ Canal Laravel Notifications
├── Http/Controllers/Api/
│   └── PushSubscriptionController.php ✅ API souscriptions
├── Notifications/
│   ├── DocumentValidatedNotification.php      ✅ (modifié: +push)
│   ├── DocumentRejectedNotification.php       ✅ (modifié: +push)
│   ├── DocumentUploadedNotification.php      ✅ (modifié: +push)
│   ├── DossierValidatedNotification.php       ✅ (nouveau: +push)
│   ├── DossierRejectedNotification.php       ✅ (nouveau: +push)
│   ├── DossierCreatedNotification.php         ✅ (nouveau: +push)
│   ├── ExamenReussiNotification.php          ✅ (nouveau: +push)
│   └── AccountCreatedNotification.php         ✅ (modifié: +push)
└── Console/Commands/
    └── GenerateVapidKeys.php         ✅ Génération clés VAPID

database/migrations/
└── create_push_subscriptions_table.php ✅ Table souscriptions

public/
└── sw.js                              ✅ Service Worker

routes/api.php                         ✅ Routes push
config/services.php                    ✅ Config VAPID
```

---

## ✅ Checklist de Déploiement

- [ ] Installer les dépendances (`composer install`)
- [ ] Exécuter la migration (`php artisan migrate`)
- [ ] Générer les clés VAPID (`php artisan webpush:vapid`)
- [ ] Ajouter les clés dans `.env`
- [ ] Vérifier que `public/sw.js` est accessible
- [ ] Tester l'enregistrement d'une souscription
- [ ] Tester l'envoi d'une notification push
- [ ] Vérifier HTTPS en production (obligatoire)

---

## 🎉 Résumé

✅ **Système complet de notifications push**  
✅ **Intégration automatique avec les notifications Laravel**  
✅ **Support multi-navigateurs**  
✅ **Gestion des souscriptions par utilisateur**  
✅ **Service Worker pour affichage natif**  
✅ **Déclenchement automatique sur toutes les validations**

**Tout est prêt !** 🚀

