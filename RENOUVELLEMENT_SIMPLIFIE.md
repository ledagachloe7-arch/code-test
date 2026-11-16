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
| 1 | Numéro de permis → **Rechercher** | Recherche du **dossier de digitalisation transmis** (fiche / duplicata, statut `DOSSIER ENVOYER`) portant ce numéro : identité, titulaire et catégories viennent de ce dossier. Le registre seul ne suffit pas (voir §2.2). | — |
| 2 | Onglet **Informations** | Identité + toutes les catégories avec un badge **Expirée / Valide** | — |
| 3 | Onglet **Catégories à renouveler** | Cases à cocher : **seules C et D sont sélectionnables** (voir §3.0), les C / D expirées sont cochées d'avance. Les autres catégories sont affichées « Non renouvelable ». Pas d'ajout ni de modification de catégorie. | — |
| 4 | Titulaire | **Candidat existant** retrouvé par nom + prénom + date de naissance. Sinon, mini-formulaire : téléphone (obligatoire), genre, type et n° de pièce, email facultatif. | — |
| 5 | **Valider et passer au paiement** | Création du dossier (ou reprise de celui en cours, voir §3.1) et génération du code de paiement | `en_attente` → `EN_ATTENTE_PAIEMENT` |
| 6 | **Vérifier le paiement** | Vérification Paynala, puis **calcul automatique des nouvelles dates** (voir §3.2). L'écran affiche aussitôt « Paiement vérifié : renouvellement effectué pour la catégorie … » et le tableau ancienne / nouvelle validité. | `PAIEMENT DE FRAIS  D'EXAMEN - Complété` |
| 7 | **Valider et envoyer à la CNEDDT** | Un seul bouton : transfert `RENOUVELLEMENT` (sans biométrie), récupération du **short code** (`cashier_short_code`, affiché en grand et envoyé par SMS), puis **téléchargement automatique du récépissé**. | `DOSSIER ENVOYER` |
| 8 | **Réimprimer le récépissé** | PDF « Récépissé de renouvellement » : short code, titulaire, catégories avec ancienne validité / valable du / jusqu'au | — |

### 2.2 Personne non digitalisée (catégories expirées)

Une personne n'est **digitalisée** que si la DGTT a toutes ses informations, c'est-à-dire un dossier de digitalisation transmis dans la base principale. Un permis présent seulement dans le registre (`registre_permis`) ou l'historique (`h_permis`) n'est pas digitalisé.

| Résultat de la recherche | Écran |
|---|---|
| Digitalisation transmise | Renouvellement (§2.1) |
| Digitalisation en cours, non transmise | Message : la terminer d'abord |
| Trouvé au registre / `h_permis` seulement | Encadré **« Permis non digitalisé »** avec le titulaire trouvé |
| Introuvable | « Permis introuvable dans le registre » |

L'encadré **« Permis non digitalisé »** propose de digitaliser d'abord :

| Bouton | Type de demande | Usage indiqué dans l'application |
|---|---|---|
| Duplicata fiche d'enregistrement | `DUPLICATAFICHEENREGISTREMENT` | Permis vert (duplicata) |
| Duplicata | `DUPLICATA` | Permis rose |

Le bouton Fiche d'enregistrement a été retiré de cet encadré. Un dossier Fiche d'enregistrement déjà transmis reste reconnu comme digitalisation.

1. Le parcours de digitalisation habituel s'ouvre, **sans modification** : pièces, paiement, biométrie, **récépissé de digitalisation**. Un bandeau rappelle que le renouvellement suit.
2. Après le transfert à la biométrie, le bouton **« Continuer vers le renouvellement »** ouvre le renouvellement simplifié, avec les catégories et le titulaire du dossier de digitalisation déjà chargés.
3. Le renouvellement suit le §2.1 à partir de l'étape 3 : **2ᵉ paiement et 2ᵉ récépissé**.

Si la personne revient un autre jour, l'agent tape simplement le numéro dans Renouvellement : le dossier de digitalisation transmis est retrouvé automatiquement. Si la digitalisation n'est pas encore transmise, un message demande de la terminer d'abord.

---

## 3. Règles métier

### 3.0 Catégories renouvelables

Pour le moment, **seules les catégories C et D peuvent être renouvelées**, pour tous les titulaires.

- Écran : toutes les catégories sont affichées dans *Informations* ; dans *Catégories à renouveler*, A, B, E… sont grisées avec le badge « Non renouvelable ». Si le titulaire n'a ni C ni D : « Aucune catégorie C ou D sur ce permis : rien à renouveler pour le moment. »
- Serveur : un `POST /dossiers` de renouvellement contenant une autre classe est refusé (**422** « Seules les catégories C et D peuvent être renouvelées (refusé : B) »). Le calcul des nouvelles dates ignore aussi toute autre classe.
- Pour changer la liste : `CATEGORIES_RENOUVELABLES` dans `DossierController.php` **et** dans `RenouvellementSimplifie.tsx`.

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
| `store` — `POST /api/dossiers` | Pour un `RENOUVELLEMENT` : refus **422** si une catégorie n'est pas C ou D (`categoriesNonRenouvelables()`, §3.0). Puis appelle `findRenouvellementEnCours()`. S'il existe un renouvellement non transmis pour le même numéro, renvoie **200** `{ success: true, existing: true, data: <dossier> }` sans rien créer. |
| `checkPaiement` — `GET /api/dossiers/{id}/check-paiement` | Si `paid === true`, appelle `appliquerNouvellesDatesRenouvellement()`. |
| `transfert` — `POST /api/dossiers/transfert` | Pour un `RENOUVELLEMENT` : refus s'il est déjà `DOSSIER ENVOYER` ; application des nouvelles dates si ce n'est pas encore fait ; pas d'e-mail biométrie ; SMS adapté. |
| `CATEGORIES_RENOUVELABLES` *(nouvelle constante)* / `categoriesNonRenouvelables()` *(nouveau, privé)* | Liste `['C', 'D']` et classes refusées d'un renouvellement. |
| `findRenouvellementEnCours()` *(nouveau, privé)* | Dernier dossier `RENOUVELLEMENT` du même numéro de permis dont le statut est différent de `DOSSIER ENVOYER`. |
| `appliquerNouvellesDatesRenouvellement()` *(nouveau, privé)* | Règle du §3.2, uniquement sur les classes C / D ; met à jour `data_categorie` et `date_expiration`, vide le cache `dossiers`, écrit un log `Renouvellement : nouvelles dates appliquées`. |

**Aucune migration** : tout passe par des colonnes existantes.

**Simulation locale** (voir §6) :

| Fichier | Changement |
|---|---|
| `config/services.php` | `paynala.simulation` (`PAYNALA_SIMULATION`) et `cneddt_api.simulation` (`CNEDDT_SIMULATION`), `false` par défaut. |
| `app/Services/PaiementService.php` | `checkAndProcessPaymentForDossier` utilise `reponsePaynalaSimulee()` au lieu de Paynala quand la simulation est active et `APP_ENV=local`. |
| `app/Http/Services/DossierService.php` | `sendToCneddt` / `sendManyToCneddt` renvoient une réponse CNEDDT fictive (`reponseSimulee()`, short code `SIM-XXXXXX`) dans les mêmes conditions. |
| `.env.example` | Les deux variables, à `false`. |

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
| Non digitalisé (au registre, sans digitalisation) | `20031C00028` (MINTSA David, C), `20042D00029` (KOUMBA Estelle, D) | Encadré « Permis non digitalisé » avec 2 boutons : **Duplicata fiche d'enregistrement** et **Duplicata** |
| Introuvable | `99999X99999` | « Permis introuvable dans le registre » |

> Depuis la règle « digitalisé = digitalisation transmise », les numéros du registre ci-dessous (et ceux du seeder) affichent l'encadré « Permis non digitalisé » tant qu'aucune digitalisation n'a été transmise pour eux.
| Anti-doublon | refaire `20022B00002` après validation | « dossier existant repris (aucun doublon créé) » |

**Jeu de test dédié** (`database/seeders/RenouvellementTestSeeder.php`, lignes `h_permis` avec `numero_identite` = `TEST-RN-*`). Relancer avec `php artisan db:seed --class=RenouvellementTestSeeder` : le seeder supprime et recrée uniquement ses lignes. Les dates et les âges sont calculés par rapport au jour du lancement.

| Cas | Numéro à saisir | Titulaire | Attendu |
|---|---|---|---|
| B expirée, A valide : rien de renouvelable | `20151B77001` | MOUSSAVOU Alain, 41 ans | Message « Aucune catégorie C ou D », bouton désactivé |
| Plus de 59 ans, B et C expirées | `20099B77002` | NZE Bernadette, 68 ans | Seule C cochée (B « Non renouvelable »), **2 ans** |
| Limite : 59 ans | `20129C77003` | ONDO Martin, 59 ans | C cochée, **5 ans** |
| Limite : 60 ans | `20113D77004` | ESSONO Rose, 60 ans | D cochée, **2 ans** |
| Tout est valide | `20221B77005` | MBA Serge, 36 ans | Pas de C / D : rien à renouveler |
| A à E toutes expirées | `20084C77006` | KOUMBA Lucie, 48 ans | Seules C et D cochées, **5 ans** |
| Déjà renouvelé deux fois (`date_renou1/2`) | `19986C77007` | NDONG Félix, 54 ans | C expirée, **5 ans** |
| C expirée hier, B expire dans 3 semaines | `20168C77008` | OBIANG Claire, 31 ans | Seule C cochée |
| Expirée depuis 9 ans | `19955D77009` | MOUKAGNI Jacques, 75 ans | D cochée, **2 ans** |
| B expirée seule | `20232B77010` | MINTSA Kevin, 22 ans | Rien à renouveler |
| 3 permis distincts rattachés (B fiche d'enregistrement, C et D duplicatas, provinces différentes) | `20051B77011`, `20112C77011` ou `20178D77011` | ASSOUMOU Pascal, 45 ans | Les 3 catégories affichées quel que soit le numéro saisi ; **C et D cochées**, B « Non renouvelable » ; **5 ans** |

N'importe quel numéro d'un titulaire affiche toutes ses catégories.

**Titulaires digitalisés A à E** (`database/seeders/RenouvellementCompletSeeder.php`, `numero_identite` / `numero_piece` = `TEST-RC-*`). Relancer avec `php artisan db:seed --class=RenouvellementCompletSeeder` : il supprime et recrée uniquement ses données (registre, utilisateur, personne, candidat, dossier DUPLICATA transmis, et les renouvellements faits ensuite sur ces titulaires). Chacun a les 5 catégories A, B, C, D, E et ouvre directement le renouvellement.

Numérotation : `<année><rang><catégorie>88<n° titulaire>`, rang 1 à 5 pour A à E. Pour MAKAYA Jean (n° 001, année 2001) : A `20011A88001`, B `20012B88001`, C `20013C88001`, D `20014D88001`, E `20015E88001`. Les numéros avec X sont `20011X88001` … `20015X88001`. **Chacun de ces numéros affiche les 5 catégories.**

| N° (catégorie C) | Titulaire | Âge | Attendu |
|---|---|---|---|
| `20013C88001` | MAKAYA Jean | 45 | C et D, **5 ans** |
| `20023C88002` | NGOMA Sylvie | 62 | C et D, **2 ans** |
| `20033C88003` | BOUSSOUGOU Patrick | 59 | Limite : C et D, **5 ans** |
| `20043C88004` | MOUNDOUNGA Alice | 60 | Limite : C et D, **2 ans** |
| `20053C88005` | EYENE Hervé | 38 | C seule (D valide), 5 ans |
| `20063C88006` | ALLOGO Brigitte | 51 | D seule (C valide), 5 ans |
| `20073C88007` | OBAME Thierry | 33 | Tout valide : rien à renouveler |
| `20083C88008` | NZAMBA Pauline | 70 | Expirées depuis 9 ans, 2 ans |
| `20093C88009` | MENGUE Rodrigue | 27 | A, B expirées, C, D valides : rien à renouveler |
| `20103C88010` | KOUMBA Georges | 56 | C expirée hier, D expire dans 14 jours : C seule |
| `20113C88011` | BIYOGHE Nadège | 44 | C et D, 5 ans |
| `20123C88012` | MBOUMBA Christian | 65 | C et D expirées, A, B, E valides : 2 ans |
| `20133C88013` | NDZIGOU Estelle | 35 | C et D, 5 ans |
| `20143C88014` | ONDIMBA Serge | 48 | D seule, 5 ans |
| `20003C88015` | MOUSSOUNDA Irène | 61 | C et D, 2 ans |
| `20013C88016` | ESSONE Marc | 29 | C et D, 5 ans |
| `20023C88017` | NKOGHE Laure | 53 | C et D, 5 ans |
| `20033C88018` | IVANGA Roger | 74 | C seule, 2 ans |
| `20043C88019` | MAGANGA Josiane | 42 | Seule E expirée : rien à renouveler |
| `20053C88020` | OYANE Didier | 58 | C et D, 5 ans |
| `20063C88021` | LEKOGO Chantal | 66 | C et D, 2 ans |
| `20073C88022` | NDONG Ulrich | 31 | C et D, 5 ans |

**Recherche par numéro (`GET /api/dossiers?numero_permis=`)** : compare le numéro du dossier, le numéro d'origine **et** les numéros des catégories (`data_categorie.codification_code`), tirets ignorés. Un numéro avec X en 6ᵉ position retrouve la catégorie au même numéro avec une lettre (`motifNumeroPermis()` dans `DossierController`).

**Limites en local :**
- Paynala et la CNEDDT ne sont pas configurés en local. Pour dérouler tout le parcours, activer le **mode simulation** dans `projet04-backend-permis-conduire/.env` :
  ```
  PAYNALA_SIMULATION=true   # tout code de paiement est considéré comme payé (montant 0, référence SIMULATION)
  CNEDDT_SIMULATION=true    # aucun appel réseau, short code fictif SIM-XXXXXX
  ```
  Les deux variables sont **ignorées si `APP_ENV` n'est pas `local`** et chaque simulation écrit un avertissement dans `storage/logs/laravel.log`. Le reste du parcours (historique de paiement, statuts, calcul des dates, SMS) se déroule normalement. Après modification du `.env` : `php artisan config:clear`.
- Sans simulation, seul `developpeuradmin@rd.com` peut contourner le paiement (bouton « Contourner (dev) ») ; les dates sont alors calculées à l'envoi CNEDDT.
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
