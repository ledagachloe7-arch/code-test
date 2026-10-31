# Documentation API - DGTT Frontend Auto-École

## 📡 Configuration API

### Base URL
```typescript
export const API_CONFIG = {
  BASE_URL: 'https://9c8r7bbvybn.preview.infomaniak.website/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};
```

### Instance Axios
```typescript
// src/shared/services/api.ts
import axios from 'axios';
import { API_CONFIG } from '../constants/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

// Intercepteurs pour l'authentification
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## 🏢 Module Auto-Écoles

### Endpoints

#### Liste des Auto-Écoles
```typescript
GET /api/auto-écoles
```

**Paramètres de requête :**
- `page` (number) : Numéro de page
- `limit` (number) : Nombre d'éléments par page
- `search` (string) : Terme de recherche
- `status` (boolean) : Filtre par statut

**Réponse :**
```typescript
interface AutoEcolesResponse {
  data: AutoEcole[];
  total: number;
  page: number;
  limit: number;
}
```

#### Créer une Auto-École
```typescript
POST /api/auto-écoles
```

**Corps de la requête :**
```typescript
interface CreateAutoEcoleRequest {
  nom_auto_ecole: string;
  adresse: string;
  email: string;
  responsable_id: string;
  contact: string;
  statut: boolean;
}
```

#### Détails d'une Auto-École
```typescript
GET /api/auto-écoles/{id}
```

#### Mettre à jour une Auto-École
```typescript
PUT /api/auto-écoles/{id}
```

#### Supprimer une Auto-École
```typescript
DELETE /api/auto-écoles/{id}
```

### Service Auto-École
```typescript
// src/modules/autoecole/services/autoecoleService.ts
export const autoEcoleService = {
  async getAutoEcoles(page = 1, limit = 10): Promise<AutoEcolesResponse> {
    const response = await api.get('/auto-écoles', {
      params: { page, limit }
    });
    return response.data;
  },

  async getAutoEcoleById(id: string): Promise<AutoEcole> {
    const response = await api.get(`/auto-écoles/${id}`);
    return response.data;
  },

  async createAutoEcole(data: CreateAutoEcoleRequest): Promise<AutoEcole> {
    const response = await api.post('/auto-écoles', data);
    return response.data;
  },

  async updateAutoEcole(id: string, data: Partial<CreateAutoEcoleRequest>): Promise<AutoEcole> {
    const response = await api.put(`/auto-écoles/${id}`, data);
    return response.data;
  },

  async deleteAutoEcole(id: string): Promise<void> {
    await api.delete(`/auto-écoles/${id}`);
  },

  async searchAutoEcoles(searchTerm: string, page = 1, limit = 10): Promise<AutoEcolesResponse> {
    const response = await api.get('/auto-écoles/search', {
      params: { search: searchTerm, page, limit }
    });
    return response.data;
  }
};
```

## 📚 Module Formations

### Endpoints

#### Liste des Formations
```typescript
GET /api/formations
```

#### Créer une Formation
```typescript
POST /api/formations
```

**Corps de la requête :**
```typescript
interface CreateFormationRequest {
  nom_formation: string;
  description: string;
  duree: number;
  prix: number;
  auto_ecole_id: string;
  statut: boolean;
}
```

#### Documents Requis
```typescript
GET /api/formations/{id}/documents-requis
```

#### Formations par Auto-École
```typescript
GET /api/formations/auto-ecole/{id}
```

### Service Formation
```typescript
// src/modules/autoecole/services/formationService.ts
export const formationService = {
  async getFormations(page = 1, limit = 10): Promise<FormationsResponse> {
    const response = await api.get('/formations', {
      params: { page, limit }
    });
    return response.data;
  },

  async getFormationById(id: string): Promise<Formation> {
    const response = await api.get(`/formations/${id}`);
    return response.data;
  },

  async createFormation(data: CreateFormationRequest): Promise<Formation> {
    const response = await api.post('/formations', data);
    return response.data;
  },

  async getFormationsByAutoEcole(autoEcoleId: string, page = 1, limit = 10): Promise<FormationsResponse> {
    const response = await api.get(`/formations/auto-ecole/${autoEcoleId}`, {
      params: { page, limit }
    });
    return response.data;
  },

  async getDocumentsRequis(formationId: string): Promise<DocumentRequis[]> {
    const response = await api.get(`/formations/${formationId}/documents-requis`);
    return response.data;
  }
};
```

## 📋 Module Référentiels

### Endpoints

#### Liste des Référentiels
```typescript
GET /api/référentiels
```

#### Créer un Référentiel
```typescript
POST /api/référentiels
```

**Corps de la requête :**
```typescript
interface CreateReferentielRequest {
  libelle: string;
  code: string;
  type_ref: string;
  description: string;
  statut: boolean;
}
```

#### Référentiels par Type
```typescript
GET /api/référentiels/type/{type}
```

#### Référentiels par Code
```typescript
GET /api/référentiels/code/{code}
```

#### Types de Référentiels
```typescript
GET /api/référentiels/types
```

### Service Référentiel
```typescript
// src/modules/autoecole/services/referentielService.ts
export const referentielService = {
  async getReferentiels(page = 1, limit = 10): Promise<ReferentielsResponse> {
    const response = await api.get('/référentiels', {
      params: { page, limit }
    });
    return response.data;
  },

  async getReferentielById(id: string): Promise<Referentiel> {
    const response = await api.get(`/référentiels/${id}`);
    return response.data;
  },

  async createReferentiel(data: CreateReferentielRequest): Promise<Referentiel> {
    const response = await api.post('/référentiels', data);
    return response.data;
  },

  async getReferentielsByType(type: string): Promise<Referentiel[]> {
    const response = await api.get(`/référentiels/type/${type}`);
    return response.data;
  },

  async getReferentielsByCode(code: string): Promise<Referentiel[]> {
    const response = await api.get(`/référentiels/code/${code}`);
    return response.data;
  },

  async getTypes(): Promise<string[]> {
    const response = await api.get('/référentiels/types');
    return response.data;
  }
};
```

## 🔐 Authentification

### Endpoints d'Authentification
```typescript
// Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

