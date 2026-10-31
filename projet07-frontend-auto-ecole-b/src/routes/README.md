# Routes - Navigation de l'application

## Vue d'ensemble

Le système de routes utilise React Router v6 avec une architecture modulaire et une protection des routes basée sur l'authentification.

## Structure des routes

### **Routes publiques**
- `/` - Redirection vers le dashboard (si connecté) ou login
- `/login` - Page de connexion

### **Routes protégées**
- `/dashboard` - Tableau de bord principal
- `/validation` - Validation des dossiers
- `/eleves` - Gestion des élèves
- `/cnepc` - Envoi au CNEPC

### **Routes spéciales**
- `*` - Page 404 (route non trouvée)

## Architecture

### **Protection des routes**
```tsx
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppStore();
  return isAuthenticated ? 
    React.createElement(React.Fragment, null, children) : 
    React.createElement(Navigate, { to: ROUTES.LOGIN, replace: true });
};
```

### **Navigation**
- Utilise `useNavigate` de React Router
- Redirection automatique selon l'état d'authentification
- Navigation contextuelle avec boutons retour

## Pages

### **1. DashboardPage**
- **Route** : `/dashboard`
- **Fonctionnalités** :
  - Navigation vers les modules
  - Statistiques rapides
  - Barre de navigation avec logout
  - Cartes interactives pour chaque module

### **2. ValidationPage**
- **Route** : `/validation`
- **Fonctionnalités** :
  - Interface de validation des dossiers
  - Navigation retour vers dashboard
  - Barre de navigation dédiée

### **3. ElevesPage**
- **Route** : `/eleves`
- **Fonctionnalités** :
  - Gestion des élèves
  - Navigation retour vers dashboard
  - Interface dédiée aux élèves

### **4. CNEPCPage**
- **Route** : `/cnepc`
- **Fonctionnalités** :
  - Envoi des dossiers au CNEPC
  - Navigation retour vers dashboard
  - Interface d'envoi

## Navigation

### **Navigation programmatique**
```tsx
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../shared/constants';

const navigate = useNavigate();
navigate(ROUTES.DASHBOARD);
```

### **Navigation avec boutons**
```tsx
<Button onClick={() => navigate(ROUTES.ELEVES)}>
  Aller aux élèves
</Button>
```

### **Navigation de retour**
```tsx
<IconButton onClick={() => navigate(ROUTES.DASHBOARD)}>
  <ArrowBack />
</IconButton>
```

## Constantes de routes

```tsx
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  VALIDATION: '/validation',
  ELEVES: '/eleves',
  CNEPC: '/cnepc',
} as const;
```

## Gestion d'état

### **Authentification**
- Vérification automatique de l'état de connexion
- Redirection vers login si non connecté
- Protection de toutes les routes sauf login

### **Navigation contextuelle**
- Boutons de retour sur chaque page
- Navigation cohérente entre les modules
- Indicateurs visuels de la page active

## Exemples d'usage

### **Page avec navigation**
```tsx
const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAppStore();

  return (
    <Box>
      <AppBar>
        <Toolbar>
          <IconButton onClick={() => navigate(ROUTES.DASHBOARD)}>
            <ArrowBack />
          </IconButton>
          <Typography>Ma Page</Typography>
          <Button onClick={logout}>Déconnexion</Button>
        </Toolbar>
      </AppBar>
      {/* Contenu */}
    </Box>
  );
};
```

### **Redirection conditionnelle**
```tsx
const ConditionalRedirect: React.FC = () => {
  const { isAuthenticated } = useAppStore();
  
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  
  return <MyContent />;
};
```

## Bonnes pratiques

### **1. Protection des routes**
- Toujours utiliser `ProtectedRoute` pour les pages sensibles
- Vérifier l'authentification avant l'accès
- Redirection automatique vers login

### **2. Navigation cohérente**
- Boutons de retour sur chaque page
- Navigation contextuelle
- Indicateurs visuels de la page active

### **3. Gestion des erreurs**
- Route 404 pour les pages non trouvées
- Redirection gracieuse en cas d'erreur
- Messages d'erreur utilisateur

### **4. Performance**
- Lazy loading des composants lourds
- Code splitting par module
- Optimisation des re-renders

## Évolutions futures

### **Fonctionnalités à ajouter**
- Lazy loading des pages
- Breadcrumbs de navigation
- Historique de navigation
- Navigation par clavier
- Animations de transition

### **Optimisations**
- Code splitting par route
- Préchargement des pages
- Cache des composants
- Optimisation des bundles

Le système de routes est maintenant robuste, sécurisé et prêt pour la production ! 🎯
