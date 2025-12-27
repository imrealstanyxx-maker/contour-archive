# ✅ Активация GitHub Pages (пошагово)

## Проблема
Ошибка: "Failed to create deployment (status: 404)" означает, что GitHub Pages не активирован.

## Решение (обязательно выполнить)

### Шаг 1: Временная активация через ветку
1. Откройте: https://github.com/imrealstanyxx-maker/contour-archive/settings/pages
2. В разделе **"Source"** измените с "GitHub Actions" на **"Deploy from a branch"**
3. Ветка: выберите **"main"**
4. Папка: выберите **"/ (root)"**
5. Нажмите **"Save"** (Сохранить)

### Шаг 2: Подождите активации
- Подождите 1-2 минуты
- GitHub создаст необходимые ресурсы для Pages
- Можете проверить: https://imrealstanyxx-maker.github.io/contour-archive/ (может показать 404, это нормально)

### Шаг 3: Переключите обратно на GitHub Actions
1. Вернитесь в: https://github.com/imrealstanyxx-maker/contour-archive/settings/pages
2. В разделе **"Source"** измените обратно на **"GitHub Actions"**
3. Нажмите **"Save"**

### Шаг 4: Проверьте деплой
1. Откройте: https://github.com/imrealstanyxx-maker/contour-archive/actions
2. Должен запуститься новый workflow автоматически
3. Или запустите вручную: `.\update-github.ps1`

## Почему это нужно?
GitHub Pages нужно сначала "разбудить" через старый способ (ветка), чтобы создать внутренние ресурсы. После этого GitHub Actions сможет работать.

---

**После выполнения этих шагов деплой должен заработать!**

