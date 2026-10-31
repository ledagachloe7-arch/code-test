# Guide pratique : appeler le webhook CNEPC depuis une autre API

Ce document aide une **équipe qui développe une autre application** (backend CNEDDT, passerelle, script d’ordonnancement, etc.) à **intégrer l’appel HTTP** vers le CNEPC pour demander un **retour dossier pour modification**.

La **référence complète** (exemples JSON longs, contexte fonctionnel élargi) est dans :  
**[`INTEGRATION_WEBHOOK_CNEDDT_VERS_CNECP.md`](INTEGRATION_WEBHOOK_CNEDDT_VERS_CNECP.md)**.

---

## 1. Ce que fait l’appel (en une phrase)

**`POST`** sur **`{BASE_URL}/api/cneddt/receive`** avec un JSON **`{ "id_dossier": "<UUID>" }`** et le header **`X-API-KEY`**, sans token utilisateur Bearer.

Après succès (**HTTP 200** + `success: true`), le dossier côté CNEPC passe au statut **`RETOUR_CNEDDT_POUR_MODIFICATION`**.

---

## 2. Tableaux du contrat (référence rapide)

### 2.1 URL du webhook

| Élément | Valeur |
|--------|--------|
| **Méthode** | `POST` |
| **Chemin** | `/api/cneddt/receive` |
| **URL complète** | `{BASE_URL}/api/cneddt/receive` où `BASE_URL` est l’URL publique HTTPS du serveur CNEPC (sans slash final). |

- Ce chemin **n’utilise pas** le Bearer métier (`Authorization` JWT/session).
- Authentification : **une seule** clé partagée **`X-API-KEY`** (voir §2.2).

---

### 2.2 En-têtes HTTP

| Header | Obligatoire | Description |
|--------|-------------|-------------|
| `Content-Type` | Recommandé | `application/json` |
| **`X-API-KEY`** | **Oui** | Doit correspondre **exactement** à **`CNEDDT_API_KEY`** configurée sur le serveur CNEPC. |
| **`Accept`** | Optionnel conseillé | `application/json` — réponses plus prévisibles. |

Pas d’OAuth ni de JWT pour ce webhook.

---

### 2.3 Corps de la requête (JSON)

Un seul champ requis :

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| **`id_dossier`** | chaîne UUID | **Oui** | UUID du dossier tel qu’il existe **déjà dans la base CNEPC**. |

> **À ne pas confondre :** pour **ce webhook**, la clé JSON attendue est **`id_dossier`**. **`dossier_id`** figure surtout dans les payloads **`POST /api/dossiers/transfert`** (flux CNEPC → CNEDDT), **pas** ici.

**Exemple minimal :**

```json
{
  "id_dossier": "019a2bc3-def4-7000-bcde-ffffffffffff"
}
```

**Contraintes :** UUID valide côté Laravel ; dossier **existant**, sinon erreur métier JSON **404** (voir §2.5).

---

### 2.4 Réponses HTTP et corps (synthèse)

Le corps est **toujours** un objet JSON (sauf problème réseau / page HTML Laravel si **mauvaise URL**).

| HTTP | Situation | `success` (typique) | Message / données (extraits) |
|------|-----------|---------------------|------------------------------|
| **200** | Mise à jour du statut effectuée | `true` | `"message":"Dossier transféré avec succès."`, `"data":{"id_dossier":"<uuid>","statut":"RETOUR_CNEDDT_POUR_MODIFICATION"}` |
| **200** | Config CNEPC incomplète (`CNEDDT_API_KEY` vide côté serveur) | `false` | Libellé indiquant la configuration manquante — **erreur d’exploitation** à corriger sur CNEPC. |
| **401** | **`X-API-KEY`** absente ou incorrecte | `false` | `"message":"Clé API invalide."` |
| **422** | **`id_dossier`** absent ou UUID invalide | `false` | `"message":"ID invalide."` |
| **404** | JSON CNEPC : aucun dossier avec cet **`id`** | `false` | `"message":"Dossier non trouvé."` |
| **≠ JSON** (**404 HTML** `<!DOCTYPE…`) | Route introuvable côté serveur HTTP / Laravel | — | Mauvaise URL (souvent **`/api`** manquant) ou mauvais hôte — voir §2.6. |

