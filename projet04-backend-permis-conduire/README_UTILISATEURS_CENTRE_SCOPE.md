# Utilisateurs – Champ centre_id et restriction par centre

Ce document résume l’ajout du champ **centre_id** sur la table **utilisateurs** et la règle métier : **un agent (hors ROLE_CANDIDAT) ne peut voir et traiter que les dossiers de son centre**.

---

## 1. Objectif

- **Centre par agent :** un utilisateur de type « agent » (admin, responsable auto-école, etc.) peut être rattaché à **un seul centre** (ou à aucun). Le centre est un référentiel (table `referentiels`).
- **Restriction d’accès :** tout agent qui a un `centre_id` ne peut **voir et traiter que les dossiers** dont le `centre_id` est le même que le sien. Les candidats (ROLE_CANDIDAT) ne sont pas concernés par cette règle.

---

## 2. Modification en base de données

### Table `utilisateurs`

| Colonne     | Type     | Contraintes                    | Description |
|------------|----------|--------------------------------|-------------|
| `centre_id` | uuid (FK) | nullable → `referentiels.id`   | Centre auquel l’agent est rattaché. Un agent peut n’avoir aucun centre ou un seul. |

- **Migration :** `database/migrations/2026_02_18_140000_add_centre_id_to_utilisateurs_table.php`
- **Commande :** `php artisan migrate`

---

## 3. Modèle Utilisateur

**Fichier :** `app/Models/Utilisateur.php`

- **Fillable :** ajout de `centre_id`.
- **Relation :**
  - `centre()` → `BelongsTo(Referentiel::class, 'centre_id')` : l’utilisateur appartient à un centre (référentiel).
- **Méthodes métier :**
  - `isAgentWithCentre()` : retourne `true` si l’utilisateur n’est **pas** `ROLE_CANDIDAT` **et** qu’il a un `centre_id` renseigné. C’est cette combinaison qui déclenche la restriction par centre (sauf bypass admin).
  - `bypassesDossierCentreScope()` : `true` pour les rôles administrateur reconnus → pas de filtre centre sur les dossiers.

---

## 4. Règle métier appliquée

- **Qui est concerné ?**  
  Uniquement les utilisateurs pour lesquels `isAgentWithCentre()` est vrai (rôle ≠ ROLE_CANDIDAT et `centre_id` non null).

- **Effet :**
  - **Listes de dossiers :** seuls les dossiers dont `centre_id` = `utilisateur.centre_id` sont retournés.
  - **Accès à un dossier précis (détail, modification, suppression, validation, transfert, etc.) :** si le dossier n’a pas le même `centre_id` que l’agent, l’API renvoie **403** avec un message du type : *« Vous n'êtes pas autorisé à accéder à ce dossier (centre différent du vôtre). »*

- **Qui n’est pas concerné ?**
  - **ROLE_CANDIDAT :** pas de filtre par centre ; le candidat ne voit que ses propres dossiers (logique existante).
  - **Agents sans centre (`centre_id` null) :** pas de filtre par centre (ex. super-admin qui voit tous les dossiers).
  - **Administrateurs (bypass centre) :** comptes dont le rôle est reconnu comme « admin » (`admin`, `ROLE_ADMIN`, `ROLE_SUPER_ADMIN`, `super_admin`, `superadmin`, insensible à la casse) : **aucun** filtre `centre_id` sur les listes et accès dossiers via `CentreScopeHelper`, même si un `centre_id` est renseigné sur l’utilisateur.

---

## 5. Helper CentreScopeHelper

**Fichier :** `app/Http/Helpers/CentreScopeHelper.php`

Centralise la logique « centre » pour éviter de la dupliquer dans les contrôleurs.

| Méthode | Rôle |
|--------|------|
| `ensureAgentCanAccessDossier(Dossier $dossier)` | Vérifie si l’agent connecté peut accéder à ce dossier. Retourne une **réponse JSON 403** à renvoyer si non autorisé, sinon `null`. |
| `applyCentreScopeToDossiersQuery($query)` | N’applique rien si l’utilisateur **bypass** le périmètre centre (`Utilisateur::bypassesDossierCentreScope()`). Sinon, applique `where('centre_id', $user->centre_id)` **uniquement** si l’utilisateur est un agent avec centre. |

Utilisation typique dans un contrôleur :

- Avant d’afficher ou de modifier un dossier :  
  `$forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier); if ($forbidden) return $forbidden;`
