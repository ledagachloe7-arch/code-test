FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    libpq-dev git curl libpng-dev libonig-dev libxml2-dev zip unzip pkg-config build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install pdo pdo_pgsql pdo_mysql mbstring exif pcntl bcmath gd
RUN pecl install redis && docker-php-ext-enable redis

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html

# Copier le code
COPY . .

# Installer les dépendances PHP sans scripts Laravel
RUN composer install --no-interaction --prefer-dist --optimize-autoloader --no-scripts

# Créer l'utilisateur non root
RUN groupadd -g 1000 www && useradd -u 1000 -ms /bin/bash -g www www && chown -R www:www /var/www/html
USER www

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
