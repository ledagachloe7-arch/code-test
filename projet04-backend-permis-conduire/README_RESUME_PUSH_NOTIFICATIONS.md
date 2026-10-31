# 📋 Résumé - Déclencheurs des Notifications Push

## 🎯 Vue d'ensemble

Ce document liste **tous les déclencheurs** de notifications push dans l'application.

---

## 📊 Tableau Récapitulatif

| # | Action | Endpoint | Notification | Destinataire | Fichier Contrôleur |
|---|--------|----------|-------------|--------------|-------------------|
| 1 | Document validé | `POST /api/documents/{id}/valider` | `DocumentValidatedNotification` | Candidat | `DossierController::validerDocument()` |
| 2 | Document rejeté | `POST /api/documents/{id}/valider` | `DocumentRejectedNotification` | Candidat | `DossierController::validerDocument()` |
| 3 | Dossier validé | `POST /api/dossiers/{id}/valider` | `DossierValidatedNotification` | Candidat | `DossierController::valider()` |
| 4 | Dossier rejeté | `POST /api/dossiers/{id}/valider` | `DossierRejectedNotification` | Candidat | `DossierController::valider()` |
| 5 | Document uploadé | `POST /api/dossiers/{id}/upload-document` | `DocumentUploadedNotification` | Auto-école | `DossierController::uploadDocument()` |
| 6 | Dossier créé | `POST /api/candidats/inscription-formation` | `DossierCreatedNotification` | Auto-école | `CandidatController::inscriptionFormation()` |
| 7 | Dossier créé (manuel) | `POST /api/dossiers` | `DossierCreatedNotification` | Auto-école | `DossierController::store()` |
| 8 | Examen réussi | `POST /api/resultats` | `ExamenReussiNotification` | Candidat | `ResultatController::store()` |
| 9 | Examen réussi (update) | `PUT /api/resultats/{id}` | `ExamenReussiNotification` | Candidat | `ResultatController::update()` |
| 10 | Compte créé | `POST /api/auth/register` | `AccountCreatedNotification` | Utilisateur | `AuthController::register()` |

---

## 🔔 Détails par Catégorie

### 📄 Actions sur les Documents

#### 1. Validation de Document

**Quand** : Auto-école valide un document d'un candidat  
**Endpoint** : `POST /api/documents/{id}/valider`  
**Body** : `{ "valide": true, "commentaires": "..." }`  
**Notification** : `DocumentValidatedNotification`  
**Destinataire** : Candidat propriétaire du document  
**Canaux** : `database`, `mail`, `push`  
**Message Push** : "✅ Document validé - Votre document [nom] a été validé"

#### 2. Rejet de Document

**Quand** : Auto-école rejette un document d'un candidat  
**Endpoint** : `POST /api/documents/{id}/valider`  
**Body** : `{ "valide": false, "commentaires": "..." }`  
**Notification** : `DocumentRejectedNotification`  
**Destinataire** : Candidat propriétaire du document  
**Canaux** : `database`, `mail`, `push`  
**Message Push** : "❌ Document rejeté - Votre document [nom] a été rejeté"

#### 3. Upload de Document

**Quand** : Candidat upload un document dans son dossier  
**Endpoint** : `POST /api/dossiers/{id}/upload-document`  
**Notification** : `DocumentUploadedNotification`  
**Destinataire** : Responsable de l'auto-école  
**Canaux** : `database`, `mail`, `push`  
**Message Push** : "📄 Nouveau document - Nouveau document uploadé par [nom candidat]"

---

### 📁 Actions sur les Dossiers

#### 4. Validation de Dossier

**Quand** : Auto-école valide un dossier complet  
**Endpoint** : `POST /api/dossiers/{id}/valider`  
**Body** : `{ "statut": "valide", "commentaires": "..." }`  
**Notification** : `DossierValidatedNotification`  
**Destinataire** : Candidat propriétaire du dossier  
**Canaux** : `database`, `push`  
**Message Push** : "✅ Dossier validé - Votre dossier de candidature a été validé avec succès !"

