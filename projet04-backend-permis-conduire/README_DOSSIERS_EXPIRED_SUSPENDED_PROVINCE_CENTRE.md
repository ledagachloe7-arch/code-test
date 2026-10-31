# Dossiers – Champs expired, suspended, province et centre

Ce document décrit les champs ajoutés à la table **dossiers** : expiration, suspension, province et centre (référentiels).

---

## 1. Nouveaux champs en base

| Colonne           | Type     | Contraintes                    | Description |
|-------------------|----------|--------------------------------|-------------|
| `expired`         | boolean  | défaut `false`                 | Dossier marqué comme expiré. |
| `expiration_date` | date     | nullable                       | Date d’expiration ; renseignée par le front quand `expired` = true. |
| `suspended`       | boolean  | défaut `false`                 | Dossier marqué comme suspendu. |
| `suspended_date`  | date     | nullable                       | Date de suspension ; renseignée par le front quand `suspended` = true. |
| `province_id`     | uuid (FK)| nullable → `referentiels.id`  | Référentiel province. |
| `centre_id`       | uuid (FK)| nullable → `referentiels.id`  | Référentiel centre. |

- **Migration :** `database/migrations/2026_02_18_120000_add_expired_suspended_province_centre_to_dossiers_table.php`
- Appliquer avec : `php artisan migrate`

---

## 2. Modèle `Dossier`

- **Fillable :** `expired`, `expiration_date`, `suspended`, `suspended_date`, `province_id`, `centre_id`
- **Casts :**  
  - `expired` → boolean  
  - `expiration_date` → date  
  - `suspended` → boolean  
  - `suspended_date` → date  
- **Relations :**
  - `province()` → `BelongsTo(Referentiel::class, 'province_id')`
  - `centre()` → `BelongsTo(Referentiel::class, 'centre_id')`

Les clés `province_id` et `centre_id` pointent vers la table **referentiels** (même table, types différenciés par `type_ref` ou usage métier).

---

## 3. API

### 3.1 Création (POST `/api/dossiers`)

Corps possible (tous les nouveaux champs sont optionnels) :

```json
{
  "candidat_id": "uuid",
  "auto_ecole_id": "uuid",
  "formation_id": "uuid",
  "type_demande_id": "uuid",
  "statut": "string",
  "commentaires": "string",
  "expired": false,
  "expiration_date": "2025-12-31",
  "suspended": false,
  "suspended_date": "2025-06-15",
  "province_id": "uuid-referentiel",
  "centre_id": "uuid-referentiel"
}
```

- `expiration_date` : en général renseignée lorsque `expired` est `true`.
- `suspended_date` : en général renseignée lorsque `suspended` est `true`.

### 3.2 Mise à jour (PUT/PATCH `/api/dossiers/{id}`)

Mêmes champs envoyés que pour la création ; seuls ceux envoyés sont mis à jour.

Exemple :

```json
{
  "expired": true,
  "expiration_date": "2025-12-31",
  "suspended": true,
  "suspended_date": "2025-06-15",
  "province_id": "uuid",
  "centre_id": "uuid"
}
```

### 3.3 Liste (GET `/api/dossiers`) – Filtres

Paramètres de requête optionnels :

| Paramètre     | Type    | Description                          |
|---------------|---------|--------------------------------------|
| `expired`     | boolean | Filtrer par dossier expiré (true/false). |
| `suspended`  | boolean | Filtrer par dossier suspendu (true/false). |
| `province_id`| uuid    | Filtrer par référentiel province.   |
| `centre_id`  | uuid    | Filtrer par référentiel centre.    |

Exemples d’URL :

- Dossiers expirés : `GET /api/dossiers?expired=true`
- Dossiers suspendus : `GET /api/dossiers?suspended=true`
- Par province : `GET /api/dossiers?province_id=xxx`
- Par centre : `GET /api/dossiers?centre_id=xxx`

---

## 4. Réponse API (DossierResource)

Les réponses incluent les nouveaux champs et les relations optionnelles :

- **Champs directs :**  
  `expired`, `expiration_date`, `suspended`, `suspended_date`, `province_id`, `centre_id`
- **Relations (si chargées) :**  
  `province`, `centre` (objets référentiel avec `id`, `libelle`, `code`, etc.)

Les dates sont au format `Y-m-d`.

---

## 5. Validation (Form Requests)

- **StoreDossierRequest** et **UpdateDossierRequest** :
  - `expired` : nullable, boolean  
  - `expiration_date` : nullable, date  
  - `suspended` : nullable, boolean  
  - `suspended_date` : nullable, date  
  - `province_id` : nullable, uuid, exists:referentiels,id  
  - `centre_id` : nullable, uuid, exists:referentiels,id  

---

## 6. Documentation Scramble

- Le contrôleur **DossierController** est regroupé sous le groupe **« Dossiers »** avec une description incluant ces champs.
- Les paramètres de requête `expired`, `suspended`, `province_id`, `centre_id` sont documentés pour `GET /api/dossiers`.
- Les schémas de requête **POST** et **PUT/PATCH** sont déduits des Form Requests (donc les nouveaux champs apparaissent automatiquement).

Régénérer la spec OpenAPI :

```bash
php artisan scramble:export
```

Puis consulter `/docs/api` pour voir la doc à jour.

---

## 7. Fichiers modifiés / concernés

| Fichier | Rôle |
|---------|------|
| `database/migrations/2026_02_18_120000_add_expired_suspended_province_centre_to_dossiers_table.php` | Migration des colonnes |
| `app/Models/Dossier.php` | Fillable, casts, relations `province` / `centre` |
| `app/Http/Requests/Dossier/StoreDossierRequest.php` | Règles de validation création |
| `app/Http/Requests/Dossier/UpdateDossierRequest.php` | Règles de validation mise à jour |
| `app/Http/Resources/DossierResource.php` | Champs et relations dans la réponse |
| `app/Http/Controllers/Api/DossierController.php` | Filtres index, chargement `province`/`centre`, attributs Scramble |

---

## 8. Exemple cURL

**Créer un dossier avec province et centre :**

```bash
curl -X POST "https://votre-domaine/api/dossiers" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "statut": "EN_ATTENTE",
    "candidat_id": "uuid-candidat",
    "auto_ecole_id": "uuid-auto-ecole",
    "formation_id": "uuid-formation",
    "expired": false,
    "suspended": false,
    "province_id": "uuid-referentiel-province",
    "centre_id": "uuid-referentiel-centre"
  }'
```

**Marquer un dossier comme expiré :**

```bash
curl -X PATCH "https://votre-domaine/api/dossiers/{id}" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expired": true, "expiration_date": "2025-12-31"}'
```

**Lister les dossiers expirés :**

```bash
curl -X GET "https://votre-domaine/api/dossiers?expired=true" \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

---

*Document généré pour la fonctionnalité dossiers (expired, suspended, province, centre).*
