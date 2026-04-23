$url = "https://download.mql5.com/cdn/web/exness.technologies.ltd/mt5/exness5setup.exe"
Invoke-WebRequest -Uri $url -OutFile "$env:USERPROFILE\Desktop\exness5setup.exe"
Write-Host "Success! Installer is on your desktop."
