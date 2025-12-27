-- Скрипт для назначения админа
-- ЗАМЕНИТЕ EMAIL НА ВАШ РЕАЛЬНЫЙ EMAIL!

-- Вариант 1: Если пользователь уже есть, но профиля нет
INSERT INTO profiles (id, username, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
  'admin'
FROM auth.users
WHERE email = 'ВАШ_EMAIL@example.com'  -- ЗАМЕНИТЕ НА ВАШ EMAIL!
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
)
ON CONFLICT (id) DO UPDATE SET role = 'admin', username = COALESCE(profiles.username, EXCLUDED.username);

-- Вариант 2: Если профиль уже есть, просто обновляем роль
UPDATE profiles 
SET role = 'admin', username = COALESCE(username, split_part((SELECT email FROM auth.users WHERE id = profiles.id), '@', 1))
WHERE id IN (SELECT id FROM auth.users WHERE email = 'ВАШ_EMAIL@example.com');  -- ЗАМЕНИТЕ НА ВАШ EMAIL!

-- Проверка: посмотреть всех админов
SELECT 
  p.id,
  p.username,
  p.role,
  u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin';

