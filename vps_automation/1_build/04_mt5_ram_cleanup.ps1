# Sets all slots to "Lean" mode (No news/sounds/max bars)
$TerminalsPath = "C:\FundedCobra\Terminals"
Get-ChildItem -Path $TerminalsPath -Filter "Slot_*" | ForEach-Object {
    $ConfigPath = Join-path $_.FullName "config"
    if (!(Test-Path $ConfigPath)) { New-Item -ItemType Directory -Path $ConfigPath -Force }
    $CommonIni = Join-Path $ConfigPath "common.ini"
    "[Common]`r`nNewsEnable=0`r`nSoundEnable=0`r`nChartsMaxBars=5000`r`n" | Out-File $CommonIni -Encoding ascii
}
Write-Host "All slots optimized for RAM."
