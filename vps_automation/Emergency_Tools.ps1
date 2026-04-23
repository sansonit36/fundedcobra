# --- FundedCobra Management Suite ---

function Kill-AllTerminals {
    Write-Host "🛑 EMERGENCY STOP: Closing all MT5 instances..." -ForegroundColor Red
    Get-Process terminal64 -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ All terminals terminated."
}

function Show-Health {
    Write-Host "--- 📊 VPS Health Report ---" -ForegroundColor Cyan
    $ram = Get-Counter '\Memory\Available MBytes'
    $slots = Get-Process terminal64 -ErrorAction SilentlyContinue | Measure-Object
    
    Write-Host "Available RAM: $([math]::Round($ram.CounterSamples.CookedValue)) MB"
    Write-Host "Active Slots:  $($slots.Count)"
    
    if ($ram.CounterSamples.CookedValue -lt 500) {
        Write-Host "⚠️ WARNING: Low RAM! Consider closing some slots." -ForegroundColor Yellow
    }
}

function Update-MasterBot {
    param([string]$botPath)
    Write-Host "🔄 Bulk Update: Pushing $botPath to all 25 slots..." -ForegroundColor Green
    for ($i=1; $i -le 25; $i++) {
        $dest = "C:\FundedCobra\Terminals\Slot_" + $i.ToString("00") + "\MQL5\Experts"
        if (Test-Path $dest) {
            Copy-Item -Path $botPath -Destination $dest -Force
            Write-Host "✅ Updated Slot_$i"
        }
    }
}

# Menu System
Write-Host "`n1. Kill All Terminals"
Write-Host "2. Show VPS Health"
Write-Host "3. Update Bot (Requires path)"
Write-Host "Q. Quit"

$choice = Read-Host "`nSelect an option"

if ($choice -eq "1") { Kill-AllTerminals }
if ($choice -eq "2") { Show-Health }
if ($choice -eq "3") { 
    $p = Read-Host "Enter path to the new MTBot.ex5"
    Update-MasterBot -botPath $p
}
