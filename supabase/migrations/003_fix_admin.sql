-- Автоматическое создание профиля и назначение админа
-- ЗАМЕНИТЕ 'ВАШ_EMAIL@example.com' НА ВАШ РЕАЛЬНЫЙ EMAIL!

-- Создаём профили для всех пользователей, у которых их нет
INSERT INTO profiles (id, username, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
  'user'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
);

-- Назначаем админом пользователя с указанным email
UPDATE profiles 
SET role = 'admin', username = COALESCE(username, 'marcelo')
WHERE id = (SELECT id FROM auth.users WHERE email = 'ВАШ_EMAIL@example.com');

-- Проверка: показываем всех админов
SELECT 
  u.email,
  p.username,
  p.role,
  p.created_at
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE p.role = 'admin';

