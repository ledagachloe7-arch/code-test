# Table Programme Sessions - Résumé de l'implémentation

## 📋 Vue d'ensemble

Cette documentation résume l'implémentation complète de la table `programme_sessions` pour gérer les sessions d'examen liées aux dossiers de candidature.

## 🗄️ Structure de la base de données

### Table: `programme_sessions`

```sql
- id (UUID, primary key)
- dossier_id (UUID, foreign key -> dossiers.id, cascade delete)
- date_examen (DATE)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 📁 Fichiers créés/modifiés

### 1. Migration
- **Fichier**: `database/migrations/2025_10_29_180701_create_programme_sessions_table.php`
- **Status**: ✅ Créée et exécutée

### 2. Modèle
- **Fichier**: `app/Models/ProgrammeSession.php`
- **Features**:
  - UUID primary key
  - Relation `belongsTo` avec `Dossier`
  - Champs fillable: `dossier_id`, `date_examen`
  - Cast des dates

### 3. Modèle Dossier (mis à jour)
- **Fichier**: `app/Models/Dossier.php`
- **Ajout**: Relation `hasMany` avec `ProgrammeSession`
- **Méthode**: `programmeSessions()`

### 4. Resource
- **Fichier**: `app/Http/Resources/ProgrammeSessionResource.php`
- **Features**:
  - Expose tous les champs du modèle
  - Inclut la relation `dossier` quand chargée
  - Formats de dates appropriés

### 5. DossierResource (mis à jour)
- **Fichier**: `app/Http/Resources/DossierResource.php`
- **Ajout**: Collection de `programme_sessions` 

### 6. Requests de Validation
- **Store**: `app/Http/Requests/ProgrammeSession/StoreProgrammeSessionRequest.php`
  - Validation: dossier_id (required, uuid, exists), date_examen (required, date, after_or_equal:today)
  
- **Update**: `app/Http/Requests/ProgrammeSession/UpdateProgrammeSessionRequest.php`
  - Validation: dossier_id (sometimes, uuid, exists), date_examen (sometimes, date, after_or_equal:today)

### 7. Contrôleur
- **Fichier**: `app/Http/Controllers/Api/ProgrammeSessionController.php`
- **Méthodes CRUD**:
  - `index()` - Liste paginée avec filtres (dossier_id, date_examen)
  - `store()` - Créer une programme session
  - `show()` - Détails d'une programme session
  - `update()` - Mettre à jour une programme session
  - `destroy()` - Supprimer une programme session

### 8. Routes API
- **Fichier**: `routes/api.php`
- **Routes**: `Route::apiResource('programme-sessions', ProgrammeSessionController::class)`

## 🚀 Endpoints API

### Endpoints Programme Sessions

#### 1. Liste des programme sessions
```
GET /api/programme-sessions
```
**Paramètres optionnels**:
- `dossier_id`: Filtrer par dossier
- `date_examen`: Filtrer par date
- `per_page`: Nombre d'éléments par page

#### 2. Créer une programme session
```
POST /api/programme-sessions
```
**Body**:
```json
{
  "dossier_id": "uuid-du-dossier",
  "date_examen": "2025-12-31"
}
```

#### 3. Détails d'une programme session
```
GET /api/programme-sessions/{id}
```

#### 4. Mettre à jour une programme session
```
PUT/PATCH /api/programme-sessions/{id}
```
**Body** (tous les champs optionnels):
```json
{
  "dossier_id": "uuid-du-dossier",
  "date_examen": "2025-12-31"
}
```

#### 5. Supprimer une programme session
```
DELETE /api/programme-sessions/{id}
```

### Endpoint Dossier Complet (NOUVEAU)

#### Récupérer un dossier avec toutes ses informations y compris les programme sessions
```
GET /api/dossiers/{id}/complet
```

**Réponse**:
```json
{
  "success": true,
  "dossier": {
    "id": "uuid",
    "candidat_id": "uuid",
    "auto_ecole_id": "uuid",
    "formation_id": "uuid",
    "statut": "en_attente",
    "commentaires": [],
    "candidat": {...},
    "auto_ecole": {...},
    "formation": {...},
    "documents": [...],
    "programme_sessions": [
      {
        "id": "uuid",
        "dossier_id": "uuid",
        "date_examen": "2025-12-31",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

## 🔗 Relations

### ProgrammeSession → Dossier
```php
$programmeSession->dossier // BelongsTo
```

### Dossier → ProgrammeSessions
```php
$dossier->programmeSessions // HasMany
```

## 📝 Exemples d'utilisation

### Créer une programme session
```bash
curl -X POST http://localhost:8000/api/programme-sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dossier_id": "dossier-uuid-here",
    "date_examen": "2025-12-31"
  }'
```

### Récupérer le dossier complet avec programme sessions
```bash
curl -X GET http://localhost:8000/api/dossiers/{dossier-id}/complet \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Lister les programme sessions d'un dossier
```bash
curl -X GET "http://localhost:8000/api/programme-sessions?dossier_id={dossier-id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## ✅ Validation

- `dossier_id`: Obligatoire (pour création), doit être un UUID valide et exister dans la table `dossiers`
- `date_examen`: Obligatoire (pour création), doit être une date valide et être aujourd'hui ou une date future

## 📊 Statut de l'implémentation

- ✅ Migration créée et exécutée
- ✅ Modèle créé avec relations
- ✅ Resource créée
- ✅ Requests de validation configurées
- ✅ Contrôleur CRUD complet
- ✅ Routes API définies
- ✅ Endpoint dossier complet créé
- ✅ DossierResource mis à jour
- ✅ Relations bidirectionnelles configurées
- ✅ **Documentation Scramble/OpenAPI complète**

## 📚 Documentation

La documentation Scramble/OpenAPI a été générée et est disponible dans :
- `api.json` - Fichier OpenAPI exporté
- `/docs/api` - Interface de documentation interactive (si serveur actif)

### Tags dans l'API
- **Programme Sessions** : Tous les endpoints pour la gestion des sessions d'examen
- **Dossiers** : L'endpoint `/dossiers/{id}/complet` a été ajouté pour récupérer toutes les informations

## 🎯 Prochaines étapes (optionnel)

1. Ajouter des champs additionnels si nécessaire (heure_examen, lieu_examen, etc.)
2. Ajouter des notifications pour les programme sessions
3. Ajouter des tests unitaires
4. Personnaliser les schémas OpenAPI si nécessaire

