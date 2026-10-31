# 🚀 Installation Rapide - Notifications Push

## Étapes d'Installation

### 1. Installer les dépendances

```bash
composer install
```

Cela installera automatiquement le package `minishlink/web-push`.

### 2. Exécuter la migration

```bash
php artisan migrate
```

Cela créera la table `push_subscriptions`.

### 3. Générer les clés VAPID

```bash
php artisan webpush:vapid
```

**Copiez les clés affichées** et ajoutez-les dans votre fichier `.env` :

```env
VAPID_PUBLIC_KEY=BFx...votre_clé_publique...
VAPID_PRIVATE_KEY=...votre_clé_privée...
```

### 4. Vider le cache de configuration

```bash
php artisan config:clear
```

### 5. Vérifier que le Service Worker est accessible

Ouvrez dans votre navigateur : `http://localhost:8000/sw.js`

Vous devriez voir le code JavaScript du Service Worker.

---

## ✅ Vérification

### Backend

1. **Routes API** : Vérifiez que les routes sont disponibles :
   ```bash
   php artisan route:list | grep push
   ```
   
   Vous devriez voir :
   - `POST /api/push/subscribe`
   - `POST /api/push/unsubscribe`
   - `GET /api/push/status`
   - `GET /api/push/vapid-public-key`

2. **Clés VAPID** : Vérifiez la configuration :
   ```bash
   php artisan tinker
   >>> config('services.webpush.public_key')
   ```
   
   Ne doit pas être `null`.

### Frontend (React)

1. **Service Worker** : Accessible à `/sw.js`
2. **Clé publique VAPID** : Accessible à `/api/push/vapid-public-key`

---

## 🧪 Test Rapide

### 1. Tester l'enregistrement d'une souscription

```bash
curl -X POST http://localhost:8000/api/push/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{
    "endpoint": "https://fcm.googleapis.com/fcm/send/test",
    "keys": {
      "p256dh": "test",
      "auth": "test"
    }
  }'
```

### 2. Vérifier le statut

```bash
curl -X GET http://localhost:8000/api/push/status \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### 3. Tester une notification push

Quand vous validez un document via l'API, une notification push devrait être automatiquement envoyée si l'utilisateur a une souscription active.

---

## 📝 Notes Importantes

1. **HTTPS requis en production** : Les notifications push nécessitent HTTPS (sauf localhost)
2. **Permission utilisateur** : L'utilisateur doit autoriser les notifications dans son navigateur
3. **Service Worker** : Doit être enregistré avant de pouvoir souscrire
4. **Clés VAPID** : Ne jamais partager la clé privée

---

## 🔗 Documentation Complète

Pour plus de détails, consultez : [`README_PUSH_NOTIFICATIONS.md`](./README_PUSH_NOTIFICATIONS.md)

---

## ❓ Problèmes Courants

### Erreur "VAPID keys not configured"
→ Vérifiez que les clés sont bien dans `.env` et exécutez `php artisan config:clear`

### Service Worker ne se charge pas
→ Vérifiez que `public/sw.js` existe et est accessible

### Notifications non reçues
→ Vérifiez que l'utilisateur a bien une souscription active (`/api/push/status`)

---

**Tout est prêt !** 🎉

