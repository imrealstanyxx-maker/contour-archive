# Инструкция по развёртыванию на GitHub Pages

## Шаг 1: Установка Git

Если Git не установлен, скачайте и установите с [git-scm.com](https://git-scm.com/download/win)

## Шаг 2: Создание репозитория на GitHub

1. Зайдите на [github.com](https://github.com)
2. Нажмите "+" → "New repository"
3. Название репозитория: `contour-archive` (или другое, но URL будет `contour-archive.github.io`)
4. Выберите "Public"
5. **НЕ** добавляйте README, .gitignore или лицензию (они уже есть)
6. Нажмите "Create repository"

## Шаг 3: Инициализация и загрузка

Откройте PowerShell или Git Bash в папке проекта и выполните:

```bash
# Инициализация git
git init

# Добавление всех файлов
git add .

# Первый коммит
git commit -m "Initial commit: КОНТУР архив"

# Добавление удалённого репозитория (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/contour-archive.git

# Переименование ветки в main (если нужно)
git branch -M main

# Загрузка на GitHub
git push -u origin main
```

## Шаг 4: Настройка GitHub Pages

1. Зайдите в репозиторий на GitHub
2. Settings → Pages
3. Source: выберите "GitHub Actions"
4. Сохраните

## Шаг 5: Автоматический деплой

После настройки GitHub Actions, каждый раз когда вы делаете `git push`, сайт автоматически обновится.

### Быстрый деплой после изменений:

```bash
git add .
git commit -m "Описание изменений"
git push
```

## URL сайта

После настройки сайт будет доступен по адресу:
- `https://YOUR_USERNAME.github.io/contour-archive/`

Или если репозиторий называется `contour-archive`:
- `https://contour-archive.github.io/`

## Рекомендуемое название репозитория

Для максимального погружения рекомендуется назвать репозиторий:
- `contour-archive` → `contour-archive.github.io`
- `kontur-archive` → `kontur-archive.github.io`
- `ktn-archive` → `ktn-archive.github.io`

