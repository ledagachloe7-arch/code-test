# 🏫 API - Liste des Auto-Écoles pour Candidats

## 📋 Vue d'ensemble

Cette documentation explique comment les candidats connectés peuvent récupérer la liste de toutes les auto-écoles disponibles dans le système.

## 🔗 Endpoint

### Récupérer la liste des auto-écoles

```http
GET /api/auto-ecoles
Authorization: Bearer {token}
```

**Description :** Récupère la liste paginée de toutes les auto-écoles avec leurs informations de base.

## 🔐 Authentification

- **Requis :** Oui
- **Type :** Bearer Token
- **Rôles autorisés :** Tous les utilisateurs connectés (candidats, responsables, administrateurs)

## 📥 Paramètres de requête

| Paramètre | Type | Requis | Description | Exemple |
|-----------|------|--------|-------------|---------|
| `page` | integer | Non | Numéro de page | `1` |
| `per_page` | integer | Non | Nombre d'éléments par page (défaut: 15) | `20` |
| `statut` | boolean | Non | Filtrer par statut (true=actif, false=inactif) | `true` |

## 📤 Réponse

### Structure de la réponse

```json
{
  "data": [
    {
      "id": "019a0e34-d153-7330-8cb6-80b14fd8811c",
      "nom_auto_ecole": "Auto-École Excellence",
      "adresse": "123 Avenue Principale, 75001 Paris",
      "email": "contact@excellence.com",
      "responsable_id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
      "contact": "0612345678",
      "statut": true,
      "statut_libelle": "Active",
      "responsable": {
        "id": "019a0e35-d154-7331-8cb7-80b14fd8812d",
        "nom": "Dupont",
        "prenom": "Jean",
        "email": "jean.dupont@excellence.com",
        "contact": "0612345678",
        "adresse": "123 Avenue Principale, 75001 Paris"
      },
      "created_at": "2025-10-24T14:30:00.000000Z",
      "updated_at": "2025-10-24T14:30:00.000000Z"
    }
  ],
  "links": {
    "first": "http://localhost:8000/api/auto-ecoles?page=1",
    "last": "http://localhost:8000/api/auto-ecoles?page=3",
    "prev": null,
    "next": "http://localhost:8000/api/auto-ecoles?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 3,
    "path": "http://localhost:8000/api/auto-ecoles",
    "per_page": 15,
    "to": 15,
    "total": 45
  }
}
```

### Détail des champs

#### Auto-École
| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Identifiant unique de l'auto-école |
| `nom_auto_ecole` | string | Nom de l'auto-école |
| `adresse` | string | Adresse complète de l'auto-école |
| `email` | string | Email de contact de l'auto-école |
| `responsable_id` | string (UUID) | ID du responsable de l'auto-école |
| `contact` | string | Numéro de téléphone de contact |
| `statut` | boolean | Statut de l'auto-école (true=active, false=inactive) |
| `statut_libelle` | string | Libellé du statut ("Active" ou "Inactive") |
| `responsable` | object | Informations du responsable |
| `created_at` | string (ISO 8601) | Date de création |
| `updated_at` | string (ISO 8601) | Date de dernière modification |

#### Responsable
| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Identifiant unique du responsable |
| `nom` | string | Nom de famille du responsable |
| `prenom` | string | Prénom du responsable |
| `email` | string | Email du responsable |
| `contact` | string | Numéro de téléphone du responsable |
| `adresse` | string | Adresse du responsable |

#### Métadonnées de pagination
| Champ | Type | Description |
|-------|------|-------------|
| `current_page` | integer | Page actuelle |
| `last_page` | integer | Dernière page |
| `per_page` | integer | Nombre d'éléments par page |
| `total` | integer | Nombre total d'éléments |
| `from` | integer | Premier élément de la page |
| `to` | integer | Dernier élément de la page |

## 🔍 Exemples d'utilisation

### 1. Récupérer toutes les auto-écoles (première page)

```bash
curl -X GET "http://localhost:8000/api/auto-ecoles" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

### 2. Récupérer seulement les auto-écoles actives

```bash
curl -X GET "http://localhost:8000/api/auto-ecoles?statut=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

### 3. Récupérer 20 auto-écoles par page

```bash
curl -X GET "http://localhost:8000/api/auto-ecoles?per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

### 4. Récupérer la page 2

```bash
curl -X GET "http://localhost:8000/api/auto-ecoles?page=2" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

## 💻 Utilisation côté frontend

### JavaScript/TypeScript

