Write-Host "--- 🔨 STEP 2: CLONING SLOTS ---" -ForegroundColor Cyan

$source = "C:\Program Files\MetaTrader 5\terminal64.exe"
$root = "C:\FundedCobra"

if (!(Test-Path $source)) { 
    Write-Host "❌ ERROR: MT5 not found in C:\Program Files\MetaTrader 5!" -ForegroundColor Red
    Write-Host "Please run the installer from Step 1 first." -ForegroundColor Yellow
    return
}

Write-Host "Generating 25 Slots..."
for ($i=1; $i -le 25; $i++) {
    $slotName = "Slot_" + $i.ToString("00")
    $slotPath = "$root\Terminals\$slotName"
    
    if (!(Test-Path $slotPath)) {
        New-Item -ItemType Directory -Path $slotPath -Force | Out-Null
        Copy-Item -Path (Split-Path $source) -Destination $slotPath -Recurse -Force
        Write-Host "✅ Created $slotName"
    } else {
        Write-Host "ℹ️ $slotName already exists. Skipping."
    }
}

Write-Host "🎉 25 Slots built successfully!" -ForegroundColor Green
Write-Host "Proceed to Step 03." -ForegroundColor Cyan
