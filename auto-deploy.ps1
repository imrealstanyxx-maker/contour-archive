# Автоматический деплой КОНТУР на GitHub Pages
# Этот скрипт делает всё автоматически

Write-Host "=== Автоматический деплой КОНТУР ===" -ForegroundColor Cyan
Write-Host ""

# Проверка Git
$gitInstalled = $false
try {
    $null = git --version 2>$null
    $gitInstalled = $true
    Write-Host "✓ Git установлен" -ForegroundColor Green
} catch {
    Write-Host "✗ Git не установлен" -ForegroundColor Red
    Write-Host ""
    Write-Host "Установка Git необходима для деплоя." -ForegroundColor Yellow
    Write-Host "Скачайте с: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host ""
    $install = Read-Host "Открыть страницу загрузки Git? (y/n)"
    if ($install -eq "y" -or $install -eq "Y") {
        Start-Process "https://git-scm.com/download/win"
    }
    exit 1
}

# Инициализация git (если нужно)
if (-not (Test-Path .git)) {
    Write-Host "Инициализация git репозитория..." -ForegroundColor Yellow
    git init
    git branch -M main
    Write-Host "✓ Репозиторий инициализирован" -ForegroundColor Green
}

# Добавление всех файлов
Write-Host "Добавление файлов..." -ForegroundColor Cyan
git add .

# Проверка изменений
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "Нет изменений для коммита." -ForegroundColor Yellow
    
    # Проверяем, есть ли remote
    $remote = git remote get-url origin 2>$null
    if ($remote) {
        Write-Host "Проверка связи с GitHub..." -ForegroundColor Cyan
        git fetch origin 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Всё синхронизировано с GitHub" -ForegroundColor Green
        }
    }
    exit 0
}

# Коммит
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "Update КОНТУР: $timestamp"

Write-Host "Создание коммита..." -ForegroundColor Cyan
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка при создании коммита" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Коммит создан" -ForegroundColor Green

# Проверка remote
$remote = git remote get-url origin 2>$null

if (-not $remote) {
    Write-Host ""
    Write-Host "=== Настройка удалённого репозитория ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Сначала создайте репозиторий на GitHub:" -ForegroundColor Cyan
    Write-Host "1. Зайдите на https://github.com/new" -ForegroundColor White
    Write-Host "2. Название: contour-archive" -ForegroundColor White
    Write-Host "3. Public репозиторий" -ForegroundColor White
    Write-Host "4. НЕ добавляйте README" -ForegroundColor White
    Write-Host "5. Нажмите Create repository" -ForegroundColor White
    Write-Host ""
    
    $username = Read-Host "Введите ваш GitHub username"
    if ([string]::IsNullOrWhiteSpace($username)) {
        Write-Host "Username обязателен. Выход." -ForegroundColor Red
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
        Write-Host "Ошибка при добавлении remote" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Remote добавлен" -ForegroundColor Green
    $remote = $repoUrl
}

# Push
Write-Host ""
Write-Host "Загрузка на GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== ✓ УСПЕШНО ЗАГРУЖЕНО НА GITHUB ===" -ForegroundColor Green
    Write-Host ""
    
    # Определяем URL сайта
    if ($remote -match 'github\.com[:/]([^/]+)/([^/\.]+)') {
        $ghUsername = $matches[1]
        $ghRepo = $matches[2] -replace '\.git$', ''
        
        Write-Host "Сайт будет доступен по адресу:" -ForegroundColor Yellow
        Write-Host "  https://$ghUsername.github.io/$ghRepo/" -ForegroundColor Cyan
        if ($ghRepo -match '^[^\.]+$') {
            Write-Host "  или" -ForegroundColor Gray
            Write-Host "  https://$ghRepo.github.io" -ForegroundColor Cyan
        }
        Write-Host ""
    }
    
    Write-Host "Настройте GitHub Pages:" -ForegroundColor Yellow
    Write-Host "1. Зайдите в репозиторий на GitHub" -ForegroundColor White
    Write-Host "2. Settings → Pages" -ForegroundColor White
    Write-Host "3. Source: GitHub Actions" -ForegroundColor White
    Write-Host "4. Сохраните" -ForegroundColor White
    Write-Host ""
    Write-Host "Сайт обновится через 1-2 минуты после настройки Pages." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Ошибка при загрузке на GitHub" -ForegroundColor Red
    Write-Host ""
    Write-Host "Возможные причины:" -ForegroundColor Yellow
    Write-Host "1. Репозиторий не создан на GitHub" -ForegroundColor White
    Write-Host "2. Неверный URL репозитория" -ForegroundColor White
    Write-Host "3. Нет прав на запись" -ForegroundColor White
    Write-Host "4. Нужна аутентификация (используйте Personal Access Token)" -ForegroundColor White
    Write-Host ""
    Write-Host "Для настройки remote вручную:" -ForegroundColor Cyan
    Write-Host "  git remote set-url origin https://github.com/USERNAME/REPO.git" -ForegroundColor Gray
}

