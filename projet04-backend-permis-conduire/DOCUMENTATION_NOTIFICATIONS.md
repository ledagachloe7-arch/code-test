# 🔔 Documentation Complète - Système de Notifications

## 🎯 Vue d'ensemble

Système de notifications Laravel complet pour la plateforme de gestion des permis de conduire. Toutes les notifications sont envoyées via **Email + Database** pour une gestion simple et complète via `$user->notifications()`.

---

## 📋 Table des Matières

1. [Configuration](#configuration)
2. [Classes de Notification](#classes-de-notification)
3. [API Notifications](#api-notifications)
4. [Utilisation Backend](#utilisation-backend)
5. [Utilisation Frontend](#utilisation-frontend)
6. [Installation & Déploiement](#installation--déploiement)
7. [Exemples Complets](#exemples-complets)

---

## ⚙️ Configuration

### Canaux de Notification

Toutes les notifications utilisent :
- ✅ **Database** : Stockage en base pour `$user->notifications()`
- ✅ **Email** : Envoi d'emails automatiques
- ✅ **Queue** : Traitement asynchrone (optionnel)

### Migrations Requises

```bash
# Tables pour les notifications
database/migrations/2025_01_27_000001_create_notifications_table.php
database/migrations/2025_01_27_000002_create_jobs_table.php
```

### Modèle Utilisateur

Le modèle `Utilisateur` utilise le trait `Notifiable` :

```php
use Illuminate\Notifications\Notifiable;

class Utilisateur extends Authenticatable
{
    use HasUuids, Notifiable;
    // ...
}
```

---

## 🔔 Classes de Notification

### 1. AccountCreatedNotification

**Déclencheur** : Création d'un nouveau compte utilisateur  
**Destinataire** : Nouvel utilisateur  
**Fichier** : `app/Notifications/AccountCreatedNotification.php`

**Utilisation** :
```php
// Dans AuthController::register()
$user->notify(new AccountCreatedNotification($user, $request->password));

// Dans AuthController::synchronizeUserFromAuthentik()
$user->notify(new AccountCreatedNotification($user));
```

**Contenu Email** :
- ✅ Message de bienvenue personnalisé
- ✅ Informations de connexion (email, rôle, mot de passe si fourni)
- ✅ Instructions pour les prochaines étapes selon le rôle
- ✅ Bouton d'action "Se connecter"

**Données Stockées** :
```json
{
  "type": "account_created",
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "candidat",
  "nom_complet": "Jean Dupont",
  "created_at": "2025-01-27T10:30:00Z",
  "message": "Votre compte a été créé avec succès ! Bienvenue Jean Dupont"
}
```

---

### 2. DocumentUploadedNotification

**Déclencheur** : Upload d'un document par un candidat  
**Destinataire** : Responsable de l'auto-école  
**Fichier** : `app/Notifications/DocumentUploadedNotification.php`

**Utilisation** :
```php
// Dans DossierController::uploadDocument()
$autoEcole->utilisateur->notify(
    new DocumentUploadedNotification($document, $candidatName)
);
```

**Contenu Email** :
- ✅ Nom du candidat
- ✅ Nom du fichier uploadé
- ✅ Type de document
- ✅ Date d'upload
- ✅ Lien vers le document

**Données Stockées** :
```json
{
  "type": "document_uploaded",
  "document_id": "uuid",
  "document_name": "permis.pdf",
  "candidat_name": "Jean Dupont",
  "upload_date": "2025-01-27T10:30:00Z",
  "message": "Nouveau document uploadé par Jean Dupont"
}
```

---

### 3. DocumentValidatedNotification

**Déclencheur** : Validation d'un document par l'auto-école  
**Destinataire** : Candidat propriétaire du document  
**Fichier** : `app/Notifications/DocumentValidatedNotification.php`

**Utilisation** :
```php
// Dans DossierController::validerDocument()
if ($request->valide) {
    $candidat->personne->utilisateur->notify(
        new DocumentValidatedNotification($document, $candidatName)
    );
}
```

**Contenu Email** :
- ✅ Confirmation de validation
- ✅ Nom du document validé
- ✅ Date de validation
- ✅ Lien vers les dossiers

**Données Stockées** :
```json
{
  "type": "document_validated",
  "document_id": "uuid",
  "document_name": "permis.pdf",
  "candidat_name": "Jean Dupont",
  "validation_date": "2025-01-27T10:30:00Z",
  "message": "Votre document \"permis.pdf\" a été validé"
}
```

---

### 4. DocumentRejectedNotification

**Déclencheur** : Rejet d'un document par l'auto-école  
**Destinataire** : Candidat propriétaire du document  
**Fichier** : `app/Notifications/DocumentRejectedNotification.php`

**Utilisation** :
```php
// Dans DossierController::validerDocument()
if (!$request->valide) {
    $candidat->personne->utilisateur->notify(
        new DocumentRejectedNotification($document, $candidatName, $reason)
    );
}
```

**Contenu Email** :
- ✅ Raison du rejet
- ✅ Commentaires de l'auto-école
- ✅ Instructions pour re-uploader
- ✅ Lien vers l'upload

**Données Stockées** :
```json
{
  "type": "document_rejected",
  "document_id": "uuid",
  "document_name": "permis.pdf",
  "candidat_name": "Jean Dupont",
  "rejection_date": "2025-01-27T10:30:00Z",
  "reason": "Document flou",
  "message": "Votre document \"permis.pdf\" a été rejeté"
}
```

---

## 🚀 API Notifications

### Contrôleur

**Fichier** : `app/Http/Controllers/Api/NotificationController.php`

### Routes API

Toutes les routes sont protégées par le middleware `auth.token` :

```php
// Routes dans routes/api.php
Route::get('/notifications', [NotificationController::class, 'index']);
Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
Route::get('/notifications/stats', [NotificationController::class, 'stats']);
Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
Route::patch('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);
```

### Endpoints Disponibles

#### 1. GET /api/notifications

Récupérer toutes les notifications avec pagination.

**Paramètres Query** :
- `per_page` (optionnel) : Nombre d'éléments par page (défaut: 15)
- `unread_only` (optionnel) : Filtrer uniquement les non lues (défaut: false)

**Réponse** :
```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "type": "App\\Notifications\\DocumentValidatedNotification",
      "notifiable_id": "user-uuid",
      "notifiable_type": "App\\Models\\Utilisateur",
      "data": {
        "type": "document_validated",
        "document_id": "uuid",
        "document_name": "permis.pdf",
        "candidat_name": "Jean Dupont",
        "validation_date": "2025-01-27T10:30:00Z",
        "message": "Votre document \"permis.pdf\" a été validé"
      },
      "read_at": null,
      "created_at": "2025-01-27T10:30:00Z",
      "updated_at": "2025-01-27T10:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 15,
    "total": 42
  }
}
```

#### 2. GET /api/notifications/unread-count

Compter les notifications non lues.

**Réponse** :
```json
{
  "success": true,
  "unread_count": 5
}
```

#### 3. GET /api/notifications/stats

Statistiques complètes des notifications.

**Réponse** :
```json
{
  "success": true,
  "stats": {
    "total": 42,
    "unread": 5,
    "read": 37,
    "by_type": {
      "App\\Notifications\\AccountCreatedNotification": 1,
      "App\\Notifications\\DocumentUploadedNotification": 15,
      "App\\Notifications\\DocumentValidatedNotification": 20,
      "App\\Notifications\\DocumentRejectedNotification": 6
    }
  }
}
```

#### 4. PATCH /api/notifications/{id}/read

Marquer une notification comme lue.

**Réponse** :
```json
{
  "success": true,
  "message": "Notification marquée comme lue"
}
```

#### 5. PATCH /api/notifications/mark-all-read

Marquer toutes les notifications comme lues.

**Réponse** :
```json
{
  "success": true,
  "message": "Toutes les notifications ont été marquées comme lues"
}
```

#### 6. DELETE /api/notifications/{id}

Supprimer une notification.

**Réponse** :
```json
{
  "success": true,
  "message": "Notification supprimée"
}
```

---

## 💻 Utilisation Backend

### Accéder aux Notifications

```php
use Illuminate\Support\Facades\Auth;

$user = Auth::user();

// Toutes les notifications
$notifications = $user->notifications();

// Notifications non lues uniquement
$unread = $user->unreadNotifications;

// Compter les non lues
$count = $user->unreadNotifications->count();
```

### Marquer comme Lue

```php
// Une notification spécifique
$notification = $user->notifications()->find($id);
$notification->markAsRead();

// Toutes les notifications
$user->unreadNotifications->markAsRead();
```

### Envoyer une Notification

```php
use App\Notifications\DocumentValidatedNotification;

// Dans un contrôleur ou service
$user->notify(new DocumentValidatedNotification($document, $candidatName));
```

---

## 🌐 Utilisation Frontend

### Récupérer les Notifications

```javascript
// Toutes les notifications
const response = await fetch('/api/notifications', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
});

const { notifications, pagination } = await response.json();

// Notifications non lues uniquement
const unreadResponse = await fetch('/api/notifications?unread_only=true', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
});
```

### Compter les Non Lues

```javascript
const response = await fetch('/api/notifications/unread-count', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
});

const { unread_count } = await response.json();
console.log(`${unread_count} notifications non lues`);
```

### Marquer comme Lue

```javascript
// Une notification
await fetch(`/api/notifications/${notificationId}/read`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
});

// Toutes les notifications
await fetch('/api/notifications/mark-all-read', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
});
```

### Supprimer une Notification

```javascript
await fetch(`/api/notifications/${notificationId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
});
```

### Afficher un Badge de Notification

```javascript
// Fonction pour mettre à jour le badge
async function updateNotificationBadge() {
  const response = await fetch('/api/notifications/unread-count', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const { unread_count } = await response.json();
  
  const badge = document.getElementById('notification-badge');
  if (unread_count > 0) {
    badge.textContent = unread_count;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

// Mettre à jour toutes les 30 secondes
setInterval(updateNotificationBadge, 30000);
updateNotificationBadge(); // Initial
```

---

## 🚀 Installation & Déploiement

### 1. Exécuter les Migrations

```bash
php artisan migrate
```

Cette commande créera les tables :
- `notifications` : Stockage des notifications
- `jobs` : Queue pour traitement asynchrone (optionnel)

### 2. Configuration Email (`.env`)

```bash
MAIL_MAILER=smtp
MAIL_HOST=votre-serveur-smtp.com
MAIL_PORT=587
MAIL_USERNAME=votre-email@example.com
MAIL_PASSWORD=votre-mot-de-passe
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@votre-domaine.com
MAIL_FROM_NAME="Système Permis de Conduire"
```

### 3. Configuration Queue (Optionnel)

Pour traiter les notifications en arrière-plan :

```bash
# Dans .env
QUEUE_CONNECTION=database

# Lancer le worker
php artisan queue:work
```

**Avantages** :
- ✅ Traitement asynchrone (meilleures performances)
- ✅ Retry automatique en cas d'échec
- ✅ Meilleure gestion de charge

### 4. Vérifier les Permissions

Assurez-vous que l'application peut :
- ✅ Écrire dans la table `notifications`
- ✅ Envoyer des emails (configuration SMTP correcte)
- ✅ Créer des jobs dans la table `jobs` (si queue activée)

---

## 🗄️ Structure Base de Données

### Table `notifications`

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    notifiable_type VARCHAR(255) NOT NULL,
    notifiable_id UUID NOT NULL,
    data TEXT NOT NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Colonnes** :
- `id` : UUID unique de la notification
- `type` : Classe de notification (ex: `App\Notifications\DocumentValidatedNotification`)
- `notifiable_type` : Type du modèle (ex: `App\Models\Utilisateur`)
- `notifiable_id` : ID de l'utilisateur
- `data` : Données JSON de la notification
- `read_at` : Date de lecture (NULL si non lue)
- `created_at`, `updated_at` : Timestamps

---

## 🧪 Exemples Complets

### Exemple 1 : Notification de Création de Compte

```php
// Dans AuthController::register()
$user = Utilisateur::create([...]);
$user->notify(new AccountCreatedNotification($user, $request->password));
```

**Résultat** :
1. ✅ Email envoyé avec informations de connexion
2. ✅ Notification stockée en base de données
3. ✅ Accessible via `$user->notifications()`

### Exemple 2 : Notification d'Upload Document

```php
// Dans DossierController::uploadDocument()
$document = $dossier->documents()->create([...]);
$candidatName = $dossier->candidat->personne->nom;

// Notifier l'auto-école
if ($dossier->autoEcole && $dossier->autoEcole->utilisateur) {
    $dossier->autoEcole->utilisateur->notify(
        new DocumentUploadedNotification($document, $candidatName)
    );
}
```

### Exemple 3 : Notification de Validation Document

```php
// Dans DossierController::validerDocument()
$document->update(['valide' => true]);

$candidatName = $document->dossier->candidat->personne->nom;
if ($document->dossier->candidat->personne->utilisateur) {
    $document->dossier->candidat->personne->utilisateur->notify(
        new DocumentValidatedNotification($document, $candidatName)
    );
}
```

---

## ✅ Vérifications & Tests

### Test Complet

```bash
# 1. Créer un compte
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "Password123!",
  ...
}

# 2. Se connecter
POST /api/auth/login-direct
{
  "email": "test@example.com",
  "password": "Password123!"
}

# 3. Récupérer les notifications
GET /api/notifications
Authorization: Bearer [TOKEN]

# Vérifier :
# - Notification AccountCreatedNotification présente
# - Email reçu
# - Données JSON correctes
```

---

## 🔒 Sécurité

### Vérifications Implémentées

1. ✅ **Authentification requise** : Toutes les routes API sont protégées
2. ✅ **Isolation des données** : Un utilisateur voit uniquement ses notifications
3. ✅ **Validation des données** : Vérifications avant envoi
4. ✅ **Protection emails** : Pas de données sensibles dans les emails
5. ✅ **Queue sécurisée** : Traitement sécurisé des jobs

---

## 📊 Statistiques & Monitoring

### Suivre les Notifications

```php
// Dans votre dashboard
$stats = [
    'total' => $user->notifications()->count(),
    'unread' => $user->unreadNotifications->count(),
    'read' => $user->readNotifications->count(),
    'by_type' => $user->notifications()
        ->selectRaw('type, COUNT(*) as count')
        ->groupBy('type')
        ->pluck('count', 'type')
];
```

### Via API

```javascript
const stats = await fetch('/api/notifications/stats', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

---

## 🎉 Résumé

### ✅ Fonctionnalités Disponibles

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| **4 Types de Notifications** | ✅ Actif | AccountCreated, DocumentUploaded, DocumentValidated, DocumentRejected |
| **Email Automatique** | ✅ Actif | Envoi d'emails pour toutes les notifications |
| **Stockage Database** | ✅ Actif | `$user->notifications()` fonctionne |
| **API Complète** | ✅ Actif | 6 endpoints pour gérer les notifications |
| **Queue Asynchrone** | ⚙️ Optionnel | Améliore les performances |

### 📁 Structure des Fichiers

```
app/Notifications/
├── AccountCreatedNotification.php        ✅
├── DocumentUploadedNotification.php      ✅
├── DocumentValidatedNotification.php     ✅
└── DocumentRejectedNotification.php      ✅

app/Http/Controllers/Api/
└── NotificationController.php            ✅

database/migrations/
├── create_notifications_table.php       ✅
└── create_jobs_table.php                ✅

routes/api.php                            ✅ (routes notifications)
```

**Tout est prêt et fonctionnel !** 🚀
