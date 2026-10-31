# Intégration Moov Money (Gabon) – Paiement en ligne marchand

Ce document décrit l’intégration du paiement **Moov Money** dans l’API permis de conduire. Le flux repose sur l’interface SOAP **InitTrans_OnlineMerchantPayment** (document Huawei / Moov) : le backend envoie une requête SOAP pour déclencher un **push de débit** sur le téléphone du client (Moov Money).

---

## 1. Contexte

- **Deux moyens de paiement** sont disponibles :
  - **Paynala (Airtel)** : vérification du paiement par code (lookup après paiement côté client).
  - **Moov Money** : initiation du paiement depuis le backend → push sur le téléphone du client → callback Result pour confirmer.
- L’intégration Moov respecte la **spécification XML/SOAP** fournie par Moov (Huawei CPS Interface).

---

## 2. Flux global

```
1. Dossier passé en "EN_ATTENTE_PAIEMENT"
   → Le code_paiement est généré (ex. PAxxxx12).

2. L’appelant (front ou autre service) appelle :
   POST /api/dossiers/{dossier_id}/initier-paiement-moov
   (optionnel : body { "montant": 150, "currency": "XAF" })

3. Le backend (PaiementMoovService) :
   - Récupère le numéro du candidat (candidat.personne.contact) et le montant (formation ou body).
   - Construit le SOAP InitTrans_OnlineMerchantPayment.
   - Envoie le SOAP à MOOV_PAYMENT_BASE_URL.

4. Moov envoie un push sur le téléphone du client (PrimaryParty).
   Le client accepte ou refuse sur son mobile.

5. Moov envoie le Result (succès/échec) en POST sur MOOV_RESULT_URL (callback).

6. Le callback (MoovPaymentController::callbackResult) :
   - Parse le Result SOAP.
   - Si ResultCode = 0 : crée une ligne dans la table paiements, met à jour le dossier
     (statut = "PAIEMENT DE FRAIS D'EXAMEN - Complété" ; `code_paiement` conservé sur le dossier).
   - Répond 200 avec { "ack": true }.
```

---

## 3. Endpoints

| Méthode | URL | Auth | Description |
|--------|-----|------|-------------|
| **POST** | `/api/dossiers/{dossier}/initier-paiement-moov` | Oui (Bearer) | Initie un paiement Moov pour le dossier : envoie le SOAP et déclenche le push sur le téléphone du candidat. Body optionnel : `{ "montant": number, "currency": "XAF" }`. |
| **POST** | `/api/paiement/moov/callback` | Non | Callback appelé par la plateforme Moov avec le Result SOAP. **Ne pas protéger par auth** : Moov n’envoie pas de token. |

---

## 4. Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `config/services.php` | Bloc `moov_money` : lecture des variables depuis `.env`. |
| `app/Services/PaiementMoovService.php` | Construction du SOAP, envoi HTTP, parsing du Result, normalisation du numéro (241...). |
| `app/Http/Controllers/Api/MoovPaymentController.php` | `initierPaiement` (initiation) et `callbackResult` (callback). |
| `routes/api.php` | Route protégée pour l’initiation, route publique pour le callback. |

---

## 5. Configuration

Toutes les variables utilisées sont définies dans le fichier **.env**. Pour le détail de chaque variable (rôle, correspondance XML, valeurs à fournir par Moov), voir le document dédié :

- **[MOOV_CONFIGURATION.md](MOOV_CONFIGURATION.md)** – Configuration des variables d’environnement Moov.

Résumé minimal :

- **MOOV_PAYMENT_BASE_URL** : URL de l’API Moov (obligatoire, fournie par Moov).
- **MOOV_RESULT_URL** : URL publique du callback (ex. `https://votre-domaine.com/api/paiement/moov/callback`).
- Identifiants et short code : **MOOV_THIRD_PARTY_ID**, **MOOV_PAYMENT_PASSWORD**, **MOOV_MERCHANT_SHORTCODE**, etc. (voir MOOV_CONFIGURATION.md).

---

## 6. Données dynamiques (non stockées dans .env)

Ces valeurs sont prises du **dossier / candidat / formation** ou du **body** de la requête :

- **PrimaryParty** (numéro client) : `dossier->candidat->personne->contact`, normalisé en 241...
- **Amount** : `dossier->formation->montant` ou champ `montant` du body.
- **Currency** : champ `currency` du body (défaut `XAF`).
- **OriginatorConversationID** : `P_{dossier->id}` pour retrouver le dossier dans le callback.
- **externalData1 / externalData2** : `dossier->id` et `dossier->code_paiement` pour la traçabilité.

---

## 7. Réponses de l’endpoint d’initiation

- **200** : Requête acceptée par Moov (push envoyé au client). Body : `success`, `message`, éventuellement `conversation_id`, `originator_conversation_id`, `response_code`, `response_desc`.
- **404** : Dossier non trouvé.
- **422** : Dossier pas en statut `EN_ATTENTE_PAIEMENT`, ou montant/candidat invalide, ou erreur renvoyée par Moov.
- **403** : Accès refusé (restriction centre / rôle).

---

## 8. Référence documentaire

- **Gabon Moov Money Interface Mapping (Payment Online for customer) V1.0** (Huawei) : décrit l’interface **InitTrans_OnlineMerchantPayment**, les paramètres Request/Response/Result et le flux asynchrone (Result envoyé sur ResultURL).