// Refresh Token
POST /api/auth/refresh
{
  "refresh_token": "refresh_token_here"
}

// Logout
POST /api/auth/logout
```

### Gestion des Tokens
```typescript
// src/shared/services/api.ts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Tentative de refresh du token
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await api.post('/auth/refresh', {
          refresh_token: refreshToken
        });
        
        const { access_token } = response.data;
        localStorage.setItem('token', access_token);
        
        // Retry de la requête originale
        return api.request(error.config);
      } catch (refreshError) {
        // Redirection vers login
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

## 📊 Types TypeScript

### Types Principaux
```typescript
// src/modules/autoecole/types/index.ts

export interface AutoEcole {
  id: string;
  nom_auto_ecole: string;
  adresse: string;
  email: string;
  responsable_id: string;
  contact: string;
  statut: boolean;
  created_at: string;
  updated_at: string;
}

export interface Formation {
  id: string;
  nom_formation: string;
  description: string;
  duree: number;
  prix: number;
  auto_ecole_id: string;
  statut: boolean;
  created_at: string;
  updated_at: string;
}

export interface Referentiel {
  id: string;
  libelle: string;
  code: string;
  type_ref: string;
  description: string;
  statut: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentRequis {
  id: string;
  nom: string;
  description: string;
  obligatoire: boolean;
  formation_id: string;
}
```

### Types de Réponse API
```typescript
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
  status: number;
}
```

## 🚨 Gestion des Erreurs

### Intercepteur d'Erreurs
```typescript
// src/shared/services/api.ts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Erreur de réponse du serveur
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          console.error('Requête invalide:', data.message);
          break;
        case 401:
          console.error('Non authentifié');
          break;
        case 403:
          console.error('Accès refusé');
          break;
        case 404:
          console.error('Ressource non trouvée');
          break;
        case 500:
          console.error('Erreur serveur');
          break;
        default:
          console.error('Erreur inconnue:', data.message);
      }
    } else if (error.request) {
      // Erreur de réseau
      console.error('Erreur de réseau:', error.message);
    } else {
      // Autre erreur
      console.error('Erreur:', error.message);
    }
    
    return Promise.reject(error);
  }
);
```

### Gestion des Erreurs dans les Composants
```typescript
// Exemple d'utilisation dans un composant
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    const data = await autoEcoleService.getAutoEcoles();
    setAutoEcoles(data.data);
  } catch (err) {
    setError('Erreur lors du chargement des données');
    console.error(err);
  } finally {
    setLoading(false);
  }
};
```

## 🔄 Service Principal

### Service Unifié
```typescript
// src/modules/autoecole/services/index.ts
import { autoEcoleService } from './autoecoleService';
import { formationService } from './formationService';
import { referentielService } from './referentielService';

class AutoEcoleApiService {
  public readonly autoEcoles = autoEcoleService;
  public readonly formations = formationService;
  public readonly referentiels = referentielService;

  async checkHealth(): Promise<boolean> {
    try {
      await this.autoEcoles.getAutoEcoles(1, 1);
      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification de la santé de l\'API:', error);
      return false;
    }
  }

  async getGlobalStats(): Promise<{
    totalAutoEcoles: number;
    totalFormations: number;
    totalReferentiels: number;
  }> {
    try {
      const [autoEcoles, formations, referentiels] = await Promise.all([
        this.autoEcoles.getAutoEcoles(1, 1),
        this.formations.getFormations(1, 1),
        this.referentiels.getReferentiels(1, 1),
      ]);

      return {
        totalAutoEcoles: autoEcoles.total,
        totalFormations: formations.total,
        totalReferentiels: referentiels.total,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
}

export const autoEcoleApiService = new AutoEcoleApiService();
export default autoEcoleApiService;
```

## 📝 Exemples d'Utilisation

### Dans un Composant React
```typescript
import React, { useState, useEffect } from 'react';
import { autoEcoleApiService } from '../services';

const AutoEcolesList: React.FC = () => {
  const [autoEcoles, setAutoEcoles] = useState<AutoEcole[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAutoEcoles = async () => {
      setLoading(true);
      try {
        const response = await autoEcoleApiService.autoEcoles.getAutoEcoles();
        setAutoEcoles(response.data);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAutoEcoles();
  }, []);

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      {autoEcoles.map(autoEcole => (
        <div key={autoEcole.id}>
          <h3>{autoEcole.nom_auto_ecole}</h3>
          <p>{autoEcole.adresse}</p>
        </div>
      ))}
    </div>
  );
};
```

---

**Dernière mise à jour** : [Date actuelle]
**Version API** : 1.0.0











