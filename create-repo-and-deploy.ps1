# Полностью автоматический деплой КОНТУР на GitHub
# Создаёт репозиторий и загружает код

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "=== Автоматический деплой КОНТУР на GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Проверка git
$gitCheck = git --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Git найден" -ForegroundColor Green
} else {
    Write-Host "✗ Git не найден" -ForegroundColor Red
    exit 1
}

# Проверка существующего remote
$remote = git remote get-url origin 2>$null

if ($remote) {
    Write-Host "✓ Remote уже настроен: $remote" -ForegroundColor Green
    Write-Host ""
    Write-Host "Загрузка на GitHub..." -ForegroundColor Cyan
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Успешно загружено!" -ForegroundColor Green
        if ($remote -match 'github\.com[:/]([^/]+)/([^/\.]+)') {
            $username = $matches[1]
            $repo = $matches[2] -replace '\.git$', ''
            Write-Host ""
            Write-Host "Сайт будет доступен:" -ForegroundColor Yellow
            Write-Host "  https://$username.github.io/$repo/" -ForegroundColor Cyan
            Write-Host "  или https://$repo.github.io" -ForegroundColor Cyan
        }
        exit 0
    } else {
        Write-Host "Ошибка при загрузке" -ForegroundColor Red
        exit 1
    }
}

# Если remote нет, нужно создать репозиторий
Write-Host "Для загрузки на GitHub нужно создать репозиторий." -ForegroundColor Yellow
Write-Host ""
Write-Host "Быстрый способ:" -ForegroundColor Cyan
Write-Host "1. Откройте GitHub Desktop" -ForegroundColor White
Write-Host "2. File → Add Local Repository" -ForegroundColor White
Write-Host "3. Выберите эту папку: $PWD" -ForegroundColor White
Write-Host "4. Нажмите 'Publish repository' (опубликовать репозиторий)" -ForegroundColor White
Write-Host "5. Название: contour-archive" -ForegroundColor White
Write-Host "6. Public репозиторий" -ForegroundColor White
Write-Host ""
Write-Host "Или создайте репозиторий вручную на https://github.com/new" -ForegroundColor Yellow
Write-Host "и запустите: .\setup-github.ps1" -ForegroundColor Yellow
Write-Host ""

$useDesktop = Read-Host "Использовать GitHub Desktop? (y/n)"
if ($useDesktop -eq "y" -or $useDesktop -eq "Y") {
    # Пытаемся открыть GitHub Desktop
    $desktopPaths = @(
        "$env:LOCALAPPDATA\GitHubDesktop\GitHubDesktop.exe",
        "$env:ProgramFiles\GitHub Desktop\GitHubDesktop.exe",
        "$env:ProgramFiles(x86)\GitHub Desktop\GitHubDesktop.exe"
    )
    
    $desktopFound = $false
    foreach ($path in $desktopPaths) {
        if (Test-Path $path) {
            Write-Host "Открываю GitHub Desktop..." -ForegroundColor Cyan
            Start-Process $path
            $desktopFound = $true
            break
        }
    }
    
    if (-not $desktopFound) {
        Write-Host "GitHub Desktop не найден в стандартных местах" -ForegroundColor Yellow
        Write-Host "Откройте GitHub Desktop вручную" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "После публикации репозитория в GitHub Desktop:" -ForegroundColor Yellow
    Write-Host "1. Зайдите в репозиторий на GitHub.com" -ForegroundColor White
    Write-Host "2. Settings → Pages" -ForegroundColor White
    Write-Host "3. Source: GitHub Actions" -ForegroundColor White
    Write-Host "4. Сохраните" -ForegroundColor White
    Write-Host ""
    Write-Host "Сайт будет доступен через 1-2 минуты!" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Создайте репозиторий на https://github.com/new" -ForegroundColor Yellow
    Write-Host "Название: contour-archive" -ForegroundColor White
    Write-Host "Затем запустите: .\setup-github.ps1" -ForegroundColor Yellow
}

