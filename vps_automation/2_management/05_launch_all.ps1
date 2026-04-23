$TerminalsPath = "C:\FundedCobra\Terminals"
$slots = Get-ChildItem -Path $TerminalsPath -Filter "Slot_*"
foreach ($slot in $slots) {
    if (Test-Path "$($slot.FullName)\terminal64.exe") {
        Write-Host "Launching $($slot.Name)..."
        Start-Process -FilePath "$($slot.FullName)\terminal64.exe" -ArgumentList "/portable"
        Start-Sleep -Seconds 2
    }
}
