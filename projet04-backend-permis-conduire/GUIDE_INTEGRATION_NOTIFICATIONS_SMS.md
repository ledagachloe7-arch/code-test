# 📱 Guide d'Intégration des Notifications SMS - Backend DGTT
## Guide Ultra-Détaillé pour Débutants PHP/Laravel

> **Prérequis** : Aucune connaissance avancée en PHP requise  
> **Durée estimée** : 30-45 minutes  
> **Projet** : Backend Permis de Conduire (Laravel)  
> **Service SMS** : Airtel Gabon ECP v6.0.0

---

## 📋 Table des Matières

1. [Configuration Initiale du Backend](#1-configuration-initiale-du-backend)
2. [Installation des Dépendances](#2-installation-des-dépendances)
3. [Configuration de la Base de Données](#3-configuration-de-la-base-de-données)
4. [Lancement du Serveur Local](#4-lancement-du-serveur-local)
5. [Tests des 8 Notifications](#5-tests-des-8-notifications)
6. [Vérification des Résultats](#6-vérification-des-résultats)
7. [Dépannage](#7-dépannage)

---

## 1. Configuration Initiale du Backend

### Étape 1.1 : Créer le fichier `.env`

Le fichier `.env` contient toutes les variables de configuration de votre application.

**Ouvrez PowerShell** ou l'invite de commande Windows et naviguez vers le projet :

```powershell
cd C:\Users\user\Downloads\DGTT\backend-permis-conduire-main
```

**Copiez le fichier d'exemple** :

```powershell
copy .env.example .env
```

✅ **Vérification** : Le fichier `.env` doit maintenant exister dans votre dossier

---

### Étape 1.2 : Vérifier les Variables SMS Airtel

Ouvrez le fichier `.env` avec votre éditeur de texte (Notepad++ ou VS Code) et vérifiez que ces lignes sont présentes à la fin :

```env
AIRTEL_SMS_HOST=https://messaging.airtel.ga:9002/smshttpquery/qs
AIRTEL_SMS_USERNAME=RANGUS
AIRTEL_SMS_PASSWORD=Dec@9080
AIRTEL_SMS_SENDER_ID=DGTT
```

✅ **Bonus** : Ces variables sont déjà dans votre `.env.example`, donc elles seront copiées automatiquement !

---

## 2. Installation des Dépendances

### Étape 2.1 : Installer Composer (si pas déjà fait)

Laravel utilise **Composer** pour gérer les dépendances PHP.

**Vérifiez si Composer est installé** :

```powershell
composer --version
```

Si vous voyez un numéro de version (ex: `Composer version 2.x`), passez à l'étape 2.2.

**Sinon, téléchargez Composer** :
1. Allez sur https://getcomposer.org/download/
2. Téléchargez et installez `Composer-Setup.exe`
3. Redémarrez PowerShell après l'installation

---

### Étape 2.2 : Installer les dépendances du projet

Dans le dossier du backend, exécutez :

```powershell
composer install
```

⏱️ **Temps estimé** : 2-5 minutes (première fois)

✅ **Vérification** : Un dossier `vendor/` doit être créé avec des milliers de fichiers

---

## 3. Configuration de la Base de Données

### Étape 3.1 : Vérifier PostgreSQL

Votre projet utilise PostgreSQL. Vérifiez que PostgreSQL est en cours d'exécution :

```powershell
# Vérifier le service PostgreSQL
Get-Service -Name postgresql*
```

**Si le service n'est pas démarré** :

```powershell
# Démarrer PostgreSQL (remplacez 'postgresql-x64-14' par votre version)
Start-Service postgresql-x64-14
```

---

### Étape 3.2 : Configurer les informations de connexion

Ouvrez `.env` et modifiez ces lignes selon votre configuration :

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=permis_conduire_db
DB_USERNAME=postgres
DB_PASSWORD=votre_mot_de_passe_postgres
```

⚠️ **Important** : Remplacez `votre_mot_de_passe_postgres` par votre vrai mot de passe PostgreSQL

---

### Étape 3.3 : Générer la clé d'application

Laravel nécessite une clé unique pour la sécurité :

```powershell
php artisan key:generate
```

✅ **Vérification** : Vous verrez `Application key set successfully.`

---

### Étape 3.4 : Exécuter les migrations

Créez les tables de base de données :

```powershell
php artisan migrate
```

✅ **Succès** : Vous verrez une liste de migrations exécutées avec des `[OK]`

❌ **Si erreur de connexion** :
- Vérifiez que PostgreSQL est démarré
- Vérifiez `DB_USERNAME` et `DB_PASSWORD` dans `.env`
- Vérifiez que la base de données existe (créez-la si nécessaire)

---

### Étape 3.5 : Effacer le cache

Effacez tous les caches pour que Laravel charge la nouvelle configuration :

```powershell
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

✅ **Chaque commande doit afficher** : `Cache cleared successfully.`

---

## 4. Lancement du Serveur Local

### Étape 4.1 : Démarrer le serveur Laravel

```powershell
php artisan serve
```

✅ **Succès** : Vous verrez :
```
Laravel development server started: http://127.0.0.1:8000
```

⚠️ **Ne fermez pas cette fenêtre PowerShell** - Le serveur tourne dans cette fenêtre

---

### Étape 4.2 : Tester que le serveur fonctionne

Ouvrez un **nouveau PowerShell** (gardez l'autre ouvert) et testez :

```powershell
curl http://127.0.0.1:8000
```

Ou ouvrez votre navigateur : http://127.0.0.1:8000

✅ **Succès** : Vous voyez une page (même si c'est une erreur 404, c'est normal)

---

## 5. Tests des 8 Notifications

### 🎯 Vue d'ensemble

Nous allons tester chaque type de notification avec des scripts PHP simples. Chaque script :
1. Crée un utilisateur de test avec un numéro de téléphone
2. Déclenche la notification
3. Affiche si le SMS a été envoyé

⚠️ **Important** : Remplacez `24177123456` par votre vrai numéro de téléphone gabonais dans chaque script !

---

### Test 1 : AccountCreatedNotification

Créez le fichier : `test_notification_1_account.php`

**Chemin** : `C:\Users\user\Downloads\DGTT\backend-permis-conduire-main\test_notification_1_account.php`

```php
<?php

require __DIR__ . '/vendor/autoload.php';

// Charger Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make('Illuminate\\Contracts\\Console\\Kernel');
$kernel->bootstrap();

echo "\n";
echo "========================================\n";
echo " TEST 1: AccountCreatedNotification\n";
echo "========================================\n\n";

// ⚠️ REMPLACEZ PAR VOTRE NUMÉRO
$testPhone = '24177123456';
$testEmail = 'test.account.' . time() . '@dgtt.ga';

echo "📱 Numéro de test : $testPhone\n";
echo "📧 Email de test : $testEmail\n\n";

try {
    // Créer un utilisateur de test
    $user = \App\Models\Utilisateur::create([
        'email' => $testEmail,
        'telephone' => $testPhone,
        'role' => 'candidat',
        'est_verifie' => false,
    ]);

    // Créer une personne associée
    $personne = \App\Models\Personne::create([
        'nom' => 'Dupont',
        'prenom' => 'Jean',
        'contact' => $testPhone,
    ]);

    $user->personne()->associate($personne);
    $user->save();

    echo "✅ Utilisateur créé : ID {$user->id}\n\n";

    // Envoyer la notification
    echo "📤 Envoi de la notification AccountCreated...\n";
    $user->notify(new \App\Notifications\AccountCreatedNotification($user, 'TestPassword123'));

    echo "\n";
    echo "✅ Notification envoyée !\n";
    echo "\n";
    echo "📱 VÉRIFIEZ VOTRE TÉLÉPHONE : Vous devriez recevoir un SMS\n";
    echo "📧 VÉRIFIEZ LES LOGS : storage/logs/laravel.log\n";
    echo "\n";

    // Afficher les notifications en base
    $notifications = $user->notifications;
    echo "💾 Notifications en base de données : " . $notifications->count() . "\n";

    // Nettoyer (optionnel - décommentez pour supprimer l'utilisateur de test)
    // $user->delete();
    // $personne->delete();
    // echo "\n🗑️ Utilisateur de test supprimé\n";

} catch (\Exception $e) {
    echo "\n❌ ERREUR : " . $e->getMessage() . "\n";
    echo "\n📋 Trace :\n";
    echo $e->getTraceAsString() . "\n";
}

echo "\n========================================\n";
echo " FIN DU TEST 1\n";
echo "========================================\n\n";
```

**Exécution** :

```powershell
php test_notification_1_account.php
```

---

### Test 2 : DocumentUploadedNotification

Créez le fichier : `test_notification_2_document.php`

```php
<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make('Illuminate\\Contracts\\Console\\Kernel');
$kernel->bootstrap();

echo "\n========================================\n";
echo " TEST 2: DocumentUploadedNotification\n";
echo "========================================\n\n";

// ⚠️ REMPLACEZ PAR VOTRE NUMÉRO
$testPhone = '24177123456';

try {
    // Trouver un utilisateur responsable d'auto-école (ou en créer un)
    $responsable = \App\Models\Utilisateur::where('role', 'responsable_auto_ecole')->first();
    
    if (!$responsable) {
        echo "⚠️ Pas de responsable trouvé, création d'un utilisateur de test...\n";
        
        $personne = \App\Models\Personne::create([
            'nom' => 'Responsable',
            'prenom' => 'Test',
            'contact' => $testPhone,
        ]);

        $responsable = \App\Models\Utilisateur::create([
            'email' => 'responsable.test.' . time() . '@dgtt.ga',
            'telephone' => $testPhone,
            'role' => 'responsable_auto_ecole',
            'est_verifie' => true,
        ]);
        
        $responsable->personne()->associate($personne);
        $responsable->save();
    } else {
        echo "✅ Responsable trouvé : {$responsable->email}\n";
    }

    // Créer un document de test
    $document = new \App\Models\Document();
    $document->nom_fichier = 'carte_identite_test.pdf';
    $document->id = \Illuminate\Support\Str::uuid();
    $document->save();

    echo "\n📤 Envoi de la notification DocumentUploaded...\n";
    
    $responsable->notify(new \App\Notifications\DocumentUploadedNotification(
        $document,
        'Jean Dupont'
    ));

    echo "\n✅ Notification envoyée  !\n";
    echo "📱 VÉRIFIEZ VOTRE TÉLÉPHONE\n\n";

} catch (\Exception $e) {
    echo "\n❌ ERREUR : " . $e->getMessage() . "\n";
}

echo "========================================\n\n";
```

**Exécution** :

```powershell
php test_notification_2_document.php
```

---

### Tests 3-8 : Script Complet pour Toutes les Notifications

Créez le fichier : `test_all_notifications.php`

```php
<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make('Illuminate\\Contracts\\Console\\Kernel');
$kernel->bootstrap();

// ⚠️⚠️⚠️ REMPLACEZ PAR VOTRE NUMÉRO ⚠️⚠️⚠️
$YOUR_PHONE_NUMBER = '24177123456';

echo "\n";
echo "╔════════════════════════════════════════╗\n";
echo "║  TEST COMPLET DES 8 NOTIFICATIONS SMS  ║\n";
echo "╚════════════════════════════════════════╝\n";
echo "\n";
echo "📱 Numéro de test : $YOUR_PHONE_NUMBER\n";
echo "⏱️  Délai entre chaque test : 3 secondes\n";
echo "\n";
echo "Appuyez sur ENTRÉE pour commencer...\n";
fgets(STDIN);

$tests = [
    1 => 'AccountCreated',
    2 => 'DocumentUploaded',
    3 => 'DocumentValidated',
    4 => 'DocumentRejected',
    5 => 'DossierCreated',
    6 => 'DossierValidated',
    7 => 'DossierRejected',
    8 => 'ExamenReussi',
];

$results = [];

foreach ($tests as $num => $name) {
    echo "\n┌─────────────────────────────────────┐\n";
    echo "│ TEST #{$num}: {$name}\n";
    echo "└─────────────────────────────────────┘\n";
    
    try {
        switch ($num) {
            case 1: // AccountCreated
                $user = createTestUser($YOUR_PHONE_NUMBER);
                $user->notify(new \App\Notifications\AccountCreatedNotification($user, 'Test123'));
                break;
                
            case 2: // DocumentUploaded
                $user = createTestUser($YOUR_PHONE_NUMBER);
                $doc = createTestDocument();
                $user->notify(new \App\Notifications\DocumentUploadedNotification($doc, 'Jean Dupont'));
                break;
                
            case 3: // DocumentValidated
                $user = createTestUser($YOUR_PHONE_NUMBER);
                $doc = createTestDocument();
                $user->notify(new \App\Notifications\DocumentValidatedNotification($doc, 'Jean Dupont'));
                break;
                
            case 4: // DocumentRejected
                $user = createTestUser($YOUR_PHONE_NUMBER);
                $doc = createTestDocument();
                $user->notify(new \App\Notifications\DocumentRejectedNotification($doc, 'Jean Dupont', 'Photo floue'));
                break;
                
            case 5: // DossierCreated
                $user = createTestUser($YOUR_PHONE_NUMBER);
                $dossier = createTestDossier();
                $user->notify(new \App\Notifications\DossierCreatedNotification($dossier, 'Jean Dupont'));
                break;
                
            case 6: // DossierValidated
                $user = createTestUser($YOUR_PHONE_NUMBER);
                $dossier = createTestDossier();
                $user->notify(new \App\Notifications\DossierValidatedNotification($dossier, 'Jean Dupont'));
                break;
                
            case 7: // DossierRejected
                $user = createTestUser($YOUR_PHONE_NUMBER);
                $dossier = createTestDossier();
                $user->notify(new \App\Notifications\DossierRejectedNotification($dossier, 'Jean Dupont', 'Dossier incomplet'));
                break;
                
            case 8: // ExamenReussi
                $user = createTestUser($YOUR_PHONE_NUMBER);
                $resultat = createTestResultat();
                $user->notify(new \App\Notifications\ExamenReussiNotification($resultat, 'Jean Dupont'));
                break;
        }
        
        echo "✅ Notification envoyée avec succès\n";
        $results[$num] = 'SUCCESS';
        
    } catch (\Exception $e) {
        echo "❌ ERREUR : " . $e->getMessage() . "\n";
        $results[$num] = 'FAILED';
    }
    
    if ($num < count($tests)) {
        echo "\n⏳ Attente de 3 secondes avant le prochain test...\n";
        sleep(3);
    }
}

// Résumé
echo "\n\n";
echo "╔════════════════════════════════════════╗\n";
echo "║         RÉSUMÉ DES TESTS               ║\n";
echo "╚════════════════════════════════════════╝\n\n";

$successCount = 0;
foreach ($results as $num => $result) {
    $icon = $result === 'SUCCESS' ? '✅' : '❌';
    echo "$icon Test #{$num}: {$tests[$num]} - $result\n";
    if ($result === 'SUCCESS') $successCount++;
}

echo "\n";
echo "Réussis : $successCount / " . count($tests) . "\n";
echo "\n";
echo "📱 Vérifiez votre téléphone : vous devriez avoir reçu {$successCount} SMS\n";
echo "📋 Vérifiez les logs : storage/logs/laravel.log\n";
echo "\n";

// Fonctions helper
function createTestUser($phone) {
    $personne = \App\Models\Personne::create([
        'nom' => 'Dupont',
        'prenom' => 'Jean',
        'contact' => $phone,
    ]);

    $user = \App\Models\Utilisateur::create([
        'email' => 'test.' . time() . rand(1000, 9999) . '@dgtt.ga',
        'telephone' => $phone,
        'role' => 'candidat',
        'est_verifie' => true,
    ]);
    
    $user->personne()->associate($personne);
    $user->save();
    
    return $user;
}

function createTestDocument() {
    $doc = new \App\Models\Document();
    $doc->nom_fichier = 'test_document_' . time() . '.pdf';
    $doc->id = \Illuminate\Support\Str::uuid();
    // Ne pas sauvegarder en base, juste pour le test
    return $doc;
}

function createTestDossier() {
    $dossier = new \App\Models\Dossier();
    $dossier->id = \Illuminate\Support\Str::uuid();
    $dossier->statut = 'en_attente';
    // Ne pas sauvegarder en base, juste pour le test
    return $dossier;
}

function createTestResultat() {
    $resultat = new \App\Models\Resultat();
    $resultat->id = \Illuminate\Support\Str::uuid();
    $resultat->typeExamen = 'Code de la route';
    $resultat->statut = 'reussi';
    $resultat->date = now();
    // Ne pas sauvegarder en base, juste pour le test
    return $resultat;
}
```

**Exécution** :

```powershell
php test_all_notifications.php
```

---

## 6. Vérification des Résultats

### ✅ Comment savoir si ça a marché ?

#### 1. Vérifier votre téléphone
- Vous devriez recevoir **1 SMS par notification testée**
- Les SMS proviennent de **DGTT** (sender ID)
- Chaque SMS contient un message spécifique

#### 2. Vérifier les logs Laravel

Ouvrez le fichier : `storage\logs\laravel.log`

**Recherchez** (Ctrl+F) :
- `[SMS] AccountCreated envoyé` ✅ SMS envoyé
- `[AirtelSMS] SMS envoyé avec succès` ✅ Confirmation Airtel
- `+OK` ✅ Réponse positive d'Airtel

**Exemple de log réussi** :
```
[2026-01-20 09:30:00] local.INFO: [AirtelSMS] SMS envoyé avec succès  
{"phone":"24177123456","message_length":95,"response":"+OK 8248428906433229997|Accepted|..."}
```

#### 3. Vérifier la base de données

Exécutez dans PowerShell :

```powershell
php artisan tinker
```

Puis dans Tinker :

```php
// Voir toutes les notifications
\Illuminate\Notifications\DatabaseNotification::count();

// Voir les 5 dernières
\Illuminate\Notifications\DatabaseNotification::latest()->take(5)->get();
```

---

## 7. Dépannage

### ❌ Problème : "Class 'App\Services\AirtelSmsService' not found"

**Solution** :

```powershell
composer dump-autoload
php artisan config:clear
```

---

### ❌ Problème : "SQLSTATE[08006] Connection refused"

**Causes possibles** :
1. PostgreSQL n'est pas démarré
2. Mauvais mot de passe dans `.env`

**Solutions** :

```powershell
# Vérifier le service
Get-Service -Name postgresql*

# Démarrer PostgreSQL
Start-Service postgresql-x64-14

# Vérifier les identifiants dans .env
cat .env | Select-String "DB_"
```

---

### ❌ Problème : SMS non reçu mais aucune erreur dans les logs

**Vérifications** :
1. Le numéro est-il au format `24177XXXXXX` ?
2. Avez-vous vérifié les logs (`storage/logs/laravel.log`) ?
3. Le crédit Airtel est-il épuisé ?

**Test direct de l'API Airtel** :

```powershell
curl -k "https://messaging.airtel.ga:9002/smshttpquery/qs?REQUESTTYPE=SMSSubmitReq&USERNAME=RANGUS&PASSWORD=Dec%409080&MOBILENO=24177123456&MESSAGE=Test&ORIGIN_ADDR=DGTT&TYPE=0"
```

Si vous voyez `+OK`, l'API fonctionne. Sinon, contactez Airtel.

---

### ❌ Problème : "419 Page expired" lors des tests API

**Solution** :

```powershell
php artisan config:clear
php artisan cache:clear
```

---

## 📊 Résumé Complet

### ✅ Ce qui a été fait

1. ✅ Service `AirtelSmsService` créé
2. ✅ Canal `SmsChannel` créé  
3. ✅ 8 notifications mises à jour avec SMS
4. ✅ Configuration ajoutée dans `config/services.php`
5. ✅ Variables SMS dans `.env.example`

### 📁 Fichiers importants

| Fichier | Description |
|---------|-------------|
| `.env` | Configuration (créé à partir de `.env.example`) |
| `app/Services/AirtelSmsService.php` | Service d'envoi SMS |
| `app/Channels/SmsChannel.php` | Canal personnalisé |
| `app/Notifications/*.php` | 8 notifications avec SMS |
| `storage/logs/laravel.log` | Logs de toutes les actions |
| `test_all_notifications.php` | Script de test complet |

### 🎯 Prochaines Étapes

Une fois que tous les tests backend fonctionnent :

1. ✅ Tester l'intégration frontend
2. ✅ Déployer en production
3. ✅ Monitorer les envois SMS
4. ✅ Ajouter un dashboard de statistiques

---

## 🆘 Besoin d'Aide ?

**Si vous êtes bloqué** :

1. Vérifiez les logs : `storage/logs/laravel.log`
2. Vérifiez que le serveur Laravel tourne : `php artisan serve`
3. Vérifiez PostgreSQL : `Get-Service postgresql*`
4. Effacez tous les caches :
   ```powershell
   php artisan config:clear
   php artisan cache:clear
   php artisan route:clear
   php artisan view:clear
   ```

---

**Guide créé le** : 20 Janvier 2026  
**Version** : 2.0 - Édition Débutants  
**Auteur** : Équipe DGTT