```javascript
// Fonction pour récupérer les auto-écoles
const getAutoEcoles = async (token, options = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (options.page) params.append('page', options.page);
    if (options.perPage) params.append('per_page', options.perPage);
    if (options.statut !== undefined) params.append('statut', options.statut);
    
    const response = await fetch(`/api/auto-ecoles?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Erreur lors de la récupération des auto-écoles:', error);
    throw error;
  }
};

// Exemple d'utilisation
const loadAutoEcoles = async () => {
  try {
    const token = localStorage.getItem('access_token');
    const result = await getAutoEcoles(token, {
      page: 1,
      perPage: 20,
      statut: true // Seulement les auto-écoles actives
    });
    
    console.log('Auto-écoles:', result.data);
    console.log('Total:', result.meta.total);
    console.log('Pages:', result.meta.last_page);
    
    // Afficher les auto-écoles dans l'interface
    displayAutoEcoles(result.data);
    
  } catch (error) {
    console.error('Impossible de charger les auto-écoles:', error);
  }
};

// Fonction pour afficher les auto-écoles
const displayAutoEcoles = (autoEcoles) => {
  const container = document.getElementById('auto-ecoles-list');
  
  autoEcoles.forEach(autoEcole => {
    const card = document.createElement('div');
    card.className = 'auto-ecole-card';
    card.innerHTML = `
      <h3>${autoEcole.nom_auto_ecole}</h3>
      <p><strong>Adresse:</strong> ${autoEcole.adresse}</p>
      <p><strong>Contact:</strong> ${autoEcole.contact}</p>
      <p><strong>Email:</strong> ${autoEcole.email}</p>
      <p><strong>Responsable:</strong> ${autoEcole.responsable.prenom} ${autoEcole.responsable.nom}</p>
      <p><strong>Statut:</strong> ${autoEcole.statut_libelle}</p>
    `;
    container.appendChild(card);
  });
};
```

### React

```jsx
import React, { useState, useEffect } from 'react';

const AutoEcolesList = () => {
  const [autoEcoles, setAutoEcoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchAutoEcoles();
  }, []);

  const fetchAutoEcoles = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`/api/auto-ecoles?page=${page}&statut=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des auto-écoles');
      }

      const data = await response.json();
      setAutoEcoles(data.data);
      setPagination(data.meta);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Chargement des auto-écoles...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      <h2>Liste des Auto-Écoles</h2>
      <div className="auto-ecoles-grid">
        {autoEcoles.map(autoEcole => (
          <div key={autoEcole.id} className="auto-ecole-card">
            <h3>{autoEcole.nom_auto_ecole}</h3>
            <p><strong>Adresse:</strong> {autoEcole.adresse}</p>
            <p><strong>Contact:</strong> {autoEcole.contact}</p>
            <p><strong>Email:</strong> {autoEcole.email}</p>
            <p><strong>Responsable:</strong> {autoEcole.responsable.prenom} {autoEcole.responsable.nom}</p>
            <p><strong>Statut:</strong> {autoEcole.statut_libelle}</p>
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      <div className="pagination">
        <button 
          onClick={() => fetchAutoEcoles(pagination.current_page - 1)}
          disabled={pagination.current_page === 1}
        >
          Précédent
        </button>
        <span>Page {pagination.current_page} sur {pagination.last_page}</span>
        <button 
          onClick={() => fetchAutoEcoles(pagination.current_page + 1)}
          disabled={pagination.current_page === pagination.last_page}
        >
          Suivant
        </button>
      </div>
    </div>
  );
};

export default AutoEcolesList;
```

## ⚠️ Codes d'erreur

| Code | Description | Solution |
|------|-------------|----------|
| `401` | Non authentifié | Vérifier le token d'authentification |
| `403` | Accès refusé | Vérifier les permissions de l'utilisateur |
| `422` | Erreur de validation | Vérifier les paramètres de requête |
| `500` | Erreur serveur | Contacter l'administrateur |

## 📝 Notes importantes

1. **Authentification requise :** L'endpoint nécessite un token d'authentification valide
2. **Pagination :** Les résultats sont paginés par défaut (15 éléments par page)
3. **Filtrage :** Possibilité de filtrer par statut (actif/inactif)
4. **Relations :** Les informations du responsable sont incluses automatiquement
5. **Tri :** Les auto-écoles sont triées par date de création (plus récentes en premier)

## 🔗 Endpoints liés

- `GET /api/auto-ecoles/{id}` - Détails d'une auto-école spécifique
- `GET /api/auto-ecoles/{id}/formations` - Formations d'une auto-école
- `GET /api/formations` - Liste des formations disponibles

---

**Version :** 1.0.0  
**Dernière mise à jour :** 24 octobre 2025
