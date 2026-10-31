# API publique — recherche usager et permis (`GET /api/v1/permis/usager`)

Endpoint **sans** middleware `auth.token` (pas de Bearer JWT). Authentification par le header **`X-API-KEY`**, identique aux autres routes publiques (`PUBLIC_API_KEY` dans `.env`).

## Objectif

Retourner les informations d’**identité** et de **permis de conduire** d’un usager à partir du **numéro de permis** (obligatoire). Les filtres **nom**, **prénom**, **date de naissance** et **NIP** sont **optionnels** (correspondance exacte en AND lorsqu’ils sont fournis ; nom et prénom **insensibles à la casse**).

## Configuration (`.env`)

```env
# Obligatoire pour que X-API-KEY soit acceptée
PUBLIC_API_KEY=votre_cle_secrete_longue_et_aleatoire

# Optionnel : liste d’IP autorisées (virgules). Vide = pas de filtre (ex. dev local).
# La première IP du header X-Forwarded-For est comparée à cette liste.
PUBLIC_API_ALLOWED_IPS=

# Optionnel : anciennes clés à rejeter en HTTP 403 (virgules).
PUBLIC_API_REVOKED_KEYS=
```

Lecture dans `config/services.php` : `services.public_api.key`, `allowed_ips`, `revoked_keys`.

Après modification du `.env` :

```bash
php artisan config:clear
```

## Référence HTTP

| Élément | Valeur |
|--------|--------|
| Méthode | `GET` |
| Chemin | `/api/v1/permis/usager` |
| URL complète (exemple local) | `http://127.0.0.1:8000/api/v1/permis/usager` |
| Authentification | Header **`X-API-KEY`** (obligatoire). Pas de `Authorization: Bearer`. |
| Réponse | `Content-Type: application/json` (UTF-8) |

### Headers

| Header | Obligatoire | Description |
|--------|-------------|-------------|
| `X-API-KEY` | Oui | Même valeur que `PUBLIC_API_KEY`. |
| `Accept` | Recommandé | `application/json` |
| `X-Forwarded-For` | Si whitelist configurée | Première IP de la liste utilisée pour la comparaison avec `PUBLIC_API_ALLOWED_IPS`. |

### Paramètres query

| Paramètre | Obligatoire | Description |
|-----------|-------------|-------------|
| `numero_permis` | Oui | Numéro de permis — **égalité stricte** sur `dossiers.numero_permis` (au moins un dossier du candidat doit correspondre). |
| `nom` | Non | Nom de famille — égalité exacte, **insensible à la casse** (filtre AND si fourni). |
| `prenom` | Non | Prénom(s) — égalité exacte, **insensible à la casse** (filtre AND si fourni). |
| `date_naissance` | Non | Format strict **`YYYY-MM-DD`** (ISO date) si fourni. |
| `nip` | Non | Si fourni : **AND** avec les autres critères ; égalité stricte sur le NIP en base. |

Exemple :

```http
GET /api/v1/permis/usager?nom=Petit&prenom=Thomas&date_naissance=1992-07-20&numero_permis=ABC123456&nip=9876543210987 HTTP/1.1
Host: 127.0.0.1:8000
X-API-KEY: <PUBLIC_API_KEY>
Accept: application/json
```

### Codes HTTP

| Code | Signification |
|------|----------------|
| **200** | Usager trouvé ; corps JSON décrit ci-dessous. |
| **400** | `numero_permis` manquant ou vide après trim. |
| **401** | `X-API-KEY` absent ou invalide. |
| **403** | IP non autorisée (`PUBLIC_API_ALLOWED_IPS`) **ou** clé présente dans `PUBLIC_API_REVOKED_KEYS`. |
| **404** | Aucun enregistrement pour la combinaison (y compris si le NIP ne correspond pas). |
| **422** | `date_naissance` invalide (format ou date inexistante au calendrier). |
| **500** | Erreur serveur. |

### Corps de réponse **200** (champs)

Les champs optionnels vides en base sont renvoyés en **`null`** (pas omis).

**Identité**

| Champ | Type | Description |
|-------|------|-------------|
| `id` | uuid | Identifiant usager (`candidats.id`). |
| `numero_usager` | string | Numéro usager (`candidats.numero_candidat`). |
| `nip` | string \| null | NIP. |
| `nom`, `prenom` | string | Depuis `personnes`. |
| `date_naissance` | date | `YYYY-MM-DD`. |
| `lieu_naissance`, `nationalite`, `genre`, `type_piece`, `numero_piece` | string | Depuis `candidats`. |
| `email`, `contact`, `adresse` | string \| null | Depuis `personnes`. |

**Permis** (plusieurs dossiers par candidat : **fusion** — pour chaque champ, la première valeur non vide en parcourant les dossiers du plus « riche » en informations permis au plus léger ; ex. un dossier avec seulement `numero_permis` et un autre avec les dates : la réponse combine les deux)

| Champ | Type | Description |
|-------|------|-------------|
| `numero_permis` | string \| null | |
| `categorie_permis` | string \| null | Depuis `data_categorie[].classe` ou type de formation. |
| `ville_permis` | string \| null | Libellé du centre (`referentiels`) si présent. |
| `codification_permis` | string \| null | Depuis `data_categorie[].codification_code`. |
| `date_delivrance_permis`, `date_obtention_permis`, `date_expiration_permis`, `date_validite_permis` | date \| null | `YYYY-MM-DD`. |
| `lieu_obtention_permis` | string \| null | |
| `numero_origine_permis` | string \| null | |

