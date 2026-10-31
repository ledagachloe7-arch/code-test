# 🏫 Flux de Validation Auto-École - Guide Complet

## ✅ NOUVEAUX ENDPOINTS CRÉÉS POUR LES AUTO-ÉCOLES !

---

## 🎯 Rôle des Auto-Écoles

Les auto-écoles peuvent maintenant :
1. ✅ **Voir tous leurs dossiers** avec statistiques
2. ✅ **Valider ou rejeter** les dossiers
3. ✅ **Valider ou rejeter** chaque document
4. ✅ **Filtrer les dossiers** par statut

---

## 📋 Nouveaux Endpoints Auto-École

| # | Endpoint | Méthode | Description |
|---|----------|---------|-------------|
| 1 | `/api/auto-ecoles/mes-dossiers` | GET | 📁 Voir tous les dossiers |
| 2 | `/api/dossiers/{id}/valider` | POST | ✅ Valider/Rejeter un dossier |
| 3 | `/api/documents/{id}/valider` | POST | ✅ Valider/Rejeter un document |

---

## 🔄 Flux de Validation Complet

### Vue d'Ensemble

```
Candidat                    Auto-École                      Système
   │                            │                              │
   │ 1. S'inscrit               │                              │
   │─────────────────────────>  │                              │
   │                            │                              │
   │ 2. Upload documents        │                              │
   │─────────────────────────>  │                              │
   │                            │                              │
   │                            │ 3. Voit nouveau dossier      │
   │                            │<──────────────────────────── │
   │                            │                              │
   │                            │ 4. Vérifie documents         │
   │                            │──────────────────────────>   │
   │                            │                              │
   │                            │ 5. Valide/Rejette docs       │
   │                            │──────────────────────────>   │
   │                            │                              │
   │                            │ 6. Valide/Rejette dossier    │
   │                            │──────────────────────────>   │
   │                            │                              │
   │ 7. Notification (optionnel)│                              │
   │<────────────────────────── │                              │
```

---

## 📖 Guide Détaillé pour Auto-École

### Étape 1️⃣ : Connexion du Responsable

**Endpoint** : `POST /api/auth/login-direct`

```json
{
  "email": "responsable@auto-ecole.com",
  "password": "Responsable123!"
}
```

**Résultat** :
```json
{
  "success": true,
  "user": {
    "role": "responsable_auto_ecole"
  },
  "access_token": "eyJ..."
}
```

---

### Étape 2️⃣ : Voir les Dossiers de Mon Auto-École ✨ NOUVEAU

**Endpoint** : `GET /api/auto-ecoles/mes-dossiers`

**Headers** :
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Paramètres optionnels** :
- `?statut=en_attente` - Filtrer par statut

**Résultat** :
```json
{
  "success": true,
  "auto_ecole": {
    "id": "uuid-auto-ecole",
    "nom_auto_ecole": "Excellence Conduite",
    "email": "contact@excellence.com"
  },
  "dossiers": [
    {
      "id": "uuid-dossier-1",
      "statut": "en_attente",
      "date_creation": "2025-10-23",
      "candidat": {
        "numero_candidat": "CAN-2025-001",
        "personne": {
          "nom_complet": "Jean Dupont",
          "email": "jean@example.com",
          "contact": "0612345678"
        }
      },
      "formation": {
        "type_permis": {
          "libelle": "Permis B"
        },
        "montant_formate": "250 000 FCFA"
      },
      "documents": [
        {
          "nom_fichier": "cni.pdf",
          "valide": false,
          "type_document": {
            "libelle": "Carte d'Identité"
          }
        },
        {
          "nom_fichier": "photo.jpg",
          "valide": false,
          "type_document": {
            "libelle": "Photo d'Identité"
          }
        }
      ]
    }
  ],
  "statistiques": {
    "total": 15,
    "en_attente": 5,
    "en_cours": 7,
    "valide": 2,
    "rejete": 1
  }
}
```

---

### Étape 3️⃣ : Voir les Détails d'un Dossier

**Endpoint** : `GET /api/dossiers/{id}`

**Résultat** :
```json
{
  "success": true,
  "data": {
    "id": "uuid-dossier",
    "statut": "en_attente",
    "candidat": {
      "numero_candidat": "CAN-2025-001",
      "date_naissance": "1995-05-15",
      "age": 30,
      "personne": {
        "nom_complet": "Jean Dupont"
      }
    },
    "documents": [
      {
        "id": "uuid-doc-1",
        "nom_fichier": "cni.pdf",
        "chemin_fichier": "/documents/2025/10/cni.pdf",
        "valide": false,
        "type_document": {
          "libelle": "Carte d'Identité"
        }
      }
    ]
  }
}
```

