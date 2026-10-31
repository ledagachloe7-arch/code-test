# 🔧 Correction de la couleur du Captcha

## ⚠️ Problème identifié

Vous avez **deux lignes** `CAPTCHA_TEXT_COLOR` dans votre `.env` :
1. `CAPTCHA_TEXT_COLOR=#1f2937` (noir - invisible)
2. `CAPTCHA_TEXT_COLOR=#2563eb` (bleu - visible)

Laravel prend généralement la **dernière valeur**, mais il peut y avoir des problèmes de cache.

## ✅ Solution

### 1. Corriger votre fichier `.env`

Supprimez la ligne en double et gardez **uniquement** :

```env
CAPTCHA_LENGTH=6
CAPTCHA_WIDTH=160
CAPTCHA_HEIGHT=60
CAPTCHA_TTL=120
CAPTCHA_BACKGROUND=#f4f4f4
CAPTCHA_TEXT_COLOR=#2563eb
CAPTCHA_NOISE=30
```

**Important** : Supprimez la ligne `CAPTCHA_TEXT_COLOR=#1f2937` (la première occurrence).

### 2. Vider le cache de configuration

```bash
php artisan config:clear
```

### 3. Tester

Générez un nouveau captcha et vérifiez que le texte est maintenant en **bleu visible**.

## 🎨 Autres couleurs possibles

Si vous voulez changer la couleur, utilisez une de ces valeurs :

- `#2563eb` - Bleu (recommandé)
- `#dc2626` - Rouge
- `#059669` - Vert foncé
- `#7c3aed` - Violet
- `#ea580c` - Orange foncé
- `#1f2937` - Gris très foncé (peut être invisible)

## 🔍 Vérification

Pour vérifier que la configuration est correcte :

```bash
php artisan tinker
```

Puis dans tinker :
```php
config('captcha.text_color')
```

Cela devrait retourner `"#2563eb"` (ou la couleur que vous avez définie).









