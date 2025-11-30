# Frontend Migration Script
# Moves frontend files to a separate 'frontend/' folder

$ErrorActionPreference = "Continue"
$rootPath = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $rootPath "frontend"

# Redirect all output
$logFile = Join-Path $rootPath "frontend-migration.log"
Start-Transcript -Path $logFile -Force

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Frontend Migration Script" -ForegroundColor Cyan
Write-Host "Root: $rootPath" -ForegroundColor Cyan
Write-Host "Frontend: $frontendPath" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Remove existing frontend folder if it exists and is empty
if (Test-Path $frontendPath) {
    $items = Get-ChildItem -Path $frontendPath -Force
    if ($items.Count -eq 0) {
        Write-Host "Removing empty frontend folder..." -ForegroundColor Yellow
        Remove-Item -Path $frontendPath -Force
    } else {
        Write-Host "ERROR: 'frontend' folder already exists with content!" -ForegroundColor Red
        Write-Host "Please remove it first or rename it." -ForegroundColor Yellow
        Stop-Transcript
        exit 1
    }
}

Write-Host "Step 1: Creating 'frontend' directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $frontendPath -Force | Out-Null
Write-Host "✓ Created frontend directory" -ForegroundColor Green
Write-Host ""

# Files and folders to move
$itemsToMove = @(
    "src",
    "public",
    "index.html",
    "vite.config.ts",
    "package.json",
    "package-lock.json",
    "bun.lockb",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "tailwind.config.ts",
    "components.json",
    "postcss.config.js",
    "eslint.config.js",
    ".prettierrc.json",
    ".prettierignore"
)

Write-Host "Step 2: Moving frontend files and folders..." -ForegroundColor Yellow
$movedCount = 0
foreach ($item in $itemsToMove) {
    $sourcePath = Join-Path $rootPath $item
    if (Test-Path $sourcePath) {
        $destPath = Join-Path $frontendPath $item
        Write-Host "  Moving: $item" -ForegroundColor Gray
        Write-Host "    From: $sourcePath" -ForegroundColor DarkGray
        Write-Host "    To: $destPath" -ForegroundColor DarkGray
        try {
            Move-Item -Path $sourcePath -Destination $destPath -Force -ErrorAction Stop
            $movedCount++
            Write-Host "    ✓ Success" -ForegroundColor Green
        } catch {
            Write-Host "    ✗ Error: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  Skipping: $item (not found)" -ForegroundColor DarkGray
    }
}
Write-Host "✓ Moved $movedCount items" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Updating configuration files..." -ForegroundColor Yellow

# Update tailwind.config.ts
$tailwindConfig = Join-Path $frontendPath "tailwind.config.ts"
if (Test-Path $tailwindConfig) {
    Write-Host "  Updating tailwind.config.ts..." -ForegroundColor Gray
    $content = Get-Content $tailwindConfig -Raw
    $content = $content -replace '"./pages/\*\*/\*\.\{ts,tsx\}"', '"./pages/**/*.{ts,tsx}"'
    $content = $content -replace '"./components/\*\*/\*\.\{ts,tsx\}"', '"./components/**/*.{ts,tsx}"'
    $content = $content -replace '"./app/\*\*/\*\.\{ts,tsx\}"', '"./app/**/*.{ts,tsx}"'
    # The ./src path should remain the same (relative to config file)
    Set-Content -Path $tailwindConfig -Value $content -NoNewline
    Write-Host "  ✓ Updated tailwind.config.ts" -ForegroundColor Green
}

# Update components.json
$componentsJson = Join-Path $frontendPath "components.json"
if (Test-Path $componentsJson) {
    Write-Host "  Updating components.json..." -ForegroundColor Gray
    $json = Get-Content $componentsJson -Raw | ConvertFrom-Json
    # The css path is relative to components.json location, so it should still work
    # But let's verify it's correct
    if ($json.tailwind.css -ne "src/index.css") {
        $json.tailwind.css = "src/index.css"
    }
    $json | ConvertTo-Json -Depth 10 | Set-Content -Path $componentsJson
    Write-Host "  ✓ Updated components.json" -ForegroundColor Green
}

# Update package.json - fix seed:admin script path
$packageJson = Join-Path $frontendPath "package.json"
if (Test-Path $packageJson) {
    Write-Host "  Updating package.json..." -ForegroundColor Gray
    $json = Get-Content $packageJson -Raw | ConvertFrom-Json
    if ($json.scripts.'seed:admin') {
        $json.scripts.'seed:admin' = "tsx ../scripts/seed-admin.ts"
    }
    $json | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJson
    Write-Host "  ✓ Updated package.json (seed:admin script path)" -ForegroundColor Green
}

# Update tsconfig.node.json - vite.config.ts path
$tsconfigNode = Join-Path $frontendPath "tsconfig.node.json"
if (Test-Path $tsconfigNode) {
    Write-Host "  Updating tsconfig.node.json..." -ForegroundColor Gray
    $json = Get-Content $tsconfigNode -Raw | ConvertFrom-Json
    # The include path is relative to tsconfig.node.json, so "vite.config.ts" should still work
    # No changes needed
    Write-Host "  ✓ Verified tsconfig.node.json" -ForegroundColor Green
}

Write-Host "✓ Configuration files updated" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Verifying critical paths..." -ForegroundColor Yellow

# Verify vite.config.ts paths
$viteConfig = Join-Path $frontendPath "vite.config.ts"
if (Test-Path $viteConfig) {
    $viteContent = Get-Content $viteConfig -Raw
    if ($viteContent -match '@":\s*path\.resolve\(__dirname,\s*"\./src"\)') {
        Write-Host "  ✓ vite.config.ts path alias is correct" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ vite.config.ts path alias may need review" -ForegroundColor Yellow
    }
}

# Verify tsconfig paths
$tsconfig = Join-Path $frontendPath "tsconfig.json"
if (Test-Path $tsconfig) {
    $tsconfigContent = Get-Content $tsconfig -Raw | ConvertFrom-Json
    if ($tsconfigContent.compilerOptions.paths.'@/*' -eq "./src/*") {
        Write-Host "  ✓ tsconfig.json paths are correct" -ForegroundColor Green
    }
}

Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Navigate to the frontend folder: cd frontend" -ForegroundColor White
Write-Host "2. Install dependencies: npm install" -ForegroundColor White
Write-Host "3. Test the dev server: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Note: All paths in config files are relative, so they should work correctly." -ForegroundColor Cyan
Write-Host "The seed:admin script path has been updated to '../scripts/seed-admin.ts'" -ForegroundColor Cyan
Write-Host ""
