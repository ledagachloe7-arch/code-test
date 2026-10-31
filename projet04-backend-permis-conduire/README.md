# 📊 PRÉSENTATION TECHNIQUE : INTÉGRATION SMS DGTT
**Guide Complet des Travaux Réalisés**

---

## 📋 RÉSUMÉ EXÉCUTIF

| Information | Détail |
|-------------|--------|
| **Projet** | Plateforme Permis de Conduire DGTT |
| **Mission** | Intégration système de notifications SMS |
| **Fournisseur** | Airtel Gabon ECP v6.0 |
| **Portée** | 12 types de notifications (8 existantes + 4 nouvelles) |
| **Status** | ✅ Déployé et Testé |
| **Date** | Janvier 2026 |

---

## 🎯 OBJECTIFS DU PROJET

Implémenter un canal de communication SMS pour :
- **Sécuriser** les inscriptions (validation téléphone)
- **Rassurer** les candidats (confirmations en temps réel)
- **Alerter** sur les actions critiques (documents, dossiers, convocations)
- **Réduire** les no-shows aux examens

---

## 📂 PARTIE 1 : INVENTAIRE COMPLET DES FICHIERS

### 1.1 Fichiers Créés (Nouveaux)

#### ✅ Services & Infrastructure

```
📁 app/Services/
   └── AirtelSmsService.php        [NOUVEAU] Moteur d'envoi SMS
   
📁 app/Channels/
   └── SmsChannel.php               [NOUVEAU] Adaptateur Laravel
```

**Rôle de `AirtelSmsService.php`** :
- C'est le **traducteur**. Il prend un message simple et s'occupe de la complexité technique d'Airtel
- Authentification sécurisée avec la Gateway Airtel
- Normalisation automatique des numéros (074... → 24174...)
- Formatage ECP, Protocoles HTTPS
- Gestion des erreurs HTTP et logging

**Rôle de `SmsChannel.php`** :
- C'est le **chef d'orchestre** intégré à Laravel
- Il permet aux développeurs d'utiliser le SMS aussi simplement que l'Email
- En ajoutant juste une ligne de code (`SmsChannel::class`) dans les notifications
- Intégration native avec le système de notifications Laravel

#### ✅ Nouvelles Notifications (4 créées de zéro)

```
📁 app/Notifications/
   ├── ExamenEchoueNotification.php
   ├── RappelDocumentManquantNotification.php
   ├── DateExamenProgrammeeNotification.php
   └── PermisDisponibleNotification.php
```

#### ✅ Outil de Test

```
📁 Racine Backend/
   └── test_all_notifications.php   [NOUVEAU] Script de diagnostic
```

**Utilité** : Tester l'envoi de toutes les notifications vers un numéro test sans créer de faux dossiers en base.

### 1.2 Fichiers Modifiés (Existants)

#### 🔧 Notifications Existantes (8 mises à jour avec SMS)

```
📁 app/Notifications/
   ├── AccountCreatedNotification.php      [MIS À JOUR] + SMS
   ├── DocumentUploadedNotification.php    [MIS À JOUR] + SMS
   ├── DocumentValidatedNotification.php   [MIS À JOUR] + SMS
   ├── DocumentRejectedNotification.php    [MIS À JOUR] + SMS
   ├── DossierCreatedNotification.php      [MIS À JOUR] + SMS
   ├── DossierValidatedNotification.php    [MIS À JOUR] + SMS
   ├── DossierRejectedNotification.php     [MIS À JOUR] + SMS
   └── ExamenReussiNotification.php        [MIS À JOUR] + SMS
```

**Modifications apportées** :
1. Ajout de `use App\Channels\SmsChannel;`
2. Ajout de `use App\Services\AirtelSmsService;`
3. Ajout de `SmsChannel::class` dans la méthode `via()`
4. Création de la méthode `toSms($notifiable)` avec gestion d'erreurs

#### 🔧 Correctif Critique

```
📁 app/Http/Controllers/Api/
   └── AuthController.php              [MODIFIÉ] Correctif rôle candidat
```

