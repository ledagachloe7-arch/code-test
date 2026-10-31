# 📋 Guide Détaillé - Intégration Notifications et Téléchargement de Documents

## 🎯 Vue d'ensemble des Modifications

Ce document explique **exactement** quels fichiers ont été modifiés, **pourquoi** chaque modification a été faite, et **comment** déployer ces changements étape par étape.

> 📚 **Documentation Notifications** : Pour tous les détails sur le système de notifications, consultez [`DOCUMENTATION_NOTIFICATIONS.md`](./DOCUMENTATION_NOTIFICATIONS.md)

---

## 📁 Fichiers Créés (Nouveaux)

### 1. Migrations de Base de Données

#### Migrations Notifications
- `database/migrations/2025_01_27_000001_create_notifications_table.php` - Table notifications
- `database/migrations/2025_01_27_000002_create_jobs_table.php` - Table jobs pour queue

**Pourquoi** : Support des notifications Laravel avec stockage en base et traitement asynchrone

### 2. Classes de Notification

**📚 Documentation complète** : Voir `DOCUMENTATION_NOTIFICATIONS.md`

**Fichiers créés** :
- `app/Notifications/AccountCreatedNotification.php` - Notification création compte
- `app/Notifications/DocumentUploadedNotification.php` - Notification upload document
- `app/Notifications/DocumentValidatedNotification.php` - Notification validation document
- `app/Notifications/DocumentRejectedNotification.php` - Notification rejet document

**Contrôleur** :
- `app/Http/Controllers/Api/NotificationController.php` - API gestion notifications

**Pourquoi** : Système complet de notifications avec Email + Database pour `$user->notifications()`

---

## 🔧 Fichiers Modifiés (Existants)

### 1. Modèle Utilisateur

#### `app/Models/Utilisateur.php`
**Modifications** :
```php
// AVANT
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Utilisateur extends Authenticatable
{
    use HasUuids;

// APRÈS
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Utilisateur extends Authenticatable
{
    use HasUuids, Notifiable;
```

**Pourquoi** : 
- Ajouter le trait `Notifiable` pour permettre aux utilisateurs de recevoir des notifications
- Importer la classe `Notifiable` nécessaire

### 2. Modèle PieceJustificative

#### `app/Models/PieceJustificative.php`
**Modifications** :
```php
// AVANT
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// APRÈS
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
```

**Nouvelle méthode ajoutée** :
```php
/**
 * Relation polymorphique : Une pièce justificative peut avoir plusieurs documents
 */
public function documents(): MorphMany
{
    return $this->morphMany(Document::class, 'documentable');
}
```

**Pourquoi** :
- Permettre à une pièce justificative d'avoir plusieurs documents associés
- Utiliser une relation polymorphique pour la flexibilité
- Permettre le téléchargement des documents via cette relation

### 3. Contrôleur PieceJustificativeController

#### `app/Http/Controllers/Api/PieceJustificativeController.php`
**Modifications** :

**Imports ajoutés** :
```php
// AVANT
use App\Models\PieceJustificative;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

// APRÈS
use App\Models\PieceJustificative;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\Controller;
```

**Nouvelles méthodes ajoutées** :

#### `downloadDocument(PieceJustificative $piece, Document $document)`
**Pourquoi** : Permettre le téléchargement direct de fichiers
**Fonctionnalités** :
- Vérification que le document appartient à la pièce justificative
- Vérification de l'existence du fichier
- Retour du fichier pour téléchargement

#### `getDocumentUrl(PieceJustificative $piece, Document $document)`
**Pourquoi** : Obtenir l'URL de téléchargement sans télécharger directement
**Fonctionnalités** :
- Retourne l'URL publique du fichier
- Informations sur le document
- Vérifications de sécurité

#### `documents(PieceJustificative $piece)`
**Pourquoi** : Lister tous les documents d'une pièce justificative
**Fonctionnalités** :
- Liste complète des documents
- URLs de téléchargement incluses
- Informations détaillées sur chaque document

### 4. Contrôleur DossierController

#### `app/Http/Controllers/Api/DossierController.php`
**Modifications** :

**Imports ajoutés** :
```php
// AVANT
use App\Models\Dossier;
use App\Models\Document;
use App\Models\Utilisateur;
use App\Models\AutoEcole;
use Exception;

// APRÈS
use App\Models\Dossier;
use App\Models\Document;
use App\Models\Utilisateur;
use App\Models\AutoEcole;
use App\Notifications\DocumentUploadedNotification;
use App\Notifications\DocumentValidatedNotification;
use App\Notifications\DocumentRejectedNotification;
use Exception;
```

