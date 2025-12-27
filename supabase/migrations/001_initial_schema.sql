-- Миграция для системы наблюдений КОНТУР
-- Выполнить в SQL Editor Supabase

-- 1. Таблица профилей
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'observer', 'admin')),
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Таблица заявок на лицензию
CREATE TABLE IF NOT EXISTS license_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  score int,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  admin_note text,
  created_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone
);

-- 3. Таблица наблюдений сообщества
CREATE TABLE IF NOT EXISTS community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dossier_id text,
  title text NOT NULL,
  body text NOT NULL,
  evidence text,
  location text,
  observed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'unofficial_approved', 'final_approved', 'rejected')),
  admin_note text,
  created_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_license_applications_user_id ON license_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_license_applications_status ON license_applications(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_user_id ON community_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_dossier_id ON community_reports(dossier_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

-- Политики для profiles (с удалением старых для идемпотентности)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Политики для license_applications
DROP POLICY IF EXISTS "Users can create own applications" ON license_applications;
CREATE POLICY "Users can create own applications"
  ON license_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own applications" ON license_applications;
CREATE POLICY "Users can read own applications"
  ON license_applications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all applications" ON license_applications;
CREATE POLICY "Admins can read all applications"
  ON license_applications FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update applications" ON license_applications;
CREATE POLICY "Admins can update applications"
  ON license_applications FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Политики для community_reports
DROP POLICY IF EXISTS "Observers can create reports" ON community_reports;
CREATE POLICY "Observers can create reports"
  ON community_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('observer', 'admin')
    )
  );

-- Чтение: final_approved + unofficial_approved - всем
DROP POLICY IF EXISTS "Everyone can read approved reports" ON community_reports;
CREATE POLICY "Everyone can read approved reports"
  ON community_reports FOR SELECT
  USING (status IN ('final_approved', 'unofficial_approved'));

-- Чтение: pending/rejected - только автор и админы
DROP POLICY IF EXISTS "Authors and admins can read own pending/rejected" ON community_reports;
CREATE POLICY "Authors and admins can read own pending/rejected"
  ON community_reports FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Обновление: только админы
DROP POLICY IF EXISTS "Admins can update reports" ON community_reports;
CREATE POLICY "Admins can update reports"
  ON community_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Функция для автоматического создания профиля
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для создания профиля при регистрации
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

