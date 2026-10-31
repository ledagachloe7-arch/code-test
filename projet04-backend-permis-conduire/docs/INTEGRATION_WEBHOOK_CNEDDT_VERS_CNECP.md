# Intégration : webhook CNEDDT → API CNEPC (`/cneddt/receive`)

Ce document permet à une **autre application** (plateforme CNEDDT ou intermédiaire) d’appeler correctement le point d’entrée CNEPC qui reçoit la demande de **retour d’un dossier pour modification**.

> **Guide pratique (checklist + extraits Node / PHP / Python) :**  
> [`GUIDE_INTEGRATION_APPEL_WEBHOOK_CNECP.md`](GUIDE_INTEGRATION_APPEL_WEBHOOK_CNECP.md)

---

## 1. Contexte fonctionnel

- Le **CNEDDT** doit pouvoir notifier le **CNEPC** qu’un dossier déjà transmis doit être repris : le CNEPC positionne alors le dossier au statut **`RETOUR_CNEDDT_POUR_MODIFICATION`** pour que les équipes (auto-école / centre) corrigeent et poursuivent le flux métier dans l’outil CNEPC.
- Ensuite, lorsqu’un utilisateur métier **met à jour** ce dossier via l’API CNEPC classique (`PUT/PATCH /api/dossiers/{id}`), le système peut le repasser automatiquement en **`ENVOI À LA BIOMETRIE`** selon les règles déjà implémentées côté mise à jour de dossier.

---

## 2. URL du webhook

| Élément | Valeur |
|--------|--------|
| **Méthode** | `POST` |
| **Chemin** | `/api/cneddt/receive` |
| **URL complète** | `{BASE_URL}/api/cneddt/receive` où `BASE_URL` est l’URL publique du serveur CNEPC (ex. `https://permis.example.com`, sans slash final). |

**Remarques :**

- Ce chemin **n’utilise pas** le Bearer utilisateur métier (`Authorization` type session / token JWT habituel du front).
- Il s’authentique avec une **clé partagée** dans le header (voir §4).

---

## 3. En-têtes HTTP obligatoires

| Header | Obligatoire | Description |
|--------|-------------|-------------|
| `Content-Type` | Recommandé | `application/json` |
| **`X-API-KEY`** | **Oui** | Doit correspondre exactement à la valeur configurée côté CNEPC (`CNEDDT_API_KEY` — voir §8). |

Aucune autre preuve (OAuth, JWT) n’est attendue pour ce webhook.

---

## 4. Corps de la requête (JSON)

Un seul champ est requis :

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id_dossier` | chaîne UUID | **Oui** | Identifiant du dossier tel qu’il existe **déjà dans la base CNEPC** (même valeur que lors du transfert initial vers le CNEDDT). |

> **À ne pas confondre avec `dossier_id` :** sur ce webhook, le nom exact attendu dans le corps JSON est **`id_dossier`**. Le libellé **`dossier_id`** est surtout utilisé dans les payloads **`POST /api/dossiers/transfert`** (flux CNEPC → CNEDDT), pas ici.

**Exemple minimal :**

```json
{
  "id_dossier": "019a2bc3-def4-7000-bcde-ffffffffffff"
}
```

Contraintes côté CNEPC :

- `id_dossier` doit être un **UUID** valide au format Laravel (`Str::isUuid`).
- Le dossier doit **exister** ; sinon réponse **404**.

---

## 5. Réponses HTTP et corps JSON

Le serveur répond avec un objet JSON systématique ; le **code HTTP** dépend du cas.

### 5.1 Succès (mise à jour effectuée)

- **HTTP 200**
- Corps typique :

```json
{
  "success": true,
  "message": "Dossier transféré avec succès.",
  "data": {
    "id_dossier": "019a2bc3-def4-7000-bcde-ffffffffffff",
    "statut": "RETOUR_CNEDDT_POUR_MODIFICATION"
  }
}
```

### 5.2 Clé API invalide ou absente

- **HTTP 401**
- Exemple :

```json
{
  "success": false,
  "message": "Clé API invalide."
}
```

### 5.3 `id_dossier` absent ou UUID invalide

- **HTTP 422**
- Exemple :

```json
{
  "success": false,
  "message": "ID invalide."
}
```

### 5.4 Dossier introuvable (`id` inexistant en base CNEPC)

- **HTTP 404**
- Exemple :

```json
{
  "success": false,
  "message": "Dossier non trouvé."
}
```

### 5.5 Configuration CNEPC incomplète (clé non définie en production)

Si `CNEDDT_API_KEY` **n’est pas définie** côté CNEPC, le service renvoie un échec logique **`success: false`** avec un libellé indiquant la configuration manquante. À traiter comme **erreur d’exploitation** à corriger sur le serveur CNEPC avant de réessayer les appels.

---

## 6. Exemples d’implémentation

### 6.1 cURL

```bash
curl -X POST "${BASE_URL}/api/cneddt/receive" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: VOTRE_CLE_PARTAGEE" \
  -d '{"id_dossier":"019a2bc3-def4-7000-bcde-ffffffffffff"}'
