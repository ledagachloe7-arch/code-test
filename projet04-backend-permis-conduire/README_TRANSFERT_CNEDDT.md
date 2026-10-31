# Transfert de dossiers vers le CNEDDT

Ce document décrit l’API de transfert d’un ou plusieurs dossiers vers l’API externe CNEDDT : endpoint, formats de requête/réponse, règles métier, optimisations et exemples.

---

## 1. Vue d’ensemble

- **Endpoint :** `POST /api/dossiers/transfert`
- **Rôle :** Envoyer un ou plusieurs dossiers au CNEDDT (construction du payload + envoi HTTP).
- **Modes :**
  - **Un seul dossier :** body avec `dossier_id` et `type_demande_id`.
  - **Plusieurs dossiers (en masse) :** body avec `dossiers` = tableau de `{ dossier_id, type_demande_id }` (max 100).

L’envoi unique et l’envoi en masse passent par le **même endpoint** et le **même flux** : normalisation en liste, puis envoi (1 requête HTTP par dossier, en parallèle). L’envoi à un seul dossier reste donc **pleinement fonctionnel** et utilise le même code que l’envoi en masse.

---

## 2. Authentification et autorisation

- L’endpoint est protégé par l’authentification API (middleware).
- **Restriction par centre :** un agent avec `centre_id` ne peut transférer que les dossiers de **son centre**. Toute tentative sur un dossier d’un autre centre renvoie **403** (ou le dossier est ignoré en masse avec la raison « Accès refusé (centre) »).

---

## 3. Format de la requête

### 3.1 Envoi d’un seul dossier

Le body doit contenir **obligatoirement** :

| Champ              | Type   | Obligatoire | Description                          |
|--------------------|--------|-------------|--------------------------------------|
| `dossier_id`       | UUID   | Oui         | Identifiant du dossier               |
| `type_demande_id`  | UUID   | Oui         | Identifiant du type de demande       |

Champs optionnels (surcharge de l’email pour la biométrie) :

| Champ             | Type  | Description                                |
|-------------------|-------|--------------------------------------------|
| `email`           | string| Email de destination (prioritaire)         |
| `personne_email`  | string| Alias possible                             |
| `candidat_email`  | string| Alias possible                             |

**Exemple (un seul dossier) :**

