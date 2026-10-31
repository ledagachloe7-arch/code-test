# Worker de file d'attente (queue) Laravel

Les jobs (SMS après transfert CNEDDT, emails, etc.) sont traités par un worker. Sans worker, les jobs restent en file (table `jobs`) et ne sont pas exécutés.

- **Queue `default`** : jobs métier (ex. `SendAirtelSmsJob`).
- **Queue `emails`** : envois d’emails (création compte, biométrie, reset password, permis, examen) — mêmes options que les jobs (tries=3, timeout=60).

## Avec Docker (image dans le registry)

### 1. Variables d'environnement

Dans `.env` (ou dans l'environnement du host) :

```env
LARAVEL_IMAGE=votre-registry.example.com/groupe/backend-permis-conduire
LARAVEL_TAG=latest
```

Le worker doit avoir accès aux **mêmes** variables que l’app (DB, Redis si utilisé, Airtel SMS, etc.). En général il utilise le même `.env` que l’application.

### 2. Lancer le worker avec le compose dédié

À la racine du projet (où se trouve `.env`) :

```bash
docker compose -f docker-compose.laravel.yml up -d laravel-worker
```

Vérifier les logs :

```bash
docker compose -f docker-compose.laravel.yml logs -f laravel-worker
```

### 3. Intégrer le worker dans votre propre compose

Si vous avez déjà un `docker-compose.yml` pour le backend avec un service `app` ou `api` qui utilise votre image :

- Copiez le service `laravel-worker` de `docker-compose.laravel.yml`.
- Utilisez la **même image** que votre app (ex. `${LARAVEL_IMAGE}:${LARAVEL_TAG}`).
- Même `env_file: [.env]` et, si besoin, `depends_on` / `environment` pour DB et Redis.

Exemple :

```yaml
services:
  api:
    image: ${LARAVEL_IMAGE}:${LARAVEL_TAG}
    command: php artisan serve --host=0.0.0.0 --port=8000
    env_file: [.env]
    # ...

  laravel-worker:
    image: ${LARAVEL_IMAGE}:${LARAVEL_TAG}
    # default = jobs (SMS, etc.) ; emails = Mailables (création compte, biométrie, reset password, etc.)
    command: php artisan queue:work redis --queue=default,emails --sleep=3 --tries=3 --max-time=3600
    env_file: [.env]
    restart: unless-stopped
    depends_on:
      - api
```

### 4. Sans Docker (host ou VM)

Sur la machine où tourne l’app :

```bash
cd /chemin/vers/backend-permis-conduire
php artisan queue:work --sleep=3 --tries=3
```

En production, faire tourner le worker avec **Supervisor** (ou systemd) pour qu’il redémarre en cas de crash.

## Vérifier que la file est traitée

- Connexion **database** : les jobs sont dans la table `jobs`. Ils disparaissent une fois traités.
- Commande utile : `php artisan queue:monitor database:default` (Laravel 11+).
