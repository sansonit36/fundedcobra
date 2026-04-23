# --- FundedCobra Infrastructure Builder ---

$root = "C:\FundedCobra"
$paths = @(
    "$root\Terminals",
    "$root\Automation",
    "$root\Templates",
    "$root\Inbox",
    "$root\Logs"
)

Write-Host "--- 🏗️ Initializing FundedCobra Factory ---" -ForegroundColor Cyan

# 1. Create Directories
foreach ($p in $paths) {
    if (!(Test-Path $p)) {
        New-Item -ItemType Directory -Path $p -Force | Out-Null
        Write-Host "✅ Created folder: $p"
    }
}

# 2. Download MT5 Installer
$mt5Url = "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe"
$installer = "$root\Automation\mt5setup.exe"
if (!(Test-Path $installer)) {
    Write-Host "📥 Downloading MT5 Installer..."
    Invoke-WebRequest -Uri $mt5Url -OutFile $installer
}

# 3. Create Slots (01 to 25)
Write-Host "🔨 Generating 25 Portable Slots..."
$mt5Source = "C:\Program Files\MetaTrader 5\terminal64.exe" # Final installed location
if (!(Test-Path $mt5Source)) {
    Write-Host "⚠️ WARNING: MT5 is not installed in Program Files! Please install it once manually then run this script again to clone slots." -ForegroundColor Yellow
} else {
    for ($i=1; $i -le 25; $i++) {
        $slotName = "Slot_" + $i.ToString("00")
        $slotPath = "$root\Terminals\$slotName"
        if (!(Test-Path $slotPath)) {
            New-Item -ItemType Directory -Path $slotPath -Force | Out-Null
            Copy-Item -Path (Split-Path $mt5Source) -Destination $slotPath -Recurse -Force
            Write-Host "✅ Built $slotName"
        }
    }
}

# 4. Install Python Dependencies
Write-Host "📦 Installing Python Automation Libraries..."
& "C:\Program Files\Python312\python.exe" -m pip install psutil pywin32 --quiet

Write-Host "`n🎉 Infrastructure Ready! Please install MT5 if you haven't already." -ForegroundColor Green
