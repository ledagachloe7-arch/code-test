# Services d'authentification - Mocks

## Vue d'ensemble

Les services d'authentification utilisent des mocks pour simuler les appels API pendant le développement. Cette approche permet de développer l'interface utilisateur sans dépendre d'un backend réel.

## Structure des services

### **1. auth.service.ts**
Service principal d'authentification avec mocks.

**Fonctions disponibles :**
- `loginMock(credentials)` - Connexion mockée
- `logoutMock()` - Déconnexion mockée  
- `refreshTokenMock()` - Rafraîchissement de token mocké
- `checkCNEPCStatusMock()` - Vérification du statut CNEPC mockée

### **2. authService.ts**
Wrapper du service avec gestion d'erreurs.

**Méthodes :**
- `login(credentials)` - Connexion avec gestion d'erreurs
- `logout()` - Déconnexion avec gestion d'erreurs
- `refreshToken()` - Rafraîchissement avec gestion d'erreurs
- `checkCNEPCStatus()` - Vérification CNEPC avec gestion d'erreurs

## Utilisation des mocks

### **Connexion mockée**
```typescript
// Dans LoginForm.tsx
const authResponse = await authService.login({
  email: formData.email,
  password: formData.password,
});
```

### **Données mockées**
```typescript
// Utilisateurs disponibles pour les tests
const mockUsers = [
  {
    id: '1',
    email: 'admin@dgtt.com',
    name: 'Administrateur',
    role: 'admin',
    password: 'password123'
  },
  {
    id: '2', 
    email: 'instructeur@dgtt.com',
    name: 'Instructeur',
    role: 'instructor',
    password: 'password123'
  }
];
```

### **Simulation des délais**
```typescript
// Tous les mocks simulent des délais réseau
setTimeout(() => {
  resolve(response);
}, 500); // 500ms de délai
```

## Gestion des erreurs

### **Erreurs simulées**
- Identifiants invalides
- Erreurs de réseau
- Erreurs de serveur

### **Exemple d'utilisation**
```typescript
try {
  const authResponse = await authService.login(credentials);
  // Succès
} catch (error) {
  // Gestion d'erreur
  setMessage({ type: 'error', text: error.message });
}
```

## Migration vers API réelle

### **Préparation pour l'API**
```typescript
// Version API future (commentée)
// export async function login(credentials: LoginRequest): Promise<AuthResponse> {
//   const { data } = await axios.post("/auth/login", credentials);
//   return data;
// }
```

### **Étapes de migration**
1. Décommenter les fonctions API
2. Remplacer les appels mock par les appels API
3. Tester la connectivité
4. Ajuster la gestion d'erreurs

## Types utilisés

### **User**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'instructor' | 'student';
  createdAt: Date;
}
```

### **AuthResponse**
```typescript
interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}
```

### **LoginRequest**
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

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

## Tests

### **Scénarios de test**
- Connexion réussie
- Identifiants invalides
- Erreurs de réseau
- Déconnexion

### **Données de test**
- Utilisateurs valides
- Mots de passe de test
- Rôles différents

Les services mockés permettent un développement fluide et une transition facile vers l'API réelle ! 🎯
