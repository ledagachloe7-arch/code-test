# 🔒 Sécurité de l'API Auto-École

## ✅ Système de Sécurité Implémenté !

---

## 🎯 Principe de Sécurité

**Simple et Efficace** :
- ✅ **Routes publiques** (GET) : Pas d'authentification requise
- ✅ **Routes protégées** (POST, PUT, DELETE) : Token obligatoire
- ❌ **Pas de restriction par rôle** : La logique métier gère les autorisations

---

## 🔐 Middlewares Créés

### 1. `AuthentikTokenMiddleware` (auth.token)

**Rôle** : Vérifier que l'utilisateur est authentifié

**Ce qu'il fait** :
1. ✅ Vérifie la présence du token
2. ✅ Décode le token
3. ✅ Vérifie l'expiration
4. ✅ Récupère l'utilisateur
5. ✅ Attache l'utilisateur à la requête

**Réponses** :
- **401** si token manquant
- **401** si token invalide
- **401** si token expiré
- **200** si tout est OK

---

## 📋 Routes Publiques (Sans Authentification)

### Lecture Seule (GET)

Tout le monde peut **consulter** :

```http
GET /api/candidats
GET /api/candidats/{id}
GET /api/auto-ecoles
GET /api/auto-ecoles/{id}
GET /api/auto-ecoles/{id}/formations
GET /api/formations
GET /api/formations/{id}
GET /api/formations/{id}/documents-requis
GET /api/dossiers
GET /api/dossiers/{id}
GET /api/documents
GET /api/documents/{id}
GET /api/referentiels
GET /api/referentiels/{id}
GET /api/health
```

**📝 Pourquoi public ?**
- Permet aux visiteurs de voir les auto-écoles
- Permet de voir les formations disponibles
- Facilite la découverte du système

---

## 🔒 Routes Protégées (Authentification Requise)

### Toutes les Opérations d'Écriture (POST, PUT, DELETE)

**Token obligatoire** pour :

#### Flux Candidat
```http
POST /api/candidats/complete-profile
POST /api/candidats/inscription-formation
GET  /api/candidats/mes-dossiers
POST /api/dossiers/{id}/upload-document
```

#### Flux Auto-École
```http
GET  /api/auto-ecoles/mes-dossiers
POST /api/dossiers/{id}/valider
POST /api/documents/{id}/valider
```

#### CRUD Complet
```http
POST   /api/candidats
PUT    /api/candidats/{id}
DELETE /api/candidats/{id}

POST   /api/auto-ecoles
PUT    /api/auto-ecoles/{id}
DELETE /api/auto-ecoles/{id}

POST   /api/formations
PUT    /api/formations/{id}
DELETE /api/formations/{id}

POST   /api/dossiers
PUT    /api/dossiers/{id}
DELETE /api/dossiers/{id}

POST   /api/documents
PUT    /api/documents/{id}
DELETE /api/documents/{id}

POST   /api/referentiels
PUT    /api/referentiels/{id}
DELETE /api/referentiels/{id}
```

---

## 🛡️ Comment Ça Marche

### Exemple : Upload de Document

```javascript
// ❌ SANS TOKEN - REFUSÉ
fetch('/api/dossiers/uuid/upload-document', {
  method: 'POST',
  body: formData
});

// Réponse: 401 Unauthorized
{
  "success": false,
  "message": "Token d'authentification manquant."
}

// ✅ AVEC TOKEN - AUTORISÉ
fetch('/api/dossiers/uuid/upload-document', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJ1c2VyX2lkIjoy...'
  },
  body: formData
});

// Réponse: 201 Created
{
  "success": true,
  "message": "Document uploadé avec succès !"
}
```

---

## 🔑 Gestion de l'Utilisateur Authentifié

### Dans les Contrôleurs

Vous pouvez récupérer l'utilisateur authentifié avec :

```php
use App\Http\Helpers\AuthHelper;

public function maMethode(Request $request)
{
    // Récupérer l'utilisateur authentifié
    $user = AuthHelper::getAuthenticatedUser($request);
    
    // Ou directement depuis les attributs
    $user = $request->attributes->get('authenticated_user');
    
    // Accéder aux infos
    $userId = $user->id;
    $userEmail = $user->email;
    $userRole = $user->role;
    $personne = $user->personne;
}
```

### Helper Methods Disponibles

```php
use App\Http\Helpers\AuthHelper;

// Récupérer l'utilisateur
$user = AuthHelper::getAuthenticatedUser($request);

// Récupérer le payload du token
$payload = AuthHelper::getTokenPayload($request);

// Vérifier le rôle (optionnel)
if (AuthHelper::isCandidat($request)) {
    // Logic pour candidat
}

if (AuthHelper::isResponsable($request)) {
    // Logic pour responsable
}

if (AuthHelper::isAdmin($request)) {
    // Logic pour admin
}
```

---

## 🔍 Logique Métier de Sécurité

### Dans les Contrôleurs (Déjà Implémenté)

Au lieu de bloquer par middleware, vous gérez la sécurité dans les méthodes :

#### Exemple 1 : Upload Document

