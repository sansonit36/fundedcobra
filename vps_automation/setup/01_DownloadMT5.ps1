Write-Host "--- 📥 STEP 1: DOWNLOADING MT5 ---" -ForegroundColor Cyan

$url = "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe"
$out = "C:\FundedCobra\mt5setup.exe"

if (!(Test-Path "C:\FundedCobra")) {
    New-Item -ItemType Directory -Path "C:\FundedCobra" -Force | Out-Null
}

Write-Host "Downloading installer..."
Invoke-WebRequest -Uri $url -OutFile $out

Write-Host "✅ MT5 Installer downloaded to C:\FundedCobra\mt5setup.exe" -ForegroundColor Green
Write-Host "👉 ACTION: Run the installer NOW and install MT5 to C:\Program Files\MetaTrader 5" -ForegroundColor Yellow
Write-Host "After the installation is complete, proceed to Step 02." -ForegroundColor Cyan
