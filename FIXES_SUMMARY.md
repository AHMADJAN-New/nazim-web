# Fixes Summary - January 11, 2026

## Issues Fixed

### 1. ✅ Frontend: `crypto.randomUUID is not a function`
**Status**: Code fixed, needs rebuild

**Fix Applied**:
- Downgraded `uuid` package from v13 to v12 (v12 doesn't require `crypto.randomUUID`)
- Removed crypto polyfill code
- Fixed duplicate translation keys in `ps.ts`, `fa.ts`, and `en.ts`

**Action Required**:
1. Fix dist folder permissions (requires sudo):
   ```bash
   sudo chown -R nazim:nazim /var/www/nazim/nazim-web/frontend/dist
   sudo rm -rf /var/www/nazim/nazim-web/frontend/dist
   ```

2. Rebuild frontend:
   ```bash
   cd /var/www/nazim/nazim-web/frontend
   npm run build
   ```

3. Clear browser cache:
   - Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
   - Or clear browser cache completely

### 2. ✅ Backend: PDF Generation - Chrome Missing Libraries
**Status**: Code fixed, needs system dependencies

**Fix Applied**:
- Added `findChromePath()` method to auto-detect Chrome
- Added `PUPPETEER_CHROME_PATH` environment variable support
- Created installation script: `backend/install-chrome-deps.sh`
- Created documentation: `backend/CHROME_SETUP.md`

**Action Required**:
1. Install Chrome system dependencies (requires sudo):
   ```bash
   cd /var/www/nazim/nazim-web/backend
   sudo bash install-chrome-deps.sh
   ```

   Or install manually:
   ```bash
   sudo apt-get update
   sudo apt-get install -y \
       libatk1.0-0 \
       libatk-bridge2.0-0 \
       libatspi2.0-0 \
       libxcomposite1 \
       libxdamage1 \
       libxfixes3 \
       libxrandr2 \
       libgbm1 \
       libasound2 \
       libxss1 \
       libxtst6 \
       libgconf-2-4 \
       libxkbcommon0 \
       libnss3 \
       libx11-6 \
       libxext6
   ```

2. Verify Chrome can run:
   ```bash
   ldd /home/nazim/.cache/puppeteer/chrome-headless-shell/linux-143.0.7499.169/chrome-headless-shell-linux64/chrome-headless-shell | grep "not found"
   ```
   Should return no output if all dependencies are installed.

3. Restart PHP-FPM to load new environment variable:
   ```bash
   sudo systemctl restart php8.3-fpm
   ```

## Files Modified

### Frontend
- `frontend/package.json` - Downgraded uuid to v12
- `frontend/vite.config.ts` - Set `emptyOutDir: false` to avoid permission issues
- `frontend/src/lib/translations/ps.ts` - Removed duplicate keys
- `frontend/src/lib/translations/fa.ts` - Removed duplicate keys
- `frontend/src/lib/translations/en.ts` - Removed duplicate keys
- `frontend/index.html` - Removed crypto polyfill
- `frontend/src/main.tsx` - Removed crypto polyfill import

### Backend
- `backend/app/Services/Reports/PdfReportService.php` - Added Chrome path detection
- `backend/.env` - Added `PUPPETEER_CHROME_PATH` variable
- `backend/install-chrome-deps.sh` - Created installation script
- `backend/CHROME_SETUP.md` - Created documentation

## Quick Fix Commands

Run these commands in order:

```bash
# 1. Fix frontend dist permissions and rebuild
sudo chown -R nazim:nazim /var/www/nazim/nazim-web/frontend/dist
sudo rm -rf /var/www/nazim/nazim-web/frontend/dist
cd /var/www/nazim/nazim-web/frontend && npm run build

# 2. Install Chrome dependencies
cd /var/www/nazim/nazim-web/backend
sudo bash install-chrome-deps.sh

# 3. Restart PHP-FPM
sudo systemctl restart php8.3-fpm

# 4. Clear browser cache (do this in your browser)
# Press Ctrl+Shift+R or Cmd+Shift+R
```

## Verification

### Frontend
- Open browser DevTools Console
- Should NOT see `crypto.randomUUID is not a function` error
- Check Network tab - new JS files should have today's timestamp

### Backend
- Try generating a PDF report
- Check `backend/storage/logs/laravel.log` for Chrome path logs
- Should see: `Using Chrome from PUPPETEER_CHROME_PATH: ...`
- PDF should generate successfully

## Troubleshooting

### Frontend still shows crypto.randomUUID error
- Clear browser cache completely
- Check if new build files are being served (check file timestamps)
- Verify `uuid` package version: `cd frontend && npm list uuid`

### PDF generation still fails
- Check if Chrome dependencies are installed: `ldd /home/nazim/.cache/puppeteer/.../chrome-headless-shell | grep "not found"`
- Verify environment variable: `cd backend && php artisan tinker --execute="echo env('PUPPETEER_CHROME_PATH');"`
- Check PHP-FPM user can access Chrome: `sudo -u www-data test -r /home/nazim/.cache/puppeteer/.../chrome-headless-shell && echo "OK" || echo "Permission denied"`