---

### Étape 4️⃣ : Valider ou Rejeter un Document ✨ NOUVEAU

**Endpoint** : `POST /api/documents/{id}/valider`

**Headers** :
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (Valider)** :
```json
{
  "valide": true,
  "commentaires": "Document conforme et lisible"
}
```

**Body (Rejeter)** :
```json
{
  "valide": false,
  "commentaires": "Photo floue, merci de renvoyer une photo plus nette"
}
```

**Résultat** :
```json
{
  "success": true,
  "message": "Document validé avec succès !",
  "document": {
    "id": "uuid-doc",
    "nom_fichier": "cni.pdf",
    "valide": true,
    "valide_libelle": "Validé",
    "commentaires": "Document conforme et lisible"
  }
}
```

**📝 Ce qui se passe** :
- ✅ Vérifie que vous êtes responsable de l'auto-école
- ✅ Met à jour le statut du document
- ✅ Ajoute un commentaire
- ✅ Met à jour la date de modification du dossier

---

### Étape 5️⃣ : Valider ou Rejeter le Dossier Complet ✨ NOUVEAU

**Endpoint** : `POST /api/dossiers/{id}/valider`

**Headers** :
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (Valider)** :
```json
{
  "statut": "valide",
  "commentaires": "Dossier complet, tous les documents sont conformes. Formation peut commencer."
}
```

**Body (Rejeter)** :
```json
{
  "statut": "rejete",
  "commentaires": "Documents manquants : certificat médical. Merci de compléter votre dossier."
}
```

**Résultat** :
```json
{
  "success": true,
  "message": "Dossier validé avec succès !",
  "dossier": {
    "id": "uuid-dossier",
    "statut": "valide",
    "date_modification": "2025-10-23T15:30:00+00:00",
    "commentaires": "Dossier complet...",
    "candidat": {
      "nom_complet": "Jean Dupont"
    }
  }
}
```

**📝 Ce qui se passe** :
- ✅ Vérifie que vous êtes responsable de l'auto-école
- ✅ Change le statut du dossier (valide/rejete)
- ✅ Ajoute un commentaire obligatoire
- ✅ Met à jour la date de modification

---

## 🎯 Workflow Complet Auto-École

### Scénario 1 : Validation Complète

```
1. Responsable se connecte
   POST /api/auth/login-direct

2. Voir tous les dossiers en attente
   GET /api/auto-ecoles/mes-dossiers?statut=en_attente

3. Examiner un dossier spécifique
   GET /api/dossiers/{id}

4. Valider chaque document
   POST /api/documents/{doc1_id}/valider
   POST /api/documents/{doc2_id}/valider
   POST /api/documents/{doc3_id}/valider

5. Valider le dossier complet
   POST /api/dossiers/{id}/valider
   Body: { "statut": "valide", "commentaires": "..." }
```

---

### Scénario 2 : Rejet Partiel

```
1. Voir les dossiers
   GET /api/auto-ecoles/mes-dossiers

2. Examiner un dossier
   GET /api/dossiers/{id}

3. Valider certains documents
   POST /api/documents/{doc1_id}/valider
   Body: { "valide": true, "commentaires": "OK" }

4. Rejeter un document
   POST /api/documents/{doc2_id}/valider
   Body: { "valide": false, "commentaires": "Photo floue" }

5. Mettre le dossier en cours (pas encore terminé)
   PUT /api/dossiers/{id}
   Body: { "statut": "en_cours", "commentaires": "En attente photo" }
```

---

## 🔒 Sécurité et Autorisations

### Qui Peut Valider ?

1. **Responsable Auto-École** :
   - ✅ Peut valider les dossiers de **son** auto-école uniquement
   - ❌ Ne peut pas valider les dossiers d'autres auto-écoles

2. **Administrateur** :
   - ✅ Peut valider **tous** les dossiers
   - ✅ Accès complet

3. **Candidat** :
   - ❌ Ne peut **pas** valider de dossiers
   - ✅ Peut seulement voir **ses** dossiers

### Vérifications Automatiques

