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
    
    if (window.supabase) {
      return window.supabase;
    }
    
    // Загружаем Supabase JS SDK если ещё не загружен
    if (typeof supabase === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      document.head.appendChild(script);
      return null; // Вернёмся после загрузки
    }
    
    return window.supabase.createClient(
      window.CONTOUR_CONFIG.SUPABASE_URL,
      window.CONTOUR_CONFIG.SUPABASE_ANON_KEY
    );
  }

  // Проверка инициализации
  function getSupabase() {
    if (!supabase) {
      supabase = initSupabase();
    }
    return supabase;
  }

  // Получение текущего пользователя
  async function getCurrentUser() {
    const client = getSupabase();
    if (!client) return null;
    
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
    if (!client) return null;
    
    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
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
      
      resolve({
        username: profile.username || user.email?.split('@')[0] || 'user',
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
    const userData = await getUserData();
    return userData && userData.level === 'admin';
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