**Dans la méthode `uploadDocument()`** :
```php
// Code ajouté après la création du document
// Envoyer des notifications
$candidatName = $dossier->candidat->personne->nom ?? 'Candidat';

// Notifier l'auto-école
if ($dossier->autoEcole && $dossier->autoEcole->utilisateur) {
    $dossier->autoEcole->utilisateur->notify(
        new DocumentUploadedNotification($document, $candidatName)
    );
}
```

**Pourquoi** : Notifier automatiquement l'auto-école quand un candidat upload un document

**Dans la méthode `validerDocument()`** :
```php
// Code ajouté après la validation/rejet du document
// Envoyer des notifications
$candidatName = $document->dossier->candidat->personne->nom ?? 'Candidat';

if ($request->valide) {
    // Notifier le candidat que son document est validé
    if ($document->dossier->candidat->personne->utilisateur) {
        $document->dossier->candidat->personne->utilisateur->notify(
            new DocumentValidatedNotification($document, $candidatName)
        );
    }
} else {
    // Notifier le candidat que son document est rejeté
    if ($document->dossier->candidat->personne->utilisateur) {
        $document->dossier->candidat->personne->utilisateur->notify(
            new DocumentRejectedNotification($document, $candidatName, $request->commentaires)
        );
    }
}
```

**Pourquoi** : Notifier automatiquement le candidat du résultat de la validation de son document

### 5. Routes API

#### `routes/api.php`
**Modifications** :

**Import ajouté** :
```php
// AVANT
use App\Http\Controllers\Api\FormationAutoEcoleController;
use App\Http\Controllers\Api\PieceJustificativeController;

// APRÈS
use App\Http\Controllers\Api\FormationAutoEcoleController;
use App\Http\Controllers\Api\PieceJustificativeController;
use App\Http\Controllers\Api\NotificationController;
```

**Nouvelles routes ajoutées** :
```php
// Pièces justificatives
Route::apiResource('pieces-justificatives', PieceJustificativeController::class);
Route::get('/pieces-justificatives/{piece}/documents', [PieceJustificativeController::class, 'documents'])->name('pieces-justificatives.documents');
Route::get('/pieces-justificatives/{piece}/documents/{document}/download', [PieceJustificativeController::class, 'downloadDocument'])->name('pieces-justificatives.download');
Route::get('/pieces-justificatives/{piece}/documents/{document}/url', [PieceJustificativeController::class, 'getDocumentUrl'])->name('pieces-justificatives.document-url');

// Notifications
Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
Route::get('/notifications/stats', [NotificationController::class, 'stats'])->name('notifications.stats');
Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
Route::patch('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
```

**Pourquoi** : Exposer les nouvelles fonctionnalités via l'API REST

---

## 🚀 Guide de Déploiement Étape par Étape

### Étape 1 : Vérifier l'Environnement

```bash
# Vérifier que vous êtes dans le bon répertoire
pwd
# Doit afficher : C:\Users\user\OneDrive\Documents\dd

# Vérifier le statut Git
git status
```

### Étape 2 : Créer une Nouvelle Branche

```bash
# Créer et basculer sur une nouvelle branche
git checkout -b feature/notifications-telechargement-documents

# Vérifier que vous êtes sur la bonne branche
git branch
```

### Étape 3 : Ajouter les Nouveaux Fichiers

```bash
# Ajouter les migrations
git add database/migrations/2025_01_27_000001_create_notifications_table.php
git add database/migrations/2025_01_27_000002_create_jobs_table.php

# Ajouter les classes de notification
git add app/Notifications/*.php

# Ajouter le contrôleur de notifications
git add app/Http/Controllers/Api/NotificationController.php

# Ajouter la documentation
git add DOCUMENTATION_NOTIFICATIONS.md
```

### Étape 4 : Ajouter les Fichiers Modifiés

```bash
# Ajouter les modèles modifiés
git add app/Models/Utilisateur.php
git add app/Models/PieceJustificative.php

# Ajouter les contrôleurs modifiés
git add app/Http/Controllers/Api/PieceJustificativeController.php
git add app/Http/Controllers/Api/DossierController.php

# Ajouter les routes modifiées
git add routes/api.php
```

### Étape 5 : Vérifier les Modifications

```bash
# Voir tous les fichiers ajoutés/modifiés
git status

# Voir les différences pour un fichier spécifique (optionnel)
git diff app/Models/Utilisateur.php
```

### Étape 6 : Commiter les Changements

