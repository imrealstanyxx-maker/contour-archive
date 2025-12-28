// Страница профиля с интеграцией Supabase

(() => {
  let supabase = null;
  let currentUser = null;
  let userProfile = null;

  async function init() {
    // Проверка конфигурации
    if (!window.CONTOUR_CONFIG || window.CONTOUR_CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
      document.querySelector('.wrap').innerHTML = `
        <section class="panel">
          <div class="panel-title">Ошибка конфигурации</div>
          <div class="panel-body">
            <div class="note" style="color: #ef4444;">
              Supabase не настроен. Пожалуйста, настройте assets/config.js с вашими данными из Supabase.
            </div>
          </div>
        </section>
      `;
      return;
    }

    // Инициализация Supabase
    supabase = window.supabase.createClient(
      window.CONTOUR_CONFIG.SUPABASE_URL,
      window.CONTOUR_CONFIG.SUPABASE_ANON_KEY
    );

    // Проверка авторизации
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      window.location.href = 'login.html?return=profile.html';
      return;
    }

    currentUser = user;
    userProfile = await getUserProfile(user.id);

    if (!userProfile) {
      // Создаём профиль если его нет
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'user'
        })
        .select()
        .single();
      
      userProfile = newProfile;
    }

    renderProfile();
    setupEventHandlers();
  }

  async function getUserProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error getting profile:', error);
      return null;
    }
    return data;
  }

  function renderProfile() {
    const roleText = {
      'user': 'Пользователь',
      'observer': 'Наблюдатель',
      'admin': 'Администратор'
    };

    // Информация о пользователе
    const userInfoEl = document.getElementById("user-info");
    if (userInfoEl) {
      const username = userProfile?.username || currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'user';
      
      const infoRows = [
        ["Логин", username],
        ["Email", currentUser.email || "—"],
        ["Роль", roleText[userProfile?.role || 'user'] || 'Пользователь'],
        ["Дата регистрации", new Date(userProfile?.created_at || currentUser.created_at).toLocaleDateString("ru-RU")],
        ["Email подтверждён", currentUser.email_confirmed_at ? "✓ Да" : "✗ Нет"]
      ];

      userInfoEl.innerHTML = `
        <div class="kv">
          ${infoRows.map(([k, v]) => `
            <div class="kv-row">
              <div class="kv-k">${k}</div>
              <div class="kv-v">${v}</div>
            </div>
          `).join("")}
        </div>
      `;
    }

    // Статистика
    const statsEl = document.getElementById("user-stats");
    if (statsEl) {
      // Загружаем статистику наблюдений
      loadStats().then(stats => {
        const viewHistory = JSON.parse(localStorage.getItem("contour_view_history") || "[]");
        const favorites = JSON.parse(localStorage.getItem("contour_favorites") || "[]");
        
        const statsRows = [
          { k: "Просмотрено досье", v: stats.viewHistoryCount || 0 },
          { k: "В избранном", v: stats.favoritesCount || 0 },
          { k: "Наблюдений отправлено", v: stats.reportsCount || 0 },
          { k: "Дней в системе", v: Math.floor((new Date() - new Date(userProfile?.created_at || currentUser.created_at)) / (1000 * 60 * 60 * 24)) }
        ];

        statsEl.innerHTML = statsRows.map(s => `
          <div class="stat">
            <div class="k">${s.k}</div>
            <div class="v">${s.v}</div>
          </div>
        `).join("");
      });
    }

    // Меню действий
    const actionsSection = document.querySelector('.panel:has(#logout-btn)');
    if (actionsSection) {
      const actionsBody = actionsSection.querySelector('.panel-body');
      actionsBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <a href="community.html" class="btn-link" style="text-align: center;">
            Мои наблюдения
          </a>
          ${userProfile?.role !== 'observer' && userProfile?.role !== 'admin' ? `
            <a href="license.html" class="btn-link" style="text-align: center; background: rgba(52, 211, 153, 0.15); border-color: rgba(52, 211, 153, 0.3); color: #34d399;">
              Заявка на лицензию
            </a>
          ` : ''}
          ${userProfile?.role === 'admin' ? `
            <a href="community.html?filter=moderation" class="btn-link" style="text-align: center; background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: #ef4444;">
              Модерация
            </a>
          ` : ''}
          <button id="logout-btn" class="btn-link" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: #ef4444;">
            Выйти из системы
          </button>
        </div>
      `;
    }

    // История и избранное (из localStorage)
    renderHistoryAndFavorites();
  }

  async function loadStats() {
    try {
      const { count, error } = await supabase
        .from('community_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
      
      if (error && error.code !== 'PGRST301' && error.code !== '42501') {
        console.warn('Error loading stats:', error);
      }
      
      return {
        reportsCount: count || 0
      };
    } catch (error) {
      console.error('Error in loadStats:', error);
      return {
        reportsCount: 0
      };
    }
  }

  function renderHistoryAndFavorites() {
    const viewHistory = JSON.parse(localStorage.getItem("contour_view_history") || "[]");
    const favorites = JSON.parse(localStorage.getItem("contour_favorites") || "[]");
    const data = Array.isArray(window.CONTOUR_DATA) ? window.CONTOUR_DATA : [];

    // История просмотров
    const historyEl = document.getElementById("view-history");
    if (historyEl) {
      if (viewHistory.length === 0) {
        historyEl.innerHTML = '<div class="note">История просмотров пуста</div>';
      } else {
        historyEl.innerHTML = viewHistory.slice(-10).reverse().map(item => {
          const entry = data.find(x => x.id === item.id);
          if (!entry) return '';
          const displayId = entry.id.match(/^KE([SFM])-(\d+)$/) 
            ? `КЕ-${{S:"С",F:"Ф",M:"М"}[entry.id[2]]}/${entry.id.split("-")[1]}`
            : entry.id;
          return `
            <div class="card" style="margin-bottom: 12px;">
              <div class="title">${displayId} — ${entry.title}</div>
              <div class="small">${new Date(item.timestamp).toLocaleDateString("ru-RU")}</div>
              <a href="dossier.html?id=${encodeURIComponent(entry.id)}&access=internal" style="color: #5ac8fa; font-size: 13px; margin-top: 8px; display: inline-block;">
                Открыть →
              </a>
            </div>
          `;
        }).filter(x => x).join("");
      }
    }

    // Избранное
    const favoritesEl = document.getElementById("favorites");
    if (favoritesEl) {
      if (favorites.length === 0) {
        favoritesEl.innerHTML = '<div class="note">Избранное пусто</div>';
      } else {
        favoritesEl.innerHTML = favorites.map(favId => {
          const item = data.find(x => x.id === favId);
          if (!item) return '';
          const displayId = item.id.match(/^KE([SFM])-(\d+)$/) 
            ? `КЕ-${{S:"С",F:"Ф",M:"М"}[item.id[2]]}/${item.id.split("-")[1]}`
            : item.id;
          return `
            <div class="card" style="margin-bottom: 12px;">
              <div class="title">${displayId} — ${item.title}</div>
              <div class="small">${item.summary}</div>
              <a href="dossier.html?id=${encodeURIComponent(item.id)}&access=internal" style="color: #5ac8fa; font-size: 13px; margin-top: 8px; display: inline-block;">
                Открыть →
              </a>
            </div>
          `;
        }).filter(x => x).join("");
      }
    }
  }

  function setupEventHandlers() {
    // Выход
    document.addEventListener('click', async (e) => {
      if (e.target.id === 'logout-btn') {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
      }
    });
  }

  // Инициализация
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

