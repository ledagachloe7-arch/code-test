# 🔔 Actions de Validation avec Notifications Push

## 📋 Vue d'ensemble

Toutes les actions de validation concernant les **candidats** et les **auto-écoles** déclenchent automatiquement des **notifications push** (en plus des emails et notifications en base).

---

## ✅ Actions de Validation pour les Candidats

### 1. Validation/Rejet de Document

**Endpoint** : `POST /api/documents/{id}/valider`

**Déclencheur** : Quand une auto-école valide ou rejette un document d'un candidat

**Notifications envoyées** :
- ✅ **DocumentValidatedNotification** (si validé)
  - Destinataire : Candidat propriétaire du document
  - Canaux : `database`, `mail`, `push`
  - Message push : "✅ Document validé - Votre document [nom] a été validé"

- ❌ **DocumentRejectedNotification** (si rejeté)
  - Destinataire : Candidat propriétaire du document
  - Canaux : `database`, `mail`, `push`
  - Message push : "❌ Document rejeté - Votre document [nom] a été rejeté"

**Fichier** : `app/Http/Controllers/Api/DossierController::validerDocument()`

---

### 2. Validation/Rejet de Dossier

**Endpoint** : `POST /api/dossiers/{id}/valider`

**Déclencheur** : Quand une auto-école valide ou rejette un dossier complet d'un candidat

**Notifications envoyées** :
- ✅ **DossierValidatedNotification** (si validé)
  - Destinataire : Candidat propriétaire du dossier
  - Canaux : `database`, `mail`, `push`
  - Message push : "✅ Dossier validé - Votre dossier de candidature a été validé avec succès !"

- ❌ **DossierRejectedNotification** (si rejeté)
  - Destinataire : Candidat propriétaire du dossier
  - Canaux : `database`, `mail`, `push`
  - Message push : "❌ Dossier rejeté - Votre dossier de candidature a été rejeté"

**Fichier** : `app/Http/Controllers/Api/DossierController::valider()`

---

## 📄 Actions pour les Auto-Écoles

### 3. Upload de Document par un Candidat

**Endpoint** : `POST /api/dossiers/{id}/upload-document`

**Déclencheur** : Quand un candidat upload un document dans son dossier

**Notifications envoyées** :
- 📄 **DocumentUploadedNotification**
  - Destinataire : Responsable de l'auto-école
  - Canaux : `database`, `mail`, `push`
  - Message push : "📄 Nouveau document - Nouveau document uploadé par [nom candidat]"

**Fichier** : `app/Http/Controllers/Api/DossierController::uploadDocument()`

---

## 🎉 Actions Générales

### 4. Création de Compte

**Endpoint** : `POST /api/auth/register`

**Déclencheur** : Quand un nouveau compte utilisateur est créé

**Notifications envoyées** :
- 🎉 **AccountCreatedNotification**
  - Destinataire : Nouvel utilisateur
  - Canaux : `database`, `mail`, `push`
  - Message push : "🎉 Compte créé - Votre compte a été créé avec succès !"

**Fichier** : `app/Http/Controllers/Api/AuthController::register()`

---

## 📊 Résumé des Notifications

| Action | Notification | Destinataire | Canaux |
|--------|-------------|--------------|--------|
| Document validé | `DocumentValidatedNotification` | Candidat | database, mail, **push** |
| Document rejeté | `DocumentRejectedNotification` | Candidat | database, mail, **push** |
| Dossier validé | `DossierValidatedNotification` | Candidat | database, **push** |
| Dossier rejeté | `DossierRejectedNotification` | Candidat | database, **push** |
| Document uploadé | `DocumentUploadedNotification` | Auto-école | database, mail, **push** |
| Dossier créé | `DossierCreatedNotification` | Auto-école | database, **push** |
| Examen réussi | `ExamenReussiNotification` | Candidat | database, **push** |
| Compte créé | `AccountCreatedNotification` | Utilisateur | database, mail, **push** |

---

## 🔄 Flux Complet

### Exemple : Validation d'un Document

```
1. Auto-école valide un document
   ↓
2. DossierController::validerDocument()
   ↓
3. Document mis à jour (valide = true)
   ↓
4. Notification créée : DocumentValidatedNotification
   ↓
5. Envoi automatique via 3 canaux :
   ✅ Database (stockage)
   ✅ Email (notification email)
   ✅ Push (notification push native)
   ↓
6. Candidat reçoit :
   - Notification en base (visible dans l'app)
   - Email de confirmation
   - Notification push native (même si l'app est fermée)
```

---

## 📁 Fichiers des Notifications

Toutes les notifications sont dans `app/Notifications/` :

- ✅ `DocumentValidatedNotification.php` (database, mail, push)
- ❌ `DocumentRejectedNotification.php` (database, mail, push)
- ✅ `DossierValidatedNotification.php` (database, push)
- ❌ `DossierRejectedNotification.php` (database, push)
- 📄 `DocumentUploadedNotification.php` (database, mail, push)
- 📋 `DossierCreatedNotification.php` (database, push)
- 🎓 `ExamenReussiNotification.php` (database, push)
- 🎉 `AccountCreatedNotification.php` (database, mail, push)

**Toutes incluent le canal `push`** dans leur méthode `via()`.

---

## 🎯 Configuration Push

Le canal push est configuré dans :
- `app/Broadcasting/PushChannel.php` - Gère l'envoi des notifications push
- `app/Services/PushNotificationService.php` - Service d'envoi
- `app/Providers/AppServiceProvider.php` - Enregistrement du canal

---

## ✅ Vérification

Pour vérifier qu'une notification push est bien envoyée :

1. **Vérifier que l'utilisateur a une souscription active** :
   ```bash
   GET /api/push/status
   ```

2. **Vérifier les logs** :
   ```bash
   tail -f storage/logs/laravel.log
   ```

3. **Tester une validation** :
   - Valider un document ou un dossier
   - Vérifier que la notification push est reçue dans le navigateur

---

## 🚀 Prochaines Actions

Toutes les actions de validation sont maintenant couvertes ! 🎉

**Actions couvertes** :
- ✅ Validation/rejet de document (candidat)
- ✅ Validation/rejet de dossier (candidat)
- ✅ Upload de document (auto-école)
- ✅ Création de dossier (auto-école)
- ✅ Réussite d'examen (candidat)
- ✅ Création de compte (utilisateur)

**Toutes déclenchent automatiquement des notifications push !** 🔔