#### 5. Rejet de Dossier

**Quand** : Auto-école rejette un dossier complet  
**Endpoint** : `POST /api/dossiers/{id}/valider`  
**Body** : `{ "statut": "rejete", "commentaires": "..." }`  
**Notification** : `DossierRejectedNotification`  
**Destinataire** : Candidat propriétaire du dossier  
**Canaux** : `database`, `push`  
**Message Push** : "❌ Dossier rejeté - Votre dossier de candidature a été rejeté"

#### 6. Création de Dossier (Inscription Formation)

**Quand** : Candidat s'inscrit à une formation  
**Endpoint** : `POST /api/candidats/inscription-formation`  
**Body** : `{ "auto_ecole_id": "...", "formation_id": "...", "commentaires": "..." }`  
**Notification** : `DossierCreatedNotification`  
**Destinataire** : Responsable de l'auto-école  
**Canaux** : `database`, `push`  
**Message Push** : "📋 Nouveau dossier - Nouveau dossier créé par [nom candidat]"

#### 7. Création de Dossier (Manuelle)

**Quand** : Création manuelle d'un dossier  
**Endpoint** : `POST /api/dossiers`  
**Body** : `{ "candidat_id": "...", "auto_ecole_id": "...", "formation_id": "..." }`  
**Notification** : `DossierCreatedNotification`  
**Destinataire** : Responsable de l'auto-école  
**Canaux** : `database`, `push`  
**Message Push** : "📋 Nouveau dossier - Nouveau dossier créé par [nom candidat]"

---

### 🎓 Actions sur les Examens

#### 8. Examen Réussi (Création)

**Quand** : Résultat d'examen créé avec statut "réussi"  
**Endpoint** : `POST /api/resultats`  
**Body** : `{ "dossier_id": "...", "statut": "reussi", "typeExamen": "...", "date": "..." }`  
**Notification** : `ExamenReussiNotification`  
**Destinataire** : Candidat  
**Canaux** : `database`, `push`  
**Message Push** : "🎓 Examen réussi - Félicitations ! Vous avez réussi votre examen [type]"

**Détection** : Le système détecte automatiquement si le statut contient :
- `reussi`, `réussi`
- `admis`, `admission`
- `success`, `succès`
- `valide`, `validé`
- `passe`, `passé`
- `obtenu`

#### 9. Examen Réussi (Mise à jour)

**Quand** : Statut d'examen mis à jour vers "réussi"  
**Endpoint** : `PUT /api/resultats/{id}`  
**Body** : `{ "statut": "reussi", ... }`  
**Notification** : `ExamenReussiNotification`  
**Destinataire** : Candidat  
**Canaux** : `database`, `push`  
**Message Push** : "🎓 Examen réussi - Félicitations ! Vous avez réussi votre examen [type]"

**Note** : La notification est envoyée uniquement si le statut passe de "non réussi" à "réussi".

---

### 👤 Actions Générales

#### 10. Création de Compte

**Quand** : Nouvel utilisateur s'inscrit  
**Endpoint** : `POST /api/auth/register`  
**Body** : `{ "telephone": "...", "email": "...", "password": "...", ... }`  
**Notification** : `AccountCreatedNotification`  
**Destinataire** : Nouvel utilisateur  
**Canaux** : `database`, `mail`, `push`  
**Message Push** : "🎉 Compte créé - Votre compte a été créé avec succès !"

---

## 🔄 Flux de Déclenchement

### Exemple 1 : Validation d'un Document

```
1. Auto-école appelle : POST /api/documents/{id}/valider
   Body: { "valide": true }
   ↓
2. DossierController::validerDocument()
   ↓
3. Document mis à jour en base
   ↓
4. Notification créée : DocumentValidatedNotification
   ↓
5. PushChannel::send() appelé automatiquement
   ↓
6. PushNotificationService::sendToUser()
   ↓
7. Notification push envoyée au candidat
   ↓
8. Service Worker reçoit et affiche la notification
```

