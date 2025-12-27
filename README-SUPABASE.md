# Настройка Supabase для КОНТУР

## Шаг 1: Создание проекта Supabase

1. Зайдите на https://supabase.com
2. Создайте новый проект
3. Запомните:
   - Project URL (например: `https://xxxxx.supabase.co`)
   - Anon/Public key (из Settings → API)

## Шаг 2: Выполнение миграции

1. В Supabase Dashboard откройте SQL Editor
2. Откройте файл `supabase/migrations/001_initial_schema.sql`
3. Скопируйте весь SQL код
4. Вставьте в SQL Editor и выполните (Run)

## Шаг 3: Настройка конфигурации

1. Откройте файл `assets/config.js`
2. Замените:
   - `YOUR_SUPABASE_URL_HERE` на ваш Project URL
   - `YOUR_SUPABASE_ANON_KEY_HERE` на ваш Anon/Public key
3. Сохраните файл

## Шаг 4: Настройка первого администратора

После регистрации первого пользователя выполните в SQL Editor:

```sql
-- Замените 'user@example.com' на email вашего аккаунта
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'user@example.com'
);
```

## Шаг 5: Проверка

1. Откройте сайт
2. Зарегистрируйтесь через `register.html`
3. Войдите через `login.html`
4. Проверьте работу:
   - Профиль (`profile.html`)
   - Заявка на лицензию (`license.html`)
   - Наблюдения (`community.html`)

## Важно

- Все данные хранятся в Supabase
- RLS (Row Level Security) настроен для безопасности
- Админ может модерировать заявки и наблюдения
- Наблюдатели могут создавать отчёты

