-- Скрипт для установки роли администратора для пользователя "observer"
-- ВАЖНО: Сначала зарегистрируйте аккаунт "observer" на сайте через register.html
-- Затем выполните этот скрипт в Supabase SQL Editor

-- Вариант 1: Если вы знаете email пользователя "observer"
-- Замените 'observer@example.com' на реальный email, который использовали при регистрации
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'observer@example.com'  -- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ EMAIL
);

-- Вариант 2: Если вы знаете username (но лучше использовать email)
UPDATE public.profiles
SET role = 'admin'
WHERE username = 'observer';

-- Проверка результата
SELECT 
  p.id,
  p.username,
  p.role,
  u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.username = 'observer' OR u.email LIKE '%observer%';

-- Если пользователь еще не зарегистрирован, используйте этот скрипт после регистрации:
-- 1. Зайдите на сайт и зарегистрируйтесь с логином "observer"
-- 2. Выполните UPDATE запрос выше с вашим email
-- 3. Проверьте результат через SELECT запрос