### Exemple 2 : Inscription à une Formation

```
1. Candidat appelle : POST /api/candidats/inscription-formation
   Body: { "auto_ecole_id": "...", "formation_id": "..." }
   ↓
2. CandidatController::inscriptionFormation()
   ↓
3. Dossier créé automatiquement
   ↓
4. Notification créée : DossierCreatedNotification
   ↓
5. PushChannel::send() appelé automatiquement
   ↓
6. PushNotificationService::sendToUser()
   ↓
7. Notification push envoyée à l'auto-école
   ↓
8. Service Worker reçoit et affiche la notification
```

### Exemple 3 : Examen Réussi

```
1. Admin/Formateur appelle : POST /api/resultats
   Body: { "statut": "reussi", "dossier_id": "...", ... }
   ↓
2. ResultatController::store()
   ↓
3. Vérification : isExamenReussi("reussi") → true
   ↓
4. Notification créée : ExamenReussiNotification
   ↓
5. PushChannel::send() appelé automatiquement
   ↓
6. PushNotificationService::sendToUser()
   ↓
7. Notification push envoyée au candidat
   ↓
8. Service Worker reçoit et affiche la notification
```

---

## 📍 Emplacements dans le Code

### Contrôleurs

| Contrôleur | Méthode | Ligne Approximative |
|-----------|---------|---------------------|
| `DossierController` | `validerDocument()` | ~475 |
| `DossierController` | `valider()` | ~389 |
| `DossierController` | `uploadDocument()` | ~248 |
| `DossierController` | `store()` | ~112 |
| `CandidatController` | `inscriptionFormation()` | ~434 |
| `ResultatController` | `store()` | ~32 |
| `ResultatController` | `update()` | ~47 |
| `AuthController` | `register()` | ~200+ |

### Notifications

Toutes dans `app/Notifications/` :

- `DocumentValidatedNotification.php`
- `DocumentRejectedNotification.php`
- `DossierValidatedNotification.php`
- `DossierRejectedNotification.php`
- `DocumentUploadedNotification.php`
- `DossierCreatedNotification.php`
- `ExamenReussiNotification.php`
- `AccountCreatedNotification.php`

---

## 🎯 Règles de Déclenchement

### Conditions Générales

1. ✅ L'utilisateur doit avoir une souscription push active
2. ✅ La notification doit inclure le canal `push` dans `via()`
3. ✅ Les clés VAPID doivent être configurées
4. ✅ Le Service Worker doit être enregistré (côté frontend)

### Conditions Spécifiques

- **Examen réussi** : Détection automatique via `isExamenReussi()` qui cherche des mots-clés dans le statut
- **Dossier créé** : Notification uniquement si l'auto-école a un responsable avec un utilisateur
- **Document uploadé** : Notification uniquement si l'auto-école a un utilisateur

---

## 📊 Statistiques

- **Total de notifications** : 8 types
- **Notifications pour candidats** : 5
- **Notifications pour auto-écoles** : 2
- **Notifications générales** : 1
- **Endpoints concernés** : 7

---

## ✅ Checklist de Vérification

Pour chaque déclencheur, vérifier :

- [ ] La notification est créée dans le contrôleur
- [ ] La notification inclut `push` dans `via()`
- [ ] Le PushChannel gère le type de notification
- [ ] Le destinataire a une souscription active
- [ ] Les clés VAPID sont configurées
- [ ] Le Service Worker est accessible

---

## 🔗 Fichiers de Référence

- **Documentation complète** : `README_PUSH_NOTIFICATIONS.md`
- **Intégration frontend** : `README_INTEGRATION_FRONTEND_PUSH.md`
- **Actions de validation** : `ACTIONS_VALIDATION_NOTIFICATIONS.md`
- **Installation** : `INSTALLATION_PUSH_NOTIFICATIONS.md`

---

**Tous les déclencheurs sont documentés !** 📚

