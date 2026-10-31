## Polymorphisme des documents (Documentable)

Ce document explique les changements réalisés pour appliquer une relation polymorphique sur le modèle `Document` afin qu'un document puisse appartenir à plusieurs types d'entités (`Dossier`, `Candidat`, …).

### Objectif
- Remplacer l'association fixe `documents → dossiers (dossier_id)` par une association polymorphique `documentable (documentable_id, documentable_type)`.
- Permettre d'attacher des `Document` aussi bien à un `Dossier` qu'à d'autres modèles (ex: `Candidat`).

---

### 1) Migration base de données

Fichier créé: `database/migrations/2025_10_28_144928_modify_documents_table_for_polymorphic_relation.php`

Changements:
- Suppression de la clé étrangère et de la colonne `dossier_id` dans la table `documents`.
- Ajout des colonnes polymorphiques: `$table->morphs('documentable');` (`documentable_id`, `documentable_type`).

Commande exécutée:

```bash
php artisan migrate
```

---

### 2) Modèle `Document`

Fichier: `app/Models/Document.php`

Changements clés:
- `fillable` mis à jour pour inclure `documentable_id`, `documentable_type` et retirer `dossier_id`.
- Ajout de la relation polymorphique:

```php
public function documentable(): MorphTo
{
    return $this->morphTo();
}
```

La relation spécifique `dossier()` a été remplacée par `documentable()`.

---

### 3) Modèles propriétaires (ex: `Dossier`, `Candidat`)

Fichier: `app/Models/Dossier.php`

```php
public function documents(): MorphMany
{
    return $this->morphMany(Document::class, 'documentable');
}
```

Fichier: `app/Models/Candidat.php`

```php
public function documents(): MorphMany
{
    return $this->morphMany(Document::class, 'documentable');
}
```

Ces méthodes permettent d'attacher/lire des documents depuis chaque entité.

---

### 4) Validation des requêtes

Fichier: `app/Http/Requests/Document/StoreDocumentRequest.php`

Changements:
- Remplacement de `dossier_id` par:
  - `documentable_id: required|uuid`
  - `documentable_type: required|string|in:App\Models\Dossier,App\Models\Candidat`

Cela force le client à préciser le type d'entité cible et son identifiant.

---

### 5) Contrôleur `DocumentController`

Fichier: `app/Http/Controllers/Api/DocumentController.php`

Changements principaux:
- `index`: filtrage par `documentable_id` et `documentable_type` et chargement de `documentable`.
- `store`: vérification que la classe de `documentable_type` existe et que l'identifiant fourni existe dans la base, puis création du document avec les champs polymorphiques.
- `show`, `update`: chargent désormais `documentable` au lieu de `dossier`.

Exemple de création (payload):

```json
{
  "documentable_id": "<uuid-de-l-entite>",
  "documentable_type": "App\\Models\\Dossier",
  "type_document_id": "<uuid-type-document>",
  "nom_fichier": "carte_identite.pdf",
  "chemin_fichier": "documents/2025/10/carte_identite.pdf",
  "type_mime": "application/pdf",
  "taille_fichier": 102400
}
```

---

### 6) Resource `DocumentResource`

Fichier: `app/Http/Resources/DocumentResource.php`

Expose désormais:
- `documentable_id`, `documentable_type` et la relation `documentable` quand elle est chargée.

---

### 7) Seeder

Fichier: `database/seeders/DocumentSeeder.php`

**Utilisation de la relation polymorphique (automatique) :**

```php
// MÉTHODE AUTOMATIQUE (recommandée)
$dossier->documents()->create([
    'type_document_id' => $typeDocument->id,
    'nom_fichier' => $nomFichier,
    'chemin_fichier' => $cheminFichier,
    'type_mime' => $typeMime,
    'taille_fichier' => $tailleFichier,
    'valide' => $valide,
    'commentaires' => $commentaires,
]);
// ✅ documentable_id et documentable_type remplis AUTOMATIQUEMENT !
```

---

### 8) Upload via `DossierController`

