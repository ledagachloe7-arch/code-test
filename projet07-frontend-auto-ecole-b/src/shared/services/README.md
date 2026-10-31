# Architecture des Services Mockés

## Vue d'ensemble

L'application utilise des services mockés pour simuler les appels API pendant le développement. Cette approche permet de développer l'interface utilisateur sans dépendre d'un backend réel.

## Structure des services

### **Modules avec services mockés**

#### **1. Authentification (`src/modules/auth/services/`)**
- `auth.service.ts` - Service principal avec mocks
- `authService.ts` - Wrapper avec gestion d'erreurs
- `types.ts` - Types TypeScript
- `README.md` - Documentation du module

#### **2. Validation (`src/modules/validation/services/`)**
- `validation.service.ts` - Service de validation avec mocks
- `studentService.ts` - Service des élèves pour validation
- Types et documentation inclus

#### **3. Élèves (`src/modules/eleves/services/`)**
- `eleve.service.ts` - Service des élèves avec mocks
- `documentService.ts` - Service de gestion des documents
- Types et documentation inclus

#### **4. CNEPC (`src/modules/cnepc/services/`)**
- `cnepc.service.ts` - Service CNEPC avec mocks
- `batchService.ts` - Service de gestion des lots
- Types et documentation inclus

## Principes des services mockés

### **1. Simulation réaliste**
```typescript
// Délais de réponse appropriés
setTimeout(() => {
  resolve(response);
}, 500); // 500ms de délai
```

### **2. Gestion d'erreurs**
```typescript
// Erreurs variées
if (credentials.password !== 'password123') {
  reject(new Error('Identifiants invalides'));
}
```

### **3. Données cohérentes**
```typescript
// Données mockées réalistes
const mockUsers = [
  {
    id: '1',
    email: 'admin@dgtt.com',
    name: 'Administrateur',
    role: 'admin'
  }
];
```

## Avantages des services mockés

### **1. Développement indépendant**
- Pas de dépendance au backend
- Développement frontend autonome
- Tests d'interface utilisateur

### **2. Simulation d'erreurs**
- Test des cas d'échec
- Gestion d'erreurs robuste
- Interface utilisateur résiliente

### **3. Données de test**
- Utilisateurs de test
- Scénarios variés
- Données cohérentes

## Migration vers API réelle

### **Structure préparée**
```typescript
// Version API future (commentée)
// export async function login(credentials: LoginRequest): Promise<AuthResponse> {
//   const { data } = await axios.post("/auth/login", credentials);
//   return data;
// }
```

### **Étapes de migration**
1. **Décommenter les fonctions API**
2. **Remplacer les appels mock**
3. **Tester la connectivité**
4. **Ajuster la gestion d'erreurs**

## Gestion des erreurs

### **Types d'erreurs simulées**
- Erreurs de validation
- Erreurs de réseau
- Erreurs de serveur
- Erreurs d'authentification

### **Exemple de gestion**
```typescript
try {
  const response = await authService.login(credentials);
  // Succès
} catch (error) {
  // Gestion d'erreur
  setMessage({ type: 'error', text: error.message });
}
```

## Types et interfaces

### **Types communs**
- `User` - Utilisateur
- `AuthResponse` - Réponse d'authentification
- `LoginRequest` - Demande de connexion

### **Types spécifiques**
- `Student` - Élève
- `Document` - Document
- `Batch` - Lot CNEPC

## Bonnes pratiques

### **1. Simulation réaliste**
- Délais de réponse appropriés
- Erreurs variées
- Données cohérentes

### **2. Gestion d'erreurs**
- Messages d'erreur clairs
- Gestion des cas d'échec
- Logging des erreurs

### **3. Préparation API**
- Structure similaire à l'API réelle
- Types compatibles
- Gestion d'erreurs cohérente

## Tests et validation

### **Scénarios de test**
- Connexion réussie
- Identifiants invalides
- Erreurs de réseau
- Déconnexion

### **Données de test**
- Utilisateurs valides
- Mots de passe de test
- Rôles différents

## Évolutions futures

### **Fonctionnalités à ajouter**
- Cache des données mockées
- Persistance des données
- Simulation de déconnexions
- Tests automatisés

### **Optimisations**
- Lazy loading des services
- Code splitting par module
- Optimisation des performances

L'architecture des services mockés permet un développement fluide et une transition facile vers l'API réelle ! 🎯
