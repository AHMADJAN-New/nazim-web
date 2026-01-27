# PHP Sodium Extension Setup Guide

## Problem
The desktop license generation feature requires the PHP Sodium extension for Ed25519 cryptographic operations. If you see the error:
```
PHP sodium extension is required for Ed25519 operations
```

This means the Sodium extension is not enabled in your PHP installation.

## Solution

### For PHP 7.2+ (Recommended: Built-in Extension)

PHP 7.2 and later versions include Sodium as a core extension, but it may need to be explicitly enabled.

#### Step 1: Locate your php.ini file

Run this command to find your php.ini file:
```bash
php --ini
```

Look for the "Loaded Configuration File" path.

#### Step 2: Edit php.ini

Open the php.ini file in a text editor and find the section for extensions (usually near the top or search for `;extension=`).

**For Windows:**
```ini
; Uncomment or add this line:
extension=php_sodium.dll
```

**For Linux/macOS:**
```ini
; Uncomment or add this line:
extension=sodium
```

#### Step 3: Verify the extension is loaded

After saving php.ini, restart your web server (Apache, Nginx, PHP-FPM, etc.) and verify:

```bash
php -m | grep sodium
```

Or check programmatically:
```bash
php -r "echo extension_loaded('sodium') ? 'Sodium is loaded' : 'Sodium is NOT loaded';"
```

### For PHP < 7.2 (Not Recommended)

If you're using PHP < 7.2, you need to install the libsodium library and PHP extension separately. However, **PHP 7.2+ is strongly recommended** as Sodium is built-in.

## Verification

### Via Command Line
```bash
php -r "var_dump(extension_loaded('sodium'));"
```

Should output: `bool(true)`

### Via Health Check Endpoint

After enabling the extension and restarting your server, you can check via the API:

```bash
GET /api/platform/desktop-licenses/keys/check-sodium
```

This endpoint requires platform admin authentication and will return:
```json
{
  "data": {
    "sodium_available": true,
    "php_version": "8.4.4",
    "message": "Sodium extension is available and ready for Ed25519 operations"
  }
}
```

## Common Issues

### Issue: Extension still not loading after enabling

**Solutions:**
1. Make sure you edited the correct php.ini file (check with `php --ini`)
2. Restart your web server completely (not just reload)
3. For Windows, ensure `php_sodium.dll` exists in your PHP extension directory
4. Check PHP error logs for extension loading errors

### Issue: Different php.ini for CLI vs Web Server

**Problem:** PHP CLI and web server may use different php.ini files.

**Solution:** 
- Check which php.ini your web server uses: Create a `phpinfo.php` file with `<?php phpinfo(); ?>` and check the "Loaded Configuration File"
- Edit the correct php.ini file that your web server uses

### Issue: Extension file not found (Windows)

**Solution:**
- Ensure `php_sodium.dll` exists in your PHP `ext` directory
- If missing, download PHP with Sodium support or compile PHP with Sodium enabled

## Testing

After enabling Sodium, test key generation:

1. Go to Platform Admin → Desktop License Generation
2. Click "Generate New Key Pair"
3. If successful, Sodium is working correctly

## Need Help?

If you continue to have issues:
1. Check PHP error logs: `backend/storage/logs/laravel.log`
2. Verify PHP version: `php -v` (should be 7.2+)
3. Check extension directory: `php -i | grep extension_dir`
4. Review web server error logs
