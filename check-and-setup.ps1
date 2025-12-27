# Check if repo is published and setup GitHub Pages
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "Checking repository status..." -ForegroundColor Cyan
Write-Host ""

$remote = git remote get-url origin 2>$null

if ($remote) {
    Write-Host "Repository is published!" -ForegroundColor Green
    Write-Host "Remote: $remote" -ForegroundColor Cyan
    Write-Host ""
    
    # Extract username and repo from remote
    if ($remote -match 'github\.com[:/]([^/]+)/([^/\.]+)') {
        $username = $matches[1]
        $repo = $matches[2] -replace '\.git$', ''
        
        Write-Host "Repository: $username/$repo" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Open: https://github.com/$username/$repo/settings/pages" -ForegroundColor White
        Write-Host "2. Source: GitHub Actions" -ForegroundColor White
        Write-Host "3. Click Save" -ForegroundColor White
        Write-Host ""
        Write-Host "Site will be available at:" -ForegroundColor Green
        Write-Host "  https://$username.github.io/$repo/" -ForegroundColor Cyan
        Write-Host "  or https://$repo.github.io" -ForegroundColor Cyan
        Write-Host ""
        
        # Try to open the settings page
        Start-Process "https://github.com/$username/$repo/settings/pages"
    }
    
    Write-Host "Pushing latest changes..." -ForegroundColor Cyan
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Changes pushed successfully!" -ForegroundColor Green
    }
} else {
    Write-Host "Repository not published yet." -ForegroundColor Yellow
    Write-Host "Please publish it in GitHub Desktop first." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run this script again after publishing." -ForegroundColor Cyan
}

