### --- 01_vps_optimizer.ps1 ---
# Set Power to High Performance
powercfg /setactive SCHEME_MIN

# Disable Visual Effects
$regPath = "HKCU:\Control Panel\Desktop"
Set-ItemProperty -Path $regPath -Name "UserPreferencesMask" -Value ([byte[]](0x90,0x12,0x03,0x80,0x10,0x00,0x00,0x00))
Set-ItemProperty -Path $regPath -Name "DragFullWindows" -Value 0

# Network Tweaks
$interfaces = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\*"
foreach ($interface in $interfaces) {
    Set-ItemProperty -Path $interface.PSPath -Name "TcpNoDelay" -Value 1 -ErrorAction SilentlyContinue
}

# Restart Explorer to Apply
Stop-Process -Name explorer -Force