Fichier: `app/Http/Controllers/Api/DossierController.php`

Remplacement de la création avec `dossier_id` par la création avec `documentable_id` et `documentable_type` (`Dossier::class`).

---

### 9) Impacts et rétrocompatibilité

- Les anciens appels qui envoyaient `dossier_id` doivent être mis à jour pour envoyer `documentable_id` et `documentable_type`.
- Les requêtes GET d'index peuvent filtrer par `documentable_id`/`documentable_type`.
- Les relations côté front/API doivent maintenant supporter la structure polymorphique.

---

### 10) Guide rapide d'utilisation

#### Méthode 1 : Via la relation Eloquent (⭐ RECOMMANDÉE - Automatique)

```php
// Pour un Dossier
$dossier->documents()->create([
    'type_document_id' => $typeDocument->id,
    'nom_fichier' => 'document.pdf',
    'chemin_fichier' => 'path/to/document.pdf',
    'type_mime' => 'application/pdf',
    'taille_fichier' => 1024000,
]);
// ✅ documentable_id et documentable_type remplis AUTOMATIQUEMENT

// Pour un Candidat
$candidat->documents()->create([...]);
// ✅ documentable_id et documentable_type remplis AUTOMATIQUEMENT
```

#### Méthode 2 : Via l'API (Manuel)

```json
POST /api/documents
{
  "documentable_id": "<uuid-dossier>",
  "documentable_type": "App\\Models\\Dossier",
  "type_document_id": "<uuid-type-document>",
  "nom_fichier": "doc.pdf",
  "chemin_fichier": "documents/2025/10/doc.pdf",
  "type_mime": "application/pdf",
  "taille_fichier": 1000
}
```

#### Récupérer les documents d'un dossier (Eloquent):

```php
$dossier->documents; // collection de Document
$candidat->documents; // collection de Document
```

#### Récupérer l'entité d'un document:

```php
$document->documentable; // instance de Dossier ou Candidat
```

#### Filtrer les documents par entité:

```php
// Via Eloquent
Document::where('documentable_type', Dossier::class)
    ->where('documentable_id', $dossierId)
    ->get();

// Via API
GET /api/documents?documentable_type=App\Models\Dossier&documentable_id=<uuid>
```

---

### 11) Étapes techniques résumées (ce que j'ai fait)

1. ✅ Créé une migration pour supprimer `dossier_id` et ajouter `$table->morphs('documentable')`.
2. ✅ Exécuté `php artisan migrate`.
3. ✅ Mis à jour `Document` (fillable + `documentable()`), retiré la relation `dossier()`.
4. ✅ Ajouté `documents()` (MorphMany) dans `Dossier` et `Candidat`.
5. ✅ Adapté `StoreDocumentRequest` pour valider `documentable_*`.
6. ✅ Mis à jour `DocumentController` (index/store/show/update) pour utiliser `documentable`.
7. ✅ Mis à jour `DocumentResource` pour exposer les champs/relations polymorphiques.
8. ✅ Adapté `DocumentSeeder` pour utiliser la relation automatique `$dossier->documents()->create()`.
9. ✅ Adapté `DossierController::uploadDocument()` pour utiliser la relation automatique.
10. ✅ Régénéré la documentation Scramble avec `php artisan scramble:export`.

---

### 12) Notes de migration de données (si base existante)

Si des données existaient déjà avec `dossier_id`, un script de migration applicative peut être utilisé avant la suppression de la colonne pour copier:

```sql
UPDATE documents
SET documentable_id = dossier_id,
    documentable_type = 'App\\Models\\Dossier';
```

Exécuter ce script (ou équivalent Eloquent) dans une migration dédiée avant de drop la colonne, si nécessaire.

---

### 13) Tests rapides à effectuer

- Création d'un document avec `documentable_type = App\Models\Dossier`.
- Création d'un document avec `documentable_type = App\Models\Candidat`.
- `GET /api/documents?documentable_type=App\Models\Dossier&documentable_id=<uuid>` retourne bien la liste.
- `GET /api/documents/{id}` renvoie `documentable` attendu.


