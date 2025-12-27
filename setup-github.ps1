# Автоматическая настройка GitHub репозитория для КОНТУР

Write-Host "=== Настройка GitHub для КОНТУР ===" -ForegroundColor Cyan
Write-Host ""

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Проверка существующего remote
$remote = git remote get-url origin 2>$null

if ($remote) {
    Write-Host "✓ Remote уже настроен: $remote" -ForegroundColor Green
    Write-Host ""
    $use = Read-Host "Использовать существующий remote? (y/n)"
    if ($use -eq "y" -or $use -eq "Y") {
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
            }
        }
        exit 0
    }
}

Write-Host "Создайте репозиторий на GitHub:" -ForegroundColor Yellow
Write-Host "1. Откройте: https://github.com/new" -ForegroundColor White
Write-Host "2. Название: contour-archive" -ForegroundColor White
Write-Host "3. Public репозиторий" -ForegroundColor White
Write-Host "4. НЕ добавляйте README, .gitignore, license" -ForegroundColor White
Write-Host "5. Нажмите 'Create repository'" -ForegroundColor White
Write-Host ""

$username = Read-Host "Введите ваш GitHub username"
if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "Username обязателен" -ForegroundColor Red
    exit 1
}

$repoName = Read-Host "Название репозитория (Enter для 'contour-archive')"
if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "contour-archive"
}

$repoUrl = "https://github.com/$username/$repoName.git"

Write-Host ""
Write-Host "Добавление remote: $repoUrl" -ForegroundColor Cyan
git remote add origin $repoUrl

if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка. Возможно remote уже существует." -ForegroundColor Yellow
    Write-Host "Попытка обновить URL..." -ForegroundColor Cyan
    git remote set-url origin $repoUrl
}

Write-Host ""
Write-Host "Загрузка на GitHub..." -ForegroundColor Cyan
Write-Host "Введите ваш GitHub username и пароль/токен когда попросит" -ForegroundColor Yellow
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== ✓ УСПЕШНО ЗАГРУЖЕНО ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Сайт будет доступен по адресу:" -ForegroundColor Yellow
    Write-Host "  https://$username.github.io/$repoName/" -ForegroundColor Cyan
    Write-Host "  или" -ForegroundColor Gray
    Write-Host "  https://$repoName.github.io" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Настройте GitHub Pages:" -ForegroundColor Yellow
    Write-Host "1. Зайдите в репозиторий: https://github.com/$username/$repoName" -ForegroundColor White
    Write-Host "2. Settings → Pages" -ForegroundColor White
    Write-Host "3. Source: GitHub Actions" -ForegroundColor White
    Write-Host "4. Сохраните" -ForegroundColor White
    Write-Host ""
    Write-Host "Сайт обновится через 1-2 минуты!" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Ошибка при загрузке" -ForegroundColor Red
    Write-Host ""
    Write-Host "Возможные решения:" -ForegroundColor Yellow
    Write-Host "1. Убедитесь, что репозиторий создан на GitHub" -ForegroundColor White
    Write-Host "2. Используйте Personal Access Token вместо пароля" -ForegroundColor White
    Write-Host "   (GitHub → Settings → Developer settings → Personal access tokens)" -ForegroundColor Gray
    Write-Host "3. Проверьте правильность username и названия репозитория" -ForegroundColor White
}

