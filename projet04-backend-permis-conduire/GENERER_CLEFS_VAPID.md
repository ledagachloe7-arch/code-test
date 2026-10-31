# 🔑 Génération des Clés VAPID

## Méthode 1 : Générateur en ligne (Recommandé)

1. Allez sur : **https://web-push-codelab.glitch.me/**
2. Cliquez sur "Generate VAPID Keys"
3. Copiez les deux clés générées
4. Ajoutez-les dans votre fichier `.env` :

```env
VAPID_PUBLIC_KEY=BFx...votre_clé_publique...
VAPID_PRIVATE_KEY=...votre_clé_privée...
```

## Méthode 2 : Avec Node.js (si installé)

```bash
npx web-push generate-vapid-keys
```

Cela affichera deux clés. Copiez-les dans votre `.env`.

## Méthode 3 : Avec PHP (si OpenSSL fonctionne)

```bash
php artisan webpush:vapid
```

**Note** : Si cette commande échoue (problème OpenSSL sur Windows), utilisez la Méthode 1.

---

## Après avoir généré les clés

1. Ajoutez les clés dans `.env`
2. Videz le cache de configuration :
   ```bash
   php artisan config:clear
   ```
3. Vérifiez que les clés sont bien chargées :
   ```bash
   php artisan tinker
   >>> config('services.webpush.public_key')
   ```

---

## Format des clés

Les clés VAPID sont des chaînes base64url qui ressemblent à :

```
VAPID_PUBLIC_KEY=BFx...environ_87_caractères...
VAPID_PRIVATE_KEY=...environ_43_caractères...
```

**⚠️ IMPORTANT** : Ne partagez jamais votre clé privée VAPID !

