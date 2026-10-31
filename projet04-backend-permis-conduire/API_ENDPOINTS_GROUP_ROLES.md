# 📋 Endpoints pour la Récupération des Rôles d'un Groupe Authentik

## 🎯 Objectif

Ce document décrit les nouveaux endpoints créés pour récupérer les rôles attachés à un groupe spécifique dans Authentik (par exemple, le groupe "DGTT").

## 🆕 Nouveaux Endpoints

### 1. Récupérer les rôles d'un groupe

**URL:** `GET /api/auth/group/{groupName}/roles`

**Description:** Récupère tous les rôles attachés à un groupe Authentik spécifique.

**Paramètres:**
- `{groupName}` (requis) : Le nom du groupe (ex: "DGTT")

**Réponse de succès (200):**
```json
{
    "success": true,
    "group_name": "DGTT",
    "roles": [
        "Role1",
        "Role2",
        "Role3"
    ],
    "roles_count": 3
}
```

**Exemple de requête:**
```bash
curl -X GET "http://localhost:8000/api/auth/group/DGTT/roles" \
  -H "Content-Type: application/json"
```

### 2. Récupérer les détails complets d'un groupe

**URL:** `GET /api/auth/group/{groupName}/details`

**Description:** Récupère toutes les informations d'un groupe : utilisateurs, rôles, attributs.

**Paramètres:**
- `{groupName}` (requis) : Le nom du groupe (ex: "DGTT")

**Réponse de succès (200):**
```json
{
    "success": true,
    "data": {
        "group": {
            "id": 1,
            "name": "DGTT",
            "attributes": {}
        },
        "users": [
            {
                "id": 1,
                "email": "user@example.com",
                "username": "user",
                "name": "John Doe"
            }
        ],
        "users_count": 1,
        "roles": [
            "admin",
            "directeur"
        ],
        "roles_count": 2
    }
}
```

**Exemple de requête:**
```bash
curl -X GET "http://localhost:8000/api/auth/group/DGTT/details" \
  -H "Content-Type: application/json"
```

## 📝 Méthodes du Service AuthentikService

### 1. `getGroupRoles(string $groupName): array`

Récupère les rôles attachés à un groupe.

**Paramètres:**
- `$groupName` : Le nom du groupe

**Retourne:** Un tableau des rôles

### 2. `getGroupDetails(string $groupName): ?array`

Récupère toutes les informations d'un groupe (utilisateurs, rôles, attributs).

**Paramètres:**
- `$groupName` : Le nom du groupe

**Retourne:** Un tableau contenant les détails du groupe ou `null` si le groupe n'existe pas

## 🔧 Implémentation

### Fichiers modifiés

1. **`app/Services/AuthentikService.php`**
   - Ajout de `getGroupRoles()` : ligne 1275-1333
   - Ajout de `getGroupDetails()` : ligne 1341-1414

2. **`app/Http/Controllers/Api/AuthController.php`**
   - Ajout de `getGroupRoles()` : ligne 1265-1308
   - Ajout de `getGroupDetails()` : ligne 1310-1359

3. **`routes/api.php`**
   - Ajout des routes :
     - `Route::get('/auth/group/{groupName}/roles', ...)` : ligne 69-70
     - `Route::get('/auth/group/{groupName}/details', ...)` : ligne 72-73

## 🚀 Utilisation

### Exemple 1 : Récupérer les rôles du groupe DGTT

```bash
curl -X GET "http://localhost:8000/api/auth/group/DGTT/roles"
```

### Exemple 2 : Récupérer tous les détails du groupe DGTT

```bash
curl -X GET "http://localhost:8000/api/auth/group/DGTT/details"
```

### Exemple avec JavaScript/Fetch

```javascript
// Récupérer les rôles d'un groupe
fetch('http://localhost:8000/api/auth/group/DGTT/roles')
  .then(response => response.json())
  .then(data => {
    console.log('Rôles:', data.roles);
    console.log('Nombre de rôles:', data.roles_count);
  });

// Récupérer les détails d'un groupe
fetch('http://localhost:8000/api/auth/group/DGTT/details')
  .then(response => response.json())
  .then(data => {
    console.log('Groupe:', data.data.group);
    console.log('Utilisateurs:', data.data.users);
    console.log('Nombre d\'utilisateurs:', data.data.users_count);
    console.log('Rôles:', data.data.roles);
  });
```

## ⚠️ Notes importantes

1. Ces endpoints sont **publiques** (non protégés par authentification) pour permettre l'accès aux informations des groupes
2. Les rôles sont récupérés depuis les **attributs** du groupe Authentik
3. Si aucun rôle n'est trouvé dans les attributs, le système essaie de récupérer les permissions du groupe
4. Les erreurs sont loggées dans les fichiers de log Laravel

## 🐛 Gestion des erreurs

**Réponses d'erreur possibles:**

- **404 Not Found** : Le groupe spécifié n'existe pas
  ```json
  {
    "success": false,
    "message": "Le groupe 'DGTT' n'a pas été trouvé."
  }
  ```

- **500 Internal Server Error** : Erreur lors de la communication avec Authentik
  ```json
  {
    "success": false,
    "message": "Erreur lors de la récupération des rôles du groupe.",
    "error": "Description détaillée de l'erreur (uniquement en mode debug)"
  }
  ```

## 📊 Structure des données renvoyées

### getGroupRoles
- `success` (bool) : Indique si la requête a réussi
- `group_name` (string) : Nom du groupe
- `roles` (array) : Liste des rôles
- `roles_count` (int) : Nombre de rôles

### getGroupDetails
- `success` (bool) : Indique si la requête a réussi
- `data` (object) : 
  - `group` : Informations du groupe (id, name, attributes)
  - `users` : Liste des utilisateurs du groupe
  - `users_count` : Nombre d'utilisateurs
  - `roles` : Liste des rôles
  - `roles_count` : Nombre de rôles
