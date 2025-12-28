// Простая страница профиля (без Supabase)

(() => {
  'use strict';

  function init() {
    const user = window.contourAuth ? window.contourAuth.getCurrentUser() : null;
    
    if (!user) {
      window.location.href = 'login.html?return=profile.html';
      return;
    }

    renderProfile(user);
    setupEventHandlers();
  }

  function renderProfile(user) {
    const wrap = document.querySelector('.wrap');
    if (!wrap) return;

    // Загружаем статистику из localStorage
    const history = JSON.parse(localStorage.getItem("contour_view_history") || "[]");
    const favorites = JSON.parse(localStorage.getItem("contour_favorites") || "[]");

    wrap.innerHTML = `
      <section class="panel">
        <div class="panel-title">Профиль</div>
        <div class="panel-body">
          <div class="kv">
            <div class="kv-row">
              <div class="kv-k">Логин</div>
              <div class="kv-v">${user.username || 'user'}</div>
            </div>
            <div class="kv-row">
              <div class="kv-k">Email</div>
              <div class="kv-v">${user.email || '—'}</div>
            </div>
            <div class="kv-row">
              <div class="kv-k">Роль</div>
              <div class="kv-v">${user.role === 'admin' ? 'Администратор' : 'Пользователь'}</div>
            </div>
            <div class="kv-row">
              <div class="kv-k">Просмотрено досье</div>
              <div class="kv-v">${history.length}</div>
            </div>
            <div class="kv-row">
              <div class="kv-k">Избранное</div>
              <div class="kv-v">${favorites.length}</div>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">Действия</div>
        <div class="panel-body">
          <a href="community.html" class="btn-link" style="display: block; margin-bottom: 12px; text-align: center;">
            Наблюдения (неофициально)
          </a>
          ${user.role === 'admin' ? `
            <div class="note" style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #ef4444; margin-bottom: 12px;">
              <strong>Администратор:</strong> Для модерации наблюдений откройте 
              <a href="https://github.com/${window.CONTOUR_CONFIG?.GITHUB_REPO || 'owner/repo'}/issues" target="_blank" style="color: #5ac8fa;">
                Issues в GitHub
              </a>
            </div>
          ` : ''}
          <button id="logout-btn" class="btn-link" style="width: 100%; background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: #ef4444;">
            Выйти
          </button>
        </div>
      </section>
    `;
  }

  function setupEventHandlers() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (window.contourAuth) {
          window.contourAuth.signOut();
        }
        window.location.href = 'index.html';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
