// Интеграция с Supabase для КОНТУР
// Заменяет старую систему auth.js для работы с реальным бэкендом

(() => {
  // Инициализация Supabase клиента
  let supabase = null;
  
  function initSupabase() {
    if (!window.CONTOUR_CONFIG || !window.CONTOUR_CONFIG.SUPABASE_URL || !window.CONTOUR_CONFIG.SUPABASE_ANON_KEY) {
      console.warn('Supabase config not found. Please configure assets/config.js');
      return null;
    }
    
    if (typeof window.supabase === 'undefined') {
      return null; // SDK ещё не загружен
    }
    
    try {
      return window.supabase.createClient(
        window.CONTOUR_CONFIG.SUPABASE_URL,
        window.CONTOUR_CONFIG.SUPABASE_ANON_KEY
      );
    } catch (error) {
      console.error('Error initializing Supabase:', error);
      return null;
    }
  }

  // Проверка инициализации
  function getSupabase() {
    if (typeof window.supabase === 'undefined') {
      return null;
    }
    
    if (!supabase) {
      if (!window.CONTOUR_CONFIG || window.CONTOUR_CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
        return null;
      }
      
      try {
        supabase = window.supabase.createClient(
          window.CONTOUR_CONFIG.SUPABASE_URL,
          window.CONTOUR_CONFIG.SUPABASE_ANON_KEY
        );
      } catch (error) {
        console.error('Error creating Supabase client:', error);
        return null;
      }
    }
    return supabase;
  }

  // Получение текущего пользователя
  async function getCurrentUser() {
    // Ждём загрузки Supabase SDK
    if (typeof window.supabase === 'undefined') {
      return null;
    }
    
    const client = getSupabase();
    if (!client || !client.auth) {
      return null;
    }
    
    try {
      const { data: { user }, error } = await client.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // Получение профиля пользователя
  async function getUserProfile(userId) {
    const client = getSupabase();
    if (!client) {
      console.warn('Supabase client not available for getUserProfile');
      return null;
    }
    
    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        // RLS может блокировать - это нормально для неавторизованных
        if (error.code === 'PGRST116') {
          // No rows - профиль не найден
          console.warn('Profile not found for user:', userId);
          return null;
        }
        if (error.code === '42501' || error.code === 'PGRST301') {
          // Permission denied - RLS блокирует
          console.warn('RLS blocked profile access for user:', userId);
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }

  // Вход через email/password
  async function signIn(email, password) {
    const client = getSupabase();
    if (!client) {
      throw new Error('Supabase not configured');
    }
    
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Создаём профиль если его нет
      const profile = await getUserProfile(data.user.id);
      if (!profile) {
        // Профиль должен создаться автоматически через триггер
        // Но на всякий случай проверим через секунду
        setTimeout(async () => {
          await getUserProfile(data.user.id);
        }, 1000);
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Регистрация
  async function signUp(email, password, username) {
    const client = getSupabase();
    if (!client) {
      throw new Error('Supabase not configured');
    }
    
    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0]
          }
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Выход
  async function signOut() {
    const client = getSupabase();
    if (!client) return;
    
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  // Проверка авторизации
  async function isAuthenticated() {
    const user = await getCurrentUser();
    return !!user;
  }

  // Получение данных пользователя (для совместимости со старым кодом)
  async function getUserData() {
    return new Promise(async (resolve) => {
      const user = await getCurrentUser();
      if (!user) {
        resolve(null);
        return;
      }
      
      const profile = await getUserProfile(user.id);
      if (!profile) {
        resolve({
          username: user.email?.split('@')[0] || 'user',
          level: 'user',
          email: user.email,
          verified: user.email_confirmed_at ? true : false,
          registered: user.created_at
        });
        return;
      }
      
      const username = profile.username || user.user_metadata?.username || user.email?.split('@')[0] || 'user';
      
      resolve({
        username: username,
        level: profile.role || 'user',
        email: user.email,
        verified: user.email_confirmed_at ? true : false,
        registered: profile.created_at || user.created_at,
        id: user.id
      });
    });
  }

  // Проверка внутреннего доступа (admin)
  async function hasInternalAccess() {
    try {
      const client = getSupabase();
      if (!client) {
        console.warn('Supabase client not available');
        return false;
      }

      const user = await getCurrentUser();
      if (!user) {
        console.warn('No user found for internal access check');
        return false;
      }

      // Проверяем роль напрямую из профиля (более надёжно)
      const profile = await getUserProfile(user.id);
      if (!profile) {
        console.warn('Profile not found for user:', user.id);
        return false;
      }

      const isAdmin = profile.role === 'admin';
      if (isAdmin) {
        console.log('Internal access granted: user is admin', { userId: user.id, role: profile.role });
      } else {
        console.log('Internal access denied: user is not admin', { userId: user.id, role: profile.role });
      }

      return isAdmin;
    } catch (error) {
      console.error('Error checking internal access:', error);
      return false;
    }
  }

  // Проверка лицензии наблюдателя
  async function isObserver() {
    const userData = await getUserData();
    return userData && (userData.level === 'observer' || userData.level === 'admin');
  }

  // Экспорт API
  window.contourSupabase = {
    getSupabase,
    getCurrentUser,
    getUserProfile,
    signIn,
    signUp,
    signOut,
    isAuthenticated,
    getUserData,
    hasInternalAccess,
    isObserver
  };

  // Слушатель изменений состояния авторизации
  // Инициализируем после загрузки страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (typeof window.supabase !== 'undefined') {
          const client = getSupabase();
          if (client && client.auth) {
            try {
              client.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT') {
                  localStorage.removeItem('contour_session');
                }
              });
            } catch (e) {
              console.warn('Could not set up auth state listener:', e);
            }
          }
        }
      }, 1000);
    });
  } else {
    setTimeout(() => {
      if (typeof window.supabase !== 'undefined') {
        const client = getSupabase();
        if (client && client.auth) {
          try {
            client.auth.onAuthStateChange((event, session) => {
              if (event === 'SIGNED_OUT') {
                localStorage.removeItem('contour_session');
              }
            });
          } catch (e) {
            console.warn('Could not set up auth state listener:', e);
          }
        }
      }
    }, 1000);
  }
})();

