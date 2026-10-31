# Store Global - Gestion d'état

## Vue d'ensemble

Le store global utilise React Context API avec useReducer pour gérer l'état de l'application, en particulier l'authentification. Cette approche est une alternative robuste à Zustand qui évite les problèmes de dépendances.

## Architecture

### **Provider Pattern**
- `AppProvider` : Wraps l'application pour fournir le contexte
- `useAppStore` : Hook pour accéder au store dans les composants

### **État géré**
- **Authentification** : User, token, statut de connexion
- **Chargement** : État de loading global
- **Actions** : Login, logout, gestion du loading

## Utilisation

### **1. Configuration de l'App**

```tsx
// App.tsx
import { AppProvider } from './store';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        {/* Votre application */}
      </BrowserRouter>
    </AppProvider>
  );
}
```

### **2. Utilisation dans les composants**

```tsx
import { useAppStore } from '../store';

const MyComponent = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    login, 
    logout, 
    setLoading 
  } = useAppStore();

  const handleLogin = async () => {
    setLoading(true);
    try {
      // Logique de connexion
      const user = await authService.login(email, password);
      login(user, 'jwt-token');
    } catch (error) {
      // Gestion d'erreur
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <p>Bienvenue {user?.name}!</p>
      ) : (
        <button onClick={handleLogin}>Se connecter</button>
      )}
    </div>
  );
};
```

### **3. Actions disponibles**

#### **login(user: User, token: string)**
- Connecte un utilisateur
- Met à jour l'état d'authentification
- Stocke le token

#### **logout()**
- Déconnecte l'utilisateur
- Nettoie l'état
- Supprime le token

#### **setLoading(loading: boolean)**
- Contrôle l'état de chargement
- Utile pour les actions asynchrones

### **4. État accessible**

```tsx
interface AuthState {
  user: User | null;           // Utilisateur connecté
  token: string | null;        // Token JWT
  isAuthenticated: boolean;    // Statut de connexion
  isLoading: boolean;          // État de chargement
}
```

## Avantages

### **✅ Simplicité**
- Pas de dépendances externes
- API React native
- TypeScript intégré

### **✅ Performance**
- Re-renders optimisés
- Context sélectif
- Pas de surcharge

### **✅ Maintenabilité**
- Code lisible
- Actions typées
- État prévisible

## Migration depuis Zustand

Si vous voulez revenir à Zustand plus tard :

```tsx
// Ancien (Zustand)
const { user, login } = useAppStore();

// Nouveau (Context)
const { user, login } = useAppStore(); // Même API !
```

## Exemples d'usage

### **Composant de connexion**

```tsx
const LoginForm = () => {
  const { login, setLoading, isLoading } = useAppStore();
  
  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await authService.login(data.email, data.password);
      login(result.user, result.token);
    } catch (error) {
      // Gestion d'erreur
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Formulaire */}
      <button disabled={isLoading}>
        {isLoading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
};
```

### **Composant de navigation**

```tsx
const Navigation = () => {
  const { user, isAuthenticated, logout } = useAppStore();

  return (
    <nav>
      {isAuthenticated ? (
        <div>
          <span>Bonjour {user?.name}</span>
          <button onClick={logout}>Déconnexion</button>
        </div>
      ) : (
        <Link to="/login">Connexion</Link>
      )}
    </nav>
  );
};
```

### **Protection de routes**

```tsx
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAppStore();
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};
```

## Bonnes pratiques

### **1. Éviter les re-renders**
```tsx
// ❌ Mauvais - re-render à chaque changement
const { user, token, isAuthenticated, isLoading } = useAppStore();

// ✅ Bon - sélectionner seulement ce dont vous avez besoin
const { user } = useAppStore();
```

### **2. Gestion d'erreurs**
```tsx
const handleAction = async () => {
  setLoading(true);
  try {
    await someAsyncAction();
  } catch (error) {
    // Gestion d'erreur
  } finally {
    setLoading(false);
  }
};
```

### **3. Types TypeScript**
```tsx
// Toujours typer les actions
const login = (user: User, token: string) => {
  // Implementation
};
```

Le store est maintenant robuste, performant et prêt pour la production ! 🎯
