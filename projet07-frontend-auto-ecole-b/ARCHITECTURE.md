# Architecture du Projet DGTT Auto-École

## Vue d'ensemble
Application de gestion d'auto-école développée avec React.js + TypeScript, utilisant une architecture modulaire.

## Structure du projet

```
src/
├── modules/                    # Modules métier
│   ├── auth/                  # Module d'authentification
│   │   ├── forms/             # Composants de formulaires (LoginForm, etc.)
│   │   ├── tables/            # Tableaux (liste d'utilisateurs, logs, etc.)
│   │   ├── services/          # Logique métier (mock pour le moment)
│   │   ├── types/             # Types & interfaces TypeScript
│   │   └── index.ts
│   │
│   ├── validation/            # Module de validation d'inscription
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── eleves/                # Module de gestion des élèves
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   │
│   └── cnepc/                 # Module d'envoi de dossiers CNEPC
│       ├── forms/
│       ├── tables/
│       ├── services/
│       ├── types/
│       └── index.ts
│
├── shared/                    # Ressources partagées
│   ├── components/            # Composants génériques (Button, Modal, Input, etc.)
│   ├── hooks/                 # Hooks réutilisables (useFetch, usePagination…)
│   ├── utils/                 # Fonctions utilitaires
│   ├── mocks/                 # Données mockées globales (liste d'élèves, users…)
│   └── constants/             # Constantes globales (routes, statuts…)
│
├── routes/                    # Définition des routes par module
├── store/                     # Zustand store global
├── App.tsx
└── main.tsx
```

## Technologies utilisées

- **Frontend**: React.js + TypeScript
- **UI Framework**: TailwindCSS + daisyUI + Material-UI
- **Gestion d'état**: Zustand
- **Routing**: React Router
- **Requêtes API**: Axios
- **Notifications**: React Hot Toast
- **Validation formulaires**: React Hook Form + Zod
- **Build**: Vite

## Modules fonctionnels

### 1. Authentification (`/auth`)
- Interface de connexion avec email + mot de passe
- Gestion du token JWT (localStorage sécurisé)
- Redirection après authentification
- Gestion des erreurs et déconnexion

### 2. Validation d'inscription (`/validation`)
- Liste des élèves inscrits avec statut
- Filtrage et recherche d'élèves
- Consultation des dossiers
- Actions de validation/invalidation
- Notifications de succès/erreur

### 3. Gestion des élèves (`/eleves`)
- Affichage de la liste des élèves
- Accès aux dossiers individuels
- Upload de documents obligatoires :
  - Carte d'identité
  - Photo
  - Certificat médical
  - Attestation d'aptitude (CNEPC)
- Prévisualisation et suppression de documents
- Sauvegarde automatique et validation finale

### 4. Envoi Dossier CNEPC (`/cnepc`)
- Sélection des dossiers complets
- Génération de lots (batch)
- Envoi au CNEPC
- Historique des envois
- Statuts : en attente / envoyé / confirmé

## Installation et démarrage

```bash
# Installation des dépendances
pnpm install

# Démarrage du serveur de développement
pnpm dev

# Build de production
pnpm build
```

## Conventions de code

- **Composants**: PascalCase (ex: `LoginForm`)
- **Hooks**: camelCase avec préfixe `use` (ex: `useAuth`)
- **Services**: camelCase avec suffixe `Service` (ex: `authService`)
- **Types**: PascalCase (ex: `User`, `Student`)
- **Constantes**: UPPER_SNAKE_CASE (ex: `ROUTES`, `STATUS`)

## Structure des modules

Chaque module suit la même structure :
- `forms/`: Composants de formulaires
- `tables/`: Composants de tableaux
- `services/`: Logique métier et appels API
- `types/`: Types et interfaces TypeScript
- `index.ts`: Exports du module
