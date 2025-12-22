# Installing PDF Letterhead Dependencies on Windows

## Current Status Check

Run these commands to check what's installed:

```powershell
# Check Imagick
php -r "echo extension_loaded('imagick') ? 'Imagick: INSTALLED' : 'Imagick: NOT INSTALLED';"

# Check Ghostscript
gs --version
```

## Installation Options

### Option 1: Install Imagick (Recommended)

#### Method A: Using PECL (if available)
```powershell
# Install via PECL
pecl install imagick

# Add to php.ini
# Add this line: extension=imagick
```

#### Method B: Manual Installation (Recommended for Windows)

1. **Download Imagick DLL:**
   - Go to: https://windows.php.net/downloads/pecl/releases/imagick/
   - Download the version matching your PHP version and architecture (x64 or x86)
   - Example: `php_imagick-3.7.0-8.2-ts-vs16-x64.zip` for PHP 8.2 x64 Thread Safe

2. **Extract the files:**
   - Extract `php_imagick.dll` to your PHP `ext` directory
   - Usually: `C:\php\ext\` or `C:\xampp\php\ext\`

3. **Download ImageMagick library:**
   - Go to: https://imagemagick.org/script/download.php#windows
   - Download the Windows binary (e.g., `ImageMagick-7.x.x-Q16-HDRI-x64-dll.exe`)
   - Install it (default location: `C:\Program Files\ImageMagick-7.x.x-Q16-HDRI\`)

4. **Update php.ini:**
   - Open your `php.ini` file
   - Find the `;extension=imagick` line (or add it)
   - Uncomment it: `extension=imagick`
   - Add ImageMagick path to PATH environment variable or add to php.ini:
     ```ini
     extension=imagick
     ```

5. **Restart your web server:**
   - If using XAMPP: Restart Apache from XAMPP Control Panel
   - If using IIS: Restart IIS
   - If using Laravel Sail: Restart the container

6. **Verify installation:**
   ```powershell
   php -m | findstr imagick
   # Should output: imagick
   ```

### Option 2: Install Ghostscript (Alternative)

1. **Download Ghostscript:**
   - Go to: https://www.ghostscript.com/download/gsdnld.html
   - Download the Windows installer (e.g., `gs1000w64.exe`)

2. **Install Ghostscript:**
   - Run the installer
   - Install to default location: `C:\Program Files\gs\gs10.00.0\`

3. **Add to PATH:**
   - Open System Properties → Environment Variables
   - Edit "Path" in System variables
   - Add: `C:\Program Files\gs\gs10.00.0\bin`
   - Click OK and restart your terminal

4. **Verify installation:**
   ```powershell
   gs --version
   # Should output: GPL Ghostscript 10.00.0 (or similar)
   ```

## Quick Installation Script

You can use the provided PowerShell script:

```powershell
cd "F:\Nazim Production\nazim-web-1\backend"
.\scripts\install-dependencies.ps1
```

This script will:
- Check if Imagick is installed
- Check if Ghostscript is installed
- Provide installation instructions if missing

## After Installation

1. **Restart your web server/PHP-FPM**
2. **Verify in Laravel:**
   ```powershell
   php artisan tinker
   ```
   Then:
   ```php
   extension_loaded('imagick') // Should return true
   shell_exec('gs --version') // Should return version string
   ```

3. **Test PDF letterhead generation:**
   - Try generating a PDF with a letterhead in the application
   - Check `storage/logs/laravel.log` for success messages:
     - "Successfully converted PDF letterhead to image using Imagick"
     - OR "Successfully converted PDF letterhead to image using Ghostscript"

## Troubleshooting

### Imagick Issues:

**"PHP Startup: Unable to load dynamic library 'imagick'"**
- Check that `php_imagick.dll` is in the correct `ext` directory
- Verify PHP version matches (x64 vs x86, TS vs NTS)
- Ensure ImageMagick library is installed

**"Class 'Imagick' not found"**
- Check `php.ini` has `extension=imagick` uncommented
- Restart web server
- Verify extension is loaded: `php -m | findstr imagick`

### Ghostscript Issues:

**"gs: command not found"**
- Verify Ghostscript is installed
- Check PATH environment variable includes Ghostscript bin directory
- Restart terminal/command prompt after adding to PATH

**"Permission denied" or conversion fails**
- Check file permissions on PDF letterhead files
- Verify Ghostscript can read the files
- Check Laravel logs for detailed error messages

## Recommended Setup

For best results, install **both** Imagick and Ghostscript:
- **Imagick** will be used first (faster, better quality)
- **Ghostscript** will be used as fallback if Imagick fails

## Need Help?

Check the main installation guide: [INSTALL_DEPENDENCIES.md](./INSTALL_DEPENDENCIES.md)

