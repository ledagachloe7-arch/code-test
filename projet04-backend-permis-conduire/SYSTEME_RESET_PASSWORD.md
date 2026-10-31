# 🔐 Système de Réinitialisation de Mot de Passe

## 📋 Vue d'ensemble

Le système de réinitialisation de mot de passe permet aux utilisateurs de réinitialiser leur mot de passe en cas d'oubli. Il fonctionne avec un système de codes à 6 chiffres envoyés par email et synchronise les changements entre Authentik et la base de données locale.

## 🏗️ Architecture

### Composants principaux :
- **Migration** : `password_resets` table
- **Modèle** : `PasswordReset` avec méthodes utilitaires
- **Requêtes** : `ForgotPasswordRequest` et `ResetPasswordRequest`
- **Service** : Méthodes dans `AuthentikService`
- **Contrôleur** : Endpoints dans `AuthController`
- **Mail** : `PasswordResetMail` avec template HTML

## 🔄 Flux de fonctionnement

### 1. Demande de réinitialisation
```
POST /api/auth/forgot-password
{
    "email": "user@example.com"
}
```

**Processus :**
1. Validation de l'email (doit exister dans `utilisateurs`)
2. Vérification de l'existence dans Authentik
3. Création d'un code de 6 chiffres (expire dans 15 minutes)
4. Envoi d'un email avec le code
5. Suppression des anciens codes pour cet email

### 2. Réinitialisation du mot de passe
```
POST /api/auth/reset-password
{
    "email": "user@example.com",
    "code": "123456",
    "password": "NewPassword123!",
    "password_confirmation": "NewPassword123!"
}
```

**Processus :**
1. Validation des données (email, code, mot de passe)
2. Vérification de la validité du code
3. Réinitialisation dans Authentik ET base de données locale
4. Marquage du code comme utilisé
5. Retour du résultat avec URL de connexion

## 📊 Base de données

### Table `password_resets`
```sql
CREATE TABLE password_resets (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_email_code_used (email, code, used),
    INDEX idx_email_expires (email, expires_at)
);
```

## 🔧 Configuration

### Variables d'environnement
```env
FRONTEND_URL=http://localhost:3000
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
```

### Configuration mail
Le système utilise Laravel Mail avec un template HTML personnalisé :
- Template : `resources/views/emails/password-reset.blade.php`
- Classe : `App\Mail\PasswordResetMail`

## 📡 Endpoints API

### 1. Demande de réinitialisation
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
    "email": "user@example.com"
}
```

**Réponses :**
- `200` : Code envoyé avec succès
- `422` : Email invalide ou inexistant
- `500` : Erreur serveur

### 2. Réinitialisation
```http
POST /api/auth/reset-password
Content-Type: application/json

{
    "email": "user@example.com",
    "code": "123456",
    "password": "NewPassword123!",
    "password_confirmation": "NewPassword123!"
}
```

**Réponses :**
- `200` : Mot de passe réinitialisé avec succès
- `422` : Code invalide ou données incorrectes
- `500` : Erreur serveur

## 🔒 Sécurité

### Validations
- **Email** : Format valide et existence dans la base
- **Code** : 6 chiffres exactement
- **Mot de passe** : Minimum 8 caractères avec majuscule, minuscule, chiffre et caractère spécial
- **Confirmation** : Doit correspondre au mot de passe

### Sécurité des codes
- **Expiration** : 15 minutes maximum
- **Usage unique** : Un code ne peut être utilisé qu'une fois
- **Nettoyage automatique** : Les codes expirés sont supprimés
- **Limitation** : Un seul code actif par email

## 📧 Template d'email

Le template HTML inclut :
- Design responsive et moderne
- Code de réinitialisation mis en évidence
- Instructions claires
- Bouton de redirection vers la page de réinitialisation
- Avertissements de sécurité
- Expiration du code

## 🧪 Tests

### Tests unitaires
- Création et validation des codes
- Vérification de l'expiration
- Marquage comme utilisé
- Nettoyage des codes expirés

### Tests d'intégration
- Synchronisation Authentik/Local
- Envoi d'emails
- Validation des endpoints
- Gestion des erreurs

## 🚀 Utilisation côté frontend

### 1. Page "Mot de passe oublié"
```javascript
const requestReset = async (email) => {
    const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (data.success) {
        // Rediriger vers la page de réinitialisation
        window.location.href = data.reset_url;
    } else {
        // Afficher l'erreur
        console.error(data.message);
    }
};
```

### 2. Page de réinitialisation
```javascript
const resetPassword = async (email, code, password, passwordConfirmation) => {
    const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            code,
            password,
            password_confirmation: passwordConfirmation
        })
    });
    
    const data = await response.json();
    
    if (data.success) {
        // Rediriger vers la page de connexion
        window.location.href = data.login_url;
    } else {
        // Afficher l'erreur
        console.error(data.message);
    }
};
```

## 🔧 Maintenance

### Nettoyage automatique
```php
// Dans une tâche cron ou commande artisan
PasswordReset::cleanupExpired();
```

### Monitoring
- Logs détaillés pour chaque étape
- Suivi des tentatives de réinitialisation
- Alertes en cas d'échec d'envoi d'email

## 📝 Exemples d'utilisation

### Exemple complet
```bash
# 1. Demande de réinitialisation
curl -X POST http://localhost:8000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@autoecole-system.com"}'

# 2. Réinitialisation avec le code reçu
curl -X POST http://localhost:8000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin@autoecole-system.com",
    "code":"123456",
    "password":"NewPassword123!",
    "password_confirmation":"NewPassword123!"
  }'
```

## ✅ Statut d'implémentation

- ✅ Migration de base de données
- ✅ Modèle PasswordReset avec méthodes utilitaires
- ✅ Requêtes de validation
- ✅ Méthodes dans AuthentikService
- ✅ Routes API
- ✅ Contrôleurs avec documentation Swagger
- ✅ Système de mail avec template HTML
- ✅ Tests complets
- ✅ Documentation complète

Le système est **entièrement fonctionnel** et prêt pour la production ! 🚀
