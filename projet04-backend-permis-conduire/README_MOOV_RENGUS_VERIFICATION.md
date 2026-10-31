# Vérification de paiement Moov via API Rengus (REST)

Ce document décrit l’intégration **REST** fournie par **Rengus** pour vérifier qu’une commande Moov est payée (`/get-token` + `/check-order`), puis l’alignement avec le métier **permis-conduire** (dossier + table `paiements`).

Elle est **distincte** du flux **SOAP** Moov (initiation push + callback) documenté ailleurs (`README_MOOV_INTEGRATION.md`, `MoovPaymentController`).
 OK 
---

## 1. Objectif

1. Un utilisateur **authentifié** sur l’API permis-conduire appelle un endpoint avec l’**OrderID** Moov et le **code de paiement** du dossier.
2. Le **backend** obtient un **JWT** auprès de Rengus, appelle **`/check-order`**, lit la réponse JSON.
3. Si la commande est considérée comme **payée** et que la réponse contient une ligne de transaction dont **`REFERENCE_KEY`** est **strictement égale** au `code_paiement` envoyé, le système peut **enregistrer le paiement** et **mettre à jour le dossier** (comme pour la vérification Airtel / Paynala, avec une condition de statut supplémentaire).

---

## 2. Fichiers concernés

| Fichier | Rôle |
|--------|------|
| `app/Services/MoovRengusApiService.php` | `getAccessToken()` (POST `/get-token`, cache du JWT), `checkOrder($orderId)` (POST `/check-order` avec `OrderID`), `clearTokenCache()`. |
| `app/Http/Controllers/Api/MoovRengusVerificationController.php` | Endpoint HTTP : validation, droits, appel service, règles métier, réponse JSON. |
| `app/Http/Requests/Moov/VerifierCommandeRengusRequest.php` | Validation du body (`order_id`, `code_paiement`, alias). |
| `config/services.php` | Clé `moov_rengus` : `base_url`, `username`, `password`, `verify_ssl`, `timeout`. |
| `routes/api.php` | `POST /api/paiements/moov/verifier-commande` (groupe `auth.token`). |

**Non concerné par cette vérif :** `PaiementMoovService` / callback SOAP (`POST /api/paiement/moov/callback`).

---

## 3. Configuration `.env`

| Variable | Description |
|----------|-------------|
| `MOOV_RENGUS_API_BASE_URL` | URL de base Rengus (sans slash final superflu), ex. `https://hôte:port`. |
| `MOOV_RENGUS_USERNAME` | Utilisateur pour `/get-token`. |
| `MOOV_RENGUS_PASSWORD` | Mot de passe pour `/get-token`. |
| `MOOV_RENGUS_VERIFY_SSL` | `true` / `false` — vérification du certificat TLS côté client HTTP. Souvent `false` en interne (certificat auto-signé). Défaut dans la config : `false`. |
| `MOOV_RENGUS_TIMEOUT` | Timeout des requêtes HTTP en secondes (défaut : `25`). |

Après modification : `php artisan config:clear`.

---

## 4. Endpoint applicatif

- **Méthode / chemin :** `POST /api/paiements/moov/verifier-commande`
- **Nom de route :** `paiements.moov.verifier-commande`
- **Authentification :** middleware **`auth.token`** (token utilisateur permis-conduire obligatoire).

### 4.1 Body JSON

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `order_id` | Oui* | OrderID envoyé à Rengus dans `check-order`. |
| `code_paiement` | Oui | Doit correspondre exactement à `dossiers.code_paiement` (recherche du dossier). |

\* Si `order_id` est absent, il peut être dérivé automatiquement de **`OrderID`** ou **`reference_paiement`** (voir `prepareForValidation` dans la FormRequest).

### 4.2 Réponses d’erreur avant appel Rengus

- **422** — Aucun dossier pour ce `code_paiement`, ou erreurs de validation du body.
- **403** — Agent : dossier d’un autre centre ; ou candidat : ce n’est pas son dossier.

### 4.3 Erreurs liées à Rengus

- **503** — Erreur réseau / exception, ou impossible d’obtenir le JWT (config manquante).
- **502** — HTTP **401** ou **422** côté Rengus sur `check-order` (token JWT manquant ou invalide côté Rengus) : le cache du token applicatif est invalidé.
- **422** — HTTP **400** côté Rengus (requête refusée, ex. OrderID manquant côté leur API).

---

## 5. Déroulement métier (ordre des étapes)