```json
{
  "dossier_id": "550e8400-e29b-41d4-a716-446655440000",
  "type_demande_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Exemple avec email de surcharge :**

```json
{
  "dossier_id": "550e8400-e29b-41d4-a716-446655440000",
  "type_demande_id": "660e8400-e29b-41d4-a716-446655440001",
  "email": "destinataire@example.com"
}
```

---

### 3.2 Envoi en masse (plusieurs dossiers)

Le body doit contenir :

| Champ     | Type  | Obligatoire | Description                                              |
|-----------|--------|-------------|----------------------------------------------------------|
| `dossiers`| array  | Oui         | Liste d’objets `{ dossier_id, type_demande_id }`, max **100** |

Chaque élément de `dossiers` doit contenir :

- `dossier_id` (UUID, obligatoire, doit exister dans `dossiers`)
- `type_demande_id` (UUID, obligatoire, doit exister dans `type_demandes`)

Les champs optionnels `email`, `personne_email`, `candidat_email` s’appliquent à **tous** les dossiers de la requête (surcharge globale).

**Exemple (plusieurs dossiers) :**

```json
{
  "dossiers": [
    {
      "dossier_id": "550e8400-e29b-41d4-a716-446655440000",
      "type_demande_id": "660e8400-e29b-41d4-a716-446655440001"
    },
    {
      "dossier_id": "550e8400-e29b-41d4-a716-446655440002",
      "type_demande_id": "660e8400-e29b-41d4-a716-446655440001"
    }
  ]
}
```

**Exemple avec email commun :**

```json
{
  "dossiers": [
    { "dossier_id": "uuid-1", "type_demande_id": "uuid-type-1" },
    { "dossier_id": "uuid-2", "type_demande_id": "uuid-type-1" }
  ],
  "email": "contact@auto-ecole.example.com"
}
```

**Comportement des doublons :** si le même couple `(dossier_id, type_demande_id)` apparaît plusieurs fois dans `dossiers`, il est **dédupliqué** côté backend : un seul envoi est effectué pour ce couple.

---

## 4. Validation (422)

- `dossier_id` / `type_demande_id` : obligatoires en mode « un seul dossier », UUID, doivent exister en base.
- `dossiers` : max **100** éléments ; chaque élément doit avoir `dossier_id` et `type_demande_id` (UUID, existants).
- En cas d’erreur de validation, la réponse est en **422** avec `success: false`, `message` et `errors` (détail des champs).

**Exemple de réponse 422 (validation) :**

```json
{
  "success": false,
  "message": "Les données fournies ne sont pas valides.",
  "errors": {
    "dossier_id": ["Le dossier est obligatoire (ou utilisez \"dossiers\" pour un envoi en masse)."]
  }
}
```

---

## 5. Réponses succès (200)

Après traitement, chaque dossier éligible est envoyé au CNEDDT. La réponse **200** contient notamment :

- `success` : `true` si au moins un envoi a réussi.
- `message` : texte résumant le résultat (ex. « 2/2 dossier(s) transmis au CNEDDT. » ou « Le dossier a bien été transmis. »).
- `total` : nombre de dossiers effectivement envoyés (après déduplication et filtrage).
- `sent_count` : nombre d’envois ayant réussi côté CNEDDT.
- `skipped` : liste des dossiers ignorés avec la raison (introuvable, accès refusé centre, payload impossible).
- `results` : pour chaque dossier envoyé, `dossier_id` et `result` (succès + données ou erreur).

**Exemple (un seul dossier, succès) :**

```json
{
  "success": true,
  "message": "Le dossier a bien été transmis.",
  "total": 1,
  "sent_count": 1,
  "skipped": [],
  "results": [
    {
      "dossier_id": "550e8400-e29b-41d4-a716-446655440000",
      "result": {
        "success": true,
        "data": { ... }
      }
    }
  ]
}
```

**Exemple (en masse, succès partiel) :**

```json
{
  "success": true,
  "message": "2/3 dossier(s) transmis au CNEDDT. 1 dossier(s) ignoré(s) (accès ou données).",
  "total": 2,
  "sent_count": 2,
  "skipped": [
    { "dossier_id": "uuid-ignored", "reason": "Accès refusé (centre)." }
  ],
  "results": [
    { "dossier_id": "uuid-1", "result": { "success": true, "data": { ... } } },
    { "dossier_id": "uuid-2", "result": { "success": true, "data": { ... } } }
  ]
}
```

**Exemple (aucun dossier éligible, 422) :**

Si tous les dossiers sont ignorés (introuvables, centre, ou payload impossible), le code renvoie **422** :

```json
{
  "success": false,
  "message": "Aucun dossier éligible au transfert.",
  "skipped": [
    { "dossier_id": "uuid-1", "reason": "Dossier introuvable." },
    { "dossier_id": "uuid-2", "reason": "Impossible de construire le payload (données manquantes)." }
  ]
}
```

---

## 6. Réponses erreur

- **401** : non authentifié.
- **403** : accès refusé (ex. agent avec centre et dossier d’un autre centre) — selon le contexte, peut apparaître en détail dans `skipped` en masse.
- **422** : validation échouée ou aucun dossier éligible au transfert (voir ci‑dessus).
- **500** : erreur serveur (log côté backend).

---

## 7. Comportement métier

- **Payload CNEDDT :** pour chaque dossier, le backend construit un payload à partir du dossier (candidat, personne, formation, type de permis, auto-école, province, etc.) et du **type de demande** (`operation_type`). Si des données obligatoires manquent (candidat/personne, formation/typePermis, ou type de demande inconnu), le payload est `null` et le dossier est ignoré avec la raison « Impossible de construire le payload (données manquantes). ».
- **Email biométrie :** pour chaque dossier envoyé, un email biométrie peut être mis en file (avec l’email du candidat ou la surcharge `email` / `personne_email` / `candidat_email`).
- **Centre :** les agents avec `centre_id` ne peuvent transférer que les dossiers de leur centre ; les autres sont soit 403, soit listés dans `skipped` avec « Accès refusé (centre). ».

---

## 8. Optimisations techniques

- **SQL :** au lieu de charger chaque dossier et chaque type de demande dans une boucle (2N requêtes), le backend fait :
  - **1 requête** : chargement de tous les dossiers concernés avec leurs relations (`candidat.personne`, `autoEcole.province`, `formation.typePermis`) via `whereIn('id', $dossierIds)`.
  - **1 requête** : chargement de tous les types de demande concernés via `whereIn('id', $typeDemandeIds)` (map `id` → `name`).
- **HTTP :** l’API CNEDDT ne traite qu’**un dossier par appel**. Le backend envoie donc **une requête POST par dossier**, mais toutes ces requêtes sont lancées **en parallèle** avec `Http::pool()`, ce qui réduit le temps total à environ celui de la requête la plus lente (au lieu de N × temps d’une requête).
- **Déduplication :** les doublons `(dossier_id, type_demande_id)` dans la même requête sont fusionnés pour éviter les envois en double.

Résumé : **2 requêtes SQL fixes** + **envoi HTTP parallèle** + **déduplication** = flux fiable et performant pour 1 ou N dossiers.

---

## 9. Configuration CNEDDT

L’envoi utilise la config Laravel `config('services.cneddt_api')` :

- `url` : URL de l’API CNEDDT (ex. endpoint POST).
- `key` : clé d’API (header `X-API-KEY`).

Si `url` ou `key` est vide, aucun envoi n’est effectué ; la réponse contient pour chaque item un `result` avec `success: false`, `message` indiquant la configuration manquante et `skipped: true`.

Exemple dans `.env` :

```env
CNEDDT_API_URL=https://api.cneddt.example.com/v1/dossiers
CNEDDT_API_KEY=your-api-key
```

(À adapter selon la structure réelle de `config/services.php`.)

---

## 10. Récapitulatif des exemples de body

| Cas                    | Body                                                                 |
|------------------------|----------------------------------------------------------------------|
| Un dossier             | `{ "dossier_id": "uuid", "type_demande_id": "uuid" }`                |
| Un dossier + email     | `{ "dossier_id": "uuid", "type_demande_id": "uuid", "email": "..." }` |
| Plusieurs dossiers     | `{ "dossiers": [ { "dossier_id": "uuid1", "type_demande_id": "uuid" }, ... ] }` |
| Masse + email commun   | `{ "dossiers": [ ... ], "email": "..." }`                            |

---

## 11. Vérification que l’envoi unique reste fonctionnel

- Le **même endpoint** `POST /api/dossiers/transfert` gère 1 ou N dossiers.
- La requête est normalisée en liste via `TransfertDossierRequest::getDossiersToTransfer()` : en mode « un seul dossier », cette méthode retourne un tableau à **un élément** `[ ['dossier_id' => ..., 'type_demande_id' => ... ] ]`.
- Le reste du flux (chargement des dossiers/types en batch, construction des payloads, déduplication, envoi via `sendManyToCneddt`) est identique ; pour 1 dossier, `sendManyToCneddt` reçoit un tableau à 1 élément et lance **une seule** requête HTTP dans le pool.

Aucun code spécifique « single » n’est nécessaire : l’envoi à un seul dossier est un cas particulier de l’envoi en masse (N=1), donc il reste **correct et fonctionnel** avec la même logique et les mêmes validations.