**Problème résolu** : Le système bloquait la vérification de compte pour les utilisateurs avec le rôle `'candidat'` (il attendait `'ROLE_CANDIDAT'`).

**Solution** :
```php
// Avant (bloquant)
if ($user->role !== 'ROLE_CANDIDAT') { ... }

// Après (flexible)
if (!in_array($user->role, ['ROLE_CANDIDAT', 'candidat'])) { ... }
```

---

## 🔧 PARTIE 2 : CONFIGURATION PRODUCTION

### 2.1 Variables d'Environnement (.env)

**📋 À copier dans le fichier `.env` du serveur de production :**

```ini
# =======================================
# CONFIGURATION SMS AIRTEL GABON
# =======================================

# Endpoint API Enterprise Content Provider
AIRTEL_SMS_HOST=https://messaging.airtel.ga:9002/smshttpquery/qs

# Identifiants d'authentification
AIRTEL_SMS_USERNAME=RANGUS
AIRTEL_SMS_PASSWORD=Dec@9080

# Nom d'affichage (Expéditeur)
AIRTEL_SMS_SENDER_ID=DGTT

# Switch global (true en PROD, false en DEV)
AIRTEL_SMS_ENABLED=true

# =======================================
```

### 2.2 Configuration Laravel (`config/services.php`)

Ce fichier a été complété pour référencer les variables :

```php
'airtel_sms' => [
    'host' => env('AIRTEL_SMS_HOST'),
    'username' => env('AIRTEL_SMS_USERNAME'),
    'password' => env('AIRTEL_SMS_PASSWORD'),
    'sender_id' => env('AIRTEL_SMS_SENDER_ID'),
    'enabled' => env('AIRTEL_SMS_ENABLED', false),
],
```

---

## 📱 PARTIE 3 : LES 12 NOTIFICATIONS DÉTAILLÉES

### 3.1 Phase 1 : 8 Notifications Existantes (Mises à jour avec SMS)

| # | Notification | Déclencheur | Message SMS Envoyé à l'Utilisateur |
|---|--------------|-------------|-----------------------------------|
| 1 | `AccountCreatedNotification` | Inscription utilisateur | `"DGTT - Bienvenue ! Votre compte a été créé avec succès. Code de vérification : 4829. Valable 10 minutes."` |
| 2 | `DocumentUploadedNotification` | Upload document | `"DGTT - Document reçu avec succès. Votre CNI est en cours de vérification par notre équipe. Vous serez notifié du résultat."` |
| 3 | `DocumentValidatedNotification` | Validation admin | `"DGTT - Excellente nouvelle ! Votre document CNI a été validé par notre service. Vous pouvez continuer votre dossier."` |
| 4 | `DocumentRejectedNotification` | Rejet admin | `"DGTT - Document CNI refusé. Motif : Photo floue ou illisible. Veuillez télécharger une nouvelle photo claire. Merci."` |
| 5 | `DossierCreatedNotification` | Création dossier | `"DGTT - Votre dossier de permis de conduire #D1234 a été créé avec succès. Prochaine étape : télécharger vos documents."` |
| 6 | `DossierValidatedNotification` | Acceptation dossier | `"DGTT - Félicitations ! Votre dossier complet a été validé. Vous serez convoqué(e) prochainement pour votre examen."` |
| 7 | `DossierRejectedNotification` | Refus dossier | `"DGTT - Votre dossier a été rejeté. Motif : Documents incomplets. Veuillez compléter les pièces manquantes dans votre espace."` |
| 8 | `ExamenReussiNotification` | Résultat positif | `"DGTT - FÉLICITATIONS ! Vous avez réussi votre examen de Code de la route avec la note de 18/20. Prochaine étape : examen pratique."` |

### 3.2 Phase 2 : 4 Nouvelles Notifications (Créées de Zéro)

