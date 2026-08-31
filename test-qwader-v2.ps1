# ============================================
# Qwader Store - Build & Speed Test Script
# ============================================

Write-Host ""
Write-Host "[1/4] Cleaning old build..." -ForegroundColor Cyan
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

Write-Host "[2/4] Running build..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED - check errors above." -ForegroundColor Red
    exit 1
}

Write-Host "[3/4] Checking file sizes..." -ForegroundColor Cyan
$assets = Get-ChildItem -Path ".\dist\assets" -Filter "*.js"
$mainFile = $assets | Where-Object { $_.Name -like "index-*.js" } | Select-Object -First 1
$adminFile = $assets | Where-Object { $_.Name -like "AdminDashboardView-*.js" } | Select-Object -First 1

if ($mainFile) {
    $mainKB = [math]::Round($mainFile.Length / 1KB, 1)
    Write-Host "  Main file (index): $mainKB KB" -ForegroundColor White
    if ($mainKB -lt 1200) {
        Write-Host "  OK - smaller than 1200 KB (was 1680 KB before)" -ForegroundColor Green
    } else {
        Write-Host "  WARNING - still large, check the code splitting" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ERROR - main index file not found!" -ForegroundColor Red
}

if ($adminFile) {
    $adminKB = [math]::Round($adminFile.Length / 1KB, 1)
    Write-Host "  Admin dashboard file (separate): $adminKB KB" -ForegroundColor White
    Write-Host "  OK - admin panel is split out, only loads when visiting #admin" -ForegroundColor Green
} else {
    Write-Host "  ERROR - admin file is not separate, code splitting did not work!" -ForegroundColor Red
}

Write-Host ""
Write-Host "  All JS chunks:" -ForegroundColor White
$assets | Sort-Object Length -Descending | ForEach-Object {
    $kb = [math]::Round($_.Length / 1KB, 1)
    Write-Host "    $($_.Name): $kb KB"
}

Write-Host ""
Write-Host "[4/4] Starting preview server..." -ForegroundColor Cyan
Write-Host "  Open http://localhost:4173 in your browser" -ForegroundColor White
Write-Host "  Press F12, go to the Network tab, then refresh the page" -ForegroundColor White
Write-Host "  You will see the real size and load time of each file" -ForegroundColor White
Write-Host "  Press Ctrl+C here in the terminal when you are done testing" -ForegroundColor Yellow
Write-Host ""

npm run preview
