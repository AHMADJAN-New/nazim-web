# Quick Installation Guide - Windows

## Your System Info
- **PHP Version:** 8.2.12
- **Architecture:** x64 (64-bit)
- **Thread Safety:** ZTS (Thread Safe)
- **Compiler:** Visual C++ 2019

## Step 1: Install Imagick (Recommended)

### Download Links:

1. **Download Imagick DLL:**
   - Direct link: https://windows.php.net/downloads/pecl/releases/imagick/
   - Look for: `php_imagick-3.7.0-8.2-ts-vs16-x64.zip` (or latest version)
   - **Important:** Must match "8.2-ts-vs16-x64" (PHP 8.2, Thread Safe, Visual Studio 2019, x64)

2. **Download ImageMagick Library:**
   - Direct link: https://imagemagick.org/script/download.php#windows
   - Download: `ImageMagick-7.x.x-Q16-HDRI-x64-dll.exe` (latest version)
   - This is required for Imagick to work

### Installation Steps:

1. **Install ImageMagick first:**
   - Run the ImageMagick installer
   - Install to default location: `C:\Program Files\ImageMagick-7.x.x-Q16-HDRI\`
   - **Important:** Check "Add to PATH" during installation

2. **Extract Imagick DLL:**
   - Extract `php_imagick.dll` from the ZIP file
   - Copy to your PHP `ext` directory
   - Find your PHP directory: `php --ini` (look for "Loaded Configuration File")
   - Usually: `C:\php\ext\` or `C:\xampp\php\ext\` or similar

3. **Edit php.ini:**
   - Open the php.ini file (path shown by `php --ini`)
   - Find or add: `extension=imagick`
   - Save the file

4. **Restart web server:**
   - If using XAMPP: Restart Apache
   - If using Laravel Sail: `docker-compose restart`
   - If using built-in server: Just restart it

5. **Verify:**
   ```powershell
   php -m | findstr imagick
   # Should output: imagick
   ```

## Step 2: Install Ghostscript (Alternative/Fallback)

### Download:
- Direct link: https://www.ghostscript.com/download/gsdnld.html
- Download: `gs1000w64.exe` (or latest version for Windows x64)

### Installation:
1. Run the installer
2. Install to default location
3. **Add to PATH:**
   - Open System Properties → Environment Variables
   - Edit "Path" in System variables
   - Add: `C:\Program Files\gs\gs10.00.0\bin` (adjust version number)
   - Restart terminal

4. **Verify:**
   ```powershell
   gs --version
   # Should output: GPL Ghostscript 10.00.0 (or similar)
   ```

## Quick Verification Commands

Run these after installation:

```powershell
# Check Imagick
php -r "echo extension_loaded('imagick') ? '✓ Imagick: INSTALLED' : '✗ Imagick: NOT INSTALLED';"

# Check Ghostscript
gs --version

# Check both in one command
php -r "echo 'Imagick: ' . (extension_loaded('imagick') ? 'INSTALLED' : 'NOT INSTALLED') . PHP_EOL; echo 'Ghostscript: ' . (shell_exec('gs --version 2>&1') ?: 'NOT INSTALLED');"
```

## After Installation

1. **Test in Laravel:**
   ```powershell
   cd "F:\Nazim Production\nazim-web-1\backend"
   php artisan tinker
   ```
   Then:
   ```php
   extension_loaded('imagick') // Should return true
   shell_exec('gs --version') // Should return version string
   ```

2. **Test PDF letterhead:**
   - Generate a PDF with a letterhead in your application
   - Check `storage/logs/laravel.log` for:
     - "Successfully converted PDF letterhead to image using Imagick" ✓
     - OR "Successfully converted PDF letterhead to image using Ghostscript" ✓

## Troubleshooting

### Can't find php.ini?
```powershell
php --ini
# Shows the path to php.ini
```

### Imagick not loading?
1. Check DLL is in correct `ext` directory
2. Verify PHP version matches (8.2-ts-vs16-x64)
3. Ensure ImageMagick is installed and in PATH
4. Restart web server

### Ghostscript not found?
1. Verify it's installed
2. Check PATH includes Ghostscript bin directory
3. Restart terminal after adding to PATH

## Need More Help?

- See [INSTALL_DEPENDENCIES.md](./INSTALL_DEPENDENCIES.md) for detailed instructions
- See [INSTALL_WINDOWS.md](./INSTALL_WINDOWS.md) for Windows-specific guide

