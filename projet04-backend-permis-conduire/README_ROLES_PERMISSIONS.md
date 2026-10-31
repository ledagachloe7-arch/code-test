# 🔐 API Gestion des Rôles et Permissions

Documentation complète de l'API pour la gestion des rôles et leurs permissions dans le système Auto-École.

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Structure de la Table](#structure-de-la-table)
3. [Endpoints API](#endpoints-api)
4. [Exemples d'Utilisation](#exemples-dutilisation)
5. [Codes de Réponse](#codes-de-réponse)
6. [Gestion des Erreurs](#gestion-des-erreurs)

---

## 🎯 Vue d'Ensemble

L'API `role_has_permissions` permet de gérer les permissions associées à chaque rôle du système. Chaque rôle peut avoir un tableau de permissions stocké en JSON.

### Rôles du Système

- `ROLE_CANDIDAT` : Candidat souhaitant passer son permis
- `ROLE_RESPONSABLE_AUTO_ECOLE` : Responsable d'auto-école
- `ROLE_ADMIN` : Administrateur du système

### Permissions

Les permissions sont stockées sous forme de tableau JSON. Exemples de permissions :
- `dossier:read` : Lire les dossiers
- `dossier:write` : Créer/modifier les dossiers
- `dossier:delete` : Supprimer les dossiers
- `document:upload` : Téléverser des documents
- `document:download` : Télécharger des documents
- `formation:manage` : Gérer les formations
- `utilisateur:manage` : Gérer les utilisateurs

---

## 🗄️ Structure de la Table

### Table : `role_has_permissions`

| Colonne      | Type   | Contraintes              | Description                    |
|--------------|--------|--------------------------|--------------------------------|
| `id`         | UUID   | PRIMARY KEY              | Identifiant unique             |
| `role`       | String | UNIQUE, NOT NULL         | Nom du rôle (ex: ROLE_CANDIDAT)|
| `permission` | JSON   | NULLABLE                 | Tableau de permissions         |
| `created_at` | Timestamp |                          | Date de création               |
| `updated_at` | Timestamp |                          | Date de modification           |

### Exemple de Données

```json
{
  "id": "019c03da-ef71-70d5-ba93-6ca77b923444",
  "role": "ROLE_CANDIDAT",
  "permission": [
    "dossier:read",
    "document:upload",
    "document:download"
  ],
  "created_at": "2026-01-28T10:00:00.000000Z",
  "updated_at": "2026-01-28T10:00:00.000000Z"
}
```

---

## 🔗 Endpoints API

Toutes les routes nécessitent une authentification via le token Bearer.

**Base URL :** `/api/role-has-permissions`

| Méthode | Endpoint                                    | Description                    |
|---------|---------------------------------------------|--------------------------------|
| GET     | `/api/role-has-permissions`                 | Liste tous les rôles           |
| GET     | `/api/role-has-permissions/{id}`            | Détails d'un rôle (par UUID)   |
| GET     | `/api/role-has-permissions/by-role/{role}`  | Rechercher un rôle par nom     |
| POST    | `/api/role-has-permissions`                 | Créer un nouveau rôle          |
| PUT     | `/api/role-has-permissions/{id}`            | Modifier un rôle (complet)     |
| PATCH   | `/api/role-has-permissions/{id}`            | Modifier un rôle (partiel)     |
| DELETE  | `/api/role-has-permissions/{id}`            | Supprimer un rôle               |

---

## 📚 Exemples d'Utilisation

### 1. 📋 Lister Tous les Rôles

**Requête :**
```http
GET /api/role-has-permissions
Authorization: Bearer {access_token}
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "019c03da-ef71-70d5-ba93-6ca77b923444",
      "role": "ROLE_ADMIN",
      "permission": [
        "dossier:read",
        "dossier:write",
        "dossier:delete",
        "document:upload",
        "document:download",
        "formation:manage",
        "utilisateur:manage"
      ],
      "created_at": "2026-01-28T10:00:00.000000Z",
      "updated_at": "2026-01-28T10:00:00.000000Z"
    },
    {
      "id": "019c03da-f829-723f-92af-c792c8b9febf",
      "role": "ROLE_CANDIDAT",
      "permission": [
        "dossier:read",
        "document:upload",
        "document:download"
      ],
      "created_at": "2026-01-28T10:05:00.000000Z",
      "updated_at": "2026-01-28T10:05:00.000000Z"
    },
    {
      "id": "019c03db-0586-70d4-93a8-9ccbeaaecf1f",
      "role": "ROLE_RESPONSABLE_AUTO_ECOLE",
      "permission": [
        "dossier:read",
        "dossier:write",
        "document:upload",
        "document:download",
        "formation:manage"
      ],
      "created_at": "2026-01-28T10:10:00.000000Z",
      "updated_at": "2026-01-28T10:10:00.000000Z"
    }
  ]
}
```

**cURL :**
```bash
curl -X GET "http://localhost:8000/api/role-has-permissions" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Accept: application/json"
```

---

### 2. 🔍 Rechercher un Rôle par Nom

**Requête :**
```http
GET /api/role-has-permissions/by-role/ROLE_CANDIDAT
Authorization: Bearer {access_token}
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "data": {
    "id": "019c03da-f829-723f-92af-c792c8b9febf",
    "role": "ROLE_CANDIDAT",
    "permission": [
      "dossier:read",
      "document:upload",
      "document:download"
    ],
    "created_at": "2026-01-28T10:05:00.000000Z",
    "updated_at": "2026-01-28T10:05:00.000000Z"
  }
}
```

**Réponse si non trouvé (404 Not Found) :**
```json
{
  "success": false,
  "message": "Aucun enregistrement trouvé pour ce rôle."
}
```

**cURL :**
```bash
curl -X GET "http://localhost:8000/api/role-has-permissions/by-role/ROLE_CANDIDAT" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Accept: application/json"
```

**JavaScript (Fetch) :**
```javascript
const role = 'ROLE_CANDIDAT';
const response = await fetch(`/api/role-has-permissions/by-role/${role}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json'
  }
});

const result = await response.json();
if (result.success) {
  console.log('Rôle trouvé:', result.data);
} else {
  console.error('Rôle non trouvé:', result.message);
}
```

---

### 3. 📄 Afficher un Rôle par UUID

**Requête :**
```http
GET /api/role-has-permissions/019c03da-ef71-70d5-ba93-6ca77b923444
Authorization: Bearer {access_token}
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "data": {
    "id": "019c03da-ef71-70d5-ba93-6ca77b923444",
    "role": "ROLE_ADMIN",
    "permission": [
      "dossier:read",
      "dossier:write",
      "dossier:delete",
      "document:upload",
      "document:download",
      "formation:manage",
      "utilisateur:manage"
    ],
    "created_at": "2026-01-28T10:00:00.000000Z",
    "updated_at": "2026-01-28T10:00:00.000000Z"
  }
}
```

**cURL :**
```bash
curl -X GET "http://localhost:8000/api/role-has-permissions/019c03da-ef71-70d5-ba93-6ca77b923444" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Accept: application/json"
```

---

### 4. ➕ Créer un Nouveau Rôle

**Requête :**
```http
POST /api/role-has-permissions
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "role": "ROLE_CANDIDAT",
  "permission": [
    "dossier:read",
    "document:upload",
    "document:download"
  ]
}
```

**Réponse (201 Created) :**
```json
{
  "success": true,
  "message": "Rôle et permissions créés avec succès.",
  "data": {
    "id": "019c03da-f829-723f-92af-c792c8b9febf",
    "role": "ROLE_CANDIDAT",
    "permission": [
      "dossier:read",
      "document:upload",
      "document:download"
    ],
    "created_at": "2026-01-28T10:05:00.000000Z",
    "updated_at": "2026-01-28T10:05:00.000000Z"
  }
}
```

**cURL :**
```bash
curl -X POST "http://localhost:8000/api/role-has-permissions" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "role": "ROLE_CANDIDAT",
    "permission": [
      "dossier:read",
      "document:upload",
      "document:download"
    ]
  }'
