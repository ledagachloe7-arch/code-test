# 🎯 Flux d'Inscription d'un Candidat à une Auto-École

## 📋 Flux Actuel vs Flux Souhaité

### ❌ Problème Actuel

Actuellement, il manque la logique métier pour :
- Permettre à un candidat de choisir une auto-école
- Sélectionner une formation
- Créer automatiquement un dossier
- Compléter les informations du candidat

### ✅ Solution : Flux Complet d'Inscription

---

## 🔄 Flux d'Inscription Complet

### Étape 1 : Création du Compte (✅ Déjà Implémenté)

```http
POST /api/auth/register
{
  "email": "jean@example.com",
  "password": "Password123!",
  "password_confirmation": "Password123!",
  "nom": "Dupont",
  "prenom": "Jean",
  "contact": "0612345678",
  "role": "candidat"
}
```

**Résultat** :
- ✅ Utilisateur créé dans Authentik
- ✅ Utilisateur créé dans DB locale
- ✅ Personne créée et liée

---

### Étape 2 : Connexion (✅ Déjà Implémenté)

```http
POST /api/auth/login-direct
{
  "email": "jean@example.com",
  "password": "Password123!"
}
```

**Résultat** :
- ✅ Tokens obtenus
- ✅ Informations utilisateur récupérées

---

### Étape 3 : Compléter le Profil Candidat (🆕 À Améliorer)

**Endpoint à créer** : `POST /api/candidats/complete-profile`

```json
{
  "numero_candidat": "CAN-2025-001",
  "date_naissance": "1995-05-15",
  "lieu_naissance": "Dakar",
  "nip": "1234567890123",
  "type_piece": "CNI",
  "numero_piece": "1234567890",
  "nationalite": "Sénégalaise",
  "genre": "M"
}
```

**Ce qui se passe** :
1. Récupère le `personne_id` depuis le token
2. Crée automatiquement le candidat
3. Lie le candidat à la personne

---

### Étape 4 : Choisir une Auto-École et une Formation (🆕 À Créer)

**Endpoint à créer** : `GET /api/auto-ecoles/{id}/formations`

Liste les formations disponibles d'une auto-école :

```http
GET /api/auto-ecoles/uuid-auto-ecole/formations?statut=true
```

**Réponse** :
```json
{
  "success": true,
  "auto_ecole": {
    "id": "uuid",
    "nom_auto_ecole": "Excellence Conduite",
    "contact": "0612345678"
  },
  "formations": [
    {
      "id": "uuid-formation-1",
      "type_permis": "Permis B",
      "montant": 250000,
      "montant_formate": "250 000 FCFA",
      "description": "Formation complète Permis B"
    },
    {
      "id": "uuid-formation-2",
      "type_permis": "Permis A",
      "montant": 200000,
      "montant_formate": "200 000 FCFA"
    }
  ]
}
```

---

### Étape 5 : S'Inscrire à une Formation (🆕 À Créer)

**Endpoint à créer** : `POST /api/candidats/inscription-formation`

```json
{
  "auto_ecole_id": "uuid-auto-ecole",
  "formation_id": "uuid-formation",
  "commentaires": "Je souhaite commencer dès que possible"
}
```

**Ce qui se passe automatiquement** :
1. Récupère le candidat depuis le token
2. Vérifie que la formation appartient à l'auto-école
3. Crée un dossier avec statut "en_attente"
4. Associe le dossier au candidat, auto-école et formation
5. Retourne les détails du dossier créé

**Réponse** :
```json
{
  "success": true,
  "message": "Inscription à la formation réussie !",
  "dossier": {
    "id": "uuid-dossier",
    "numero_dossier": "DOS-2025-001",
    "statut": "en_attente",
    "date_creation": "2025-10-23",
    "candidat": {
      "nom_complet": "Jean Dupont"
    },
    "auto_ecole": {
      "nom_auto_ecole": "Excellence Conduite"
    },
    "formation": {
      "type_permis": "Permis B",
      "montant": 250000
    }
  }
}
```

---

### Étape 6 : Compléter le Dossier avec Documents (🆕 À Créer)

**Endpoint à créer** : `POST /api/dossiers/{id}/upload-document`

Upload et associe un document au dossier :

```http
POST /api/dossiers/uuid-dossier/upload-document
Content-Type: multipart/form-data

{
  "type_document_id": "uuid-type-cni",
  "fichier": [FILE]
}
```

**Ce qui se passe** :
1. Upload le fichier dans `storage/app/documents/`
2. Crée l'enregistrement dans la table `documents`
3. Associe au dossier
4. Retourne les détails du document

---

## 🎯 Flux Complet Proposé

```
1. 📝 Inscription (Authentik)
   POST /api/auth/register
   
2. 🚀 Connexion
   POST /api/auth/login-direct
   
3. 👤 Compléter Profil Candidat
   POST /api/candidats/complete-profile
   
4. 🏫 Lister Auto-Écoles
   GET /api/auto-ecoles?statut=true
   
5. 📚 Voir Formations d'une Auto-École
   GET /api/auto-ecoles/{id}/formations
   
6. ✅ S'Inscrire à une Formation
   POST /api/candidats/inscription-formation
   
7. 📄 Uploader Documents
   POST /api/dossiers/{id}/upload-document (pour chaque document)
   
8. 📊 Suivre le Dossier
   GET /api/dossiers/{id}
```

---

## 🔧 Endpoints à Créer

### 1. Compléter le Profil Candidat

**Route** : `POST /api/candidats/complete-profile`

**Logique** :
- Récupère `personne_id` depuis le token
- Crée le candidat automatiquement
- Génère un `numero_candidat` unique

### 2. Formations d'une Auto-École

**Route** : `GET /api/auto-ecoles/{id}/formations`

**Logique** :
- Liste les formations de l'auto-école
- Filtre par statut actif
- Inclut les informations de prix

### 3. Inscription à une Formation

**Route** : `POST /api/candidats/inscription-formation`

**Logique** :
- Récupère le candidat depuis le token
- Vérifie que la formation existe
- Crée le dossier automatiquement
- Retourne les détails complets

### 4. Upload de Document

**Route** : `POST /api/dossiers/{id}/upload-document`

**Logique** :
- Vérifie que le dossier appartient au candidat
- Upload le fichier
- Crée l'enregistrement
- Retourne les détails du document

### 5. Mes Dossiers

**Route** : `GET /api/candidats/mes-dossiers`

**Logique** :
- Récupère le candidat depuis le token
- Liste tous ses dossiers
- Inclut les documents

### 6. Types de Documents Requis

**Route** : `GET /api/formations/{id}/documents-requis`

**Logique** :
- Liste les documents obligatoires pour cette formation
- Basé sur la table `pieces_justificatives`

---

## 📝 Voulez-vous que je crée ces endpoints ?

Cela ajoutera environ **6 nouveaux endpoints** spécialisés pour le flux d'inscription complet.

---

**🎯 Dites-moi si vous voulez que j'implémente ce flux complet d'inscription !**

