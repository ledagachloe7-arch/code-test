# Renouvellement simplifié des catégories de permis

**Branche :** `feat/renouvellement-simplifie` (à partir de `yaf-test-branch`)
**Commits :** `805bd1e` (parcours + anti-doublon), `3e055f8` (nouvelles dates après paiement)
**Date :** 2026-11-02

---

## 1. Objectif

Avant, un renouvellement passait par le formulaire complet de « Nouvelle demande » : type, candidat, permis, auto-école et formation, pièces, puis transfert à la **biométrie**.

Le renouvellement est maintenant **un parcours court**, dédié au type `RENOUVELLEMENT` :

> Numéro de permis → informations et catégories du titulaire → choix des catégories → paiement → **nouvelles dates calculées** → envoi à la **CNEDDT (sans biométrie)** → **short code** → **récépissé**

Les autres types de demande (Nouveau permis, Duplicata, Fiche d'enregistrement, Duplicata fiche, Conversion) **ne sont pas modifiés**.

---

## 2. Parcours fonctionnel

Point d'entrée : **Nouvelle demande** (`/eleves/nouvelle-demande`), carte **Renouvellement**.
Le bouton « Créer un dossier » de *Gestion dossier* ouvre l'ancien parcours par étapes. Il n'est **pas** concerné.

### 2.1 Personne déjà digitalisée

| # | Écran | Ce qui se passe | Statut du dossier |
|---|---|---|---|
| 1 | Numéro de permis → **Rechercher** | Recherche dans le registre et l'historique (`/change-permis`), puis toutes les catégories du titulaire via son identité. À défaut, recherche dans les dossiers de digitalisation transmis. | — |
| 2 | Onglet **Informations** | Identité + toutes les catégories avec un badge **Expirée / Valide** | — |
| 3 | Onglet **Catégories à renouveler** | Cases à cocher (les catégories expirées sont cochées d'avance). Pas d'ajout ni de modification de catégorie. | — |
| 4 | Titulaire | **Candidat existant** retrouvé par nom + prénom + date de naissance. Sinon, mini-formulaire : téléphone (obligatoire), genre, type et n° de pièce, email facultatif. | — |
| 5 | **Valider et passer au paiement** | Création du dossier (ou reprise de celui en cours, voir §3.1) et génération du code de paiement | `en_attente` → `EN_ATTENTE_PAIEMENT` |
| 6 | **Vérifier le paiement** | Vérification Paynala, puis **calcul automatique des nouvelles dates** (voir §3.2) et affichage du tableau ancienne / nouvelle validité | inchangé |
| 7 | **Envoyer à la CNEDDT** | Transfert `RENOUVELLEMENT` (sans biométrie). La CNEDDT renvoie le **short code** (`cashier_short_code`), affiché en grand et envoyé par SMS. | `DOSSIER ENVOYER` |
| 8 | **Imprimer le récépissé** | PDF « Récépissé de renouvellement » : short code, titulaire, catégories avec ancienne validité / valable du / jusqu'au | — |

### 2.2 Personne non digitalisée (catégories expirées)

Si le numéro ne correspond à aucun permis numérique, un encadré **« Permis non digitalisé »** propose de digitaliser d'abord :

| Bouton | Type de demande | Usage indiqué dans l'application |
|---|---|---|
| Fiche d'enregistrement | `FICHEENREGISTREMENT` | Permis vert |
| Duplicata fiche d'enregistrement | `DUPLICATAFICHEENREGISTREMENT` | Permis vert (duplicata) |
| Duplicata | `DUPLICATA` | Permis rose |

1. Le parcours de digitalisation habituel s'ouvre, **sans modification** : pièces, paiement, biométrie, **récépissé de digitalisation**. Un bandeau rappelle que le renouvellement suit.
2. Après le transfert à la biométrie, le bouton **« Continuer vers le renouvellement »** ouvre le renouvellement simplifié, avec les catégories et le titulaire du dossier de digitalisation déjà chargés.
3. Le renouvellement suit le §2.1 à partir de l'étape 3 : **2ᵉ paiement et 2ᵉ récépissé**.

Si la personne revient un autre jour, l'agent tape simplement le numéro dans Renouvellement : le dossier de digitalisation transmis est retrouvé automatiquement. Si la digitalisation n'est pas encore transmise, un message demande de la terminer d'abord.

---

## 3. Règles métier

### 3.1 Anti-doublon

| Niveau | Règle |
|---|---|
| Candidat | On réutilise le candidat existant (nom + prénom + date de naissance) au lieu d'en créer un. |
| Dossier | **Un seul renouvellement en cours par numéro de permis** (tirets ignorés). Un `POST /dossiers` de renouvellement pour un permis qui a déjà un renouvellement non transmis renvoie le dossier existant avec `existing: true`, sans en créer de nouveau. |
| CNEDDT | Un renouvellement déjà au statut `DOSSIER ENVOYER` est refusé à l'envoi (`skipped` : « Renouvellement déjà transmis au CNEDDT »). |
| Recherche | Un permis déjà renouvelé (renouvellement transmis) s'affiche avec ses **nouvelles dates**, donc « Valide », et un message « déjà renouvelé ». |

### 3.2 Nouvelles dates de validité

Elles sont calculées **par le serveur** au moment du paiement vérifié, ou à défaut juste avant l'envoi CNEDDT, sur les catégories cochées :

| Âge du titulaire le jour du calcul | Durée de validité |
|---|---|
| **plus de 59 ans** (60 ans et plus) | **2 ans** |
| 59 ans et moins | **5 ans** |

- `valable_du` = jour du paiement ; `jusqu_au` = `valable_du` + durée.
- L'âge est calculé à partir de `candidats.date_naissance`. Si elle est vide, la durée est de 5 ans.
- `dossiers.date_expiration` reçoit la nouvelle date de fin.
- Le calcul est **idempotent** : une catégorie déjà marquée `renouvele` n'est jamais recalculée.
- Les nouvelles dates partent à la CNEDDT dans `categorie_vehicule` (construit à partir de `data_categorie`).

### 3.3 Notifications

| Canal | Renouvellement | Autres types |
|---|---|---|
| E-mail de convocation biométrique | **Non envoyé** | inchangé |
| SMS après transfert | « DGTT: Votre demande de renouvellement a été transmise au CNEDDT. Code dossier: XXX. » | inchangé (« … prise des empreintes biométriques … ») |

### 3.4 Gestion dossier

Les dossiers `RENOUVELLEMENT` **ne sont plus listés** dans *Gestion dossier* : ils sont traités de bout en bout dans *Nouvelle demande*.

---

## 4. Modifications backend (`projet04-backend-permis-conduire`)

### 4.1 `app/Http/Controllers/Api/CandidatController.php`

`GET /api/candidats` : nouveaux filtres **optionnels**. Les appels existants ne changent pas.

| Paramètre | Filtre |
|---|---|
| `nom` | `LOWER(personnes.nom) = ?` |
| `prenom` | `LOWER(personnes.prenom) = ?` |
| `date_naissance` | `candidats.date_naissance = ?` (date) |

### 4.2 `app/Http/Controllers/Api/DossierController.php`

| Méthode / endpoint | Changement |
|---|---|
| `index` — `GET /api/dossiers` | Nouveau filtre optionnel `numero_permis` : compare `numero_permis` **ou** `numero_origine_permis`, en majuscules et sans tirets. |
| `store` — `POST /api/dossiers` | Pour un `RENOUVELLEMENT`, appelle `findRenouvellementEnCours()`. S'il existe un renouvellement non transmis pour le même numéro, renvoie **200** `{ success: true, existing: true, data: <dossier> }` sans rien créer. |
| `checkPaiement` — `GET /api/dossiers/{id}/check-paiement` | Si `paid === true`, appelle `appliquerNouvellesDatesRenouvellement()`. |
| `transfert` — `POST /api/dossiers/transfert` | Pour un `RENOUVELLEMENT` : refus s'il est déjà `DOSSIER ENVOYER` ; application des nouvelles dates si ce n'est pas encore fait ; pas d'e-mail biométrie ; SMS adapté. |
| `findRenouvellementEnCours()` *(nouveau, privé)* | Dernier dossier `RENOUVELLEMENT` du même numéro de permis dont le statut est différent de `DOSSIER ENVOYER`. |
| `appliquerNouvellesDatesRenouvellement()` *(nouveau, privé)* | Règle du §3.2 ; met à jour `data_categorie` et `date_expiration`, vide le cache `dossiers`, écrit un log `Renouvellement : nouvelles dates appliquées`. |

**Aucune migration** : tout passe par des colonnes existantes.

### 4.3 Format de `dossiers.data_categorie`

Chaque ligne garde le format existant `{ classe, ville, codification_code, valable_du, jusqu_au }`. Après paiement d'un renouvellement, trois champs sont ajoutés :

```json
{
  "classe": "B",
  "ville": "LIBREVILLE",
  "codification_code": "20022B00002",
  "valable_du": "2026-11-02",
  "jusqu_au": "2028-11-02",
  "ancienne_validite": "2012-01-15",
  "duree_ans": 2,
  "renouvele": true
}
```

---

## 5. Modifications frontend (`projet07-frontend-auto-ecole-b/src`)

| Fichier | Changement |
|---|---|
| `modules/demande/pages/nouvelle-demande/components/RenouvellementSimplifie.tsx` | **Nouveau.** Tout le parcours du §2 : recherche, onglets Informations / Catégories, mini-formulaire titulaire, paiement, tableau des nouvelles dates, envoi CNEDDT, short code, récépissé, encadré « Permis non digitalisé ». |
| `modules/demande/pages/nouvelle-demande/components/index.ts` | Export de `RenouvellementSimplifie`. |
| `modules/demande/pages/NouvelleDemandeePage.tsx` | Si le type est `RENOUVELLEMENT` (hors modification d'un dossier existant), affiche `RenouvellementSimplifie` à la place des sections 2 à 5 et masque le récapitulatif de droite. Ajoute « Digitaliser puis renouveler » (bandeau + bouton **Continuer vers le renouvellement** après le transfert biométrie). Réinitialisation du formulaire regroupée dans `resetFormulaire()`. |
| `modules/demande/services/demande.service.ts` | Nouvelles fonctions : `findCandidatPourPermis`, `createCandidatPourRenouvellement`, `createDossierRenouvellement`, `chargerDossierAvecCategories`, `findDigitalisationParNumero`, `findRenouvellementTransmisParNumero`, constante `TYPES_DIGITALISATION`. Création de compte + candidat extraite dans `createCandidatFromState()`, toujours utilisée par `submitDemande`. |
| `modules/reception/services/sendToCNEDDT.service.ts` | `sendDossierToCNEDDT` renvoie maintenant `{ shortCode, alreadyExistsAtBiometrie }` au lieu de `void`. Ça corrige aussi l'accès à `transfert.alreadyExistsAtBiometrie` dans `NouvelleDemandeePage`. |
| `modules/demande/utils/recepisseTransfertBiometriePdf.ts` | Nouvelle fonction `telechargerRecepisseRenouvellementPdf` (A4) : short code encadré, dossier, titulaire, tableau des catégories (ancienne validité / valable du / jusqu'au). Le récépissé biométrie existant n'est pas modifié. |
| `modules/cnepc/forms/utils.ts` | Nouveau helper `checkIsRenouvellement`. |
| `modules/cnepc/tables/GestionDossierTable.tsx` | Exclut les dossiers `RENOUVELLEMENT` de la liste. |

---

## 6. Tester

Compte : `admin@permis.local` / `123456`. Page : `http://localhost:3000/eleves/nouvelle-demande` → **Renouvellement**.

| Cas | Numéro | Attendu |
|---|---|---|
| Titulaire déjà enregistré, catégorie expirée | `20022B00002` (NGUEMA Paul, 64 ans) | « Titulaire déjà enregistré » ; après paiement : **2 ans** |
| Plusieurs catégories, expirées et valides, pas de compte | `2015001234` (Dupont Jean, 41 ans) | Mini-formulaire ; après paiement : **5 ans** |
| Une seule catégorie expirée | `2012003100` (Obame Paul) | B expirée en 2022 |
| Catégorie valide | `2019007300` (Essono David) | Badge « Valide » |
| Catégories C / D / E | `20033C00003`, `20044D00004`, `20055E00005` | Catégories expirées (registre) |
| Non digitalisé | `99999X99999` | Encadré « Permis non digitalisé » avec 3 boutons |
| Anti-doublon | refaire `20022B00002` après validation | « dossier existant repris (aucun doublon créé) » |

**Limites en local :**
- **Paiement** : `PAYNALA_API_KEY` et `PAYNALA_BASE_URL` sont vides, donc la vérification échoue. Seul `developpeuradmin@rd.com` peut la contourner (bouton « Contourner (dev) »). Dans ce cas, les dates sont calculées à l'envoi CNEDDT.
- **CNEDDT** : `CNEDDT_API_URL` et `CNEDDT_API_KEY` sont vides, donc l'envoi échoue : pas de short code ni de récépissé de renouvellement en local.
- Les données de test contiennent des doublons (permis avec et sans tirets dans `h_permis`, candidat NGUEMA Paul en double). Ce n'est pas lié à cette fonctionnalité.

---

## 7. Points ouverts

1. **Short code non enregistré en base** : il n'existe pas de colonne. Il reste à l'écran, dans le SMS et dans le `localStorage` du navigateur. Pour pouvoir réimprimer un récépissé plus tard, il faut une migration (colonne pour la réponse CNEDDT).
2. **Numéro de permis après digitalisation** : le renouvellement utilise le numéro du dossier de digitalisation. Si la CNEDDT attribue un nouveau numéro à la digitalisation, il faudra l'enregistrer (même migration).
3. **Dates CNEDDT** : la réponse CNEDDT contient `issue_date` et `categories_created`. Il faut vérifier sur une vraie réponse qu'elles concordent avec la règle 2 ans / 5 ans.
4. **« Transmis » ne veut pas dire « biométrie faite »** : une personne est considérée digitalisée dès que son dossier est `DOSSIER ENVOYER`.
5. **Paiement** : deux frais (digitalisation + renouvellement) pour une personne non digitalisée. À confirmer avec la DGTT.
6. **Conversion** : pas proposée comme voie de digitalisation. À confirmer.
7. **Bug existant, non corrigé** : `demandeService.loadCnepcAutoEcoleWithFormations` et `findCnepcAutoEcole` sont appelés dans `NouvelleDemandeePage` mais ne sont pas exportés dans l'objet `demandeService`. Le pré-remplissage de l'auto-école CNEPC des parcours Renouvellement et Duplicata standard échoue sans rien afficher.

---

## 8. Environnement local (hors Git)

Ces réglages ont servi pendant le développement et ne sont **pas** dans le dépôt :

- `projet04-backend-permis-conduire/.env` créé à partir de `.env.example` avec les bases Supabase du WIKI, `CACHE_STORE=redis`, `REDIS_CLIENT=predis` et `BROADCAST_CONNECTION=log`.
- Conteneur Docker `redis-server` (`redis:7-alpine`, port 6379), comme au §3 du WIKI.
- Backend lancé avec **4 workers** `php artisan serve` (ports 8001 à 8004) derrière un petit répartiteur Node sur le port 8000, parce que `php artisan serve` sous Windows ne traite qu'une requête à la fois. Résultat : 0,2 s par appel une fois le cache rempli, contre 30 à 60 s avant.
