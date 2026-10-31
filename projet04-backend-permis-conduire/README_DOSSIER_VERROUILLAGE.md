# Verrouillage des dossiers (open / close)

Ce document décrit les champs et règles de gestion pour **éviter qu’un dossier en cours de traitement soit traité par un autre utilisateur**. On traite des **dossiers des candidats** : seuls les **agents** (pas `ROLE_CANDIDAT`) ouvrent, traitent et ferment les dossiers. Un agent ouvre le dossier (verrouillage), travaille dessus, puis le ferme (déverrouillage).

---

## 1. Champs ajoutés à la table `dossiers`

| Champ       | Type      | Description |
|------------|-----------|-------------|
| `opened_by`| uuid (FK) | Référence vers `utilisateurs.id` : agent qui a ouvert le dossier. |
| `opened_at`| timestamp | Date/heure d’ouverture du dossier. |
| `is_locked`| boolean   | `true` si le dossier est verrouillé (en cours de traitement). |

- **Migration :** `database/migrations/2026_02_24_100000_add_opened_by_opened_at_is_locked_to_dossiers_table.php`
- **Commande :** `php artisan migrate`

---

## 2. Règles de gestion

### 2.1 Ouverture (verrouillage)

- **Qui peut ouvrir ?** Un **agent** (tout rôle sauf `ROLE_CANDIDAT`). On traite ici des **dossiers des candidats** : ce sont les agents qui ouvrent et traitent les dossiers ; le candidat n’est pas concerné par l’action « ouvrir / fermer ». L’agent doit être authentifié et autorisé sur le dossier (règle centre si `centre_id`).
- **Comportement :**
  - Si le dossier **n’est pas verrouillé** ou est **verrouillé par le même agent** ou le **verrou est expiré** (timeout) → on verrouille pour l’agent connecté :
    - `is_locked = true`
    - `opened_by = user_id`
    - `opened_at = NOW()`
  - Si le dossier **est verrouillé par un autre agent** et le **verrou n’est pas expiré** → réponse **423** avec le message :
    - *"Ce dossier est actuellement traité par [Nom Agent] depuis [date/heure]."*

### 2.2 Déverrouillage

- **À la fermeture :** l’agent (ou un admin) appelle l’endpoint **close** → `is_locked = false`, `opened_by = null`, `opened_at = null`.
- **Après timeout :** au bout de **30 minutes** sans activité, le verrou est considéré **expiré**. Un autre agent peut alors **ouvrir** le dossier (et en prendre le verrou). Aucun cron nécessaire : la vérification se fait au moment de l’appel **open**.

### 2.3 Timeout

- Constante dans le modèle : `Dossier::LOCK_TIMEOUT_MINUTES = 30`.
- Une méthode `isLockExpired()` sur le modèle indique si `opened_at` est antérieur à maintenant − 30 min.

---

## 3. API

### 3.1 Ouvrir un dossier (verrouiller)

- **POST** `/api/dossiers/{dossier}/open`
- **Corps :** aucun.
- **Réponses :**
  - **200** : dossier verrouillé pour l’agent connecté ; body avec `data` (dossier + `is_locked`, `opened_by`, `opened_at`, `opened_by_user`).
  - **401** : non authentifié.
  - **403** : utilisateur avec `ROLE_CANDIDAT` (seuls les agents qui traitent les dossiers des candidats peuvent ouvrir) ou agent avec `centre_id` et dossier d’un autre centre.
  - **423** : dossier déjà ouvert par un autre agent (message détaillé + `opened_by`, `opened_at`).

### 3.2 Fermer un dossier (déverrouiller)

- **POST** `/api/dossiers/{dossier}/close`
- **Corps :** aucun.
- **Réponses :**
  - **200** : dossier déverrouillé.
  - **401** : non authentifié.
  - **403** : utilisateur avec `ROLE_CANDIDAT` (non concerné par le traitement des dossiers), ou agent d’un autre centre, ou (si dossier verrouillé) ni l’agent qui a ouvert ni admin.

---

## 4. Modèle `Dossier`

- **Fillable :** `is_locked`, `opened_by`, `opened_at`.
- **Casts :** `is_locked` → boolean, `opened_at` → datetime.
- **Relation :** `openedByUser()` → `BelongsTo(Utilisateur::class, 'opened_by')`.
- **Méthodes :**
  - `isLockExpired()` : verrou considéré expiré après `LOCK_TIMEOUT_MINUTES`.
  - `isLockedByOther(?string $currentUserId)` : `true` si verrouillé par un autre utilisateur et non expiré.

---

## 5. Réponse API (DossierResource)

En plus des champs existants, le dossier expose :

- `is_locked`
- `opened_by` (uuid)
- `opened_at` (ISO 8601)
- `opened_by_user` (si la relation est chargée) : `{ id, email, nom }` (nom déduit de `personne` ou email).

Les listes et détails qui chargent `openedByUser.personne` affichent correctement ces infos.

---

## 6. Fichiers modifiés / créés

| Fichier | Rôle |
|---------|------|
| `database/migrations/2026_02_24_100000_add_opened_by_opened_at_is_locked_to_dossiers_table.php` | Ajout des colonnes |
| `app/Models/Dossier.php` | Fillable, casts, relation, `LOCK_TIMEOUT_MINUTES`, `isLockExpired()`, `isLockedByOther()` |
| `app/Http/Controllers/Api/DossierController.php` | `open()`, `close()` + restriction centre + 423 / 403 |
| `app/Http/Resources/DossierResource.php` | Champs `is_locked`, `opened_by`, `opened_at`, `opened_by_user` |
| `routes/api.php` | `POST dossiers/{dossier}/open`, `POST dossiers/{dossier}/close` |

---

## 7. Exemple de flux

1. L’agent A appelle **POST /api/dossiers/{id}/open** → 200, dossier verrouillé pour A.
2. L’agent B appelle **POST /api/dossiers/{id}/open** → 423 avec *"Ce dossier est actuellement traité par [Nom de A] depuis 25/02/2026 à 14:30."*
3. Soit A appelle **POST /api/dossiers/{id}/close** → déverrouillage.
4. Soit après 30 min, B rappelle **open** → le verrou est considéré expiré → 200, dossier verrouillé pour B.

---

*Document généré pour la fonctionnalité de verrouillage des dossiers (open/close).*
