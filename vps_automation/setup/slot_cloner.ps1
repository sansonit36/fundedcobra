### --- FundedCobra Slot Generator --- ###
# This script clones the Template MT5 and creates Portable Mode instances.

$TemplatePath = "C:\FundedCobra\Terminals\Template"
$TerminalsPath = "C:\FundedCobra\Terminals"

# 1. Create 25 Test Slots
for ($i=1; $i -le 25; $i++) {
    $SlotName = "Slot_$( $i.ToString('00') )"
    $DestPath = Join-Path $TerminalsPath $SlotName
    
    if (Test-Path $TemplatePath) {
        Write-Host "Creating $SlotName..." -ForegroundColor Cyan
        Copy-Item -Path $TemplatePath -Destination $DestPath -Recurse -Force
        
        # Create Desktop Shortcut
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\$SlotName.lnk")
        $Shortcut.TargetPath = "$DestPath\terminal64.exe"
        $Shortcut.Arguments = "/portable"
        $Shortcut.Save()
    } else {
        Write-Error "Template folder not found! Install MT5 to C:\FundedCobra\Terminals\Template first."
    }
}
Write-Host "Success! Check your desktop for Slot_01 to Slot_05." -ForegroundColor Green
