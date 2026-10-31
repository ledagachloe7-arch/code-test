# 🏫 Parcours Auto-École - Guide Complet

Ce guide explique comment créer une auto-école et son administrateur avec le rôle `ROLE_AUTO_ECOLE`, ainsi que la gestion des candidats inscrits.

## 📋 Table des matières

1. [Vue d'ensemble du système](#vue-densemble-du-système)
2. [Création d'un administrateur auto-école](#création-dun-administrateur-auto-école)
3. [Création d'une auto-école](#création-dune-auto-école)
4. [Endpoints pour lister les candidats](#endpoints-pour-lister-les-candidats)
5. [Exemples JSON complets](#exemples-json-complets)
6. [Flux complet](#flux-complet)

## 🎯 Vue d'ensemble du système

Le système de gestion des auto-écoles fonctionne avec les entités suivantes :

- **Utilisateur** : Compte d'authentification avec rôle (`ROLE_AUTO_ECOLE`)
- **Personne** : Informations personnelles de l'utilisateur
- **AutoEcole** : Établissement de formation au permis de conduire
- **Candidat** : Personne inscrite dans une auto-école
- **Dossier** : Dossier de candidature liant un candidat à une auto-école

## 👤 Création d'un administrateur auto-école

### Étape 1 : Inscription de l'utilisateur responsable

**Endpoint :** `POST /api/auth/register`

**Description :** Crée un utilisateur avec le rôle `ROLE_AUTO_ECOLE` dans Authentik et la base locale.

### JSON de création d'un responsable auto-école :

```json
{
  "email": "responsable@autoecole-excellence.com",
  "password": "MotDePasseSecurise123!",
  "password_confirmation": "MotDePasseSecurise123!",
  "nom": "Dupont",
  "prenom": "Jean",
  "contact": "0612345678",
  "adresse": "123 Avenue des Champs-Élysées, 75008 Paris",
  "role": "ROLE_AUTO_ECOLE"
}
```

### Réponse attendue :

```json
{
  "success": true,
  "message": "Inscription réussie. Redirigez l'utilisateur vers Authentik pour se connecter.",
  "auth_url": "https://authentik.example.com/application/o/authorize/?client_id=...",
  "user": {
    "id": "019a0e34-d153-7330-8cb6-80b14fd8811c",
    "email": "responsable@autoecole-excellence.com",
    "role": "ROLE_AUTO_ECOLE",
    "created_at": "2025-01-27T10:30:00.000000Z"
  }
}
```

## 🏫 Création d'une auto-école

### Étape 2 : Création de l'auto-école

**Endpoint :** `POST /api/auto-ecoles`

**Description :** Crée une nouvelle auto-école associée au responsable.

**Prérequis :** L'utilisateur doit être authentifié avec le rôle `ROLE_AUTO_ECOLE`.

### JSON de création d'une auto-école :

```json
{
  "nom_auto_ecole": "Auto-École Excellence",
  "adresse": "123 Avenue des Champs-Élysées, 75008 Paris",
  "email": "contact@autoecole-excellence.com",
  "responsable_id": "019a0e34-d153-7330-8cb6-80b14fd8811c",
  "contact": "0612345678",
  "statut": true
}
```

### Réponse attendue :

```json
{
  "success": true,
  "message": "Auto-école créée avec succès.",
  "data": {
    "id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
    "nom_auto_ecole": "Auto-École Excellence",
    "adresse": "123 Avenue des Champs-Élysées, 75008 Paris",
    "email": "contact@autoecole-excellence.com",
    "contact": "0612345678",
    "statut": true,
    "responsable": {
      "id": "019a0e34-d153-7330-8cb6-80b14fd8811c",
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "responsable@autoecole-excellence.com",
      "contact": "0612345678"
    },
    "created_at": "2025-01-27T10:35:00.000000Z",
    "updated_at": "2025-01-27T10:35:00.000000Z"
  }
}
```

## 👥 Endpoints pour lister les candidats

### 1. Lister tous les candidats de l'auto-école

**Endpoint :** `GET /api/auto-ecoles/mes-dossiers`

**Description :** Récupère tous les dossiers (candidats) de l'auto-école du responsable connecté.

**Authentification :** Requise (Bearer Token)

**Paramètres optionnels :**
- `statut` : Filtrer par statut du dossier (`en_attente`, `en_cours`, `valide`, `rejete`)

### Exemple de requête :

```bash
GET /api/auto-ecoles/mes-dossiers?statut=en_attente
Authorization: Bearer YOUR_TOKEN_HERE
```

### Réponse attendue :

```json
{
  "success": true,
  "auto_ecole": {
    "id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
    "nom_auto_ecole": "Auto-École Excellence",
    "adresse": "123 Avenue des Champs-Élysées, 75008 Paris",
    "email": "contact@autoecole-excellence.com",
    "contact": "0612345678",
    "statut": true
  },
  "dossiers": [
    {
      "id": "019a0e36-d155-7332-8cb8-80b14fd8813e",
      "numero_dossier": "DOS-2025-001",
      "statut": "en_attente",
      "date_creation": "2025-01-27T09:00:00.000000Z",
      "candidat": {
        "id": "019a0e37-d156-7333-8cb9-80b14fd8814f",
        "numero_candidat": "CAN-2025-001",
        "personne": {
          "nom": "Martin",
          "prenom": "Sophie",
          "email": "sophie.martin@email.com",
          "contact": "0698765432"
        },
        "date_naissance": "1995-03-15",
        "lieu_naissance": "Paris",
        "nationalite": "Française",
        "genre": "F"
      },
      "formation": {
        "id": "019a0e38-d157-7334-8cba-80b14fd8815g",
        "nom": "Formation Permis B",
        "typePermis": {
          "nom": "Permis B",
          "categorie": "B"
        }
      },
      "documents": [
        {
          "id": "019a0e39-d158-7335-8cbb-80b14fd8816h",
          "nom": "CNI",
          "statut": "en_attente",
          "date_upload": "2025-01-27T09:15:00.000000Z"
        }
      ]
    }
  ],
  "statistiques": {
    "total": 15,
    "en_attente": 8,
    "en_cours": 4,
    "valide": 2,
    "rejete": 1
  }
}
```

### 2. Lister tous les candidats (vue globale)

**Endpoint :** `GET /api/candidats`

**Description :** Récupère la liste paginée de tous les candidats du système.

**Authentification :** Requise (Bearer Token)

**Paramètres optionnels :**
- `page` : Numéro de page (défaut: 1)
- `per_page` : Nombre d'éléments par page (défaut: 15)

### Exemple de requête :

```bash
GET /api/candidats?page=1&per_page=10
Authorization: Bearer YOUR_TOKEN_HERE
```

### Réponse attendue :

```json
{
  "data": [
    {
      "id": "019a0e37-d156-7333-8cb9-80b14fd8814f",
      "numero_candidat": "CAN-2025-001",
      "personne": {
        "nom": "Martin",
        "prenom": "Sophie",
        "email": "sophie.martin@email.com",
        "contact": "0698765432",
        "adresse": "45 Rue de la Paix, 75001 Paris"
      },
      "date_naissance": "1995-03-15",
      "lieu_naissance": "Paris",
      "nip": "1234567890123",
      "type_piece": "CNI",
      "numero_piece": "1234567890",
      "nationalite": "Française",
      "genre": "F",
      "created_at": "2025-01-27T09:00:00.000000Z"
    }
  ],
  "links": {
    "first": "http://localhost:8000/api/candidats?page=1",
    "last": "http://localhost:8000/api/candidats?page=2",
    "prev": null,
    "next": "http://localhost:8000/api/candidats?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 2,
    "per_page": 10,
    "to": 10,
    "total": 15
  }
}
```

## 📝 Exemples JSON complets

### 1. Création d'un candidat

**Endpoint :** `POST /api/candidats`

```json
{
  "personne_id": "019a0e40-d159-7336-8cbc-80b14fd8817i",
  "numero_candidat": "CAN-2025-002",
  "date_naissance": "1992-07-20",
  "lieu_naissance": "Lyon",
  "nip": "9876543210987",
  "type_piece": "Passeport",
  "numero_piece": "9876543210",
  "nationalite": "Française",
  "genre": "M"
}
```

### 2. Création d'une formation pour l'auto-école

**Endpoint :** `POST /api/formations`

```json
{
  "auto_ecole_id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
  "type_permis_id": "019a0e41-d160-7337-8cbd-80b14fd8818j",
  "nom": "Formation Permis B Accélérée",
  "description": "Formation intensive pour l'obtention du permis B",
  "prix": 1200.00,
  "duree_jours": 30,
  "statut": true
}
```

### 3. Création d'un dossier de candidature

**Endpoint :** `POST /api/dossiers`

```json
{
  "candidat_id": "019a0e37-d156-7333-8cb9-80b14fd8814f",
  "auto_ecole_id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
  "formation_id": "019a0e38-d157-7334-8cba-80b14fd8815g",
  "numero_dossier": "DOS-2025-001",
  "statut": "en_attente",
  "date_inscription": "2025-01-27",
  "observations": "Candidat motivé, première inscription"
}
```

## 🔄 Flux complet

### Scénario : Création complète d'une auto-école avec candidats

1. **Inscription du responsable** :
   ```bash
   POST /api/auth/register
   # Crée l'utilisateur avec rôle ROLE_AUTO_ECOLE
   ```

2. **Authentification** :
   ```bash
   GET /api/auth/auth-url
   # Redirige vers Authentik pour connexion
   ```

3. **Création de l'auto-école** :
   ```bash
   POST /api/auto-ecoles
   # Associe l'auto-école au responsable
   ```

4. **Création de formations** :
   ```bash
   POST /api/formations
   # Définit les formations proposées
   ```

5. **Inscription de candidats** :
   ```bash
   POST /api/candidats
   # Crée les profils candidats
   ```

6. **Création de dossiers** :
   ```bash
   POST /api/dossiers
   # Lie les candidats à l'auto-école via les formations
   ```

7. **Consultation des candidats** :
   ```bash
   GET /api/auto-ecoles/mes-dossiers
   # Liste tous les candidats de l'auto-école
   ```

## 🔐 Sécurité et authentification

- Tous les endpoints de création/modification nécessitent une authentification Bearer Token
- Le rôle `ROLE_AUTO_ECOLE` est vérifié pour les opérations sur les auto-écoles
- Les données sensibles sont chiffrées et validées
- Les logs sont enregistrés pour traçabilité

## 📊 Gestion des erreurs

### Codes de réponse courants :

- **200** : Succès
- **201** : Création réussie
- **400** : Erreur de validation ou logique métier
- **401** : Non authentifié
- **403** : Accès refusé (mauvais rôle)
- **404** : Ressource non trouvée
- **422** : Erreur de validation des données
- **500** : Erreur serveur

### Exemple de réponse d'erreur :

```json
{
  "success": false,
  "message": "Les données fournies ne sont pas valides.",
  "errors": {
    "email": ["L'adresse email est déjà utilisée."],
    "responsable_id": ["Le responsable sélectionné n'existe pas."]
  }
}
```

## 🚀 Démarrage rapide

1. **Cloner le projet** et installer les dépendances
2. **Configurer la base de données** et Authentik
3. **Exécuter les migrations** : `php artisan migrate`
4. **Tester l'API** avec les exemples fournis
5. **Consulter la documentation Swagger** : `/api/documentation`

---

*Ce guide couvre l'ensemble du parcours de création d'une auto-école et de gestion des candidats. Pour plus de détails sur l'API, consultez la documentation Swagger intégrée.*