```

Remplace `BASE_URL` et `id_dossier` par les valeurs réelles ; la clé est celle communiquée par l’administrateur CNEPC (alignée sur `CNEDDT_API_KEY`).

### 6.2 Intégration dans une autre API (pseudo-code Node.js)

```javascript
async function notifierRetourCneddtVersCnecp(baseUrl, apiKey, dossierIdUuid) {
  const res = await fetch(`${baseUrl}/api/cneddt/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ id_dossier: dossierIdUuid }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} — ${JSON.stringify(body)}`);
  }
  return body;
}
```

### 6.3 Intégration (pseudo-code Python)

```python
import json
import urllib.request


def notifier_retour(base_url: str, api_key: str, dossier_id: str) -> dict:
    url = f"{base_url.rstrip('/')}/api/cneddt/receive"
    req = urllib.request.Request(
        url,
        data=json.dumps({"id_dossier": dossier_id}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-API-KEY": api_key,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode()
        return json.loads(body)
```

---

## 7. Bonnes pratiques côté appelant (CNEDDT / middleware)

| Sujet | Recommandation |
|--------|----------------|
| **Idempotence** | Un second appel avec le même `id_dossier` repositionne encore le même statut ; envisager un backoff et des logs métier pour éviter les doublons inutiles. |
| **Sécurité** | Transport **HTTPS**, stockage secret de la clé hors dépôt, rotation coordonnée avec l’équipe CNEPC. |
| **Traçabilité** | Logger le `id_dossier`, le statut HTTP et le corps réponse ou un extrait (sans données personnelles excessivement sensibles hors cadre légal). |
| **Réessais** | En **5xx** ou timeout réseau, prévoir quelques retries avec délai ; en **401** / **422** / **404**, corriger données ou configuration avant de reboucler. |

---

## 8. Configuration requise côté serveur CNEPC

Fichiers d’environnement Laravel (valeurs exemples uniquement ; ne pas committer les secrets réels) :

```env
# URL du CNEDD (pour les appels sortants CNEPC → CNEDD — autre partie du projet)
CNEDDT_API_URL=https://cnedd.example/

# Clé attendue dans le header X-API-KEY sur POST /api/cneddt/receive
CNEDDT_API_KEY=cle_partagee_secrete_a_generer_et_a_communiquer
```

Référence configuration applicative : `config/services.php` → clé `cneddt_api`.

---

## 9. Séparation avec le flux inverse (CNEPC → CNEDDT)

Pour **envoyer** un dossier depuis le CNEPC vers le CNEDDT (transfert, création permis, etc.), l’endpoint exposé aux clients authentifiés est **`POST /api/dossiers/transfert`** sous **middleware identité** (`Authorization`). Ce flux n’est **pas** le même contrat que le webhook `POST /api/cneddt/receive` décrit dans ce guide.

Référez-vous au contrôleur `DossierController` (transfert) et au `DossierService` dans le dépôt pour le détail des payloads métier dans ce sens là.

---

## 10. Point de validation dans le dépôt

| Fichier | Rôle |
|---------|------|
| `routes/api.php` | Déclaration de `Route::post('/cneddt/receive', ...)` hors groupe `auth.token` |
| `app/Http/Controllers/Api/DossierController.php` | Méthode `getDossierFromCneddt` |
| `app/Http/Services/DossierService.php` | Méthode `receiveFromCneddt` |

En cas de divergence entre ce document et le code source, **le dépôt Git fait foi** ; faire évoluer la doc après toute évolution fonctionnelle.

---

## 11. Dépannage : `remote.status` = **404** et `body_preview` commence par `<!DOCTYPE html>`

Cela signifie que **Laravel renvoie sa page « Not Found » en HTML**, pas une réponse JSON de l’endpoint. Le client (CNEDDT) interprète alors : *« Réponse CNEPC invalide : le corps n’est pas du JSON attendu »* (ex. erreur métier **502** côté appelant).

**Causes fréquentes :**

| Problème | À vérifier |
|----------|------------|
| **Préfixe `/api` omis** | L’URL correcte est **`{BASE_URL}/api/cneddt/receive`**. Une URL du type `{BASE_URL}/cneddt/receive` (sans **`/api`**) peut donner **404** si aucune route web équivalente n’existe. |
| **Faute de frappe** | Chemin exact : **`cneddt`** (pas `cnedd`, pas `cneddt`). Segment final : **`receive`**. |
| **Méthode HTTP** | Il faut **`POST`**. Un **GET** sur une route `POST`-only conduit en général à une erreur différente (souvent **405**) ; suivant la config pare-feu/proxy on peut aussi voir un **404**. |
| **Mauvais hôte ou instance** | `BASE_URL` pointe vers un autre projet, une vieille VM, ou un sous-domaine qui n’a pas encore ce déploiement. |
| **Proxy / IIS / Nginx** | Troncature ou réécriture d’URL (perte du segment `/api/`). Tester avec **curl** depuis une machine qui voit la même URL que le CNEDDT. |

**Test rapide depuis un poste ayant la clé :**

```bash
curl -i -X POST "https://VOTRE-HÔTE/api/cneddt/receive" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: LA_MÊME_CLÉ_QU_EN_PRODUCTION" \
  -d '{"id_dossier":"00000000-0000-4000-8000-000000000000"}'
```

Si la route existe, vous obtenez du **JSON** (**401**/ **422**/ **404** JSON pour « Dossier non trouvé » selon les cas — mais **toujours** depuis le contrôleur, pas une grande page HTML). Si vous voyez **404** avec du **HTML**, c’est encore un problème **d’URL / routage jusqu’à Laravel**.