```

**JavaScript (Fetch) :**
```javascript
const response = await fetch('/api/role-has-permissions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    role: 'ROLE_CANDIDAT',
    permission: [
      'dossier:read',
      'document:upload',
      'document:download'
    ]
  })
});

const result = await response.json();
if (result.success) {
  console.log('Rôle créé:', result.data);
} else {
  console.error('Erreur:', result.errors);
}
```

**Python (requests) :**
```python
import requests

url = "http://localhost:8000/api/role-has-permissions"
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}
data = {
    "role": "ROLE_CANDIDAT",
    "permission": [
        "dossier:read",
        "document:upload",
        "document:download"
    ]
}

response = requests.post(url, json=data, headers=headers)
result = response.json()
print(result)
```

---

### 5. ✏️ Modifier un Rôle (PUT - Complet)

**Requête :**
```http
PUT /api/role-has-permissions/019c03da-f829-723f-92af-c792c8b9febf
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "role": "ROLE_CANDIDAT",
  "permission": [
    "dossier:read",
    "dossier:write",
    "document:upload",
    "document:download"
  ]
}
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "message": "Rôle et permissions mis à jour avec succès.",
  "data": {
    "id": "019c03da-f829-723f-92af-c792c8b9febf",
    "role": "ROLE_CANDIDAT",
    "permission": [
      "dossier:read",
      "dossier:write",
      "document:upload",
      "document:download"
    ],
    "created_at": "2026-01-28T10:05:00.000000Z",
    "updated_at": "2026-01-28T10:15:00.000000Z"
  }
}
```

**cURL :**
```bash
curl -X PUT "http://localhost:8000/api/role-has-permissions/019c03da-f829-723f-92af-c792c8b9febf" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "role": "ROLE_CANDIDAT",
    "permission": [
      "dossier:read",
      "dossier:write",
      "document:upload",
      "document:download"
    ]
  }'
