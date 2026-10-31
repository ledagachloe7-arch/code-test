# 🏫 AUTO-ECOLE-DOC - Documentation Complète

Ce document explique comment créer une auto-école avec son responsable ayant le rôle `ROLE_AUTO_ECOLE` et comment consulter les candidats inscrits.

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Création du responsable auto-école](#création-du-responsable-auto-école)
3. [Création de l'auto-école](#création-de-lauto-école)
4. [Consultation des candidats inscrits](#consultation-des-candidats-inscrits)
5. [Structure des dossiers de candidats](#structure-des-dossiers-de-candidats)
6. [Exemples JSON complets](#exemples-json-complets)
7. [Flux complet](#flux-complet)
8. [Cas d'usage pratiques](#cas-dusage-pratiques)
9. [Sécurité et authentification](#sécurité-et-authentification)
10. [Gestion des erreurs](#gestion-des-erreurs)
11. [Démarrage rapide](#démarrage-rapide)

## 🎯 Vue d'ensemble

Le système permet de :
- Créer un responsable avec le rôle `ROLE_AUTO_ECOLE`
- Associer ce responsable à une auto-école
- Consulter tous les candidats inscrits dans cette auto-école

### Structure des entités :
- **Utilisateur** : Compte avec rôle `ROLE_AUTO_ECOLE`
- **Personne** : Informations personnelles du responsable
- **AutoEcole** : Établissement de formation
- **Candidat** : Personnes inscrites dans l'auto-école
- **Dossier** : Liaison candidat ↔ auto-école

## 👤 Création du responsable auto-école

### Étape 1 : Inscription du responsable

**Endpoint :** `POST /api/auth/register`

**Description :** Crée un utilisateur responsable avec le rôle `ROLE_AUTO_ECOLE` dans Authentik et la base de données locale.

**Headers :**
```
Content-Type: application/json
```

**Body JSON :**
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

**Réponse de succès (201) :**
```json
{
  "success": true,
  "message": "Inscription réussie. Redirigez l'utilisateur vers Authentik pour se connecter.",
  "auth_url": "https://authentik.example.com/application/o/authorize/?client_id=abc123&redirect_uri=http://localhost:8000/api/auth/authentik/callback&response_type=code&scope=openid+profile+email&state=xyz789",
  "user": {
    "id": "019a0e34-d153-7330-8cb6-80b14fd8811c",
    "email": "responsable@autoecole-excellence.com",
    "role": "ROLE_AUTO_ECOLE",
    "created_at": "2025-01-27T10:30:00.000000Z",
    "updated_at": "2025-01-27T10:30:00.000000Z"
  }
}
```

**Réponse d'erreur (422) :**
```json
{
  "success": false,
  "message": "Les données fournies ne sont pas valides.",
  "errors": {
    "email": ["L'adresse email est déjà utilisée."],
    "password": ["Le mot de passe doit contenir au moins 8 caractères."]
  }
}
```

## 🏫 Création de l'auto-école

### Étape 2 : Création de l'auto-école

**Endpoint :** `POST /api/auto-ecoles`

**Description :** Crée une nouvelle auto-école et l'associe au responsable.

**Prérequis :** L'utilisateur doit être authentifié avec le rôle `ROLE_AUTO_ECOLE`.

**Headers :**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Body JSON :**
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

**Réponse de succès (201) :**
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
      "contact": "0612345678",
      "adresse": "123 Avenue des Champs-Élysées, 75008 Paris"
    },
    "created_at": "2025-01-27T10:35:00.000000Z",
    "updated_at": "2025-01-27T10:35:00.000000Z"
  }
}
```

**Réponse d'erreur (422) :**
```json
{
  "success": false,
  "message": "Les données fournies ne sont pas valides.",
  "errors": {
    "nom_auto_ecole": ["Le nom de l'auto-école est requis."],
    "email": ["L'adresse email est déjà utilisée."],
    "responsable_id": ["Le responsable sélectionné n'existe pas."]
  }
}
```

## 👥 Consultation des candidats inscrits

### Étape 3 : Lister tous les candidats inscrits dans l'auto-école

**Endpoint :** `GET /api/auto-ecoles/mes-dossiers`

**Description :** Récupère tous les dossiers (candidats inscrits) de l'auto-école du responsable connecté. Chaque dossier contient les informations complètes du candidat, sa formation et ses documents.

**Prérequis :** L'utilisateur doit être authentifié avec le rôle `ROLE_AUTO_ECOLE` et être responsable d'une auto-école.

**Headers :**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Paramètres de requête (optionnels) :**
- `statut` : Filtrer par statut du dossier (`en_attente`, `en_cours`, `valide`, `rejete`)

**Exemple de requête :**
```bash
GET /api/auto-ecoles/mes-dossiers?statut=en_attente
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Réponse de succès (200) :**
```json
{
  "success": true,
  "auto_ecole": {
    "id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
    "nom_auto_ecole": "Auto-École Excellence",
    "adresse": "123 Avenue des Champs-Élysées, 75008 Paris",
    "email": "contact@autoecole-excellence.com",
    "responsable_id": "019a0e34-d153-7330-8cb6-80b14fd8811c",
    "contact": "0612345678",
    "statut": true,
    "statut_libelle": "Active",
    "responsable": {
      "id": "019a0e34-d153-7330-8cb6-80b14fd8811c",
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "responsable@autoecole-excellence.com",
      "contact": "0612345678",
      "adresse": "123 Avenue des Champs-Élysées, 75008 Paris",
      "created_at": "2025-01-27T10:30:00.000000Z",
      "updated_at": "2025-01-27T10:30:00.000000Z"
    },
    "created_at": "2025-01-27T10:35:00.000000Z",
    "updated_at": "2025-01-27T10:35:00.000000Z"
  },
  "dossiers": [
    {
      "id": "019a0e36-d155-7332-8cb8-80b14fd8813e",
      "candidat_id": "019a0e37-d156-7333-8cb9-80b14fd8814f",
      "auto_ecole_id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
      "formation_id": "019a0e39-d158-7335-8cbb-80b14fd8816h",
      "statut": "en_attente",
      "date_creation": "2025-01-27",
      "date_modification": "2025-01-27",
      "commentaires": "Candidat motivé, première inscription",
      "candidat": {
        "id": "019a0e37-d156-7333-8cb9-80b14fd8814f",
        "personne_id": "019a0e38-d157-7334-8cba-80b14fd8815g",
        "numero_candidat": "CAN-2025-001",
        "date_naissance": "1995-03-15",
        "lieu_naissance": "Paris",
        "nip": "1234567890123",
        "type_piece": "CNI",
        "numero_piece": "1234567890",
        "nationalite": "Française",
        "genre": "F",
        "personne": {
          "id": "019a0e38-d157-7334-8cba-80b14fd8815g",
          "nom": "Martin",
          "prenom": "Sophie",
          "email": "sophie.martin@email.com",
          "contact": "0698765432",
          "adresse": "45 Rue de la Paix, 75001 Paris",
          "created_at": "2025-01-27T09:00:00.000000Z",
          "updated_at": "2025-01-27T09:00:00.000000Z"
        },
        "created_at": "2025-01-27T09:00:00.000000Z",
        "updated_at": "2025-01-27T09:00:00.000000Z"
      },
      "formation": {
        "id": "019a0e39-d158-7335-8cbb-80b14fd8816h",
        "auto_ecole_id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
        "type_permis_id": "019a0e40-d159-7336-8cbc-80b14fd8817i",
        "nom": "Formation Permis B",
        "description": "Formation complète pour l'obtention du permis B",
        "prix": 1200.00,
        "duree_jours": 30,
        "statut": true,
        "typePermis": {
          "id": "019a0e40-d159-7336-8cbc-80b14fd8817i",
          "nom": "Permis B",
          "categorie": "B",
          "description": "Permis de conduire voiture",
          "created_at": "2025-01-27T08:00:00.000000Z",
          "updated_at": "2025-01-27T08:00:00.000000Z"
        },
        "created_at": "2025-01-27T08:30:00.000000Z",
        "updated_at": "2025-01-27T08:30:00.000000Z"
      },
      "documents": [
        {
          "id": "019a0e41-d160-7337-8cbd-80b14fd8818j",
          "dossier_id": "019a0e36-d155-7332-8cb8-80b14fd8813e",
          "nom": "CNI",
          "type": "piece_identite",
          "statut": "en_attente",
          "date_upload": "2025-01-27",
          "chemin_fichier": "documents/cni_sophie_martin.pdf",
          "created_at": "2025-01-27T09:15:00.000000Z",
          "updated_at": "2025-01-27T09:15:00.000000Z"
        },
        {
          "id": "019a0e42-d161-7338-8cbe-80b14fd8819k",
          "dossier_id": "019a0e36-d155-7332-8cb8-80b14fd8813e",
          "nom": "Photo d'identité",
          "type": "photo",
          "statut": "valide",
          "date_upload": "2025-01-27",
          "chemin_fichier": "documents/photo_sophie_martin.jpg",
          "created_at": "2025-01-27T09:20:00.000000Z",
          "updated_at": "2025-01-27T09:20:00.000000Z"
        }
      ],
      "created_at": "2025-01-27T09:00:00.000000Z",
      "updated_at": "2025-01-27T09:00:00.000000Z"
    },
    {
      "id": "019a0e43-d162-7339-8cbf-80b14fd881al",
      "candidat_id": "019a0e44-d163-7340-8cc0-80b14fd881bm",
      "auto_ecole_id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
      "formation_id": "019a0e46-d165-7342-8cc2-80b14fd881do",
      "statut": "en_cours",
      "date_creation": "2025-01-26",
      "date_modification": "2025-01-27",
      "commentaires": "Candidat en cours de formation",
      "candidat": {
        "id": "019a0e44-d163-7340-8cc0-80b14fd881bm",
        "personne_id": "019a0e45-d164-7341-8cc1-80b14fd881cn",
        "numero_candidat": "CAN-2025-002",
        "date_naissance": "1992-07-20",
        "lieu_naissance": "Lyon",
        "nip": "9876543210987",
        "type_piece": "Passeport",
        "numero_piece": "9876543210",
        "nationalite": "Française",
        "genre": "M",
        "personne": {
          "id": "019a0e45-d164-7341-8cc1-80b14fd881cn",
          "nom": "Durand",
          "prenom": "Pierre",
          "email": "pierre.durand@email.com",
          "contact": "0654321098",
          "adresse": "78 Boulevard Saint-Germain, 75005 Paris",
          "created_at": "2025-01-26T14:00:00.000000Z",
          "updated_at": "2025-01-26T14:00:00.000000Z"
        },
        "created_at": "2025-01-26T14:00:00.000000Z",
        "updated_at": "2025-01-26T14:00:00.000000Z"
      },
      "formation": {
        "id": "019a0e46-d165-7342-8cc2-80b14fd881do",
        "auto_ecole_id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
        "type_permis_id": "019a0e40-d159-7336-8cbc-80b14fd8817i",
        "nom": "Formation Permis B Accélérée",
        "description": "Formation intensive pour l'obtention du permis B",
        "prix": 1500.00,
        "duree_jours": 15,
        "statut": true,
        "typePermis": {
          "id": "019a0e40-d159-7336-8cbc-80b14fd8817i",
          "nom": "Permis B",
          "categorie": "B",
          "description": "Permis de conduire voiture",
          "created_at": "2025-01-27T08:00:00.000000Z",
          "updated_at": "2025-01-27T08:00:00.000000Z"
        },
        "created_at": "2025-01-26T13:30:00.000000Z",
        "updated_at": "2025-01-26T13:30:00.000000Z"
      },
      "documents": [
        {
          "id": "019a0e47-d166-7343-8cc3-80b14fd881ep",
          "dossier_id": "019a0e43-d162-7339-8cbf-80b14fd881al",
          "nom": "Passeport",
          "type": "piece_identite",
          "statut": "valide",
          "date_upload": "2025-01-26",
          "chemin_fichier": "documents/passeport_pierre_durand.pdf",
          "created_at": "2025-01-26T15:00:00.000000Z",
          "updated_at": "2025-01-26T15:00:00.000000Z"
        }
      ],
      "created_at": "2025-01-26T14:30:00.000000Z",
      "updated_at": "2025-01-27T08:45:00.000000Z"
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

**Réponse d'erreur (400) :**
```json
{
  "success": false,
  "message": "Aucune auto-école associée à votre compte."
}
```

**Réponse d'erreur (401) :**
```json
{
  "success": false,
  "message": "Token d'authentification manquant."
}
```

**Réponse d'erreur (404) :**
```json
{
  "success": false,
  "message": "Utilisateur non trouvé."
}
```

## 📋 Structure des dossiers de candidats

### Comprendre la réponse de l'endpoint `mes-dossiers`

L'endpoint `GET /api/auto-ecoles/mes-dossiers` retourne une structure complète qui permet de voir tous les candidats inscrits dans votre auto-école. Voici ce que contient chaque dossier :

#### 🔍 Informations du dossier
- **`id`** : Identifiant unique du dossier
- **`candidat_id`** : Référence vers le candidat
- **`auto_ecole_id`** : Référence vers votre auto-école
- **`formation_id`** : Référence vers la formation suivie
- **`statut`** : État du dossier (`en_attente`, `en_cours`, `valide`, `rejete`)
- **`date_creation`** : Date de création du dossier
- **`date_modification`** : Dernière modification
- **`commentaires`** : Notes sur le dossier

#### 👤 Informations du candidat
- **`candidat`** : Objet contenant toutes les infos du candidat
  - **`numero_candidat`** : Numéro unique du candidat
  - **`date_naissance`**, **`lieu_naissance`** : Informations personnelles
  - **`nip`** : Numéro d'identification personnel
  - **`type_piece`**, **`numero_piece`** : Pièce d'identité
  - **`nationalite`**, **`genre`** : Informations civiles
  - **`personne`** : Informations de contact (nom, prénom, email, téléphone, adresse)

#### 📚 Informations de la formation
- **`formation`** : Objet contenant les détails de la formation
  - **`nom`**, **`description`** : Détails de la formation
  - **`prix`**, **`duree_jours`** : Coût et durée
  - **`typePermis`** : Type de permis préparé (B, A, etc.)

#### 📄 Documents du dossier
- **`documents`** : Liste des documents fournis
  - **`nom`** : Nom du document
  - **`type`** : Type (`piece_identite`, `photo`, `certificat`, etc.)
  - **`statut`** : État de validation (`en_attente`, `valide`, `rejete`)
  - **`chemin_fichier`** : Emplacement du fichier

#### 📊 Statistiques
- **`statistiques`** : Vue d'ensemble des dossiers
  - **`total`** : Nombre total de dossiers
  - **`en_attente`**, **`en_cours`**, **`valide`**, **`rejete`** : Répartition par statut

## 📝 Exemples JSON complets

### 1. Création d'un candidat

**Endpoint :** `POST /api/candidats`

**Headers :**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Body JSON :**
```json
{
  "personne_id": "019a0e48-d167-7344-8cc4-80b14fd881fq",
  "numero_candidat": "CAN-2025-003",
  "date_naissance": "1998-12-10",
  "lieu_naissance": "Marseille",
  "nip": "1122334455667",
  "type_piece": "CNI",
  "numero_piece": "1122334455",
  "nationalite": "Française",
  "genre": "F"
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "message": "Candidat créé avec succès.",
  "data": {
    "id": "019a0e49-d168-7345-8cc5-80b14fd881gr",
    "numero_candidat": "CAN-2025-003",
    "date_naissance": "1998-12-10",
    "lieu_naissance": "Marseille",
    "nip": "1122334455667",
    "type_piece": "CNI",
    "numero_piece": "1122334455",
    "nationalite": "Française",
    "genre": "F",
    "personne": {
      "id": "019a0e48-d167-7344-8cc4-80b14fd881fq",
      "nom": "Bernard",
      "prenom": "Marie",
      "email": "marie.bernard@email.com",
      "contact": "0645678901",
      "adresse": "12 Rue de la République, 13001 Marseille"
    },
    "created_at": "2025-01-27T11:00:00.000000Z",
    "updated_at": "2025-01-27T11:00:00.000000Z"
  }
}
```

### 2. Création d'une formation

**Endpoint :** `POST /api/formations`

**Headers :**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Body JSON :**
```json
{
  "auto_ecole_id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
  "type_permis_id": "019a0e40-d159-7336-8cbc-80b14fd8817i",
  "nom": "Formation Permis B Standard",
  "description": "Formation classique pour l'obtention du permis B",
  "prix": 1000.00,
  "duree_jours": 45,
  "statut": true
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "message": "Formation créée avec succès.",
  "data": {
    "id": "019a0e50-d169-7346-8cc6-80b14fd881hs",
    "nom": "Formation Permis B Standard",
    "description": "Formation classique pour l'obtention du permis B",
    "prix": 1000.00,
    "duree_jours": 45,
    "statut": true,
    "auto_ecole": {
      "id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
      "nom_auto_ecole": "Auto-École Excellence"
    },
    "typePermis": {
      "id": "019a0e40-d159-7336-8cbc-80b14fd8817i",
      "nom": "Permis B",
      "categorie": "B"
    },
    "created_at": "2025-01-27T11:15:00.000000Z",
    "updated_at": "2025-01-27T11:15:00.000000Z"
  }
}
```

### 3. Création d'un dossier de candidature

**Endpoint :** `POST /api/dossiers`

**Headers :**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Body JSON :**
```json
{
  "candidat_id": "019a0e49-d168-7345-8cc5-80b14fd881gr",
  "auto_ecole_id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
  "formation_id": "019a0e50-d169-7346-8cc6-80b14fd881hs",
  "numero_dossier": "DOS-2025-003",
  "statut": "en_attente",
  "date_creation": "2025-01-27",
  "commentaires": "Nouvelle inscription, dossier complet"
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "message": "Dossier créé avec succès.",
  "data": {
    "id": "019a0e51-d170-7347-8cc7-80b14fd881it",
    "numero_dossier": "DOS-2025-003",
    "statut": "en_attente",
    "date_creation": "2025-01-27",
    "date_modification": "2025-01-27",
    "commentaires": "Nouvelle inscription, dossier complet",
    "candidat": {
      "id": "019a0e49-d168-7345-8cc5-80b14fd881gr",
      "numero_candidat": "CAN-2025-003",
      "personne": {
        "nom": "Bernard",
        "prenom": "Marie",
        "email": "marie.bernard@email.com"
      }
    },
    "auto_ecole": {
      "id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
      "nom_auto_ecole": "Auto-École Excellence"
    },
    "formation": {
      "id": "019a0e50-d169-7346-8cc6-80b14fd881hs",
      "nom": "Formation Permis B Standard"
    },
    "created_at": "2025-01-27T11:30:00.000000Z",
    "updated_at": "2025-01-27T11:30:00.000000Z"
  }
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

7. **Consultation des candidats inscrits** :
   ```bash
   GET /api/auto-ecoles/mes-dossiers
   # Liste tous les dossiers (candidats inscrits) de l'auto-école
   # Retourne : candidat + formation + documents + statistiques
   ```

## 🎯 Cas d'usage pratiques

### 📊 Tableau de bord des candidats
L'endpoint `GET /api/auto-ecoles/mes-dossiers` vous permet de :

1. **Voir tous vos candidats** avec leurs informations complètes
2. **Suivre l'avancement** des dossiers par statut
3. **Consulter les documents** fournis par chaque candidat
4. **Vérifier les formations** suivies par chaque candidat
5. **Obtenir des statistiques** en temps réel

### 🔍 Filtrage par statut
Vous pouvez filtrer les dossiers selon leur état :

```bash
# Voir seulement les nouveaux dossiers
GET /api/auto-ecoles/mes-dossiers?statut=en_attente

# Voir les candidats en cours de formation
GET /api/auto-ecoles/mes-dossiers?statut=en_cours

# Voir les dossiers validés
GET /api/auto-ecoles/mes-dossiers?statut=valide

# Voir tous les dossiers (par défaut)
GET /api/auto-ecoles/mes-dossiers
```

### 📈 Utilisation des statistiques
Les statistiques retournées vous donnent une vue d'ensemble :

```json
{
  "statistiques": {
    "total": 15,        // Total des candidats inscrits
    "en_attente": 8,    // Nouveaux dossiers à traiter
    "en_cours": 4,      // Candidats en formation
    "valide": 2,        // Dossiers validés
    "rejete": 1         // Dossiers rejetés
  }
}
```

## 🔐 Sécurité et authentification

- Tous les endpoints de création/modification nécessitent une authentification Bearer Token
- Le rôle `ROLE_AUTO_ECOLE` est requis pour créer des auto-écoles
- Seul le responsable de l'auto-école peut consulter ses candidats
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

### Exemple de réponse d'erreur complète :

```json
{
  "success": false,
  "message": "Les données fournies ne sont pas valides.",
  "errors": {
    "email": ["L'adresse email est déjà utilisée."],
    "responsable_id": ["Le responsable sélectionné n'existe pas."],
    "nom_auto_ecole": ["Le nom de l'auto-école est requis."]
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

*Cette documentation couvre l'ensemble du parcours de création d'une auto-école et de consultation des candidats. Pour plus de détails sur l'API, consultez la documentation Swagger intégrée.*