- Sur une liste de dossiers :  
  `CentreScopeHelper::applyCentreScopeToDossiersQuery($query);`

---

## 6. Où la restriction est appliquée

### DossierController

| Action | Comportement |
|--------|--------------|
| **index** (liste des dossiers) | Filtre automatique par `centre_id` pour les agents avec centre. |
| **show** (détail d’un dossier) | 403 si le dossier n’est pas du centre de l’agent. |
| **update** (modification) | 403 si le dossier n’est pas du centre. |
| **destroy** (suppression) | 403 si le dossier n’est pas du centre. |
| **valider** (valider / rejeter un dossier) | 403 si le dossier n’est pas du centre (en plus des règles auto-école / admin). |
| **complet** (dossier complet) | 403 si le dossier n’est pas du centre. |
| **transfert** (transfert CNEDDT) | 403 si le dossier n’est pas du centre. |

### validerDocument (DossierController)

- **Valider / rejeter un document :** 403 si le **dossier** auquel appartient le document n’est pas du centre de l’agent.

### AutoEcoleController

- **mesDossiers** (dossiers de l’auto-école) : la liste des dossiers est aussi filtrée par centre pour les agents avec centre (en plus du filtre par auto-école).

### DocumentController

- **index** (liste des documents) : un agent avec centre ne voit que les documents dont le « parent » est un **dossier** de son centre (les documents liés à d’autres types d’entités ne sont pas filtrés par centre).
- **show**, **update**, **destroy** : si le document est lié à un **dossier**, 403 si ce dossier n’est pas du centre de l’agent.

---

## 7. Fichiers modifiés ou créés

| Fichier | Rôle |
|---------|------|
| `database/migrations/2026_02_18_140000_add_centre_id_to_utilisateurs_table.php` | Ajout de la colonne `centre_id` (FK referentiels) sur `utilisateurs`. |
| `app/Models/Utilisateur.php` | Fillable `centre_id`, relation `centre()`, méthode `isAgentWithCentre()`. |
| `app/Http/Helpers/CentreScopeHelper.php` | **Nouveau.** Helper pour vérification d’accès et filtre par centre sur les requêtes de dossiers. |
| `app/Http/Controllers/Api/DossierController.php` | Utilisation du helper sur index, show, update, destroy, valider, validerDocument, complet, transfert. |
| `app/Http/Controllers/Api/AutoEcoleController.php` | Application du filtre centre sur la requête des dossiers dans `mesDossiers`. |
| `app/Http/Controllers/Api/DocumentController.php` | Filtre sur la liste des documents (dossiers du centre) ; vérification centre sur show, update, destroy quand le document est lié à un dossier. |

---

## 8. Authentification et utilisateur connecté

La restriction s’appuie sur l’utilisateur connecté fourni par le middleware **auth.token** (`AuthentikTokenMiddleware`), qui définit l’utilisateur via `Auth::setUser($user)`. Les méthodes du helper utilisent donc **`auth()->user()`** (instance de `Utilisateur`) pour :

- savoir si l’utilisateur est un agent avec centre (`isAgentWithCentre()`),
- comparer `dossier.centre_id` à `auth()->user()->centre_id`.

---

## 9. Renseigner le centre des agents

Après migration, il faut affecter un **centre_id** aux comptes agents qui doivent être limités à un centre :

- Les **centre_id** valides sont des **id** de la table **referentiels** (ex. référentiels de type « centre » ou identifiés comme tels dans votre métier).
- Les utilisateurs avec **centre_id = null** (ou ROLE_CANDIDAT) ne subissent pas la restriction par centre.

Exemple de mise à jour en base (à adapter selon vos rôles et référentiels) :

```sql
-- Exemple : rattacher l'utilisateur à un centre (UUID du référentiel)
UPDATE utilisateurs SET centre_id = 'uuid-du-referentiel-centre' WHERE id = 'uuid-utilisateur';
```

---

## 10. Résumé en une phrase

**Tout utilisateur connecté qui n’est pas ROLE_CANDIDAT et qui a un `centre_id` ne peut voir et traiter que les dossiers dont le `centre_id` est le sien ; les listes et actions (détail, modification, suppression, validation, transfert, documents associés) sont filtrées ou protégées en conséquence.**

---

*Document généré pour la fonctionnalité « centre par utilisateur » et la restriction d’accès aux dossiers par centre.*
