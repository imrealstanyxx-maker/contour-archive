# Automatic update script - runs after every change
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "=== Updating CONTOUR on GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repo
if (-not (Test-Path ".git")) {
    Write-Host "Not a git repository!" -ForegroundColor Red
    exit 1
}

# Check remote
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "Remote not configured!" -ForegroundColor Red
    Write-Host "Run: git remote add origin https://github.com/imrealstanyxx-maker/contour-archive.git" -ForegroundColor Yellow
    exit 1
}

Write-Host "Repository: $remote" -ForegroundColor Green
Write-Host ""

# Add all changes
Write-Host "Adding changes..." -ForegroundColor Cyan
git add -A

# Check if there are changes
$status = git status --short
if (-not $status) {
    Write-Host "No changes to commit" -ForegroundColor Yellow
} else {
    # Create commit with timestamp
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $commitMsg = "Update: $timestamp"
    
    Write-Host "Committing changes..." -ForegroundColor Cyan
    git commit -m $commitMsg
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Changes committed!" -ForegroundColor Green
        
        # Push to GitHub
        Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
        git push origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "=== Success! ===" -ForegroundColor Green
            Write-Host "Site will be updated in 1-2 minutes at:" -ForegroundColor Cyan
            Write-Host "  https://imrealstanyxx-maker.github.io/contour-archive/" -ForegroundColor Yellow
            Write-Host "  or https://contour-archive.github.io" -ForegroundColor Yellow
            Write-Host ""
        } else {
            Write-Host "Error pushing to GitHub" -ForegroundColor Red
        }
    } else {
        Write-Host "Error committing changes" -ForegroundColor Red
    }
}

