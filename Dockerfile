# Dockerfile para Laravel con Node.js
FROM php:8.2-fpm

# Argumentos
ARG user=laravel
ARG uid=1000

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    nodejs \
    npm \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Limpiar cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Instalar Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Crear usuario del sistema
RUN useradd -G www-data,root -u $uid -d /home/$user $user
RUN mkdir -p /home/$user/.composer && \
    chown -R $user:$user /home/$user

# Establecer directorio de trabajo
WORKDIR /var/www

# Copiar archivos de dependencias primero (para cache de Docker)
COPY composer.json composer.lock ./
COPY package.json package-lock.json ./

# Instalar dependencias de PHP y Node como root
RUN composer install --no-scripts --no-autoloader --no-dev --prefer-dist
RUN npm install

# Copiar el resto de la aplicación
COPY . .

# Cambiar permisos
RUN chown -R $user:www-data /var/www
RUN chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# Completar instalación de Composer y generar autoload
RUN composer dump-autoload --optimize

# Compilar assets frontend
RUN npm run build

# Cambiar a usuario no-root
USER $user

# Exponer puerto
EXPOSE 9000

CMD ["php-fpm"]
