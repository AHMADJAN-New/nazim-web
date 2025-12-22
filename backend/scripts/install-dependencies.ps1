# PowerShell script for installing PDF letterhead dependencies on Windows
# This script helps install Imagick and Ghostscript on Windows systems

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Installing PDF Letterhead Dependencies" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Warning: This script should be run as Administrator" -ForegroundColor Yellow
    Write-Host "Some operations may require elevated privileges" -ForegroundColor Yellow
    Write-Host ""
}

# Detect PHP version
$phpVersion = (php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;")
Write-Host "Detected PHP version: $phpVersion" -ForegroundColor Green
Write-Host ""

# Check if Imagick is already installed
Write-Host "Checking Imagick installation..." -ForegroundColor Cyan
$imagickLoaded = php -r "echo extension_loaded('imagick') ? 'true' : 'false';"

if ($imagickLoaded -eq 'true') {
    Write-Host "✓ Imagick is already installed" -ForegroundColor Green
} else {
    Write-Host "✗ Imagick is NOT installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "To install Imagick on Windows:" -ForegroundColor Yellow
    Write-Host "1. Download Imagick DLL from: https://pecl.php.net/package/imagick" -ForegroundColor Yellow
    Write-Host "2. Extract DLL files to your PHP 'ext' directory" -ForegroundColor Yellow
    Write-Host "3. Add 'extension=imagick' to your php.ini" -ForegroundColor Yellow
    Write-Host "4. Restart your web server" -ForegroundColor Yellow
    Write-Host ""
}

# Check if Ghostscript is installed
Write-Host "Checking Ghostscript installation..." -ForegroundColor Cyan
$gsPath = Get-Command gs -ErrorAction SilentlyContinue

if ($gsPath) {
    $gsVersion = gs --version
    Write-Host "✓ Ghostscript is installed: $gsVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Ghostscript is NOT installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "To install Ghostscript on Windows:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.ghostscript.com/download/gsdnld.html" -ForegroundColor Yellow
    Write-Host "2. Run the installer" -ForegroundColor Yellow
    Write-Host "3. Add Ghostscript 'bin' directory to your system PATH" -ForegroundColor Yellow
    Write-Host "4. Restart your terminal/command prompt" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Installation Check Complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verification commands:" -ForegroundColor Yellow
Write-Host "  php -m | findstr imagick" -ForegroundColor White
Write-Host "  gs --version" -ForegroundColor White
Write-Host ""