Pour des **exemples JSON complets** par cas : **`INTEGRATION_WEBHOOK_CNEDDT_VERS_CNECP.md` §5.**

---

### 2.5 Dépannage : erreur métier JSON « 502 » avec `remote.status` **404** et HTML

Si votre client affiche quelque chose comme *Réponse invalide : pas du JSON* alors que Laravel renvoie une **page HTML 404** :

| Cause possible | À vérifier |
|------------------|------------|
| **`/api` absent** dans l’URL | Utiliser **`{BASE_URL}/api/cneddt/receive`**, pas **`{BASE_URL}/cneddt/receive`**. |
| **Faute dans le chemin** | **`cneddt`** puis **`receive`** exactement ainsi. |
| **Méthode** | **`POST`** (pas GET). |
| **Mauvais environnement** | `BASE_URL` pointe bien la même instance où la route est déployée ; pas de pare-feu qui tronque le chemin. |

Test rapide : exemples **curl** en **§6** ; détails et causes supplémentaires dans **`INTEGRATION_WEBHOOK_CNEDDT_VERS_CNECP.md`** (section dépannage 404 HTML).

---

## 3. Prérequis avant d’écrire du code

| Élément | Rôle |
|--------|------|
| **`BASE_URL`** | URL HTTPS publique du serveur Laravel CNEPC, **sans** slash final (ex. `https://permis-production.example.com`). À confirmer avec l’infra CNEPC. |
| **`X-API-KEY`** | Secret communiqué par l’équipe CNEPC ; côté serveur ils le configurent sous **`CNEDDT_API_KEY`**. À stocker en **variable d’environnement** dans ton projet (jamais en dur dans Git). |
| **`id_dossier`** | L’UUID du dossier tel qu’il existe **déjà dans le CNEPC** (pas un identifiant interne différent sans correspondance). |

---

## 4. Checklist « premier appel qui marche »

1. URL exacte : **`POST {BASE_URL}/api/cneddt/receive`** — le segment **`/api`** est indispensable (sinon **404 en HTML**, pas du JSON).
2. Méthode **`POST`** (pas GET).
3. Headers **`Content-Type: application/json`**, **`X-API-KEY`** alignée avec le serveur CNEPC.
4. Corps avec **`id_dossier`** (pas **`dossier_id`**).
5. Tester avec **curl** ou Postman depuis le même réseau que la prod avant d’embarquer dans ton code.

---

## 5. Modèle de requête (à adapter dans ta stack)

```
POST {BASE_URL}/api/cneddt/receive HTTP/1.1
Host: ...
Content-Type: application/json
X-API-KEY: <secret>
Accept: application/json

{"id_dossier":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
```

---

## 6. Extraits de code (copier-coller)

### 6.1 cURL

```bash
curl -sS -X POST "${CNECP_BASE_URL}/api/cneddt/receive" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: ${CNECP_WEBHOOK_API_KEY}" \
  -H "Accept: application/json" \
  -d "{\"id_dossier\":\"${DOSSIER_UUID}\"}"
```

### 6.2 Node.js (`fetch`)

```javascript
import process from 'node:process';

const baseUrl = process.env.CNECP_BASE_URL; // ex: https://api.cnecp.example.com
const apiKey = process.env.CNECP_WEBHOOK_API_KEY;
const idDossier = '019a2bc3-def4-7000-bcde-ffffffffffff';

const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/cneddt/receive`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-API-KEY': apiKey,
  },
  body: JSON.stringify({ id_dossier: idDossier }),
});

const json = await res.json();
if (!res.ok) {
  throw new Error(`${res.status} ${JSON.stringify(json)}`);
}
// json.success === true attendu pour succès métier
```

### 6.3 PHP (`Illuminate\Support\Facades\Http`)

```php
use Illuminate\Support\Facades\Http;