### Exemple de JSON **200**

```json
{
  "id": "019d9fe3-309f-7011-8426-15b9f2bbdc46",
  "numero_usager": "USG-DEMO-CHHNYCHQ",
  "nip": "NIP-DEMO-CHHNYCHQ",
  "nom": "DEMO_PERMIS_CHHNYCHQ",
  "prenom": "TestApi",
  "date_naissance": "1993-11-22",
  "lieu_naissance": "Libreville",
  "nationalite": "Gabonaise",
  "genre": "M",
  "type_piece": "CNI",
  "numero_piece": "CNI-DEMO-CHHNYCHQ",
  "email": "demo_perm_pers_CHHNYCHQ@test.local",
  "contact": "+241074000001",
  "adresse": "Adresse démo API permis",
  "numero_permis": "PERM-DEMO-CHHNYCHQ",
  "categorie_permis": "B",
  "ville_permis": null,
  "codification_permis": "GAB-B-DEMO",
  "date_delivrance_permis": "2025-03-10",
  "date_obtention_permis": "2025-03-10",
  "lieu_obtention_permis": "Libreville",
  "date_expiration_permis": "2035-03-10",
  "numero_origine_permis": null,
  "date_validite_permis": "2035-03-10"
}
```

### Exemples d’erreurs

**400** — paramètre obligatoire manquant :

```json
{
  "message": "Les paramètres nom, prenom, date_naissance et numero_permis sont obligatoires."
}
```

**401** — clé API :

```json
{
  "success": false,
  "message": "Clé API invalide."
}
```

**404** — aucune ligne :

```json
{
  "message": "Aucun usager ne correspond à la combinaison de paramètres fournie."
}
```

**422** — date invalide :

```json
{
  "message": "Le paramètre date_naissance doit être au format ISO 8601 (YYYY-MM-DD)."
}
```

## Tester avec Postman

### 1. Importer la collection (recommandé)

1. Ouvrir Postman → **Import**.
2. Choisir le fichier **`postman/Permis_Usager_v1.postman_collection.json`** à la racine du dépôt.
3. Dans l’onglet **Variables** de la collection, renseigner :
   - **`api_host`** : ex. `127.0.0.1` (ou ton domaine sans `http://`).
   - **`api_port`** : ex. `8000` (ou `443` derrière HTTPS ; adapter le schéma dans l’URL si besoin).
   - **`public_api_key`** : la même valeur que `PUBLIC_API_KEY` dans ton `.env`.
   - **`nom`**, **`prenom`**, **`date_naissance`**, **`numero_permis`** : valeurs réelles présentes en base (voir commande Artisan ci-dessous).
   - **`nip`** : remplir pour tester le filtre ; sinon **désactive** la ligne `nip` dans l’onglet Params de la requête (case à décocher).

4. Lancer la requête **« Rechercher usager + permis (v1) »**.

### 2. Créer la requête à la main dans Postman

1. **New** → **HTTP Request**.
2. Méthode **GET**.
3. URL : `http://127.0.0.1:8000/api/v1/permis/usager` (ou ton URL de préprod / prod en **HTTPS**).
4. Onglet **Params** (Query Params) :

   | Key | Value | Activé |
   |-----|-------|--------|
   | `nom` | ex. `Petit` | ✓ |
   | `prenom` | ex. `Thomas` | ✓ |
   | `date_naissance` | ex. `1992-07-20` | ✓ |
   | `numero_permis` | ex. valeur exacte d’un `dossiers.numero_permis` du candidat | ✓ |
   | `nip` | ex. `9876543210987` | optionnel |

5. Onglet **Headers** :

   | Key | Value |
   |-----|-------|
   | `X-API-KEY` | ta clé (identique à `PUBLIC_API_KEY`) |
   | `Accept` | `application/json` |

6. **Send**. Vérifier le code HTTP (200, 404, etc.) et le corps JSON.

### 3. Liste de candidats réels pour remplir les params

```bash
php artisan permis:list-candidats-echantillon --limit=20
```

Affiche nom, prénom, date de naissance, NIP, numéro usager et (si présent) numéro de permis utilisables dans Postman.

### 4. Démarrer le backend en local

```bash
php artisan serve
```

Postman doit pointer vers la même origine (ex. `http://127.0.0.1:8000`).

## Outils Artisan (même projet)

| Commande | Rôle |
|----------|------|
| `php artisan permis:list-candidats-echantillon` | Affiche des exemples issus de la base. |
| `php artisan permis:test-usager-api "Nom" "Prénom" "YYYY-MM-DD" "numero_permis" [--nip=...]` | Appel HTTP réel vers `APP_URL` (serveur démarré). |
| `php artisan permis:create-demo-usager` | Crée un jeu de données de démo + vérifie l’endpoint via le kernel. |

## Tests automatisés (PHPUnit)

- Rapide (SQLite mémoire) : `php vendor/bin/phpunit tests/Feature/PublicPermisUsagerApiTest.php`
- Intégration PostgreSQL : `php vendor/bin/phpunit -c phpunit.pgsql.xml tests/Feature/PublicPermisUsagerPostgresIntegrationTest.php`

## Sécurité (rappel)

- **TLS** : en production, exposer l’API uniquement en **HTTPS** (configuration reverse proxy / hébergeur).
- **Clé** : ne jamais committer `PUBLIC_API_KEY` ; la transmettre uniquement via configuration sécurisée côté client Postman (variables d’environnement / secrets Postman).
