# Automatic publish to GitHub
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "=== Publishing CONTOUR to GitHub ===" -ForegroundColor Cyan
Write-Host ""

$remote = git remote get-url origin 2>$null

if ($remote) {
    Write-Host "Remote configured: $remote" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pushing changes..." -ForegroundColor Cyan
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully pushed!" -ForegroundColor Green
        exit 0
    }
}

$desktopPath = "$env:LOCALAPPDATA\GitHubDesktop\GitHubDesktop.exe"

if (Test-Path $desktopPath) {
    Write-Host "Opening GitHub Desktop..." -ForegroundColor Cyan
    Start-Process $desktopPath
    
    Write-Host ""
    Write-Host "=== Instructions ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "In GitHub Desktop:" -ForegroundColor Cyan
    Write-Host "1. File -> Add Local Repository" -ForegroundColor White
    Write-Host "2. Select folder: $PWD" -ForegroundColor White
    Write-Host "3. Click 'Add'" -ForegroundColor White
    Write-Host "4. Click 'Publish repository'" -ForegroundColor White
    Write-Host "5. Name: contour-archive" -ForegroundColor White
    Write-Host "6. Description: Archive of contour units" -ForegroundColor White
    Write-Host "7. Select 'Public'" -ForegroundColor White
    Write-Host "8. Click 'Publish repository'" -ForegroundColor White
    Write-Host ""
    Write-Host "After publishing:" -ForegroundColor Yellow
    Write-Host "1. Go to https://github.com/YOUR_USERNAME/contour-archive" -ForegroundColor White
    Write-Host "2. Settings -> Pages" -ForegroundColor White
    Write-Host "3. Source: GitHub Actions" -ForegroundColor White
    Write-Host "4. Save" -ForegroundColor White
    Write-Host ""
    Write-Host "Site will be available at:" -ForegroundColor Cyan
    Write-Host "  https://contour-archive.github.io" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "GitHub Desktop not found" -ForegroundColor Red
}
