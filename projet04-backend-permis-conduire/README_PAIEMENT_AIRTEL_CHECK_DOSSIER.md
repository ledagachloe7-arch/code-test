## Vérification paiement Airtel / Paynala (par dossier)

Objectif : quand l’utilisateur est sur **un dossier** dans le frontend, vérifier **uniquement ce dossier** auprès de Paynala (Airtel Money) et, si le paiement est confirmé, **enregistrer** dans la table `paiements` puis **mettre à jour** le dossier.

---

### Endpoint (1 dossier)

- **Méthode** : `GET`
- **URL** : `/api/dossiers/{dossierId}/check-paiement`
- **Auth** : `Authorization: Bearer <token>`
- **Body** : **aucun**

> Le frontend passe **l’UUID du dossier** (`dossiers.id`) dans l’URL.  
> Le frontend **ne passe pas** le code de paiement.

---

### Ce que fait le backend

1. Charge le dossier `{dossierId}` (avec contrôle d’accès centre via `CentreScopeHelper`).
2. Récupère `dossiers.code_paiement`.
3. Appelle Paynala **lookup-payment** avec :

```json
{ "id_number": "<code_paiement_du_dossier>" }
```

4. Si Paynala retourne un paiement `SUCCESS` :
   - **Crée / met à jour** une ligne dans `paiements` (idempotent, basé sur la contrainte unique) :
     - `code_paiement`
     - `reference_paiement` (= `airtel_money_id`)
     - `montant` (= `subscription.amount`)
     - `nom`, `prenom`, `dossier_id`
   - Met à jour le dossier :
     - `statut` → `PAIEMENT DE FRAIS  D'EXAMEN - Complété`
     - `code_paiement` est **conservé** sur le dossier (traçabilité / unicité historique).

---

### Réponses API (forme)

#### 200 OK
- `success: true`
- `paid: true|false`

Cas possibles :
- `paid: true` : paiement confirmé (`SUCCESS`), dossier mis à jour, paiement enregistré.
- `paid: false` : paiement non confirmé / introuvable (ex: Paynala `data: null`), aucun changement sur le dossier.

#### 422 Unprocessable Entity
- `success: false`
- Exemple : dossier sans `code_paiement`, erreur Paynala, erreur DB.

#### 403 Forbidden
Accès refusé (agent centre essaye d’accéder à un dossier d’un autre centre).

---

### Exemple d’appel (frontend)

```js
await fetch(`${API_BASE_URL}/dossiers/${dossierId}/check-paiement`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  },
});
```

---

### Notes importantes

- Le traitement est **par dossier** : aucun scan global des dossiers en attente.
- Le champ `code_paiement` doit être présent sur le dossier au moment de l’appel.
- L’écriture dans `paiements` est **idempotente** (si le paiement existe déjà, on met à jour/retourne la même ligne au lieu d’échouer).