1. **Charger le dossier** avec `WHERE code_paiement = ?`. Sinon **422**.
2. **Contrôler les droits** (`CentreScopeHelper` pour les agents avec centre ; candidat = uniquement son dossier). Sinon **403**.
3. **Appeler Rengus** : `check-order` avec l’`order_id` validé.
4. **Calculer `paid` (côté backend)** — ce champ **n’est pas** un champ brut obligatoire du JSON Moov :  
   `paid = (HTTP 200) ET success truthy ET count > 0`.
5. Si **`paid`** : parcourir **`transactions`** et vérifier qu’**au moins une ligne** a  
   **`REFERENCE_KEY` === `code_paiement`** (comparaison **stricte** `===` sur les chaînes : casse et caractères comptent).
6. **Synchronisation base** (uniquement si **les trois** conditions suivantes) :  
   - `paid`  
   - `code_paiement_verifie_moov` (i.e. étape 5 OK)  
   - statut dossier **`EN_ATTENTE_PAIEMENT`**  
   Alors dans une transaction SQL :  
   - `PaiementHistoriqueService::creerPaiement` (clé idempotente `code_paiement` + `reference_paiement`) ;  
   - mise à jour du dossier : statut **`PAIEMENT DE FRAIS D'EXAMEN - Complété`**.

La **référence de paiement** enregistrée est prise dans les transactions (`ORDERID` / `order_id`) si présente, sinon l’`order_id` de la requête.

---

## 6. Réponse JSON (succès HTTP 200 vers le client)

Le corps fusionne en général :

- les champs renvoyés par **Rengus / Moov** (`success`, `count`, `message`, `transactions`, `order_id`, `verified_by`, etc.) ;
- des champs **ajoutés / surchargés** par l’application :

| Champ | Signification |
|-------|----------------|
| `moov_http_status` | Code HTTP de la réponse Rengus pour `check-order`. |
| `paid` | Booléen calculé (voir §5). |
| `success` | Même valeur que `paid` dans cette réponse agrégée. |
| `message` | Message lisible (priorité au message Moov si présent). |
| `transactions` | Tableau des lignes transaction. |
| `code_paiement_verifie_moov` | `true` si `paid` **et** au moins une transaction avec `REFERENCE_KEY === code_paiement`. |
| `dossier_id` | UUID du dossier résolu par `code_paiement`. |
| `dossier_synchronise` | `true` si l’enregistrement `paiements` + mise à jour statut a bien été fait. |

**Cas fréquent :** `paid: true` mais `code_paiement_verifie_moov: false` si le format Moov ne met pas le code dans `REFERENCE_KEY` (ex. clé littérale `CodePayement` et code ailleurs) — dans ce cas **aucune** synchro dossier. Il faut alors que la plateforme Moov/Renvoie **`REFERENCE_KEY` identique au `code_paiement`** du dossier, ou adapter le code de correspondance.

---

## 7. Comparaison rapide avec la vérification Airtel (Paynala)

| Sujet | Airtel (`checkPaiement` / `PaiementService`) | Moov Rengus |
|--------|-----------------------------------------------|-------------|
| API externe | Paynala `lookup-payment` | Rengus `get-token` + `check-order` |
| Identification dossier | Par ID dans l’URL | Par `code_paiement` dans le body |
| Condition paiement | `payments[0].status === 'SUCCESS'` | `paid` dérivé de HTTP 200 + `success` + `count` |
| Lien code / réponse | Le code sert d’`id_number` à Paynala | `REFERENCE_KEY` doit égaler le `code_paiement` envoyé |
| Statut avant MAJ | Non vérifié dans `checkAndProcessPaymentForDossier` | **`EN_ATTENTE_PAIEMENT` requis** |

---

## 8. Logs

- Succès synchro : `[MoovRengus] Dossier mis à jour après check-order` avec `dossier_id`, `order_id`.
- Échec synchro : `[MoovRengus] Erreur synchro dossier après check-order`.
- Erreurs transport / token : logs dans `MoovRengusApiService` (`[MoovRengus] ...`).

---

## 9. Documentation OpenAPI (Scramble)

- **`MoovRengusVerificationController`** : `#[Group]` (description du groupe), `#[Endpoint]` (titre + description du body, de `paid`, de REFERENCE_KEY, synchro), `#[Response]` pour les codes **200, 401, 403, 422, 502, 503**.
- **`MoovPaymentController`** : même principe pour **Initier paiement Moov (SOAP)** (réponses 200, 403, 404, 422) ; le groupe SOAP renvoie vers ce README et le groupe Rengus.

Régénérer / analyser : `php artisan scramble:analyze` (ou la commande d’export OpenAPI utilisée dans le projet).
