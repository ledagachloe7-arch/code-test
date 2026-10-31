# Configuration des variables Moov Money (.env)

Ce document décrit chaque variable d’environnement utilisée pour l’intégration **Moov Money** (paiement en ligne marchand). Les valeurs sont lues dans `config/services.php` sous le bloc `moov_money`.

---

## 1. Où configurer

- Fichier : **`.env`** à la racine du projet.
- Après modification, exécuter si besoin : `php artisan config:clear`.

---

## 2. Tableau des variables

| Variable | Obligatoire | Exemple / Défaut | Correspondance XML | Description |
|----------|-------------|------------------|-------------------|-------------|
| **MOOV_PAYMENT_BASE_URL** | Oui | `https://api.moov.ga/...` | — | URL de l’API Moov où envoyer la requête SOAP. **Non présente dans le XML** : à obtenir auprès de Moov. |
| **MOOV_THIRD_PARTY_ID** | Oui | `RENGUS` | `req:Caller/ThirdPartyID` | Identifiant du système tiers (partenaire) dans la plateforme Moov. |
| **MOOV_PAYMENT_PASSWORD** | Oui | (fourni par Moov) | `req:Caller/Password` | Mot de passe du Caller. Souvent chiffré (3DES/RSA). Remplacer les placeholders par la valeur fournie par Moov. |
| **MOOV_RESULT_URL** | Oui | `https://votre-domaine.com/api/paiement/moov/callback` | `req:Caller/ResultURL` | URL de callback où Moov envoie le **Result** (succès/échec). Doit être **accessible depuis les serveurs Moov** (URL publique en HTTPS en production). |
| **MOOV_INITIATOR_IDENTIFIER** | Oui | `RENGUS` | `req:Initiator/Identifier` | Identifiant de l’initiateur (opérateur/organisation qui initie la transaction). |
| **MOOV_SECURITY_CREDENTIAL** | Oui | (fourni par Moov) | `req:Initiator/SecurityCredential` | PIN ou secret de l’initiateur (souvent chiffré). Remplacer le placeholder par la valeur fournie par Moov. |
| **MOOV_CHANNEL_CODE** | Non | `1010` | `req:Header/ChannelCode` | Code du canal (ex. 1010 = API). |
| **MOOV_MERCHANT_SHORTCODE** | Oui | (fourni par Moov) | `req:ReceiverParty/Identifier` | Short code du **marchand** qui reçoit le paiement. Remplacer `shortcodeMerchant` par le vrai short code. |
| **MOOV_REQUESTER_IDENTIFIER** | Non | `I0200` | `req:Requester/Identifier` | Identifiant du requester (qui demande la transaction, ex. compte marchand). |
| **MOOV_KEY_OWNER** | Non | `1` | `req:Header/KeyOwner` | Propriétaire de la clé (contexte chiffrement). |
| **MOOV_CALLER_TYPE** | Non | `2` | `req:Caller/CallerType` | Type d’appelant : `2` = système tiers / API Caller. |

---

## 3. Exemple de bloc .env commenté

```env
### Moov Money (Gabon) - Paiement en ligne marchand (SOAP InitTrans_OnlineMerchantPayment)

# URL de l'API Moov (fournie par Moov - pas dans le XML).
MOOV_PAYMENT_BASE_URL=https://api.moov.ga/cpsinterface/api_requestmgr

# req:Caller/ThirdPartyID
MOOV_THIRD_PARTY_ID=RENGUS

# req:Caller/Password - Remplacer par le vrai mot de passe fourni par Moov.
MOOV_PAYMENT_PASSWORD=votre_mot_de_passe_caller

# req:Caller/ResultURL - URL publique de votre callback.
MOOV_RESULT_URL=https://votre-domaine.com/api/paiement/moov/callback

# req:Initiator/Identifier
MOOV_INITIATOR_IDENTIFIER=RENGUS

# req:Initiator/SecurityCredential - Remplacer par la valeur fournie par Moov.
MOOV_SECURITY_CREDENTIAL=votre_security_credential

# req:Header/ChannelCode
MOOV_CHANNEL_CODE=1010

# req:ReceiverParty/Identifier - Remplacer par le vrai short code marchand.
MOOV_MERCHANT_SHORTCODE=VOTRE_SHORTCODE

# req:Requester/Identifier
MOOV_REQUESTER_IDENTIFIER=I0200

# req:Header/KeyOwner
MOOV_KEY_OWNER=1

# req:Caller/CallerType
MOOV_CALLER_TYPE=2
```

---

## 4. Ce qu’il faut fournir côté Moov

À demander / obtenir auprès de Moov (ou de l’opérateur qui gère l’API) :

1. **URL de l’API** → `MOOV_PAYMENT_BASE_URL`
2. **Identifiant partenaire** → en général déjà fixé (ex. `RENGUS`) → `MOOV_THIRD_PARTY_ID`
3. **Mot de passe Caller** (et éventuellement format de chiffrement) → `MOOV_PAYMENT_PASSWORD`
4. **Identifiant et credential initiateur** → `MOOV_INITIATOR_IDENTIFIER`, `MOOV_SECURITY_CREDENTIAL`
5. **Short code marchand** → `MOOV_MERCHANT_SHORTCODE`
6. **Confirmation de l’URL de callback** : votre `MOOV_RESULT_URL` doit être acceptée et appelable par leurs serveurs (whitelist, HTTPS, etc.)

---

## 5. Vérification rapide

- Toutes les variables **obligatoires** sont renseignées (pas de valeur vide pour Base URL, Password, Result URL, Initiator, SecurityCredential, Merchant Shortcode).
- `MOOV_RESULT_URL` pointe bien vers votre route **publique** :  
  `POST /api/paiement/moov/callback`
- En production, utiliser **HTTPS** pour `MOOV_PAYMENT_BASE_URL` et `MOOV_RESULT_URL`.

Pour le détail du flux et des endpoints, voir **[README_MOOV_INTEGRATION.md](README_MOOV_INTEGRATION.md)**.