```

---

### 6. 🔄 Modifier un Rôle (PATCH - Partiel)

**Requête :**
```http
PATCH /api/role-has-permissions/019c03da-f829-723f-92af-c792c8b9febf
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "permission": [
    "dossier:read",
    "dossier:write",
    "document:upload"
  ]
}
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "message": "Rôle et permissions mis à jour avec succès.",
  "data": {
    "id": "019c03da-f829-723f-92af-c792c8b9febf",
    "role": "ROLE_CANDIDAT",
    "permission": [
      "dossier:read",
      "dossier:write",
      "document:upload"
    ],
    "created_at": "2026-01-28T10:05:00.000000Z",
    "updated_at": "2026-01-28T10:20:00.000000Z"
  }
}
```

**cURL :**
```bash
curl -X PATCH "http://localhost:8000/api/role-has-permissions/019c03da-f829-723f-92af-c792c8b9febf" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "permission": [
      "dossier:read",
      "dossier:write",
      "document:upload"
    ]
  }'
```

**JavaScript (Fetch) :**
```javascript
const roleId = '019c03da-f829-723f-92af-c792c8b9febf';
const response = await fetch(`/api/role-has-permissions/${roleId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    permission: [
      'dossier:read',
      'dossier:write',
      'document:upload'
    ]
  })
});

const result = await response.json();
if (result.success) {
  console.log('Rôle mis à jour:', result.data);
}
```

---

### 7. 🗑️ Supprimer un Rôle

**Requête :**
```http
DELETE /api/role-has-permissions/019c03da-f829-723f-92af-c792c8b9febf
Authorization: Bearer {access_token}
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "message": "Rôle et permissions supprimés avec succès."
}
```

**cURL :**
```bash
curl -X DELETE "http://localhost:8000/api/role-has-permissions/019c03da-f829-723f-92af-c792c8b9febf" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Accept: application/json"
```

**JavaScript (Fetch) :**
```javascript
const roleId = '019c03da-f829-723f-92af-c792c8b9febf';
const response = await fetch(`/api/role-has-permissions/${roleId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json'
  }
});

