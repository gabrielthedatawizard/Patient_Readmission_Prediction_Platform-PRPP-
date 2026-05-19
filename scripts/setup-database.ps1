# TRIP Platform — Database Setup Script
# Run this once from the repo root after Supabase is reachable:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-database.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$BackendDir = Join-Path $PSScriptRoot '..' 'backend'

Write-Host ""
Write-Host "=== TRIP Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Verify .env exists
$EnvFile = Join-Path $BackendDir '.env'
if (-not (Test-Path $EnvFile)) {
    Write-Error ".env not found at $EnvFile. Create it from the configuration guide before running this script."
}

# Step 1: Generate Prisma client
Write-Host "[1/3] Generating Prisma client..." -ForegroundColor Yellow
Set-Location $BackendDir
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }

# Step 2: Deploy migrations
Write-Host ""
Write-Host "[2/3] Deploying migrations to database..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy failed — check DATABASE_URL / DIRECT_URL in backend/.env" }

# Step 3: Seed
Write-Host ""
Write-Host "[3/3] Seeding demo data (22 patients, 13 users, 7 facilities)..." -ForegroundColor Yellow
npx prisma db seed
if ($LASTEXITCODE -ne 0) { throw "prisma db seed failed" }

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host "Login at your Vercel URL with:  clinician@trip.go.tz  /  Trip@2026" -ForegroundColor Green
Write-Host ""
