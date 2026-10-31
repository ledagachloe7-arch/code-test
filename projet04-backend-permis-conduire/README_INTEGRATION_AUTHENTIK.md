# 🔐 Guide d'Intégration Authentik - Système d'Authentification

Ce guide vous explique étape par étape comment intégrer Authentik dans votre application Laravel pour gérer l'authentification des utilisateurs.

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Étape 1 : Configuration d'Authentik](#étape-1--configuration-dauthentik)
4. [Étape 2 : Installation des Packages Laravel](#étape-2--installation-des-packages-laravel)
5. [Étape 3 : Configuration Laravel](#étape-3--configuration-laravel)
6. [Étape 4 : Migrations de Base de Données](#étape-4--migrations-de-base-de-données)
7. [Étape 5 : Configuration des Variables d'Environnement](#étape-5--configuration-des-variables-denvironnement)
8. [Étape 6 : Test de l'Intégration](#étape-6--test-de-lintégration)
9. [Flux d'Authentification](#flux-dauthentification)
10. [Dépannage](#dépannage)

---

## 🎯 Vue d'Ensemble

### Architecture
```
Frontend → Laravel API → Authentik IAM → Base de Données Locale
```

### Fonctionnalités
- ✅ Authentification centralisée via Authentik
- ✅ Inscription avec téléphone obligatoire (email optionnel)
- ✅ Connexion avec email OU téléphone
- ✅ Vérification de compte (code à 8 chiffres) - **Uniquement pour ROLE_CANDIDAT**
- ✅ Activation automatique pour les autres rôles
- ✅ Captcha texte pour la sécurité
- ✅ Gestion des rôles via groupes Authentik
- ✅ Tokens personnalisés (JWT)

### Types d'Utilisateurs
- **ROLE_CANDIDAT** : Doit vérifier son compte avant de se connecter
- **ROLE_RESPONSABLE_AUTO_ECOLE** : Compte activé automatiquement
- **ROLE_ADMIN** : Compte activé automatiquement

---

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ Laravel 12+ installé
- ✅ PHP 8.1+ installé
- ✅ Composer installé
- ✅ Accès à un serveur Authentik (ex: http://5.189.156.115:31015)
- ✅ Base de données configurée (MySQL/PostgreSQL/SQLite)
- ✅ Accès administrateur à Authentik

---

## 🔧 Étape 1 : Configuration d'Authentik

### 1.1 Accéder à Authentik

1. Ouvrez votre navigateur et accédez à votre serveur Authentik :
   ```
   http://5.189.156.115:31015
   ```

2. Connectez-vous avec les identifiants administrateur :
   - **Utilisateur** : `akadmin`
   - **Mot de passe** : [Votre mot de passe]

### 1.2 Créer un Token API

1. **Cliquez sur votre nom** (en haut à droite)
2. **Sélectionnez "Admin Interface"**
3. **Applications** → **Tokens** → **Create**
4. **Remplissez le formulaire :**
   ```
   Identifier: Auto-Ecole-API-Token
   Intent: api
   Description: Token pour l'API Auto-École Laravel
   ```
5. **Cliquez sur "Create"**
6. **⚠️ IMPORTANT : Copiez le token généré** (il ne sera affiché qu'une seule fois !)
   - Vous en aurez besoin pour la configuration Laravel

### 1.3 Créer un Provider OAuth2

1. **Admin Interface** → **Applications** → **Providers**
2. **Create** → **OAuth2/OpenID Provider**
3. **Configuration :**
   ```
   Name: Auto-Ecole-OAuth-Provider
   Client Type: Confidential
   Authorization Flow: Authorization Code
   Redirect URIs: 
     - http://localhost:8000/api/auth/authentik/callback (développement)
     - https://votre-domaine.com/api/auth/authentik/callback (production)
   ```
4. **Cliquez sur "Create"**
5. **Récupérez les credentials :**
   - **Client ID** : Copiez cette valeur
   - **Client Secret** : Cliquez sur "Show" et copiez cette valeur

### 1.4 Créer les Groupes de Rôles

Créez les groupes suivants dans Authentik :

#### Groupe Candidats
1. **Admin Interface** → **Applications** → **Groups**
2. **Create**
3. **Configuration :**
   ```
   Name: Candidats
   Parent: /
   Users: [Laisser vide pour l'instant]
   ```
4. **Cliquez sur "Create"**

#### Groupe Responsables Auto-École
```
Name: Responsables Auto-École
Parent: /
```

#### Groupe Administrateurs
```
Name: Administrateurs
Parent: /
```

---

## 📥 Étape 2 : Installation des Packages Laravel

### 2.1 Installer les Packages Requis

Ouvrez un terminal dans le répertoire de votre projet Laravel et exécutez :

```bash
# Package principal pour Authentik
composer require socialiteproviders/authentik

# Dépendances nécessaires
composer require guzzlehttp/guzzle
```

### 2.2 Vérifier l'Installation

```bash
composer show socialiteproviders/authentik
```

Vous devriez voir la version du package installé.

---

## ⚙️ Étape 3 : Configuration Laravel

### 3.1 Configuration des Services

**Fichier : `config/services.php`**

Ajoutez la configuration Authentik dans le tableau `return` :

```php
<?php

return [
    // ... autres services existants

    'authentik' => [
        'base_url' => env('AUTHENTIK_BASE_URL'),
        'client_id' => env('AUTHENTIK_CLIENT_ID'),
        'client_secret' => env('AUTHENTIK_CLIENT_SECRET'),
        'redirect' => env('AUTHENTIK_REDIRECT_URI'),
        'api_token' => env('AUTHENTIK_API_TOKEN'),
    ],

    // Configuration pour la vérification de compte
    'verification_code_ttl' => env('VERIFICATION_CODE_TTL', 15),
    'sms' => [
        'enabled' => env('SMS_ENABLED', false),
    ],

    // ... autres services
];
```

### 3.2 Configuration du Service Provider

**Fichier : `app/Providers/AppServiceProvider.php`**

Assurez-vous que le provider Authentik est enregistré :

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Socialite\Contracts\Factory as SocialiteFactory;
use SocialiteProviders\Authentik\Provider as AuthentikProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Enregistrer le provider Authentik
        $this->app->make(SocialiteFactory::class)->extend('authentik', function ($app) {
            return $this->app->make(AuthentikProvider::class);
        });
    }
}
```

### 3.3 Configuration des Routes

**Fichier : `routes/api.php`**

Les routes d'authentification doivent être configurées comme suit :

```php
<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

// Routes d'authentification publiques
Route::prefix('auth')->group(function () {
    // Authentification OAuth avec Authentik
    Route::get('/authentik/redirect', [AuthController::class, 'redirectToAuthentik'])
        ->name('auth.authentik.redirect');

    Route::get('/authentik/callback', [AuthController::class, 'handleAuthentikCallback'])
        ->name('auth.authentik.callback');

    // Obtenir l'URL d'authentification pour le frontend
    Route::get('/auth-url', [AuthController::class, 'getAuthUrl'])
        ->name('auth.url');

    // Inscription
    Route::post('/register', [AuthController::class, 'register'])
        ->name('auth.register');

    // Connexion directe
    Route::post('/login-direct', [AuthController::class, 'loginDirect'])
        ->name('auth.login.direct');

    // Générer un captcha pour la connexion
    Route::get('/captcha', [AuthController::class, 'generateCaptcha'])
        ->name('auth.captcha');

    // Vérification de compte
    Route::post('/send-verification-code', [AuthController::class, 'sendVerificationCode'])
        ->name('auth.send-verification-code');
    
    Route::post('/verify-account', [AuthController::class, 'verifyAccount'])
        ->name('auth.verify-account');

    // Réinitialisation de mot de passe
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
        ->name('auth.forgot-password');

    Route::post('/reset-password', [AuthController::class, 'resetPassword'])
        ->name('auth.reset-password');

    // Rafraîchir le token d'accès
    Route::post('/refresh', [AuthController::class, 'refreshToken'])
        ->name('auth.refresh');

    // Déconnexion
    Route::post('/logout', [AuthController::class, 'logout'])
        ->name('auth.logout');
});

// Routes protégées (nécessitent authentification)
Route::middleware(['auth.token'])->group(function () {
    // Obtenir les informations de l'utilisateur connecté
    Route::get('/auth/me', [AuthController::class, 'me'])
        ->name('auth.me');
    
    Route::put('/auth/update-profile', [AuthController::class, 'updateProfile'])
        ->name('auth.update-profile');
    
    Route::post('/auth/change-password', [AuthController::class, 'changePassword'])
        ->name('auth.change-password');
});
```

### 3.4 Configuration du Middleware d'Authentification

**Fichier : `bootstrap/app.php`**

Assurez-vous que le middleware personnalisé est enregistré :

```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Enregistrer les middlewares personnalisés
        $middleware->alias([
            'auth.token' => \App\Http\Middleware\AuthentikTokenMiddleware::class,
            'role' => \App\Http\Middleware\CheckRoleMiddleware::class,
        ]);
        
        // Ajouter le middleware CORS globalement pour les routes API
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
```

---

## 🗄️ Étape 4 : Migrations de Base de Données

### 4.1 Exécuter les Migrations

```bash
php artisan migrate
```

### 4.2 Migrations Importantes

Les migrations suivantes sont nécessaires pour le système d'authentification :

1. **Modification de la table `utilisateurs`**
   - Ajoute le champ `telephone` (obligatoire, unique)
   - Rend le champ `email` nullable
   - Ajoute le champ `verified_at` (nullable timestamp)

2. **Modification de la table `personnes`**
   - Rend le champ `email` nullable

3. **Création de la table `verification_codes`**
   - Stocke les codes de vérification à 8 chiffres
   - Expiration automatique après 15 minutes (configurable)

### 4.3 Vérifier les Migrations

```bash
php artisan migrate:status
```

Toutes les migrations doivent être marquées comme "Ran".

---

## 🔐 Étape 5 : Configuration des Variables d'Environnement

### 5.1 Créer/Modifier le Fichier `.env`

**Fichier : `.env`**

Ajoutez les variables suivantes :

```env
# ============================================
# Configuration Authentik
# ============================================

# URL de base du serveur Authentik
AUTHENTIK_BASE_URL=http://5.189.156.115:31015

# Credentials OAuth2 (récupérés depuis Authentik)
AUTHENTIK_CLIENT_ID=votre_client_id_ici
AUTHENTIK_CLIENT_SECRET=votre_client_secret_ici

# URI de redirection OAuth2
AUTHENTIK_REDIRECT_URI=http://localhost:8000/api/auth/authentik/callback

# Token API Authentik (récupéré depuis Authentik)
AUTHENTIK_API_TOKEN=votre_api_token_ici

# ============================================
# Configuration Vérification de Compte
# ============================================

# Durée de validité du code de vérification (en minutes)
VERIFICATION_CODE_TTL=15

# Activer l'envoi SMS (true/false)
SMS_ENABLED=false

# ============================================
# Configuration Captcha
# ============================================

# Durée de validité du captcha (en secondes)
CAPTCHA_TTL=120

# ============================================
# Configuration Session
# ============================================

SESSION_DRIVER=cookie
SESSION_LIFETIME=120
```

### 5.2 Remplacer les Valeurs

Remplacez les valeurs suivantes par celles récupérées depuis Authentik :

- `AUTHENTIK_CLIENT_ID` : Client ID du Provider OAuth2
- `AUTHENTIK_CLIENT_SECRET` : Client Secret du Provider OAuth2
- `AUTHENTIK_API_TOKEN` : Token API créé dans Authentik

### 5.3 Vider le Cache de Configuration

```bash
php artisan config:clear
php artisan cache:clear
```

---

## ✅ Étape 6 : Test de l'Intégration

### 6.1 Vérifier la Configuration

```bash
php artisan config:show services.authentik
```

Vous devriez voir toutes les valeurs de configuration Authentik.

### 6.2 Tester la Connexion à Authentik

Créez un fichier de test temporaire `test_authentik.php` :

```php
<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\AuthentikService;

try {
    $authentikService = new AuthentikService();
    
    // Tester la récupération des utilisateurs
    $response = $authentikService->client->get('/api/v3/core/users/');
    $users = json_decode($response->getBody()->getContents(), true);
    
    echo "✅ Connexion à Authentik réussie !\n";
    echo "Nombre d'utilisateurs trouvés : " . count($users['results'] ?? []) . "\n";
    
} catch (\Exception $e) {
    echo "❌ Erreur : " . $e->getMessage() . "\n";
}
```

Exécutez le test :

```bash
php test_authentik.php
```

### 6.3 Tester l'Inscription

Utilisez Postman ou cURL pour tester l'inscription :

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "telephone": "0612345678",
    "email": "test@example.com",
    "password": "Password123!",
    "password_confirmation": "Password123!",
    "nom": "Dupont",
    "prenom": "Jean",
    "contact": "0612345678",
    "adresse": "123 Rue de Paris",
    "role": "ROLE_CANDIDAT"
  }'
```

### 6.4 Tester la Connexion

```bash
# 1. Obtenir un captcha
curl -X GET http://localhost:8000/api/auth/captcha

# 2. Se connecter (remplacez CAPTCHA_ID et CAPTCHA_CODE)
curl -X POST http://localhost:8000/api/auth/login-direct \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "password": "Password123!",
    "captcha_id": "CAPTCHA_ID",
    "captcha_code": "CAPTCHA_CODE"
  }'
```

---

## 🔄 Flux d'Authentification

### Flux d'Inscription

```
1. Utilisateur → POST /api/auth/register
2. Laravel → Création dans Authentik + Base locale
3. Si ROLE_CANDIDAT → Envoi code de vérification
4. Si autre rôle → Activation automatique (verified_at = now())
5. Réponse → URL d'authentification + informations utilisateur
```

### Flux de Connexion (Candidat)

```
1. Utilisateur → GET /api/auth/captcha
2. Frontend → Affiche le captcha
3. Utilisateur → POST /api/auth/login-direct (avec captcha)
4. Laravel → Vérifie le captcha
5. Laravel → Vérifie que le compte est vérifié (verified_at non null)
6. Laravel → Authentification via Authentik API
7. Laravel → Génération de tokens personnalisés
8. Réponse → Access token + Refresh token + Informations utilisateur
```

### Flux de Connexion (Autres Rôles)

```
1. Utilisateur → GET /api/auth/captcha
2. Frontend → Affiche le captcha
3. Utilisateur → POST /api/auth/login-direct (avec captcha)
4. Laravel → Vérifie le captcha
5. Laravel → Pas de vérification de compte (activation automatique)
6. Laravel → Authentification via Authentik API
7. Laravel → Génération de tokens personnalisés
8. Réponse → Access token + Refresh token + Informations utilisateur
```

### Flux de Vérification de Compte (Candidat uniquement)

```
1. Utilisateur → POST /api/auth/send-verification-code
2. Laravel → Génère un code à 8 chiffres
3. Laravel → Envoie le code par email (et/ou SMS si activé)
4. Utilisateur → POST /api/auth/verify-account (avec le code)
5. Laravel → Vérifie le code
6. Laravel → Met à jour verified_at = now()
7. Réponse → Confirmation de vérification
```

---

## 🛠️ Dépannage

### Problème 1 : "Token API invalide"

**Symptôme :** Erreur 401 lors des appels à l'API Authentik

**Solution :**
1. Vérifiez que `AUTHENTIK_API_TOKEN` est correct dans `.env`
2. Vérifiez que le token existe toujours dans Authentik
3. Créez un nouveau token si nécessaire
4. Videz le cache : `php artisan config:clear`

### Problème 2 : "Client ID ou Secret invalide"

**Symptôme :** Erreur lors de la redirection OAuth

**Solution :**
1. Vérifiez les valeurs dans `.env`
2. Vérifiez que le Provider OAuth2 existe dans Authentik
3. Vérifiez que l'URI de redirection correspond exactement

### Problème 3 : "Utilisateur non trouvé"

**Symptôme :** Erreur lors de la connexion

**Solution :**
1. Vérifiez que l'utilisateur existe dans Authentik
2. Vérifiez que l'utilisateur existe dans la base locale
3. Utilisez l'inscription pour créer l'utilisateur

### Problème 4 : "Compte non vérifié" (Candidat)

**Symptôme :** Erreur 403 lors de la connexion d'un candidat

**Solution :**
1. Vérifiez que le code de vérification a été envoyé
2. Utilisez `/api/auth/send-verification-code` pour renvoyer un code
3. Vérifiez le compte avec `/api/auth/verify-account`
4. Vérifiez que `verified_at` n'est pas null dans la base de données

### Problème 5 : "Code captcha invalide"

**Symptôme :** Erreur lors de la connexion avec captcha

**Solution :**
1. Obtenez un nouveau captcha via `GET /api/auth/captcha`
2. Vérifiez que le `captcha_id` correspond au captcha affiché
3. Le captcha expire après 2 minutes (120 secondes)

### Vérifier les Logs

```bash
# Logs Laravel
tail -f storage/logs/laravel.log

# Filtrer les logs Authentik
tail -f storage/logs/laravel.log | grep -i authentik
```

---

## 📚 Ressources Supplémentaires

### Documentation Authentik
- [Documentation Officielle Authentik](https://goauthentik.io/docs/)
- [API Authentik](https://goauthentik.io/api/)

### Documentation Laravel
- [Laravel Socialite](https://laravel.com/docs/socialite)
- [Laravel Authentication](https://laravel.com/docs/authentication)

### Fichiers Importants du Projet

- `app/Services/AuthentikService.php` : Service principal pour Authentik
- `app/Http/Controllers/Api/AuthController.php` : Contrôleur d'authentification
- `app/Http/Middleware/AuthentikTokenMiddleware.php` : Middleware de vérification de token
- `app/Services/VerificationService.php` : Service de vérification de compte

---

## ✅ Checklist d'Intégration

- [ ] Token API créé dans Authentik
- [ ] Provider OAuth2 créé dans Authentik
- [ ] Groupes de rôles créés dans Authentik
- [ ] Packages Laravel installés
- [ ] Configuration `services.php` mise à jour
- [ ] Service Provider configuré
- [ ] Routes API configurées
- [ ] Middleware enregistré
- [ ] Migrations exécutées
- [ ] Variables `.env` configurées
- [ ] Cache vidé
- [ ] Tests d'intégration réussis

---

## 🎉 Félicitations !

Votre système d'authentification avec Authentik est maintenant configuré et prêt à être utilisé !

Pour toute question ou problème, consultez la section [Dépannage](#dépannage) ou les logs Laravel.

---

**Dernière mise à jour :** 2025-01-15
**Version :** 1.0.0