const result = await response.json();
if (result.success) {
  console.log('Rôle supprimé:', result.message);
}
```

---

## 📊 Codes de Réponse

| Code | Description                    | Cas d'Usage                          |
|------|--------------------------------|--------------------------------------|
| 200  | OK                             | Requête réussie                      |
| 201  | Created                        | Ressource créée avec succès          |
| 404  | Not Found                      | Ressource non trouvée                |
| 422  | Unprocessable Entity           | Erreur de validation                 |
| 401  | Unauthorized                   | Token manquant ou invalide            |
| 500  | Internal Server Error          | Erreur serveur                       |

---

## ⚠️ Gestion des Erreurs

### Erreur de Validation (422)

**Requête invalide :**
```http
POST /api/role-has-permissions
Content-Type: application/json

{
  "permission": ["dossier:read"]
}
```

**Réponse (422 Unprocessable Entity) :**
```json
{
  "success": false,
  "message": "Les données fournies ne sont pas valides.",
  "errors": {
    "role": [
      "Le rôle est obligatoire."
    ]
  }
}
```

### Rôle Déjà Existant (422)

**Requête avec rôle dupliqué :**
```http
POST /api/role-has-permissions
Content-Type: application/json

{
  "role": "ROLE_CANDIDAT",
  "permission": ["dossier:read"]
}
```

**Réponse (422 Unprocessable Entity) :**
```json
{
  "success": false,
  "message": "Les données fournies ne sont pas valides.",
  "errors": {
    "role": [
      "Ce rôle existe déjà."
    ]
  }
}
```

### Rôle Non Trouvé (404)

**Requête :**
```http
GET /api/role-has-permissions/by-role/ROLE_INEXISTANT
Authorization: Bearer {access_token}
```

**Réponse (404 Not Found) :**
```json
{
  "success": false,
  "message": "Aucun enregistrement trouvé pour ce rôle."
}
```

### Token Invalide (401)

**Réponse (401 Unauthorized) :**
```json
{
  "message": "Unauthenticated."
}
```

---

## 💡 Exemples de Cas d'Usage

### Cas 1 : Créer les Permissions pour Tous les Rôles

```javascript
const roles = [
  {
    role: 'ROLE_CANDIDAT',
    permission: ['dossier:read', 'document:upload', 'document:download']
  },
  {
    role: 'ROLE_RESPONSABLE_AUTO_ECOLE',
    permission: [
      'dossier:read',
      'dossier:write',
      'document:upload',
      'document:download',
      'formation:manage'
    ]
  },
  {
    role: 'ROLE_ADMIN',
    permission: [
      'dossier:read',
      'dossier:write',
      'dossier:delete',
      'document:upload',
      'document:download',
      'formation:manage',
      'utilisateur:manage'
    ]
  }
];