- ✅ Vérifie que le responsable appartient à l'auto-école du dossier
- ✅ Vérifie le token d'authentification
- ✅ Log toutes les actions de validation
- ✅ Empêche les accès non autorisés (403)

---

## 📊 Statistiques et Dashboard

### Dashboard Auto-École

```json
{
  "statistiques": {
    "total": 15,
    "en_attente": 5,    // 📝 À traiter
    "en_cours": 7,      // 🔄 En cours
    "valide": 2,        // ✅ Validés
    "rejete": 1         // ❌ Rejetés
  }
}
```

**Utilisation Frontend** :
```javascript
// Récupérer les statistiques
const stats = await fetch('/api/auto-ecoles/mes-dossiers', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Afficher dans un dashboard
<Dashboard>
  <Stat label="En attente" value={5} color="yellow" />
  <Stat label="En cours" value={7} color="blue" />
  <Stat label="Validés" value={2} color="green" />
  <Stat label="Rejetés" value={1} color="red" />
</Dashboard>
```

---

## 🧪 Test dans Swagger

### 1. Se Connecter en tant que Responsable

```
POST /api/auth/register
{
  "email": "responsable@test.com",
  "password": "Responsable123!",
  "password_confirmation": "Responsable123!",
  "nom": "Responsable",
  "prenom": "Auto-École",
  "contact": "0698765432",
  "role": "responsable_auto_ecole"
}
```

Puis :
```
POST /api/auth/login-direct
{
  "email": "responsable@test.com",
  "password": "Responsable123!"
}
```

### 2. Créer une Auto-École

```
POST /api/auto-ecoles
{
  "nom_auto_ecole": "Test Auto-École",
  "email": "test@autoecole.com",
  "responsable_id": "uuid-personne-responsable",
  "contact": "0698765432",
  "statut": true
}
```

### 3. Voir les Dossiers

```
GET /api/auto-ecoles/mes-dossiers
Authorization: Bearer YOUR_TOKEN
```

### 4. Valider un Document

```
POST /api/documents/uuid-document/valider
Authorization: Bearer YOUR_TOKEN

{
  "valide": true,
  "commentaires": "Document conforme"
}
```

### 5. Valider le Dossier

```
POST /api/dossiers/uuid-dossier/valider
Authorization: Bearer YOUR_TOKEN

{
  "statut": "valide",
  "commentaires": "Dossier complet et conforme"
}
```

---

## 📱 Exemple Frontend pour Auto-École

```javascript
// Dashboard Auto-École
const AutoEcoleDashboard = () => {
  const [dossiers, setDossiers] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    // Charger les dossiers
    fetch('/api/auto-ecoles/mes-dossiers', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    })
    .then(r => r.json())
    .then(data => {
      setDossiers(data.dossiers);
      setStats(data.statistiques);
    });
  }, []);

  const validerDocument = async (docId) => {
    await fetch(`/api/documents/${docId}/valider`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valide: true,
        commentaires: 'Document conforme'
      })
    });
    // Recharger les dossiers
  };

  const validerDossier = async (dossierId) => {
    await fetch(`/api/dossiers/${dossierId}/valider`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        statut: 'valide',
        commentaires: 'Dossier complet'
      })
    });
  };

  const rejeterDossier = async (dossierId, raison) => {
    await fetch(`/api/dossiers/${dossierId}/valider`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        statut: 'rejete',
        commentaires: raison
      })
    });
  };

  return (
    <div>
      <h1>Tableau de Bord Auto-École</h1>
      
      {/* Statistiques */}
      <div className="stats">
        <StatCard label="En attente" value={stats.en_attente} />
        <StatCard label="En cours" value={stats.en_cours} />
        <StatCard label="Validés" value={stats.valide} />
        <StatCard label="Rejetés" value={stats.rejete} />
      </div>

      {/* Liste des dossiers */}
      <div className="dossiers">
        {dossiers.map(dossier => (
          <DossierCard 
            key={dossier.id}
            dossier={dossier}
            onValiderDoc={validerDocument}
            onValiderDossier={validerDossier}
            onRejeterDossier={rejeterDossier}
          />
        ))}
      </div>
    </div>
  );
};
```

---

## 🎯 Cas d'Usage

### Cas 1 : Dossier Complet et Conforme

```
1. Auto-école voit le dossier (statut: en_attente)
2. Vérifie tous les documents
3. Valide chaque document un par un
4. Tous les docs validés → Valide le dossier
5. Candidat peut commencer la formation
```

### Cas 2 : Document Manquant

