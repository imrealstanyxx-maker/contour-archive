# Скрипт для настройки Supabase конфигурации

Write-Host "=== Настройка Supabase для КОНТУР ===" -ForegroundColor Cyan
Write-Host ""

# Проверяем существование config.js
if (-not (Test-Path "assets\config.js")) {
    Write-Host "Файл assets\config.js не найден!" -ForegroundColor Red
    exit 1
}

Write-Host "Инструкция:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Зайдите в Supabase Dashboard" -ForegroundColor White
Write-Host "2. Settings → API" -ForegroundColor White
Write-Host "3. Скопируйте Project URL и anon public key" -ForegroundColor White
Write-Host ""

$supabaseUrl = Read-Host "Введите Project URL (например: https://xxxxx.supabase.co)"
$supabaseKey = Read-Host "Введите anon public key (длинная строка, начинается с eyJ...)"

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "Ошибка: не все данные введены" -ForegroundColor Red
    exit 1
}

# Читаем текущий config.js
$configContent = Get-Content "assets\config.js" -Raw

# Заменяем значения
$configContent = $configContent -replace "SUPABASE_URL: 'YOUR_SUPABASE_URL_HERE'", "SUPABASE_URL: '$supabaseUrl'"
$configContent = $configContent -replace "SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE'", "SUPABASE_ANON_KEY: '$supabaseKey'"

# Сохраняем
Set-Content "assets\config.js" -Value $configContent -NoNewline

Write-Host ""
Write-Host "✓ Конфигурация обновлена!" -ForegroundColor Green
Write-Host ""
Write-Host "Следующие шаги:" -ForegroundColor Yellow
Write-Host "1. Убедитесь, что миграция выполнена в Supabase SQL Editor" -ForegroundColor White
Write-Host "2. Назначьте себя админом (SQL запрос в README-SUPABASE.md)" -ForegroundColor White
Write-Host "3. Проверьте работу сайта" -ForegroundColor White
Write-Host ""