for (const roleData of roles) {
  const response = await fetch('/api/role-has-permissions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(roleData)
  });
  
  const result = await response.json();
  console.log(`Rôle ${roleData.role} créé:`, result.success);
}
```

### Cas 2 : Vérifier les Permissions d'un Rôle

```javascript
async function checkRolePermissions(roleName) {
  const response = await fetch(`/api/role-has-permissions/by-role/${roleName}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const result = await response.json();
  
  if (result.success) {
    return result.data.permission || [];
  }
  
  return [];
}

// Utilisation
const permissions = await checkRolePermissions('ROLE_CANDIDAT');
console.log('Permissions du candidat:', permissions);
// Output: ['dossier:read', 'document:upload', 'document:download']
```

### Cas 3 : Ajouter une Permission à un Rôle

```javascript
async function addPermissionToRole(roleId, newPermission) {
  // Récupérer le rôle actuel
  const getResponse = await fetch(`/api/role-has-permissions/${roleId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const role = await getResponse.json();
  const currentPermissions = role.data.permission || [];
  
  // Ajouter la nouvelle permission si elle n'existe pas déjà
  if (!currentPermissions.includes(newPermission)) {
    const updatedPermissions = [...currentPermissions, newPermission];
    
    // Mettre à jour
    const updateResponse = await fetch(`/api/role-has-permissions/${roleId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        permission: updatedPermissions
      })
    });
    
    return await updateResponse.json();
  }
  
  return { success: false, message: 'Permission déjà présente' };
}

// Utilisation
const result = await addPermissionToRole('019c03da-f829-723f-92af-c792c8b9febf', 'dossier:write');
console.log(result);
```

### Cas 4 : Retirer une Permission d'un Rôle

```javascript
async function removePermissionFromRole(roleId, permissionToRemove) {
  // Récupérer le rôle actuel
  const getResponse = await fetch(`/api/role-has-permissions/${roleId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const role = await getResponse.json();
  const currentPermissions = role.data.permission || [];
  
  // Retirer la permission
  const updatedPermissions = currentPermissions.filter(p => p !== permissionToRemove);
  
  // Mettre à jour
  const updateResponse = await fetch(`/api/role-has-permissions/${roleId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      permission: updatedPermissions
    })
  });
  
  return await updateResponse.json();
}

// Utilisation
const result = await removePermissionFromRole('019c03da-f829-723f-92af-c792c8b9febf', 'dossier:write');
console.log(result);
```

---

## 🔒 Sécurité

### Authentification Requise

Toutes les routes nécessitent un token d'accès valide dans le header `Authorization` :

```
Authorization: Bearer {access_token}
```

### Obtenir un Token

Pour obtenir un token d'accès, utilisez l'endpoint de connexion :

```http
POST /api/auth/login-direct
Content-Type: application/json

{
  "identifier": "votre@email.com",
  "password": "votre_mot_de_passe",
  "captcha_id": "...",
  "captcha_code": "..."
}
```

---

## 📝 Notes Importantes

1. **Unicité du Rôle** : Le champ `role` est unique. Vous ne pouvez pas créer deux enregistrements avec le même rôle.

2. **Permissions Optionnelles** : Le champ `permission` est nullable. Vous pouvez créer un rôle sans permissions et les ajouter plus tard.

3. **Format JSON** : Le champ `permission` doit être un tableau JSON valide. Exemple :
   ```json
   ["dossier:read", "document:upload"]
   ```

4. **Recherche par Rôle** : La route `/by-role/{role}` est sensible à la casse. Assurez-vous d'utiliser exactement le même format que celui stocké en base (ex: `ROLE_CANDIDAT`).

5. **UUID** : Les identifiants sont des UUID v4. Exemple : `019c03da-ef71-70d5-ba93-6ca77b923444`

---

## 🧪 Tests avec Postman

### Collection Postman

1. **Variables d'Environnement** :
   - `base_url` : `http://localhost:8000`
   - `access_token` : Votre token d'accès

2. **Headers Communs** :
   - `Authorization` : `Bearer {{access_token}}`
   - `Content-Type` : `application/json`
   - `Accept` : `application/json`

3. **Exemples de Requêtes** :

   **GET Liste**
   ```
   GET {{base_url}}/api/role-has-permissions
   ```

   **GET Par Rôle**
   ```
   GET {{base_url}}/api/role-has-permissions/by-role/ROLE_CANDIDAT
   ```

   **POST Créer**
   ```
   POST {{base_url}}/api/role-has-permissions
   Body (raw JSON):
   {
     "role": "ROLE_CANDIDAT",
     "permission": ["dossier:read", "document:upload"]
   }
   ```

   **PATCH Modifier**
   ```
   PATCH {{base_url}}/api/role-has-permissions/{{role_id}}
   Body (raw JSON):
   {
     "permission": ["dossier:read", "dossier:write"]
   }
   ```

   **DELETE Supprimer**
   ```
   DELETE {{base_url}}/api/role-has-permissions/{{role_id}}
   ```

---

## 📞 Support

Pour toute question ou problème concernant l'API des rôles et permissions, consultez :
- Les logs Laravel : `storage/logs/laravel.log`
- La documentation de l'API complète : `README.md`

---

**Dernière mise à jour :** 2026-02-18  
**Version API :** 1.0.0
