# 🌐 Configuration Swagger avec Serveur de Production

## ✅ Serveurs Configurés dans Swagger

Votre documentation Swagger est maintenant configurée avec **deux serveurs** :

### 🏠 **Serveur de Développement**
- **URL** : `http://localhost:8000`
- **Description** : Serveur de développement local
- **Usage** : Pour les tests en local

### 🚀 **Serveur de Production**
- **URL** : `https://9c8r7bbvybn.preview.infomaniak.website`
- **Description** : Serveur de production Infomaniak
- **Usage** : Pour les tests en production

---

## 🔄 Comment Basculer entre les Serveurs

### Dans Swagger UI

1. **Ouvrez Swagger** : `http://localhost:8000/api/documentation`
2. **En haut de la page**, vous verrez un **menu déroulant "Servers"**
3. **Sélectionnez le serveur** que vous voulez utiliser :
   - `http://localhost:8000` (développement)
   - `https://9c8r7bbvybn.preview.infomaniak.website` (production)

### Exemple d'Utilisation

#### Test en Développement
```
Serveur sélectionné : http://localhost:8000
Route testée : POST /api/auth/login-direct
URL complète : http://localhost:8000/api/auth/login-direct
```

#### Test en Production
```
Serveur sélectionné : https://9c8r7bbvybn.preview.infomaniak.website
Route testée : POST /api/auth/login-direct
URL complète : https://9c8r7bbvybn.preview.infomaniak.website/api/auth/login-direct
```

---

## 🔐 Authentification sur les Deux Serveurs

### 1. **Obtenir un Token**

#### En Développement
```http
POST http://localhost:8000/api/auth/login-direct
{
  "email": "candidat@test.com",
  "password": "Password123!"
}
```

#### En Production
```http
POST https://9c8r7bbvybn.preview.infomaniak.website/api/auth/login-direct
{
  "email": "candidat@test.com",
  "password": "Password123!"
}
```

### 2. **Utiliser le Token**

Une fois le token obtenu, utilisez-le avec le préfixe "Bearer " :

```
Authorization: Bearer eyJ1c2VyX2lkIjoyOCwiZW1haWwiOiJjYW5kaWRhdEB0ZXN0LmNvbSIsInJvbGUiOiJjYW5kaWRhdCIsImlhdCI6MTczNzc0OTI0MCwiZXhwIjoxNzM3NzUyODQwfQ.eyJzaWduYXR1cmUiOiJhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTAifQ
```

---

## 📋 URLs Complètes pour Production

### Routes d'Authentification
- **Connexion** : `https://9c8r7bbvybn.preview.infomaniak.website/api/auth/login-direct`
- **Inscription** : `https://9c8r7bbvybn.preview.infomaniak.website/api/auth/register`
- **Déconnexion** : `https://9c8r7bbvybn.preview.infomaniak.website/api/auth/logout`

### Routes Publiques
- **Auto-écoles** : `https://9c8r7bbvybn.preview.infomaniak.website/api/auto-ecoles`
- **Formations** : `https://9c8r7bbvybn.preview.infomaniak.website/api/formations`
- **Candidats** : `https://9c8r7bbvybn.preview.infomaniak.website/api/candidats`
- **Santé API** : `https://9c8r7bbvybn.preview.infomaniak.website/api/health`

### Routes Protégées (nécessitent un token)
- **Compléter profil** : `https://9c8r7bbvybn.preview.infomaniak.website/api/candidats/complete-profile`
- **Mes dossiers** : `https://9c8r7bbvybn.preview.infomaniak.website/api/candidats/mes-dossiers`
- **Upload document** : `https://9c8r7bbvybn.preview.infomaniak.website/api/dossiers/{id}/upload-document`

---

## 🧪 Test de Production

### Script de Test pour Production

```powershell
# Test de production
$baseUrl = "https://9c8r7bbvybn.preview.infomaniak.website"

# Test route publique
Write-Host "Test route publique en production..." -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod "$baseUrl/api/health"
    Write-Host "SUCCESS: API production accessible" -ForegroundColor Green
    Write-Host "Response: $($r.message)" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test connexion
Write-Host "Test connexion en production..." -ForegroundColor Yellow
try {
    $body = @{
        email = "candidat@test.com"
        password = "Password123!"
    } | ConvertTo-Json
    
    $r = Invoke-RestMethod "$baseUrl/api/auth/login-direct" -Method Post -Body $body -ContentType "application/json"
    
    if ($r.success -and $r.access_token) {
        Write-Host "SUCCESS: Connexion production réussie" -ForegroundColor Green
        Write-Host "Token: $($r.access_token.Substring(0,50))..." -ForegroundColor Cyan
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
```

---

## 🔧 Configuration Technique

### Fichier Modifié

**`app/Http/Controllers/Api/AuthController.php`** :

```php
/**
 * @OA\Server(
 *     url="http://localhost:8000",
 *     description="Serveur de développement local"
 * )
 * 
 * @OA\Server(
 *     url="https://9c8r7bbvybn.preview.infomaniak.website",
 *     description="Serveur de production Infomaniak"
 * )
 */
```

### Documentation Swagger

- **Développement** : `http://localhost:8000/api/documentation`
- **Production** : `https://9c8r7bbvybn.preview.infomaniak.website/api/documentation`

---

## 🎯 Avantages de cette Configuration

### ✅ **Flexibilité**
- Testez facilement en local ET en production
- Basculez entre les environnements sans changer le code

### ✅ **Documentation Complète**
- Swagger affiche les deux serveurs
- Les utilisateurs peuvent choisir leur environnement

### ✅ **Développement Facilité**
- Tests locaux rapides
- Validation en production avant déploiement

### ✅ **Sécurité Maintenue**
- Même système d'authentification sur les deux serveurs
- Tokens valides sur les deux environnements

---

## 📚 Résumé

✅ **Serveur de développement** : `http://localhost:8000`  
✅ **Serveur de production** : `https://9c8r7bbvybn.preview.infomaniak.website`  
✅ **Swagger mis à jour** avec les deux serveurs  
✅ **Authentification** fonctionnelle sur les deux environnements  
✅ **Documentation** accessible sur les deux URLs  

**🌐 Votre API est maintenant configurée pour le développement ET la production ! 🚀**