$response = Http::withHeaders([
    'X-API-KEY' => config('services.cnecp_webhook.key'), // .env CNECP_WEBHOOK_API_KEY par ex.
    'Accept' => 'application/json',
])
    ->post(rtrim(config('services.cnecp_webhook.base_url'), '/') . '/api/cneddt/receive', [
        'id_dossier' => $dossierUuid,
    ]);

if (! $response->successful()) {
    // logger status + corps
    abort($response->status(), $response->body());
}

$data = $response->json();
// $data['success'] === true pour succès métier
```

Configure les clés **`base_url`** / **`key`** dans ton `config/services.php` + `.env` (noms exemples : **`CNECP_WEBHOOK_BASE_URL`**, **`CNECP_WEBHOOK_API_KEY`**).

### 6.4 Python (`requests`)

```python
import os
import requests

BASE = os.environ["CNECP_BASE_URL"].rstrip("/")
KEY = os.environ["CNECP_WEBHOOK_API_KEY"]

r = requests.post(
    f"{BASE}/api/cneddt/receive",
    headers={
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-KEY": KEY,
    },
    json={"id_dossier": "019a2bc3-def4-7000-bcde-ffffffffffff"},
    timeout=30,
)
r.raise_for_status()
print(r.json())
```

---

## 7. Bonnes pratiques côté appelant

| Sujet | Recommandation |
|--------|----------------|
| **Idempotence** | Un second appel avec le même `id_dossier` repositionne encore le même statut ; logs métier pour limiter les doublons involontaires. |
| **Sécurité** | **HTTPS**, secret hors dépôt, rotation avec l’équipe CNEPC. |
| **Traçabilité** | Logger `id_dossier`, statut HTTP, extrait de réponse (sans exposer trop de données perso hors cadre). |
| **Réessais** | En **5xx** ou timeout : backoff ; en **401** / **422** / **404 JSON** : corriger données/config avant de reboucler. |

---

## 8. Sécurité et exploitation

- Mettre la clé uniquement dans des **secrets** (variables d’environnement, coffre-fort CI).
- Appels **HTTPS** uniquement en production.
- Journaliser **status HTTP**, **`success`**, **`id_dossier`** (ne pas logger la clé).
- Timeout + retries raisonnables sur erreurs transitoiries (**5xx**).

---

## 9. Configuration côté serveur CNEPC (rappel)

Le serveur qui **reçoit** le webhook lit la clé attendue ainsi :

| Fichier / env | Détail |
|---------------|--------|
| **`.env`** | `CNEDDT_API_KEY` = valeur que vous donnez aux intégrations pour **`X-API-KEY`**. |
| `config/services.php` | Clé `cneddt_api.key` ← `env('CNEDDT_API_KEY')`. |
| `CNEDDT_API_URL` | Sert aux **sorties** CNEPC → CNEDDT (transfert), pas au contrôle **`X-API-KEY`**. |

Exemple :

```env
CNEDDT_API_URL=https://cneddt.example.com/
CNEDDT_API_KEY=cle_partagee_secrete_communiquee_aux_integrations
```

---

## 10. Fichiers côté dépôt CNEPC (pour support / PR)

| Fichier | Rôle |
|---------|------|
| `routes/api.php` | `Route::post('/cneddt/receive', …)` hors `auth.token` |
| `app/Http/Controllers/Api/DossierController.php` | `getDossierFromCneddt` |
| `app/Http/Services/DossierService.php` | `receiveFromCneddt` |

---

## 11. Séparation flux inverse (résumé tableau)

| Direction | Endpoint typique | Auth |
|-----------|-----------------|------|
| **CNEDDT → CNEPC** (ce guide) | `POST /api/cneddt/receive` | **`X-API-KEY`** = `CNEDDT_API_KEY` |
| **CNEPC → CNEDDT** (transfert) | `POST /api/dossiers/transfert` | **`Authorization`** (utilisateur authentifié) |

Détail des payloads transfert : `DossierController` / `DossierService`.

---

## 12. Documentation de référence étendue

Exemples JSON **complets** pour chaque code HTTP : **`INTEGRATION_WEBHOOK_CNEDDT_VERS_CNECP.md`**.
