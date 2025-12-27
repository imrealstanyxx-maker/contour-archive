# Скрипт для быстрого деплоя на GitHub Pages
# Используйте auto-deploy.ps1 для полностью автоматического деплоя

Write-Host "=== Деплой КОНТУР на GitHub Pages ===" -ForegroundColor Cyan
Write-Host "Для автоматического деплоя используйте: .\auto-deploy.ps1" -ForegroundColor Yellow
Write-Host ""

# Проверка git
try {
    $gitVersion = git --version
    Write-Host "Git найден: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "ОШИБКА: Git не установлен!" -ForegroundColor Red
    Write-Host "Установите Git с https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Проверка инициализации
if (-not (Test-Path .git)) {
    Write-Host "Инициализация git репозитория..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# Добавление файлов
Write-Host "`nДобавление файлов..." -ForegroundColor Cyan
git add .

# Проверка изменений
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "Нет изменений для коммита." -ForegroundColor Yellow
    exit 0
}

# Коммит
$commitMessage = Read-Host "`nВведите сообщение коммита (или нажмите Enter для автоматического)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

Write-Host "Создание коммита: $commitMessage" -ForegroundColor Cyan
git commit -m $commitMessage

# Проверка remote
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "`nУдалённый репозиторий не настроен!" -ForegroundColor Yellow
    $repoUrl = Read-Host "Введите URL репозитория (например: https://github.com/USERNAME/contour-archive.git)"
    if ($repoUrl) {
        git remote add origin $repoUrl
    } else {
        Write-Host "Пропущено. Настройте remote вручную: git remote add origin <URL>" -ForegroundColor Yellow
        exit 0
    }
}

# Push
Write-Host "`nЗагрузка на GitHub..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Успешно загружено на GitHub!" -ForegroundColor Green
    Write-Host "Сайт обновится через 1-2 минуты на GitHub Pages." -ForegroundColor Cyan
    
    # Пытаемся определить URL сайта
    if ($remote) {
        if ($remote -match 'github\.com[:/]([^/]+)/([^/\.]+)') {
            $username = $matches[1]
            $repo = $matches[2]
            if ($repo -match '\.git$') { $repo = $repo -replace '\.git$', '' }
            Write-Host "`nСайт будет доступен по адресу:" -ForegroundColor Yellow
            Write-Host "https://$username.github.io/$repo/" -ForegroundColor Cyan
            Write-Host "или" -ForegroundColor Gray
            Write-Host "https://$repo.github.io" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "`nОшибка при загрузке. Проверьте настройки remote." -ForegroundColor Red
    Write-Host "Убедитесь, что:" -ForegroundColor Yellow
    Write-Host "  1. Репозиторий создан на GitHub" -ForegroundColor Gray
    Write-Host "  2. У вас есть права на запись" -ForegroundColor Gray
    Write-Host "  3. Используете правильный URL" -ForegroundColor Gray
}

