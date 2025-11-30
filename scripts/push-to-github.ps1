# Script to push to GitHub with authentication
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GitHub Push Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$repoPath = "e:\nazim production\nazim-web"
Set-Location $repoPath

Write-Host "Current directory: $repoPath" -ForegroundColor Yellow
Write-Host ""

# Check if .git exists
if (-not (Test-Path ".git")) {
    Write-Host "ERROR: .git folder not found!" -ForegroundColor Red
    Write-Host "Please run 'git init' first" -ForegroundColor Yellow
    exit 1
}

# Check remote
Write-Host "Checking remote configuration..." -ForegroundColor Yellow
$remoteUrl = git remote get-url origin 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Adding remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/AHMADJAN-New/nazim-web.git
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to add remote" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Remote added" -ForegroundColor Green
} else {
    Write-Host "✓ Remote exists: $remoteUrl" -ForegroundColor Green
}

Write-Host ""

# Check current branch
Write-Host "Checking branch..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan

if ($currentBranch -ne "main") {
    Write-Host "Renaming branch to main..." -ForegroundColor Yellow
    git branch -M main
}

Write-Host ""

# Check if there are commits
Write-Host "Checking commits..." -ForegroundColor Yellow
$commitCount = (git log --oneline 2>&1 | Measure-Object -Line).Lines
Write-Host "Commits found: $commitCount" -ForegroundColor Cyan

if ($commitCount -eq 0) {
    Write-Host "WARNING: No commits found!" -ForegroundColor Yellow
    Write-Host "Creating initial commit..." -ForegroundColor Yellow
    
    git add .
    git commit -m "Initial commit: Fresh start with frontend migration"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create commit" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Initial commit created" -ForegroundColor Green
}

Write-Host ""

# Push to GitHub
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will FORCE PUSH and overwrite remote history!" -ForegroundColor Yellow
Write-Host ""

# Try push
Write-Host "Executing: git push -u origin main --force" -ForegroundColor Yellow
Write-Host ""

$pushOutput = git push -u origin main --force 2>&1
$pushExitCode = $LASTEXITCODE

Write-Host $pushOutput

Write-Host ""

if ($pushExitCode -eq 0) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ SUCCESS: Push completed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Repository: https://github.com/AHMADJAN-New/nazim-web" -ForegroundColor Cyan
    Write-Host "Branch: main" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "✗ ERROR: Push failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "1. Authentication required - GitHub may prompt for credentials" -ForegroundColor White
    Write-Host "2. Permission denied - Check repository access" -ForegroundColor White
    Write-Host "3. Network issue - Check internet connection" -ForegroundColor White
    Write-Host ""
    Write-Host "Try running manually:" -ForegroundColor Yellow
    Write-Host "  git push -u origin main --force" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Verification:" -ForegroundColor Cyan
git log --oneline -3
Write-Host ""
git remote -v
