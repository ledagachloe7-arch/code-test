# Vérification de Compte - Documentation Complète

Ce document décrit le système de vérification de compte avec code à 8 chiffres envoyé **sur tous les canaux disponibles** (email et/ou SMS).

## 📋 Vue d'ensemble

Chaque utilisateur doit vérifier son compte avant de pouvoir se connecter. Le système envoie un code de vérification à 8 chiffres **sur tous les canaux qu'il a fournis** :
- Email + SMS si les deux sont disponibles
- Email uniquement si aucun numéro n'est fourni
- SMS uniquement si aucun email n'est disponible (fonctionnalité en attente d'activation SMS)

## 🗄️ Base de données

### Migrations

1. `2025_01_15_000002_add_verified_at_to_utilisateurs.php`  
   → Ajoute le champ `verified_at` (nullable timestamp) dans `utilisateurs`.

2. `2025_01_15_000003_create_verification_codes_table.php`  
   → Ajoute la table `verification_codes` qui stocke les codes envoyés :
   - `id` (UUID)
   - `utilisateur_id` (UUID)
   - `method` (`email` ou `sms`)
   - `code_hash`
   - `expires_at`
   - timestamps

**Exécuter les migrations :**
```bash
php artisan migrate
```

## 🔧 Configuration

Les codes sont stockés dans la table `verification_codes`. Deux paramètres principaux :

- **Durée de validité** : `VERIFICATION_CODE_TTL` (minutes, défaut : 15)
  ```env
  VERIFICATION_CODE_TTL=15
  ```

- **Activation SMS** : `SMS_ENABLED`
  ```env
  SMS_ENABLED=true
  ```
  Par défaut `SMS_ENABLED=false`, ce qui signifie que les codes SMS sont enregistrés/loggés mais non envoyés (utile en développement).

## 📡 Endpoints API

### 1. Inscription avec envoi automatique du code

**POST** `/api/auth/register`

Lors de l'inscription, un code de vérification est automatiquement généré et envoyé :
- Par **email** si l'utilisateur a fourni un email
- Par **SMS** si seulement le téléphone est fourni (en attente API SMS)

**Réponse :**
```json
{
  "success": true,
  "message": "Inscription réussie. Veuillez vérifier votre compte avec le code reçu.",
  "requires_verification": true,
  "verification": {
    "channels": [
      {
        "method": "email",
        "sent": true,
        "message": "Code envoyé par email."
      },
      {
        "method": "sms",
        "sent": false,
        "message": "L'envoi par SMS n'est pas encore disponible. Le code est enregistré pour vérification."
      }
    ]
  },
  "user": { ... }
}
```

**Note importante :** Si l'utilisateur a fourni **email ET téléphone**, le **même code** est envoyé sur les deux canaux. L'utilisateur peut utiliser le code reçu par email ou par SMS pour vérifier son compte.

### 2. Demander un nouveau code de vérification

**POST** `/api/auth/send-verification-code`

Permet de demander un nouveau code si l'utilisateur ne l'a pas reçu ou s'il a expiré.

**Body :**
```json
{
  "identifier": "0612345678"
}
```
ou
```json
{
  "identifier": "user@example.com"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Code de vérification envoyé sur tous les canaux disponibles.",
  "channels": [
    {
      "method": "email",
      "sent": true,
      "message": "Code envoyé par email."
    },
    {
      "method": "sms",
      "sent": false,
      "message": "L'envoi par SMS n'est pas encore disponible."
    }
  ]
}
```

**Note :** Le code est envoyé sur **tous les canaux** que l'utilisateur a fournis (email et/ou téléphone). Le même code fonctionne pour tous les canaux.

**Erreurs possibles :**
- `404` : Utilisateur non trouvé
- `400` : Compte déjà vérifié
- `503` : API SMS non disponible (si tentative par téléphone uniquement)
- `500` : Erreur d'envoi

### 3. Vérifier le compte avec le code

**POST** `/api/auth/verify-account`

Vérifie le compte avec le code à 8 chiffres reçu.

**Body :**
```json
{
  "identifier": "0612345678",
  "code": "12345678"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Votre compte a été vérifié avec succès. Vous pouvez maintenant vous connecter.",
  "user": {
    "id": "...",
    "telephone": "0612345678",
    "email": "user@example.com",
    "role": "candidat",
    "verified_at": "2025-01-15T10:30:00+00:00"
  }
}
```

**Erreurs possibles :**
- `404` : Utilisateur non trouvé
- `400` : Code invalide ou expiré, ou compte déjà vérifié
- `422` : Erreur de validation (code doit être exactement 8 chiffres)

### 4. Connexion (vérification obligatoire)

**POST** `/api/auth/login-direct`

