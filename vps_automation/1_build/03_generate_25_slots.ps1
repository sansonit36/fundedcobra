# Clones the Template folder into 25 Slots
$TemplatePath = "C:\FundedCobra\Terminals\Template"
$TerminalsPath = "C:\FundedCobra\Terminals"

for ($i=1; $i -le 25; $i++) {
    $SlotName = "Slot_$( $i.ToString('00') )"
    $DestPath = Join-Path $TerminalsPath $SlotName
    if (Test-Path $TemplatePath) {
        Write-Host "Creating $SlotName..."
        Copy-Item -Path $TemplatePath -Destination $DestPath -Recurse -Force
        
        # Create Desktop Shortcut
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\$SlotName.lnk")
        $Shortcut.TargetPath = "$DestPath\terminal64.exe"
        $Shortcut.Arguments = "/portable"
        $Shortcut.Save()
    }
}
