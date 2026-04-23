Write-Host "--- 🧪 STEP 3: ENVIRONMENT SETUP ---" -ForegroundColor Cyan

$root = "C:\FundedCobra"
$folders = @("Inbox", "Logs", "Templates")

foreach ($f in $folders) {
    if (!(Test-Path "$root\$f")) {
        New-Item -ItemType Directory -Path "$root\$f" -Force | Out-Null
        Write-Host "✅ Created folder: $f"
    }
}

Write-Host "📦 Installing Python Automation Libraries..."
& "C:\Program Files\Python312\python.exe" -m pip install psutil pywin32 --quiet

Write-Host "`n🎉 Setup Complete! Your professional infrastructure is ready." -ForegroundColor Green
Write-Host "You can now run the FundedCobra_Agent.py to begin automation." -ForegroundColor Cyan
