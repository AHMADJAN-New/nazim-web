FROM php:8.3-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    imagemagick \
    ghostscript \
    libmagickwand-dev \
    libpq-dev \
    libzip-dev \
    libonig-dev \
    unzip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install -j$(nproc) \
    pdo \
    pdo_pgsql \
    mbstring \
    bcmath \
    zip \
    pcntl

# Install Imagick via PECL
RUN pecl install imagick && \
    docker-php-ext-enable imagick

# Install Redis extension for Laravel cache/queue/session
RUN pecl install redis && \
    docker-php-ext-enable redis

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Set permissions
RUN chown -R www-data:www-data /var/www

# Expose port 9000 for PHP-FPM
EXPOSE 9000

CMD ["php-fpm"]

