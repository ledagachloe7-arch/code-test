# 📖 WIKI & REGISTRE DES MODIFICATIONS

> **Projet :** Système de Gestion du Permis de Conduire (DGTT)  
> **Branche de travail :** `yaf-test-branch`  
> **Dernière mise à jour :** 1er Novembre 2026  
> **Auteur / Suivi :** Équipe Projet & Antigravity  

Ce document constitue le **Wiki officiel et le journal de bord** de la branche `yaf-test-branch`. Il centralise l'architecture, la configuration des environnements, l'état des bases de données Supabase, les comptes d'accès, ainsi que le registre exhaustif de toutes les améliorations et corrections apportées.

---

## 📑 Sommaire
1. [Architecture & Dépôts](#1-architecture--dépôts)
2. [Bases de Données Supabase & Restauration](#2-bases-de-données-supabase--restauration)
3. [Serveur de Cache Redis (Docker)](#3-serveur-de-cache-redis-docker)
4. [Authentification & Comptes de Test](#4-authentification--comptes-de-test)
5. [Journal des Modifications & Optimisations (Changelog)](#5-journal-des-modifications--optimisations-changelog)
6. [Procédure de Démarrage Local](#6-procédure-de-démarrage-local)
7. [Guide pour les Prochaines Modifications](#7-guide-pour-les-prochaines-modifications)

---

## 1. Architecture & Dépôts

Le projet est composé de deux briques applicatives principales :

* **Backend (`projet04-backend-permis-conduire`)** :
  * Framework : **Laravel 12**
  * Runtime PHP : PHP 8.5.0
  * Rôle : API REST, gestion des candidats, des auto-écoles, des circuits de validation de dossiers, paiements, authentification, notifications.
  * URL locale de dev : `http://127.0.0.1:8000`

* **Frontend (`projet07-frontend-auto-ecole-b`)** :
  * Framework : **React 18 + TypeScript + Vite 5**
  * Gestionnaire de paquets : **pnpm** (v10)
  * Composants UI : MUI (Material-UI) + Tailwind CSS + DaisyUI
  * Rôle : Interface portail Auto-école & Administration DGTT / CNEPC.
  * URL locale de dev : `http://localhost:3000` (Reverse proxy Vite vers `http://127.0.0.1:8000/api`)

---

## 2. Bases de Données Supabase & Restauration

Deux bases de données PostgreSQL sont hébergées sur le Cloud **Supabase** et connectées via SSL :

| Base | Hôte Supabase Pooler (IPv4) | Fichier Dump Associé | État & Contenu |
| :--- | :--- | :--- | :--- |
| **Principale (Métier)** | `aws-0-eu-north-1.pooler.supabase.com:5432` | `permisdc_roles_test.dump` | **Restaurée** : 37 tables (`utilisateurs`, `auto_ecoles`, `candidats`, `dossiers`, `roles`, `role_has_permissions`, etc.) |
| **Registre Permis** | `aws-0-eu-west-1.pooler.supabase.com:5432` | `registre_permis_test.dump` | **Restaurée** : 2 tables (`registre_permis`, `migrations`), 100 dossiers dans `registre_permis` |

### Configuration `.env` Backend :
```ini
DB_CONNECTION=pgsql
DB_HOST=aws-0-eu-north-1.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.kuhjyhkmretjwoyxpjkz
DB_PASSWORD=AHhqfG43M91Cez4y
DB_SSLMODE=require

REGISTRE_DB_HOST=aws-0-eu-west-1.pooler.supabase.com
REGISTRE_DB_PORT=5432
REGISTRE_DB_DATABASE=postgres
REGISTRE_DB_USERNAME=postgres.tqwilvmlzwajlipxczgr
REGISTRE_DB_PASSWORD=ZDCzdwDSo60FkZbC
REGISTRE_DB_SSLMODE=require
```

---

## 3. Serveur de Cache Redis (Docker)

Afin d'éliminer la latence réseau vers Supabase (hébergé en Europe du Nord) et de décharger le serveur PHP local, un serveur de cache **Redis** a été intégré au système.

### Caractéristiques du Conteneur :
* **Nom du conteneur :** `redis-server`
* **Image :** `redis:7-alpine`
* **Port :** `6379:6379`
* **Politique de redémarrage :** `--restart unless-stopped`
* **Commande de démarrage :**
  ```powershell
  docker run -d --name redis-server -p 6379:6379 --restart unless-stopped redis:7-alpine
  ```

### Configuration Laravel (`.env`) :
```ini
CACHE_STORE=redis
REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

### Mécanisme de Caching & Tags :
* **Client Predis :** Utilisé car PHP 8.5 sous Laragon ne dispose pas de l'extension C compilée `phpredis`, tandis que `predis/predis: ^3.3` est intégré dans les dépendances du projet.
* **Cache Tags (`Cache::tags([...])`) :** Redis permet l'étiquetage fin des clés de cache par entité métier (`referentiels`, `roles`, `role_has_permissions`, `dossiers`, `auto_ecoles`, `candidats`, etc.). Lors de toute action d'écriture (création, mise à jour, suppression), seul le tag correspondant est invalidé sans vider tout le cache applicatif.

---

## 4. Authentification & Comptes de Test

### Mode de connexion
L'interface de connexion utilise la route API **`POST /api/auth/login-direct`**.
* **Fonctionnement :** La méthode vérifie directement l'identifiant (email ou téléphone) et le mot de passe (via `Hash::check` bcrypt) dans la table `utilisateurs` de la base Supabase.
* **Tokens :** Génère un `access_token` (durée 1h) et un `refresh_token` (durée 30 jours) via Laravel Sanctum.
* **Autonomie :** Aucun conteneur Docker ni serveur Authentik externe n'est requis pour la connexion locale.

### Identifiants actifs :

| Identifiant / Email | Téléphone | Rôle | Mot de passe | Statut |
| :--- | :--- | :--- | :--- | :--- |
| **`admin@permis.local`** | `0600000000` | `ROLE_ADMIN` | **`123456`** | ✅ Validé & Fonctionnel |
| **`axel@rd.com`** | `0778046` | `ROLE_ADMIN` | *(Hash bcrypt personnalisé)* | Compte actif en base |
| **`obame@gmail.com`** | `0772985406` | `ROLE_RESPONSABLE_AUTO_ECOLE` | *(Hash bcrypt personnalisé)* | Compte actif en base |
| **`erwinobame@gmail.com`** | `077804665` | `ROLE_CNEPC` | *(Hash bcrypt personnalisé)* | Compte actif en base |
| **`cloclo@rd.com`** | `060384444` | `ROLE_ENREGISTREUR` | *(Hash bcrypt personnalisé)* | Compte actif en base |

---

## 5. Journal des Modifications & Optimisations (Changelog)

### [2026-11-01] - Implémentation du Cache Redis Global & Résolution des Latences

* **Contexte & Diagnostic :**
  * Les requêtes vers Supabase souffraient d'une latence réseau incompressible (distance géographique Europe du Nord + résolveur DNS IPv6 avec retransmissions TCP SYN de 14 secondes).
  * Sur Windows, le serveur de développement `php artisan serve` est strictement **mono-thread** (pas de `fork`), sérialisant toutes les requêtes frontend.
  * Chaque requête authentifiée déclenchait 3 requêtes SQL distantes rien que pour valider le jeton Sanctum (`personal_access_tokens`, `utilisateurs`, `personnes`), ajoutant ~3,6 secondes de temps incompressible à chaque appel d'API.
  * Les requêtes lourdes (comme `/api/dossiers` avec 9 jointures) prenaient plus de 11 secondes, causant des timeouts (30s) côté frontend.

* **Solutions Mises en Œuvre :**
  1. **Déploiement du conteneur Redis Docker** :
     * Démarrage du conteneur `redis-server` (`redis:7-alpine`) sur le port standard `6379`.
     * Configuration de Laravel (`.env`) avec `CACHE_STORE=redis` et `REDIS_CLIENT=predis`.
  2. **Cache Redis des Jetons Sanctum (`AuthentikTokenMiddleware.php`)** :
     * Mise en cache Redis (`Cache::tags(['auth_tokens'])->remember(...)` pendant 10 minutes) de la résolution du token vers l'utilisateur et sa personne associée.
     * Élimine 3 requêtes réseau distantes par appel d'API.
  3. **Implémentation du Cache Redis dans l'ensemble des Contrôleurs Backend** :
     * `ReferentielController.php` : Tag `referentiels`.
     * `RoleHasPermissionController.php` : Tag `role_has_permissions`.
     * `RoleController.php` : Tag `roles`.
     * `TypeDemandeController.php` : Tag `type_demandes`.
     * `CircuitController.php` : Tag `circuits`.
     * `AutoEcoleController.php` : Tag `auto_ecoles` (`index`, `indexComplets`, `showCnepc`, `show`).
     * `StatutController.php` : Tag `statuts`.
     * `EtapeController.php` : Tag `etapes`.
     * `TransitionController.php` : Tag `transitions`.
     * `PieceJustificativeController.php` : Tag `pieces_justificatives`.
     * `ProgrammeSessionController.php` : Tag `programme_sessions`.
     * `FormationAutoEcoleController.php` : Tags `formations`, `auto_ecoles`.
     * `CandidatController.php` : Tag `candidats`.
     * `UtilisateurController.php` : Tag `utilisateurs` (`indexAgents`, `indexCandidats`).
     * `DossierController.php` : Tag `dossiers` (`index` indexé par utilisateur/centre, `show`).
     * `ResultatController.php` : Tag `resultats`.
  4. **Invalidation Granulaire Automatique** :
     * À chaque action d'écriture (`store`, `update`, `destroy`, validation, rejet, transfert), le contrôleur concerné appelle `Cache::tags([...])->flush()`, garantissant la fraîcheur immédiate des données sans affecter les autres caches.
  5. **Bascule des Hôtes Supabase vers les Poolers IPv4** :
     * Remplacement de `db.<ref>.supabase.co` par `aws-0-eu-north-1.pooler.supabase.com:5432` et `aws-0-eu-west-1.pooler.supabase.com:5432` dans `.env`, supprimant définitivement le délai DNS/IPv6 de 14 secondes.
  6. **Augmentation du Timeout Axios (`api.ts`)** :
     * Timeout porté de 30 secondes à 60 secondes pour absorber les éventuelles charges de travail froides initiales.

* **Mesures de Performances Réelles :**
  | Endpoint | Avant Cache Redis | Avec Cache Redis | Gain / Réduction |
  | :--- | :--- | :--- | :--- |
  | `GET /api/referentiels` | ~4 545 ms | **121 ms** | **-97.3%** |
  | `GET /api/roles` | ~5 132 ms | **72 ms** | **-98.6%** |
  | `GET /api/dossiers` | ~11 521 ms | **60 ms** | **-99.5%** |

---

### [2026-11-01] - Optimisation Performances Initiales, Dumps & Stabilisation

#### 1. Backend (`projet04-backend-permis-conduire`)
* **Compatibilité PHP 8.5 dans `AuthentikService.php`** :
  * Déclaration de `$baseUrl` et `$apiToken` en types nullables (`?string`) pour éviter une `TypeError` au démarrage lorsque l'API token n'est pas encore configuré.
* **Correction SSL PDO dans `config/database.php`** :
  * Utilisation sécurisée de `\Pdo\Mysql::ATTR_SSL_CA` avec vérification `defined()` pour prévenir les plantages sous PHP 8.5.
* **Validation de la persistance Supabase** :
  * Contrôle des 37 tables et 100 enregistrements du registre via `psql`.

#### 2. Frontend (`projet07-frontend-auto-ecole-b`)
* **Correction écran blanc Page Statuts (`StatutPage.tsx`, `StatutTable.tsx`, `statut.service.ts`)** :
  * *Problème :* La page `Workflow > Statuts` affichait un écran blanc complet sans erreur visible. Le backend Laravel renvoyait un objet paginé `{ current_page, data: [], total }`. `StatutPage` stockait cet objet directement dans `statuts`. Lors du rendu de `StatutTable`, l'appel `data.map()` échouait avec `TypeError: data.map is not a function`, provoquant le crash complet du composant React.
  * *Solution :*
    * Normalisation du service `statut.service.ts` pour extraire systématiquement le tableau (`res.data.data ?? res.data`).
    * Sécurisation du `useState<Statut[]>` dans `StatutPage.tsx` avec fallback sur tableau vide.
    * Ajout d'une garde défensive `statutsList` dans `StatutTable.tsx` évitant tout crash même en cas de payload inattendu.
    * Ajout de la méthode `show(Statut $statut)` manquante dans `StatutController.php` (backend).
* **Optimisation majeure RBAC (`RolePermissionsContext.tsx` & `rolePermissionsService.ts`)** :
  * Refactorisation pour charger l'intégralité des rôles et permissions en requêtes groupées.
* **Caches mémoire côté client (`referentiel.services.ts`, `type-demande.service.ts`, `circuit.service.ts`)** :
  * Déduplication des requêtes frontend pour éliminer les appels redondants lors du montage des composants React.

---

## 6. Procédure de Démarrage Local

Pour lancer l'environnement de développement complet :

### Étape 0 - S'assurer que le conteneur Docker Redis tourne :
```powershell
docker start redis-server
# Si le conteneur n'existe pas encore :
# docker run -d --name redis-server -p 6379:6379 --restart unless-stopped redis:7-alpine
```

### Étape 1 - Backend Laravel :
```powershell
cd "c:\Users\gervi\Desktop\Dossier Rengus\code-test\projet04-backend-permis-conduire"
php artisan serve --port=8000
```

### Étape 2 - Frontend React / Vite :
```powershell
cd "c:\Users\gervi\Desktop\Dossier Rengus\code-test\projet07-frontend-auto-ecole-b"
pnpm run dev
```

Accès à l'application dans le navigateur : **`http://localhost:3000`**

---

## 7. Guide pour les Prochaines Modifications

À chaque nouvelle modification, amélioration ou correctif sur cette branche `yaf-test-branch`, veillez à consigner l'entrée dans la section **5. Journal des Modifications** en suivant ce modèle :

```markdown
### [AAAA-MM-JJ] - Titre court de l'intervention
* **Composant/Projet concerné** :
  * Description du problème ou du besoin.
  * Solution mise en place (fichiers modifiés, fonctions ajoutées/ajustées).
  * Résultat ou impact sur les performances / fonctionnalités.
```

