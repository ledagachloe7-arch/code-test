# Captcha texte pour la connexion

Ce document décrit comment fonctionne le captcha interne ajouté à l'API et comment l'utiliser côté frontend.

## Pré-requis

- PHP doit disposer de l'extension **GD** (génération d'images).
- Aucun service externe n'est requis (captcha 100 % en interne).

## Configuration

Les paramètres par défaut se trouvent dans `config/captcha.php`. Ils peuvent être ajustés via `.env` :

```env
CAPTCHA_LENGTH=6
CAPTCHA_WIDTH=160
CAPTCHA_HEIGHT=60
CAPTCHA_TTL=120
CAPTCHA_BACKGROUND=#f4f4f4
CAPTCHA_TEXT_COLOR=#1f2937
CAPTCHA_NOISE=30
```

## Flux côté client

1. **Obtenir un captcha**
   - Appeler `GET /api/auth/captcha`
   - Réponse :
     ```json
     {
       "success": true,
       "captcha_id": "uuid",
       "image": "data:image/png;base64,...",
       "expires_in": 120
     }
     ```
   - Afficher l'image `image` et stocker `captcha_id`.

2. **Soumettre la connexion**
   - Envoyer `identifier`, `password`, `captcha_id`, `captcha_code` vers `POST /api/auth/login-direct`.
   - Exemple :
     ```json
     {
       "identifier": "0612345678",
       "password": "Password123!",
       "captcha_id": "uuid-reçu",
       "captcha_code": "ABC123"
     }
     ```

3. **Gestion des erreurs**
   - Si le code est erroné ou expiré, l'API renvoie une erreur 422 avec le message **"Le code captcha est invalide ou a expiré."**
   - Générer un nouveau captcha et réessayer.

## Endpoints ajoutés

| Méthode | Route                | Description                                     |
|---------|----------------------|-------------------------------------------------|
| GET     | `/api/auth/captcha`  | Génère un captcha (image + identifiant).        |
| POST    | `/api/auth/login-direct` | Connexion directe **avec** captcha obligatoire. |

## Remarques

- Chaque captcha est à usage unique et expire après `CAPTCHA_TTL` secondes.
- Le code n'est pas sensible à la casse (`abc123` == `ABC123`).
- En cas d'échec répété, toujours requérir un nouveau captcha.

