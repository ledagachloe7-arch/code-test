
# DGTT Frontend Auto-École

## Vue d'ensemble

Application React.js + TypeScript pour la gestion des dossiers d'auto-écoles validées par le ministère du transport. Plateforme destinée aux auto-écoles pour la gestion de leurs élèves et la transmission des dossiers au CNEPC.

## Architecture

### **Structure des modules**
```
src/
├── modules/
│   ├── auth/          # Authentification
│   ├── validation/    # Validation des dossiers
│   ├── eleves/        # Gestion des élèves
│   └── cnepc/         # Envoi au CNEPC
├── shared/            # Composants partagés
├── routes/            # Navigation
└── store/             # État global
```

### **Services mockés**
- **Authentification** : Connexion, déconnexion, rafraîchissement
- **Validation** : Validation et rejet des élèves
- **Élèves** : CRUD des élèves et gestion des documents
- **CNEPC** : Gestion des lots et envoi au CNEPC

## Fonctionnalités

### **✅ Authentification**
- Formulaire de connexion avec validation
- Gestion des sessions
- Protection des routes
- Services mockés complets

### **✅ Navigation**
- Routes protégées
- Navigation contextuelle
- Pages par module
- Gestion des erreurs 404

### **✅ Services**
- Tous les services utilisent des mocks
- Simulation réaliste des délais
- Gestion d'erreurs robuste
- Préparation pour l'API réelle

### **✅ Interface utilisateur**
- Material-UI pour les composants
- Design cohérent
- Responsive design
- Notifications utilisateur

## Utilisation

### **Connexion**
- **Administrateur DGTT** : `admin@dgtt.com` / `password123`
- **Auto-École du Centre** : `autoecole.centre@email.com` / `password123`
- **Auto-École du Nord** : `autoecole.nord@email.com` / `password123`
- **Auto-École du Sud** : `autoecole.sud@email.com` / `password123`

### **Navigation**
- Dashboard : Vue d'ensemble avec cartes de navigation
- Validation : Interface de validation des dossiers
- Élèves : Gestion des élèves et documents
- CNEPC : Envoi des dossiers au CNEPC

## Développement

### **Services mockés**
Tous les services utilisent des mocks pour le développement :
- Délais de réponse simulés
- Données de test réalistes
- Gestion d'erreurs variées
- Structure prête pour l'API réelle

### **Types TypeScript**
- Interfaces complètes
- Validation des données
- Gestion d'erreurs typée
- Compatibilité entre modules

### **État global**
- React Context + useReducer
- Gestion de l'authentification
- Persistance des données
- Actions typées

## Migration vers API réelle

### **Étapes de migration**
1. Décommenter les fonctions API dans les services
2. Remplacer les appels mock par les appels API
3. Tester la connectivité
4. Ajuster la gestion d'erreurs

### **Structure préparée**
```typescript
// Version API future (commentée)
// export async function login(credentials: LoginRequest): Promise<AuthResponse> {
//   const { data } = await axios.post("/auth/login", credentials);
//   return data;
// }
```

## Technologies

- **React 18** : Framework principal
- **TypeScript** : Typage statique
- **Material-UI** : Composants UI
- **React Router** : Navigation
- **Axios** : Requêtes HTTP (préparé)
- **Vite** : Build tool

## Scripts

```bash
# Développement
npm run dev

# Build
npm run build

# Linting
npm run lint
```

## État actuel

### **✅ Fonctionnel**
- Authentification complète
- Navigation entre modules
- Services mockés
- Interface utilisateur
- Gestion d'erreurs

### **🔄 En développement**
- Intégration des composants de validation
- Interface de gestion des élèves
- Envoi au CNEPC
- Tests automatisés

### **📋 À venir**
- Migration vers API réelle
- Tests end-to-end
- Optimisations de performance
- Documentation utilisateur

## Contribution

1. Fork le projet
2. Créer une branche feature
3. Commiter les changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## Licence

Projet privé - DGTT Auto-École

---

**L'application est maintenant prête pour le développement avec des services mockés complets !** 🎯