```php
public function uploadDocument(Request $request, string $id)
{
    $dossier = Dossier::with('candidat.personne')->findOrFail($id);
    $user = $request->attributes->get('authenticated_user');
    
    // Vérifier que le dossier appartient au candidat
    if ($dossier->candidat_id !== $user->personne->candidat->id) {
        return response()->json([
            'success' => false,
            'message' => 'Ce dossier ne vous appartient pas.'
        ], 403);
    }
    
    // Upload le document
}
```

#### Exemple 2 : Valider Dossier

```php
public function valider(Request $request, string $id)
{
    $dossier = Dossier::findOrFail($id);
    $user = $request->attributes->get('authenticated_user');
    
    // Vérifier que l'utilisateur est responsable de l'auto-école
    $autoEcole = AutoEcole::where('responsable_id', $user->personne->id)
        ->where('id', $dossier->auto_ecole_id)
        ->first();
    
    if (!$autoEcole && $user->role !== 'admin') {
        return response()->json([
            'success' => false,
            'message' => 'Vous n\'êtes pas autorisé.'
        ], 403);
    }
    
    // Valider le dossier
}
```

---

## 📊 Matrice de Sécurité

| Action | Authentification | Vérification Métier |
|--------|------------------|---------------------|
| GET (lister) | ❌ Publique | - |
| GET (détails) | ❌ Publique | - |
| POST (créer) | ✅ Token requis | ✅ Dans le contrôleur |
| PUT (modifier) | ✅ Token requis | ✅ Dans le contrôleur |
| DELETE (supprimer) | ✅ Token requis | ✅ Dans le contrôleur |
| Upload document | ✅ Token requis | ✅ Vérifie propriété |
| Valider dossier | ✅ Token requis | ✅ Vérifie responsable |

---

## 🎯 Avantages de Cette Approche

### ✅ Flexibilité

- Tout utilisateur authentifié peut utiliser l'API
- La logique métier décide des autorisations spécifiques
- Pas de blocage strict par rôle au niveau des routes

### ✅ Sécurité par Propriété

- **Candidat** : Ne peut modifier que SES dossiers
- **Responsable** : Ne peut valider que les dossiers de SON auto-école
- **Admin** : Accès complet (vérifié dans le contrôleur)

### ✅ Simplicité

- Un seul middleware d'authentification
- Logique claire dans les contrôleurs
- Facile à maintenir et déboguer

---

## 🧪 Test de Sécurité

### Test 1 : Requête Sans Token

```bash
curl -X POST http://localhost:8000/api/candidats/complete-profile \
  -H "Content-Type: application/json" \
  -d '{"date_naissance": "1995-05-15"}'
```

**Résultat attendu** : `401 Unauthorized`
```json
{
  "success": false,
  "message": "Token d'authentification manquant. Veuillez vous connecter."
}
```

---

### Test 2 : Requête Avec Token Valide

```bash
curl -X POST http://localhost:8000/api/candidats/complete-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ1c2VyX2lkIjoy..." \
  -d '{"date_naissance": "1995-05-15", ...}'
```

**Résultat attendu** : `201 Created`
```json
{
  "success": true,
  "message": "Profil candidat complété avec succès !",
  "data": {...}
}
```

---

### Test 3 : Requête Publique

```bash
curl -X GET http://localhost:8000/api/auto-ecoles
```

**Résultat attendu** : `200 OK`
```json
{
  "data": [...]
}
```

---

## 📝 Résumé de Configuration

### Fichiers Modifiés

1. **`bootstrap/app.php`**
   - Enregistrement du middleware `auth.token`

2. **`app/Http/Middleware/AuthentikTokenMiddleware.php`**
   - Vérifie le token
   - Attache l'utilisateur à la requête

3. **`routes/api.php`**
   - Routes publiques (GET)
   - Routes protégées (POST, PUT, DELETE) avec `auth.token`

4. **Contrôleurs**
   - Logique métier de sécurité déjà implémentée
   - Vérification de propriété des ressources

---

## 🎯 Structure Finale

```
Routes API
├── Publiques (GET)
│   ├── /api/candidats
│   ├── /api/auto-ecoles
│   ├── /api/formations
│   └── ...
│
└── Protégées (POST/PUT/DELETE)
    ├── Middleware: auth.token
    │   └── Vérifie le token
    │
    └── Contrôleur
        └── Logique métier
            ├── Vérifie propriété
            ├── Vérifie rôle si nécessaire
            └── Exécute l'action
```

---

## ✅ Ce Qui Est Sécurisé

1. ✅ **Toutes les opérations d'écriture** requièrent un token
2. ✅ **Token vérifié** (validité + expiration)
3. ✅ **Utilisateur identifié** pour chaque requête
4. ✅ **Propriété des ressources** vérifiée dans les contrôleurs
5. ✅ **Logs complets** de toutes les actions
6. ✅ **Messages d'erreur clairs** en français

---

## 📚 Documentation

- **Routes sécurisées** : Voir `routes/api.php`
- **Middleware** : `app/Http/Middleware/AuthentikTokenMiddleware.php`
- **Helper** : `app/Http/Helpers/AuthHelper.php`

---

**🔒 Votre API est maintenant sécurisée avec authentification token sur toutes les opérations sensibles ! 🎯**