| # | Notification | Déclencheur | Message SMS Envoyé à l'Utilisateur |
|---|--------------|-------------|-----------------------------------|
| 9 | `ExamenEchoueNotification` | Résultat négatif | `"DGTT - Résultat examen Code : Malheureusement non acquis. Note obtenue : 12/20 (minimum requis : 15/20). Ne vous découragez pas, vous pouvez repasser l'examen."` |
| 10 | `RappelDocumentManquantNotification` | Dossier incomplet | `"DGTT - Rappel important : Votre dossier est incomplet. Il manque 2 documents (Certificat médical, Photo). Veuillez les uploader rapidement pour éviter tout retard."` |
| 11 | `DateExamenProgrammeeNotification` | Planification | `"DGTT - CONVOCATION OFFICIELLE : Examen Code de la route programmé le 25/01/2026 à 10h00. Lieu : Centre d'examen Owendo. Merci d'arriver 15min en avance avec votre pièce d'identité."` |
| 12 | `PermisDisponibleNotification` | Production permis | `"DGTT - Bonne nouvelle ! Votre permis de conduire définitif est disponible pour retrait au siège DGTT Libreville. Horaires : Lun-Ven 8h-16h. Munissez-vous de votre pièce d'identité."` |

---

## 🎓 PÉDAGOGIE : COMMENT INTÉGRER UN NOUVEAU SMS ?

Ce guide rapide vous permet d'ajouter une notification SMS à n'importe quelle autre classe de Notification Laravel.

### Étape 1 : Les Imports
**Fichier cible :** `app/Notifications/VotreNotification.php`

En haut du fichier, sous `namespace App\Notifications;`, ajoutez :

```php
use App\Channels\SmsChannel;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
```

### Étape 2 : Activation du Canal
**Fichier cible :** `app/Notifications/VotreNotification.php`

Modifiez la méthode `via()` pour inclure `SmsChannel::class` :

```php
public function via($notifiable)
{
    // Ajouter SmsChannel::class à la liste
    return ['mail', 'database', SmsChannel::class];
}
```

### Étape 3 : Le Contenu du Message
**Fichier cible :** `app/Notifications/VotreNotification.php`

Copiez-collez ce modèle standard pour la méthode `toSms()` :

```php
public function toSms($notifiable)
{
    try {
        // 1. Récupérer le téléphone (compatible User et Candidat)
        $phone = $notifiable->telephone 
                  ?? $notifiable->personne?->contact 
                  ?? null;
        
        if (!$phone) {
            return; // Pas de numéro = pas de SMS silentieux
        }
        
        // 2. Préparer le message
        $service = new AirtelSmsService();
        $message = "DGTT - Votre message ici. Code: 12345.";
        
        // 3. Envoyer
        $service->send($phone, $message);
        
    } catch (\Exception $e) {
        Log::error("[SMS ERROR] " . $e->getMessage());
    }
}
```

---

## 💻 PARTIE 4 : ARCHITECTURE TECHNIQUE DÉTAILLÉE

### 4.1 Le Moteur (Le Service)
**Fichier :** `app/Services/AirtelSmsService.php`
- Gère la communication brute avec l'API Airtel.
- Transforme `074XXXXXX` en `24174XXXXXX`.
- Gère l'authentification et les logs.

### 4.2 L'Adaptateur (Le Channel)
**Fichier :** `app/Channels/SmsChannel.php`
- Standardise l'envoi dans Laravel.
- Permet d'appeler `toSms()` depuis n'importe quelle notification.

---

## 🧪 PARTIE 5 : TESTS & VALIDATION

### 5.1 Script de Test
Utilisez `test_all_notifications.php` à la racine pour simuler les 12 scénarios d'un coup vers votre numéro.

```bash
php test_all_notifications.php
```

---

## 🖥️ PARTIE 6 : FRONTEND (REACT)

Le Frontend affiche des "Toasts" de confirmation quand un SMS est envoyé.

**Logique Front (Exemple)** :
```typescript
if (response.data.verification?.channels?.some(c => c.method === 'sms')) {
    toast.success("SMS envoyé !");
}
```

---

## ✅ CONCLUSION

L'intégration SMS est **complète et opérationnelle** avec **12 scénarios de notifications SMS**.
