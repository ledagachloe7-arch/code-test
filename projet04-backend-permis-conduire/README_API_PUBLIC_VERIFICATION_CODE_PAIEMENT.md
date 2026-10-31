# API publique — codes de paiement (`X-API-KEY`)

Ce document décrit l’endpoint **public** (sans `auth.token`) protégé par le header **`X-API-KEY`** (`PUBLIC_API_KEY` dans `.env`) :

- **Vérifier** si un `code_paiement` existe (`GET`).

## Objectif

Permettre à un service externe (site, passerelle, autre backend) de savoir si un `code_paiement` correspond bien à un **dossier** enregistré (`dossiers.code_paiement`).

Ce n’est **pas** un appel Paynala / Airtel : on ne vérifie que la **présence du code** dans la table `dossiers`.

## Configuration

Dans le fichier `.env` du serveur :

```env
PUBLIC_API_KEY=votre_cle_secrete_longue_et_aleatoire
```

La valeur est lue via `config/services.php` :

- `services.public_api.key` → `env('PUBLIC_API_KEY')`

Après modification du `.env`, exécuter si besoin :

```bash
php artisan config:clear
```

## 1. Vérifier l’existence d’un code (`exists`)

| Élément | Valeur |
|--------|--------|
| Méthode | `GET` |
| URL | `/api/public/paiements/exists` |
| Authentification | Header **`X-API-KEY`** (pas de Bearer) |

### Paramètres requis

| Paramètre | Emplacement | Description |
|-----------|-------------|-------------|
| `code_paiement` | Query string | Code à vérifier (égalité stricte avec `dossiers.code_paiement`, casse incluse). |

### Header requis

| Header | Description |
|--------|-------------|
| `X-API-KEY` | Doit être **identique** à `PUBLIC_API_KEY`. |

### Exemple de requête

```http
GET /api/public/paiements/exists?code_paiement=pa1x7mab HTTP/1.1
Host: votre-domaine.com
Accept: application/json
X-API-KEY: votre_cle_secrete_longue_et_aleatoire
```

### Réponses — codes HTTP

| Code HTTP | Situation |
|-----------|-----------|
| **200** | Clé `X-API-KEY` valide **et** `code_paiement` non vide. Le corps JSON indique si le code a été trouvé en base (`exists`) — **y compris lorsque le code n’existe pas** (toujours 200, pas de 404). |
| **401** | `X-API-KEY` absent, incorrect, ou `PUBLIC_API_KEY` non défini côté serveur. |
| **422** | Paramètre `code_paiement` absent ou vide (après `trim`). |

### Corps JSON — **200** (requête valide : clé OK + code fourni)

**Le code existe** (`dossiers.code_paiement` trouvé, égalité stricte) :

```json
{
  "success": true,
  "exists": true,
  "data": {
    "dossier_id": "uuid-du-dossier",
    "statut": "EN_ATTENTE_PAIEMENT"
  }
}
```

**Le code n’existe pas** (aucune ligne avec ce `code_paiement`) — **HTTP 200** également :

```json
{
  "success": true,
  "exists": false,
  "data": null
}
```

> À distinguer par le champ **`exists`** (et `data`), pas par le code HTTP : dans les deux cas ci-dessus la réponse est **200**.

**401 — Clé invalide** :

```json
{
  "success": false,
  "message": "Clé API invalide."
}
```

**422 — Query `code_paiement` manquant ou vide** :

```json
{
  "success": false,
  "message": "Le paramètre code_paiement est obligatoire.",
  "exists": false
}
```

## Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `app/Http/Controllers/Api/PublicPaiementController.php` | `exists` + documentation Scramble |
| `app/Http/Middleware/PublicApiKeyMiddleware.php` | Vérification du header `X-API-KEY` |
| `bootstrap/app.php` | Alias middleware `x.api.key` |
| `config/services.php` | Clé `public_api.key` |
| `routes/api.php` | `GET /public/paiements/exists` + middleware `x.api.key` |

## Documentation Scramble

Les attributs Dedoc Scramble (`#[Group]`, `#[Endpoint]`, `#[QueryParameter]`, `#[ScrambleResponse]`) sont sur `PublicPaiementController`. Le groupe affiché est **« Paiements publics »** (opération **« Vérifier l’existence d’un code de paiement »**).

Pour régénérer la doc OpenAPI / l’UI selon votre configuration :

```bash
php artisan scramble:export
```

(ou ouvrir l’interface Scramble si elle est activée sur le projet.)

## Sécurité — bonnes pratiques

- Ne **jamais** exposer `PUBLIC_API_KEY` dans un frontend public (navigateur) si vous voulez limiter la vérification aux serveurs de confiance.
- Utiliser une clé longue, aléatoire, et la faire tourner en cas de fuite.
- L’endpoint **exists** ne renvoie que `dossier_id` et `statut` lorsque le code existe ; il ne renvoie pas les données du candidat.

## Lien avec la génération du code

Le champ `code_paiement` est renseigné sur le modèle `Dossier` lorsque le statut est `EN_ATTENTE_PAIEMENT` et que le code est vide (voir `app/Models/Dossier.php`, événement `saving`, et `CandidatService::generatePaymentCode`). La comparaison sur cet endpoint est **sensible à la casse** : le `code_paiement` envoyé en query doit correspondre **exactement** à la valeur stockée (chaîne alphanumérique générée automatiquement par le serveur, sans préfixe fixe).

---

## Tests automatisés (PHPUnit)

Fichier : `tests/Feature/PublicPaiementApiTest.php` (couvre l’endpoint public `exists`).

```bash
php artisan test tests/Feature/PublicPaiementApiTest.php
```

Les tests utilisent une table `dossiers` SQLite minimale (sans exécuter toutes les migrations du projet). La clé API attendue est fixée dans le `setUp()` du test (`services.public_api.key`).

**Important** : le fichier `.env` doit être **syntaxiquement valide** (DotEnv). Les noms de variables ne doivent pas contenir de tiret (`X-API-KEY` est invalide) : utiliser **`PUBLIC_API_KEY`** dans `.env` pour la même valeur que le header `X-API-KEY`.
