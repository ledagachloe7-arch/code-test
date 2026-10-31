# Journalisation des activités (Activity Log)

Ce document décrit la table des logs d’activité et la façon dont les logs sont enregistrés dans l’application (Spatie Laravel Activity Log).

---

## 1. Table `activity_log`

Les logs sont stockés dans la table **`activity_log`** (package `spatie/laravel-activitylog`). Elle est créée et modifiée par les migrations dans `database/migrations/`.

### Structure de la table

| Colonne        | Type        | Description |
|----------------|-------------|-------------|
| `id`           | bigint (PK) | Identifiant unique du log |
| `log_name`     | string      | Nom du log (souvent le nom de l’utilisateur) |
| `description`  | text        | Description de l’action (ex. "Ouverture de la page Liste des partenaires", "Création de Partner ID: 5") |
| `subject_type` | string      | Type du sujet (modèle ou libellé, ex. `App\Models\Partner`, "Lecture des données") |
| `subject_id`   | bigint      | ID du sujet (optionnel, peut être 1 pour les actions sans modèle lié) |
| `event`        | string      | Type d’événement (ex. "Lecture des données", "Création effectuée", "Modification effectuée") |
| `causer_type`  | string      | Classe de l’auteur (ex. `App\Models\User`) |
| `causer_id`    | bigint      | ID de l’utilisateur ayant effectué l’action |
| `properties`   | json        | Métadonnées : `ip`, `route`, `route_uri`, `method`, `url`, `model_columns`, etc. |
| `batch_uuid`   | uuid        | (Optionnel) UUID de lot pour grouper des activités |
| `created_at`   | timestamp   | Date et heure de l’action |
| `updated_at`   | timestamp   | Date et heure de dernière mise à jour |

### Fichiers de migration

- `database/migrations/2023_05_25_224002_create_activity_log_table.php` — création de la table
- `database/migrations/2023_05_25_224003_add_event_column_to_activity_log_table.php` — ajout de `event`
- `database/migrations/2025_09_18_074702_add_batch_uuid_column_to_activity_log_table.php` — ajout de `batch_uuid`

### Configuration

Fichier : **`config/activitylog.php`**

- `enabled` : active/désactive l’enregistrement (variable d’environnement `ACTIVITY_LOGGER_ENABLED`, défaut `true`)
- `table_name` : `activity_log`
- `database_connection` : connexion DB (optionnel, via `ACTIVITY_LOGGER_DB_CONNECTION`)

---

## 2. Comment les logs sont enregistrés

Le projet utilise **deux helpers** et des **événements Eloquent** pour écrire dans `activity_log`.

### 2.1 ActivityLogHelper::log() — appels manuels dans les contrôleurs

Utilisé pour des actions précises (pages, actions métier) avec description et type d’action.

**Fichier :** `app/Helpers/ActivityLogHelper.php`

**Signature :**

```php
ActivityLogHelper::log(
    string $description,   // Ex: "Ouverture de la page Liste des partenaires"
    string $subjectType,   // Ex: "Lecture des données"
    string $causerType,    // Ex: "App\\Http\\Controllers\\Partner\\PartnerController"
    string $event,         // Ex: "Lecture des données"
    $model = null,         // Modèle Eloquent (optionnel, pour enrichir la description)
    $subjectId = null,     // ID du sujet (optionnel)
    ?Request $request = null
): ?Activity
```

**Exemple (PartnerController) :**

```php
use App\Helpers\ActivityLogHelper;

\App\Helpers\ActivityLogHelper::log(
    'Ouverture de la page Liste des partenaires',
    'Lecture des données',
    'App\\Http\\Controllers\\Partner\\PartnerController',
    'Lecture des données',
    null,
    null,
    $request
);
```

Si un **modèle** est passé, l’helper remplace les IDs dans la description par les deux premières colonnes utiles du modèle (via `ActivityHelper::replaceIdInDescription`). Les infos de requête (IP, route, méthode, URL) sont stockées dans `properties`.

---

### 2.2 ActivityHelper::logActivity() — logs manuels avec contexte auto

Utilisé pour des messages personnalisés avec détection du contexte (route, méthode HTTP) et enrichissement de la description.