La connexion vérifie automatiquement que le compte est vérifié (`verified_at` n'est pas null).

**Si le compte n'est pas vérifié :**
```json
{
  "success": false,
  "message": "Votre compte n'est pas encore vérifié. Veuillez vérifier votre compte avant de vous connecter.",
  "requires_verification": true,
  "user_id": "..."
}
```

**Code HTTP :** `403 Forbidden`

## 🔄 Flux complet

### Scénario 1 : Inscription avec email ET téléphone

1. **Inscription** → `POST /api/auth/register` avec email **et** téléphone
2. **Code envoyé automatiquement** sur **les deux canaux** :
   - Par **email** (toujours envoyé si email fourni)
   - Par **SMS** (si `SMS_ENABLED=true` dans `.env`)
3. **Vérification** → `POST /api/auth/verify-account` avec le code reçu (peu importe le canal)
4. **Connexion** → `POST /api/auth/login-direct` (maintenant autorisée)

**Important :** Le **même code** est envoyé sur les deux canaux. L'utilisateur peut utiliser celui qu'il reçoit en premier.

### Scénario 1b : Inscription avec email uniquement

1. **Inscription** → `POST /api/auth/register` avec email uniquement
2. **Code envoyé automatiquement** par email
3. **Vérification** → `POST /api/auth/verify-account` avec le code reçu
4. **Connexion** → `POST /api/auth/login-direct`

### Scénario 2 : Inscription avec téléphone uniquement

1. **Inscription** → `POST /api/auth/register` avec téléphone uniquement
2. **Code généré** et stocké (mais non envoyé si `SMS_ENABLED=false`)
3. **Demander le code** → `POST /api/auth/send-verification-code` avec le téléphone
4. **En attendant l'API SMS** (`SMS_ENABLED=false`), le code est loggé dans les logs Laravel (`storage/logs/laravel.log`) pour les tests
5. **Vérification** → `POST /api/auth/verify-account` avec le code (récupéré depuis les logs en développement)
6. **Connexion** → `POST /api/auth/login-direct`

### Scénario 3 : Code expiré ou non reçu

1. **Demander un nouveau code** → `POST /api/auth/send-verification-code`
2. **Vérifier avec le nouveau code** → `POST /api/auth/verify-account`

## 🛠️ Services

### VerificationService

**Méthodes principales :**

- `generateVerificationCode()` : Génère un code à 8 chiffres
- `sendVerificationCodeByEmail($user, $code)` : Envoie le code par email
- `sendVerificationCodeBySms($user, $code)` : Envoie le code par SMS (nécessite `SMS_ENABLED=true`)
- `sendVerificationCode($user)` : Envoie le code sur **tous les canaux disponibles** (email + SMS si les deux sont fournis)
- `verifyCode($user, $code, $method)` : Vérifie le code et marque le compte comme vérifié
- `isVerified($user)` : Vérifie si un compte est vérifié

**Stockage des codes :**
- Les codes sont stockés dans la table `verification_codes`
- Contrainte unique : `utilisateur_id + method`
- **Un code unique** est stocké pour chaque canal (email et SMS) mais le **code texte est identique** pour faciliter l'expérience utilisateur
- Expiration : configurable via `VERIFICATION_CODE_TTL` (15 minutes par défaut)
- Usage unique : la ligne est supprimée après vérification ou quand elle expire

## 📧 Email de vérification

Le service envoie un email simple avec le code. Le format est :

```
Votre code de vérification est : 12345678

Ce code est valide pendant 15 minutes.
```

**Note :** Vous pouvez personnaliser cet email en créant une classe Mailable dédiée.

## 📱 SMS

La méthode `sendVerificationCodeBySms()` est prête mais nécessite l'activation via `SMS_ENABLED=true` dans `.env`.

**Configuration SMS :**
1. Ajouter `SMS_ENABLED=true` dans `.env`
2. Implémenter l'envoi réel dans `VerificationService::sendVerificationCodeBySms()` (actuellement loggé)
3. Le code sera automatiquement envoyé sur tous les canaux disponibles lors de l'inscription

**Comportement actuel :**
- Si `SMS_ENABLED=false` : Le code SMS est généré et loggé mais non envoyé (utile pour les tests)
- Si `SMS_ENABLED=true` : Le code SMS sera envoyé (une fois l'API SMS implémentée)

## 🔒 Sécurité

- Les codes sont hashés (SHA-256) avant stockage
- Comparaison avec `hash_equals()` pour éviter les attaques par timing
- Expiration automatique après 15 minutes
- Usage unique : chaque code ne peut être utilisé qu'une fois
- Validation stricte : le code doit être exactement 8 chiffres

## 🧪 Tests

### Test manuel

1. **Créer un compte :**
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
    "role": "candidat"
  }'
```

2. **Vérifier le compte :**
```bash
curl -X POST http://localhost:8000/api/auth/verify-account \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "code": "12345678"
  }'
```

3. **Tenter de se connecter :**
```bash
curl -X POST http://localhost:8000/api/auth/login-direct \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "password": "Password123!",
    "captcha_id": "...",
    "captcha_code": "..."
  }'
```

## 📝 Notes importantes

1. **Migration obligatoire** : Exécutez `php artisan migrate` pour ajouter le champ `verified_at`
2. **Cache configuré** : Assurez-vous que le cache Laravel fonctionne
3. **Email configuré** : Vérifiez la configuration SMTP dans `.env` pour l'envoi d'emails
4. **SMS en attente** : L'envoi par SMS sera activé quand l'API SMS sera disponible
5. **Logs en développement** : En développement, les codes SMS sont loggés pour faciliter les tests

## 🐛 Dépannage

### Le code n'arrive pas par email
- Vérifier la configuration SMTP dans `.env`
- Vérifier les logs Laravel : `storage/logs/laravel.log`
- Vérifier que l'email n'est pas dans les spams

### Le code n'arrive pas par SMS
- Vérifiez que `SMS_ENABLED=true` dans `.env`
- Vérifiez les logs Laravel pour voir si un code a été généré
- Assurez-vous d'avoir configuré votre fournisseur SMS (TODO)
- Si `SMS_ENABLED=false`, seul l'email est réellement envoyé (le SMS est loggé pour référence)

### Erreur "Code invalide ou expiré"
- Le code expire après 15 minutes
- Chaque code ne peut être utilisé qu'une fois
- Demander un nouveau code avec `/api/auth/send-verification-code`

### Erreur "Compte déjà vérifié"
- Le compte a déjà été vérifié
- L'utilisateur peut directement se connecter

### Erreur 403 lors de la connexion
- Le compte n'est pas encore vérifié
- L'utilisateur doit d'abord vérifier son compte avec `/api/auth/verify-account`

