# 🚀 Installation de PHP et Composer sur Windows

## Guide Ultra-Complet pour Débutants (20-30 minutes)

> **Objectif** : Installer PHP et Composer pour pouvoir exécuter Laravel  
> **Niveau** : Débutant absolu - Aucune connaissance préalable requise

---

## 📋 Table des Matières

1. [Installation de PHP](#1-installation-de-php)
2. [Installation de Composer](#2-installation-de-composer)
3. [Vérification de l'Installation](#3-vérification-de-linstallation)
4. [Configuration du Projet](#4-configuration-du-projet)
5. [Lancement du Serveur](#5-lancement-du-serveur)
6. [Dépannage](#6-dépannage)

---

## 1. Installation de PHP

### Étape 1.1 : Télécharger PHP

#### Option A : Installation Manuelle (Recommandé)

**a) Télécharger PHP 8.2 (version stable)** :

1. Ouvrez votre navigateur
2. Allez sur : https://windows.php.net/download/
3. Cherchez **"PHP 8.2"** dans la colonne de gauche
4. Téléchargez **"VS16 x64 Thread Safe"** (fichier ZIP)
   - Exemple : `php-8.2.14-Win32-vs16-x64.zip`

**b) Extraire PHP** :

1. Une fois téléchargé, faites **clic droit** sur le fichier ZIP
2. Choisissez **"Extraire tout..."**
3. Extrayez dans : `C:\php` (créez ce dossier s'il n'existe pas)

**Résultat attendu** : Vous devez avoir un dossier `C:\php` avec plein de fichiers dedans

---

### Étape 1.2 : Ajouter PHP au PATH Windows

Le PATH permet à Windows de trouver PHP depuis n'importe quel dossier.

**Méthode détaillée** :

1. Appuyez sur la touche **Windows** de votre clavier
2. Tapez : `variables d'environnement`
3. Cliquez sur **"Modifier les variables d'environnement système"**
4. Dans la fenêtre qui s'ouvre, cliquez sur **"Variables d'environnement..."** (en bas)
5. Dans la section **"Variables système"** (en bas), trouvez la ligne **"Path"**
6. Sélectionnez **"Path"** et cliquez sur **"Modifier..."**
7. Cliquez sur **"Nouveau"**
8. Tapez : `C:\php` (le chemin où vous avez extrait PHP)
9. Cliquez sur **"OK"** trois fois pour tout fermer

**📸 Capture d'écran de référence** :
```
Variables d'environnement
├── Variables utilisateur
└── Variables système
    └── Path
        ├── C:\Windows\System32
        ├── C:\Program Files\...
        └── C:\php  ← À AJOUTER
```

---

### Étape 1.3 : Configurer PHP

**a) Créer le fichier php.ini** :

1. Ouvrez l'explorateur de fichiers
2. Allez dans `C:\php`
3. Trouvez le fichier `php.ini-development`
4. Faites **clic droit** → **Copier**
5. Faites **clic droit** dans le dossier → **Coller**
6. Renommez la copie en `php.ini` (supprimez `-development`)

**b) Activer les extensions nécessaires** :

1. Ouvrez `C:\php\php.ini` avec **Notepad++** ou **VS Code**
2. Appuyez sur **Ctrl+F** pour chercher
3. Cherchez ces lignes et **supprimez le `;` au début** :

```ini
;extension=curl          → extension=curl
;extension=fileinfo      → extension=fileinfo
;extension=gd            → extension=gd
;extension=mbstring      → extension=mbstring
;extension=openssl       → extension=openssl
;extension=pdo_pgsql     → extension=pdo_pgsql
;extension=pgsql         → extension=pgsql
;extension=zip           → extension=zip
```

4. Enregistrez le fichier : **Ctrl+S**

---

### Étape 1.4 : Redémarrer PowerShell

**IMPORTANT** : Fermez toutes les fenêtres PowerShell/CMD ouvertes et **ouvrez-en une nouvelle**.

Sinon, Windows ne verra pas PHP dans le PATH.

---

## 2. Installation de Composer

### Étape 2.1 : Télécharger Composer

1. Ouvrez votre navigateur
2. Allez sur : https://getcomposer.org/download/
3. Cliquez sur **"Composer-Setup.exe"** (sous Windows Installer)
4. Téléchargez le fichier (environ 2 MB)

---

### Étape 2.2 : Installer Composer

1. Double-cliquez sur **Composer-Setup.exe**
2. Cliquez sur **"Installer for all users"** (recommandé)
3. L'installateur va chercher PHP :
   - Si tout va bien, il trouvera `C:\php\php.exe`
   - Cliquez sur **"Next"**
4. **Proxy Settings** : Laissez vide, cliquez sur **"Next"**
5. Vérifiez le résumé, cliquez sur **"Install"**
6. Attendez la fin de l'installation (30 secondes - 1 minute)
7. Cliquez sur **"Finish"**

---

### Étape 2.3 : Redémarrer PowerShell (encore)

**IMPORTANT** : Fermez toutes les fenêtres PowerShell et ouvrez-en une nouvelle.

---

## 3. Vérification de l'Installation

### Étape 3.1 : Vérifier PHP

Ouvrez **PowerShell** et tapez :

```powershell
php -v
```

**✅ Résultat attendu** :
```
PHP 8.2.14 (cli) (built: Jan  9 2024 18:48:21) (NTS Visual C++ 2019 x64)
Copyright (c) The PHP Group
Zend Engine v4.2.14, Copyright (c) Zend Technologies
```

**❌ Si vous voyez** : `'php' is not recognized...`
- Recommencez l'étape 1.2 (ajouter PHP au PATH)
- Redémarrez PowerShell

---

### Étape 3.2 : Vérifier Composer

Dans PowerShell, tapez :

```powershell
composer --version
```

**✅ Résultat attendu** :
```
Composer version 2.6.6 2023-12-08 18:32:26
```

**❌ Si vous voyez** : `'composer' is not recognized...`
- Réinstallez Composer (étape 2.2)
- Redémarrez PowerShell

---

## 4. Configuration du Projet

Maintenant que PHP et Composer sont installés, configurons le projet Laravel.

### Étape 4.1 : Naviguer vers le projet

```powershell
cd C:\Users\user\Downloads\DGTT\backend-permis-conduire-main
```

---

### Étape 4.2 : Créer le fichier .env

```powershell
copy .env.example .env
```

**✅ Résultat** : Le fichier `.env` est créé

---

### Étape 4.3 : Installer les dépendances

```powershell
composer install
```

**⏱️ Temps estimé** : 3-10 minutes (première fois)

**✅ Résultat attendu** :
- Plein de messages défilent
- À la fin : `X packages installed`
- Un dossier `vendor/` est créé

**❌ Erreurs possibles** :
- `"ext-pgsql" is missing` → Vérifiez l'étape 1.3 (activer extensions)
- `Out of memory` → Augmentez `memory_limit` in `php.ini` à `512M`

---

### Étape 4.4 : Générer la clé d'application

```powershell
php artisan key:generate
```

**✅ Résultat** : `Application key set successfully.`

---

### Étape 4.5 : Configurer la base de données

**a) Ouvrez le fichier `.env`** avec votre éditeur de texte

**b) Modifiez ces lignes** selon votre configuration PostgreSQL :

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=permis_conduire_db
DB_USERNAME=postgres
DB_PASSWORD=VOTRE_MOT_DE_PASSE_ICI
```

**⚠️ Remplacez** `VOTRE_MOT_DE_PASSE_ICI` par votre vrai mot de passe PostgreSQL

**c) Enregistrez le fichier**

---

### Étape 4.6 : Créer la base de données (si elle n'existe pas)

**Option 1 : Via pgAdmin** (interface graphique)
1. Ouvrez pgAdmin
2. Connectez-vous à votre serveur
3. Clic droit sur "Databases" → "Create" → "Database"
4. Nom : `permis_conduire_db`
5. Cliquez sur "Save"

**Option 2 : Via PowerShell**
```powershell
# Remplacez par le chemin de votre installation PostgreSQL
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "CREATE DATABASE permis_conduire_db;"
```

---

### Étape 4.7 : Exécuter les migrations

```powershell
php artisan migrate
```

**✅ Résultat attendu** : Liste de migrations avec `[OK]`

**❌ Si erreur** :
- `Connection refused` → PostgreSQL n'est pas démarré
- `Access denied` → Mauvais mot de passe dans `.env`
- `Database does not exist` → Créez la base (étape 4.6)

---

### Étape 4.8 : Effacer les caches

```powershell
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