```
1. Auto-école voit le dossier
2. Constate qu'il manque le certificat médical
3. Rejette le dossier avec commentaire
4. Candidat reçoit la notification (à implémenter)
5. Candidat upload le document manquant
6. Dossier repasse en "en_attente"
```

### Cas 3 : Document Non Conforme

```
1. Auto-école examine les documents
2. Photo d'identité est floue
3. Valide les autres documents
4. Rejette la photo avec commentaire
5. Met le dossier en "en_cours"
6. Candidat upload une nouvelle photo
```

---

## 📊 Filtres Disponibles

### Pour les Auto-Écoles

```http
# Tous les dossiers
GET /api/auto-ecoles/mes-dossiers

# Seulement les dossiers en attente (à traiter)
GET /api/auto-ecoles/mes-dossiers?statut=en_attente

# Seulement les dossiers en cours
GET /api/auto-ecoles/mes-dossiers?statut=en_cours

# Seulement les dossiers validés
GET /api/auto-ecoles/mes-dossiers?statut=valide

# Seulement les dossiers rejetés
GET /api/auto-ecoles/mes-dossiers?statut=rejete
```

---

## 🔔 Notifications (À Implémenter)

### Suggestions pour le Futur

Vous pourriez ajouter :

1. **Email au candidat** quand :
   - Son dossier est validé
   - Son dossier est rejeté
   - Un document est rejeté

2. **Email au responsable** quand :
   - Un nouveau dossier arrive
   - Un candidat upload un document

3. **Notifications in-app** :
   - Badge sur le dashboard
   - Liste des notifications

---

## 🎨 Interface Suggérée

### Pour l'Auto-École

```
┌─────────────────────────────────────────────────┐
│  📊 DASHBOARD AUTO-ÉCOLE                        │
├─────────────────────────────────────────────────┤
│                                                  │
│  📈 Statistiques                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │  5   │ │  7   │ │  2   │ │  1   │           │
│  │ 📝   │ │ 🔄   │ │ ✅   │ │ ❌   │           │
│  │Attente│ │Cours │ │Validé│ │Rejeté│           │
│  └──────┘ └──────┘ └──────┘ └──────┘           │
│                                                  │
│  📁 Dossiers en Attente                         │
│  ┌───────────────────────────────────────────┐  │
│  │ CAN-2025-001 - Jean Dupont                │  │
│  │ Formation: Permis B                       │  │
│  │ Documents: 3/4 validés                    │  │
│  │ [Voir] [Valider] [Rejeter]                │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ CAN-2025-002 - Marie Martin               │  │
│  │ Formation: Permis A                       │  │
│  │ Documents: 2/3 validés                    │  │
│  │ [Voir] [Valider] [Rejeter]                │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## ✅ Résumé des Fonctionnalités

### Pour les Auto-Écoles

✅ **Voir tous les dossiers** de leur auto-école  
✅ **Statistiques en temps réel** (en attente, validés, etc.)  
✅ **Filtrer par statut** pour organisation  
✅ **Valider document par document** avec commentaires  
✅ **Valider ou rejeter** le dossier complet  
✅ **Commentaires obligatoires** en cas de rejet  
✅ **Sécurité** : Seul le responsable peut valider  
✅ **Logs complets** de toutes les actions  

### Pour les Candidats

✅ **Voir leurs dossiers** et leur statut  
✅ **Voir les commentaires** de l'auto-école  
✅ **Savoir quels documents** sont validés/rejetés  
✅ **Réuploader** les documents rejetés  

---

## 📚 Documentation Complète

- **Guide Flux Inscription** : `GUIDE_FLUX_INSCRIPTION_COMPLET.md`
- **Guide Validation** : `FLUX_AUTO_ECOLE_VALIDATION.md` (ce fichier)
- **API Complète** : `GUIDE_API_COMPLETE.md`

---

## 🎯 Endpoints Totaux

**Avant** : 50 routes  
**Maintenant** : 53 routes  

**Nouveaux endpoints** :
1. ✅ `GET /api/auto-ecoles/mes-dossiers` - Dossiers de l'auto-école
2. ✅ `POST /api/dossiers/{id}/valider` - Valider/Rejeter dossier
3. ✅ `POST /api/documents/{id}/valider` - Valider/Rejeter document

---

**🎉 Les auto-écoles peuvent maintenant recevoir, vérifier et valider les dossiers des candidats ! 🚀**

