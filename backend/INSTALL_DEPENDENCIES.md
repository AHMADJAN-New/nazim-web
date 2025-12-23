# Installing Dependencies for PDF Letterhead Support

This guide will help you install the required system dependencies for PDF letterhead rendering in the Nazim School Management System.

## Required Dependencies

For PDF letterheads to work correctly, you need **at least one** of the following:

1. **Imagick PHP Extension** (Recommended) - Best quality and performance
2. **Ghostscript** - Alternative if Imagick is not available

## Installation Instructions

### Option 1: Install Imagick (Recommended)

#### Ubuntu/Debian:
```bash
# Install Imagick PHP extension
sudo apt-get update
sudo apt-get install php-imagick

# For PHP 8.2 specifically (adjust version as needed)
sudo apt-get install php8.2-imagick

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm

# Or if using Apache
sudo systemctl restart apache2
```

#### Windows (XAMPP/WAMP):
1. Download Imagick DLL from: https://pecl.php.net/package/imagick
2. Extract the DLL files to your PHP `ext` directory
3. Add `extension=imagick` to your `php.ini`
4. Restart your web server

#### macOS (Homebrew):
```bash
brew install imagemagick
pecl install imagick
```

#### Verify Installation:
```bash
php -m | grep imagick
# Should output: imagick

php -r "echo extension_loaded('imagick') ? 'Imagick loaded' : 'Imagick NOT loaded';"
# Should output: Imagick loaded
```

### Option 2: Install Ghostscript (Alternative)

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install ghostscript

# Verify installation
gs --version
# Should output: GPL Ghostscript X.XX.X
```

#### Windows:
1. Download Ghostscript from: https://www.ghostscript.com/download/gsdnld.html
2. Install the executable
3. Add Ghostscript `bin` directory to your system PATH

#### macOS (Homebrew):
```bash
brew install ghostscript
```

#### Verify Installation:
```bash
which gs
# Should output: /usr/bin/gs (or similar path)

gs --version
# Should output: GPL Ghostscript X.XX.X
```

## Docker Setup (Laravel Sail)

If you're using Laravel Sail, add these to your `Dockerfile` or update your `docker-compose.yml`:

```dockerfile
# In your Dockerfile
RUN apt-get update && apt-get install -y \
    php-imagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*
```

Or in `docker-compose.yml`:
```yaml
services:
  laravel.test:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - '.:/var/www/html'
    environment:
      - WWWGROUP=1000
      - WWWUSER=1000
```

## Verification

After installation, verify the setup by:

1. **Check PHP extensions:**
   ```bash
   php -m | grep -E "imagick|gd"
   ```

2. **Check Ghostscript:**
   ```bash
   gs --version
   ```

3. **Test in Laravel:**
   ```bash
   php artisan tinker
   ```
   Then run:
   ```php
   extension_loaded('imagick') // Should return true if Imagick is installed
   shell_exec('gs --version') // Should return version string if Ghostscript is installed
   ```

4. **Check Laravel logs:**
   After trying to generate a PDF with a letterhead, check `storage/logs/laravel.log` for:
   - Success: "Successfully converted PDF letterhead to image using Imagick"
   - Success: "Successfully converted PDF letterhead to image using Ghostscript"
   - Error: "Imagick and Ghostscript not available" (means neither is installed)

## Troubleshooting

### Imagick Issues:

1. **Extension not loading:**
   - Check `php.ini` has `extension=imagick` uncommented
   - Verify PHP version matches (e.g., `php8.2-imagick` for PHP 8.2)
   - Restart web server/PHP-FPM

2. **Permission errors:**
   - Ensure ImageMagick policy allows PDF reading
   - Check `/etc/ImageMagick-6/policy.xml` (or similar)
   - May need to modify policy to allow PDF format

### Ghostscript Issues:

1. **Command not found:**
   - Verify `gs` is in system PATH
   - Try full path: `/usr/bin/gs --version`
   - Check installation: `which gs` or `where gs`

2. **Conversion fails:**
   - Check file permissions on PDF letterhead files
   - Verify Ghostscript can read the PDF
   - Check Laravel logs for detailed error messages

## Priority Order

The system will try in this order:
1. **Imagick** (if available) - Best quality, fastest
2. **Ghostscript** (if Imagick not available) - Good quality, reliable
3. **Fallback** (if neither available) - May not render letterhead properly

## Production Recommendations

For production environments:
- **Install both** Imagick and Ghostscript for redundancy
- **Monitor logs** for conversion failures
- **Test letterhead rendering** after deployment
- **Set up alerts** if letterhead conversion fails consistently

## Additional Notes

- Imagick requires ImageMagick library to be installed first
- Ghostscript is a standalone tool and doesn't require PHP extension
- Both tools work well, but Imagick is generally faster for PHP applications
- The system automatically detects and uses the best available option