```bash
# Commiter avec un message descriptif
git commit -m "feat: Intégration système notifications et téléchargement documents

- Ajout système notifications Laravel (database + email)
- Notifications automatiques pour upload/validation/rejet documents
- Fonctionnalité téléchargement documents pour pièces justificatives
- Nouvelles routes API pour notifications et téléchargement
- Documentation complète en français
- Sécurité: vérifications propriété et existence fichiers"
```

### Étape 7 : Pousser vers GitLab

```bash
# Pousser la branche vers GitLab
git push origin feature/notifications-telechargement-documents
```

### Étape 8 : Créer une Merge Request

1. Aller sur le gestionnaire de dépôt (GitHub / GitLab)
2. Cliquer sur "Merge requests" (ou "Pull requests")
3. Cliquer sur "New merge request"
4. Sélectionner la branche source : `feature/notifications-telechargement-documents`
5. Sélectionner la branche cible : `main` (ou `master`)
6. Titre : "Intégration système notifications et téléchargement documents"
7. Description :
```markdown
## 🎯 Objectif
Intégration du système de notifications Laravel et de la fonctionnalité de téléchargement de documents pour les pièces justificatives.

## 📋 Fonctionnalités Ajoutées

### Notifications
- ✅ Notifications automatiques lors de l'upload de documents
- ✅ Notifications de validation/rejet de documents
- ✅ API complète pour gérer les notifications
- ✅ Support email et base de données

### Téléchargement Documents
- ✅ Téléchargement direct de fichiers
- ✅ URLs de téléchargement sécurisées
- ✅ Liste des documents par pièce justificative
- ✅ Vérifications de sécurité et propriété

## 🔧 Fichiers Modifiés
- `app/Models/Utilisateur.php` - Ajout trait Notifiable
- `app/Models/PieceJustificative.php` - Relation documents
- `app/Http/Controllers/Api/PieceJustificativeController.php` - Nouvelles méthodes téléchargement
- `app/Http/Controllers/Api/DossierController.php` - Intégration notifications
- `routes/api.php` - Nouvelles routes API

## 📁 Fichiers Créés
- Migrations pour notifications et jobs
- Classes de notification (3)
- Contrôleur NotificationController
- Documentation complète

## 🧪 Tests Requis
- [ ] Migration des tables notifications/jobs
- [ ] Test upload document + notification auto-école
- [ ] Test validation document + notification candidat
- [ ] Test téléchargement documents
- [ ] Test API notifications
```

### Étape 9 : Après Merge - Déploiement

Une fois la merge request acceptée et mergée :

```bash
# Retourner sur la branche principale
git checkout main
git pull origin main

# Exécuter les migrations
php artisan migrate

# Créer le lien symbolique pour le stockage
php artisan storage:link

# Vider le cache
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### Étape 10 : Configuration Production

**Dans le fichier `.env` de production** :

```bash
# Configuration email
MAIL_MAILER=smtp
MAIL_HOST=votre-serveur-smtp
MAIL_PORT=587
MAIL_USERNAME=votre-email
MAIL_PASSWORD=votre-mot-de-passe
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@votre-domaine.com
MAIL_FROM_NAME="Système Permis de Conduire"

# Configuration queue (optionnel)
QUEUE_CONNECTION=database
```

**Lancer le worker de queue** (si configuré) :
```bash
php artisan queue:work
```

---

## 🔍 Résumé des Modifications

### Fichiers Créés : 8
- 2 migrations (notifications, jobs)
- 4 classes de notification (AccountCreated, DocumentUploaded, DocumentValidated, DocumentRejected)
- 1 contrôleur NotificationController
- 1 documentation (DOCUMENTATION_NOTIFICATIONS.md)

### Fichiers Modifiés : 5
- 2 modèles
- 2 contrôleurs
- 1 fichier de routes

### Nouvelles Routes API : 9
- 3 pour le téléchargement de documents
- 6 pour la gestion des notifications (voir DOCUMENTATION_NOTIFICATIONS.md)

### Fonctionnalités Ajoutées : 2
- Système de notifications complet
- Téléchargement sécurisé de documents

---

## ⚠️ Points d'Attention

1. **Migrations** : Les migrations doivent être exécutées en production
2. **Email** : Configuration SMTP requise pour les notifications email
3. **Stockage** : Le lien symbolique `storage:link` est nécessaire
4. **Permissions** : Vérifier les permissions de lecture des fichiers
5. **Queue** : Optionnel mais recommandé pour les performances

Cette intégration est maintenant prête pour le déploiement ! 🚀