**Fichier :** `app/Helpers/ActivityHelper.php`

**Signature :**

```php
ActivityHelper::logActivity(
    string $description,      // Description de l’action
    string $subjectType,      // Type d’action (ex: "Lecture des données", "Création pack")
    ?string $event = null,    // Événement (optionnel, défaut = subjectType)
    ?Request $request = null
): ?Activity
```

- Utilise l’API Spatie `activity()->causedBy($user)->withProperties([...])->event(...)->log(...)`.
- Renseigne automatiquement `subject_type` / `subject_id` et les propriétés (IP, route, méthode, URL).
- Ne fait rien si `config('activitylog.enabled')` est `false` ou si l’utilisateur n’est pas authentifié.

---

### 2.3 ActivityHelper::log() — raccourci vers logActivity

Version simplifiée qui déduit le `subjectType` à partir de la description et du modèle.

**Signature :**

```php
ActivityHelper::log(
    string $description,
    $model = null,
    array $properties = [],
    ?string $event = null
): ?Activity
```

Utilisé notamment par le middleware `LogPageView` et le listener `LogDatabaseActivity`.

---

### 2.4 Logs automatiques (création / modification / suppression)

Les **créations**, **modifications** et **suppressions** sur les modèles Eloquent sont loguées automatiquement via `AppServiceProvider` (écoute des événements `created`, `updated`, `deleted`).

**Fichier :** `app/Providers/AppServiceProvider.php`

- **Création** : `ActivityHelper::logCreate($model)` — description du type "Création de {Model} ID: {id}" + deux premières colonnes.
- **Modification** : `ActivityHelper::logUpdate($model, $oldAttributes)` — idem avec "Modification de..." et anciens attributs dans `properties`.
- **Suppression** : `ActivityHelper::logDelete($model)` — "Suppression de..." avec infos du modèle avant suppression.

Le modèle **`Spatie\Activitylog\Models\Activity`** est exclu pour éviter les récursions. Tous les autres modèles sont logués.

En résumé :

- **ActivityHelper::logCreate** / **logUpdate** / **logDelete** : utilisent l’API Spatie `activity()->causedBy()->performedOn($model)->withProperties([...])->event(...)->log(...)` et renseignent `subject_type` / `subject_id` selon le modèle.

---

## 3. Récapitulatif des méthodes d’enregistrement

| Méthode / Mécanisme              | Usage principal                          | Fichiers clés |
|---------------------------------|------------------------------------------|----------------|
| `ActivityLogHelper::log()`      | Actions manuelles (pages, écrans)        | Contrôleurs (ex. PartnerController) |
| `ActivityHelper::logActivity()` | Log manuel avec contexte route/requête   | ActivityHelper.php |
| `ActivityHelper::log()`         | Raccourci log manuel                     | LogPageView, LogDatabaseActivity |
| `ActivityHelper::logCreate()`   | Création de modèle (automatique)         | AppServiceProvider (created) |
| `ActivityHelper::logUpdate()`   | Modification de modèle (automatique)     | AppServiceProvider (updated) |
| `ActivityHelper::logDelete()`   | Suppression de modèle (automatique)      | AppServiceProvider (deleted) |

---

## 4. Consultation des logs

- **Modèle :** `Spatie\Activitylog\Models\Activity`
- **Contrôleur d’administration :** `app/Http/Controllers/Admin/AuditLogController.php` — liste et filtres sur les activités, avec pagination.

Requêtes typiques : filtrer par `subject_type`, `subject_id`, `causer_id`, `event`, ou par plage de dates sur `created_at`.

---

## 5. Fichiers importants

| Rôle              | Fichier |
|-------------------|---------|
| Helpers de log    | `app/Helpers/ActivityHelper.php`, `app/Helpers/ActivityLogHelper.php` |
| Config            | `config/activitylog.php` |
| Enregistrement auto (CRUD) | `app/Providers/AppServiceProvider.php` |
| Affichage / audit | `app/Http/Controllers/Admin/AuditLogController.php` |
| Migrations        | `database/migrations/*activity_log*` |

Pour les logs spécifiques aux conventions, voir aussi **`LOGS_CONVENTION.md`**.