**✅ Chaque commande doit afficher** : `Cache cleared successfully.`

---

## 5. Lancement du Serveur

### Étape 5.1 : Démarrer le serveur Laravel

```powershell
php artisan serve
```

**✅ Résultat attendu** :
```
Laravel development server started: http://127.0.0.1:8000
Press Ctrl+C to stop the server
```

**⚠️ NE FERMEZ PAS CETTE FENÊTRE** - Le serveur tourne ici

---

### Étape 5.2 : Tester le serveur

Ouvrez votre navigateur et allez sur : **http://127.0.0.1:8000**

**✅ Résultat** : Vous voyez une page (même si c'est une page d'erreur ou de bienvenue Laravel, c'est normal)

---

### Étape 5.3 : Tester les notifications SMS

**Dans une NOUVELLE fenêtre PowerShell** (gardez l'autre ouverte avec le serveur) :

```powershell
cd C:\Users\user\Downloads\DGTT\backend-permis-conduire-main
```

**Modifiez d'abord votre numéro dans le script** :

1. Ouvrez `test_all_notifications.php` avec votre éditeur
2. Ligne 9 : Remplacez `24177123456` par votre vrai numéro gabonais
3. Enregistrez

**Exécutez le script** :

```powershell
php test_all_notifications.php
```

**✅ Résultat attendu** :
- Le script affiche chaque test
- Vous recevez des SMS sur votre téléphone
- Les logs montrent les envois réussis

---

## 6. Dépannage

### ❌ Problème : "php is not recognized"

**Solutions** :
1. Vérifiez que `C:\php` contient bien `php.exe`
2. Ajoutez `C:\php` au PATH (étape 1.2)
3. **Fermez et rouvrez PowerShell**
4. Retestez : `php -v`

---

### ❌ Problème : "composer is not recognized"

**Solutions** :
1. Réinstallez Composer (étape 2.2)
2. **Fermez et rouvrez PowerShell**
3. Retestez : `composer --version`

---

### ❌ Problème : "ext-pgsql is missing"

**Solution** :
1. Ouvrez `C:\php\php.ini`
2. Cherchez `;extension=pdo_pgsql` et `;extension=pgsql`
3. Supprimez les `;` au début
4. Enregistrez
5. Redémarrez PowerShell
6. Retestez : `php artisan migrate`

---

### ❌ Problème : "Connection refused [pgsql]"

**Solutions** :
1. Vérifiez que PostgreSQL est démarré :
   ```powershell
   Get-Service -Name postgresql*
   ```
2. Si "Stopped", démarrez-le :
   ```powershell
   Start-Service postgresql-x64-14
   ```
3. Vérifiez `.env` : `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`

---

### ❌ Problème : "Address already in use"

Le port 8000 est déjà utilisé.

**Solution** :
```powershell
# Utiliser un autre port
php artisan serve --port=8001
```

Puis allez sur : http://127.0.0.1:8001

---

## 📊 Récapitulatif des Chemins Importants

| Élément | Chemin |
|---------|--------|
| **PHP** | `C:\php\php.exe` |
| **Composer** | `C:\ProgramData\ComposerSetup\bin\composer.bat` |
| **Projet Laravel** | `C:\Users\user\Downloads\DGTT\backend-permis-conduire-main` |
| **Fichier .env** | `C:\Users\user\Downloads\DGTT\backend-permis-conduire-main\.env` |
| **Logs Laravel** | `C:\Users\user\Downloads\DGTT\backend-permis-conduire-main\storage\logs\laravel.log` |
| **Script de test** | `C:\Users\user\Downloads\DGTT\backend-permis-conduire-main\test_all_notifications.php` |

---

## ✅ Checklist Complète

Avant de tester les notifications :

- [ ] PHP installé (`php -v` fonctionne)
- [ ] Composer installé (`composer --version` fonctionne)
- [ ] Extensions PHP activées dans `php.ini`
- [ ] Fichier `.env` créé
- [ ] Base de données créée
- [ ] `composer install` exécuté
- [ ] `php artisan key:generate` exécuté
- [ ] `php artisan migrate` exécuté
- [ ] Caches effacés
- [ ] Serveur Laravel lancé (`php artisan serve`)
- [ ] Numéro de téléphone modifié dans `test_all_notifications.php`

---

## 🎯 Commandes à Exécuter dans l'Ordre

**Une fois PHP et Composer installés**, voici toutes les commandes à exécuter :

```powershell
# 1. Aller dans le projet
cd C:\Users\user\Downloads\DGTT\backend-permis-conduire-main

# 2. Créer .env
copy .env.example .env

# 3. Installer les dépendances
composer install

# 4. Générer la clé
php artisan key:generate

# 5. Configurer .env (éditez le fichier manuellement)
notepad .env

# 6. Migrer la base de données
php artisan migrate

# 7. Effacer les caches
php artisan config:clear
php artisan cache:clear

# 8. Lancer le serveur
php artisan serve
```

**Dans une NOUVELLE fenêtre PowerShell** :

```powershell
# 9. Tester les notifications
cd C:\Users\user\Downloads\DGTT\backend-permis-conduire-main
php test_all_notifications.php
```

---

**Guide créé le** : 20 Janvier 2026  
**Version** : 1.0 - Installation Windows  
**Auteur** : Équipe DGTT

**Besoin d'aide ?** Vérifiez les logs : `storage\logs\laravel.log`
