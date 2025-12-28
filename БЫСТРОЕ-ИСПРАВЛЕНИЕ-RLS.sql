-- БЫСТРОЕ ИСПРАВЛЕНИЕ РЕКУРСИИ В RLS
-- Скопируйте и выполните ВЕСЬ этот код в Supabase SQL Editor

-- 1. Создаём функцию is_admin (если ещё не создана)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- 2. Исправляем политики для profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- 3. Исправляем политики для license_applications
DROP POLICY IF EXISTS "Admins can read all applications" ON license_applications;
CREATE POLICY "Admins can read all applications"
  ON license_applications FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update applications" ON license_applications;
CREATE POLICY "Admins can update applications"
  ON license_applications FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- 4. Исправляем политики для community_reports
DROP POLICY IF EXISTS "Admins can read all reports" ON community_reports;
CREATE POLICY "Admins can read all reports"
  ON community_reports FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update reports" ON community_reports;
CREATE POLICY "Admins can update reports"
  ON community_reports FOR UPDATE
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authors and admins can read own pending/rejected" ON community_reports;
CREATE POLICY "Authors and admins can read own pending/rejected"
  ON community_reports FOR SELECT
  USING (
    auth.uid() = user_id OR
    public.is_admin(auth.uid())
  );

-- 5. Исправляем функцию создания профиля
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Создаём профили для существующих пользователей (если их нет)
INSERT INTO profiles (id, username, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
  'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

