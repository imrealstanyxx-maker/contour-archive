// Страница наблюдений сообщества

(() => {
  let supabase = null;
  let currentUser = null;
  let userProfile = null;
  let currentFilter = 'all';
  let allReports = [];

  async function init() {
    // Проверка конфигурации
    if (!window.CONTOUR_CONFIG || window.CONTOUR_CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
      document.getElementById('reports-list').innerHTML = `
        <div class="note" style="color: #ef4444;">
          Supabase не настроен. Пожалуйста, настройте assets/config.js с вашими данными из Supabase.
        </div>
      `;
      return;
    }

    // Инициализация Supabase
    supabase = window.supabase.createClient(
      window.CONTOUR_CONFIG.SUPABASE_URL,
      window.CONTOUR_CONFIG.SUPABASE_ANON_KEY
    );

    // Проверка авторизации
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = 'login.html?return=community.html';
      return;
    }

    currentUser = user;
    userProfile = await getUserProfile(user.id);

    // Проверка лицензии
    if (!userProfile || (userProfile.role !== 'observer' && userProfile.role !== 'admin')) {
      document.getElementById('no-license-section').style.display = 'block';
      document.getElementById('create-section').style.display = 'none';
    } else {
      document.getElementById('no-license-section').style.display = 'none';
      document.getElementById('create-section').style.display = 'block';
      
      if (userProfile.role === 'admin') {
        document.getElementById('moderation-btn').style.display = 'inline-block';
      }
    }

    // Загрузка списка досье для select
    await loadDossiers();

    // Загрузка наблюдений
    await loadReports();

    // Обработчики фильтров
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderReports();
      });
    });

    // Обработчик формы
    document.getElementById('report-form').addEventListener('submit', handleSubmit);
  }

  async function getUserProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error getting profile:', error);
      return null;
    }
    return data;
  }

  async function loadDossiers() {
    if (!window.CONTOUR_DATA) return;
    
    const select = document.getElementById('dossier-id');
    window.CONTOUR_DATA.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.id} — ${item.title}`;
      select.appendChild(option);
    });
  }

  async function loadReports() {
    const { data, error } = await supabase
      .from('community_reports')
      .select(`
        *,
        profiles:user_id (username, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reports:', error);
      allReports = [];
      return;
    }

    allReports = data || [];
    renderReports();
  }

  function renderReports() {
    const container = document.getElementById('reports-list');
    
    let filtered = [];
    
    switch (currentFilter) {
      case 'my':
        filtered = allReports.filter(r => r.user_id === currentUser.id);
        break;
      case 'unofficial':
        filtered = allReports.filter(r => r.status === 'unofficial_approved');
        break;
      case 'approved':
        filtered = allReports.filter(r => r.status === 'final_approved');
        break;
      case 'pending':
        filtered = allReports.filter(r => r.status === 'pending' && (r.user_id === currentUser.id || userProfile?.role === 'admin'));
        break;
      case 'moderation':
        if (userProfile?.role === 'admin') {
          filtered = allReports.filter(r => r.status === 'pending' || r.status === 'unofficial_approved');
        }
        break;
      default:
        // Все доступные пользователю
        filtered = allReports.filter(r => {
          if (r.status === 'final_approved' || r.status === 'unofficial_approved') return true;
          if (r.user_id === currentUser.id) return true;
          if (userProfile?.role === 'admin') return true;
          return false;
        });
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div class="note">Наблюдений нет.</div>';
      return;
    }

    container.innerHTML = filtered.map(report => {
      const profile = report.profiles;
      const isMyReport = report.user_id === currentUser.id;
      const isAdmin = userProfile?.role === 'admin';
      
      let statusBadge = '';
      switch (report.status) {
        case 'pending':
          statusBadge = '<span style="color: #fbbf24;">На рассмотрении</span>';
          break;
        case 'unofficial_approved':
          statusBadge = '<span style="color: #60a5fa;">Неофициально</span>';
          break;
        case 'final_approved':
          statusBadge = '<span style="color: #34d399;">Подтверждено</span>';
          break;
        case 'rejected':
          statusBadge = '<span style="color: #ef4444;">Отклонено</span>';
          break;
      }

      let adminActions = '';
      if (isAdmin && (report.status === 'pending' || report.status === 'unofficial_approved')) {
        adminActions = `
          <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
            ${report.status === 'pending' ? `
              <button onclick="moderateReport('${report.id}', 'unofficial_approved')" class="btn-link" style="background: rgba(96, 165, 250, 0.15); border-color: rgba(96, 165, 250, 0.3); color: #60a5fa; font-size: 13px;">
                Одобрить (неофициально)
              </button>
            ` : ''}
            ${report.status === 'unofficial_approved' ? `
              <button onclick="moderateReport('${report.id}', 'final_approved')" class="btn-link" style="background: rgba(52, 211, 153, 0.15); border-color: rgba(52, 211, 153, 0.3); color: #34d399; font-size: 13px;">
                Подтвердить для досье
              </button>
            ` : ''}
            <button onclick="moderateReport('${report.id}', 'rejected')" class="btn-link" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 13px;">
              Отклонить
            </button>
            <textarea id="admin-note-${report.id}" class="input" placeholder="Примечание администратора" style="min-height: 60px; width: 100%; margin-top: 8px;"></textarea>
          </div>
        `;
      }

      return `
        <div class="card" style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 500; margin-bottom: 4px;">${report.title}</div>
              <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6);">
                ${profile?.username || profile?.email || 'Пользователь'} • ${statusBadge}
                ${report.dossier_id ? ` • Связано с ${report.dossier_id}` : ''}
              </div>
            </div>
            <div style="font-size: 12px; color: rgba(255, 255, 255, 0.4);">
              ${new Date(report.created_at).toLocaleDateString('ru-RU')}
            </div>
          </div>
          
          <div style="margin-bottom: 8px; line-height: 1.6;">
            ${report.body.replace(/\n/g, '<br>')}
          </div>
          
          ${report.evidence ? `
            <div style="margin-bottom: 8px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; font-size: 13px;">
              <strong>Доказательства:</strong> ${report.evidence.replace(/\n/g, '<br>')}
            </div>
          ` : ''}
          
          ${report.location ? `
            <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); margin-bottom: 8px;">
              Локация: ${report.location}
            </div>
          ` : ''}
          
          ${report.observed_at ? `
            <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); margin-bottom: 8px;">
              Наблюдение: ${new Date(report.observed_at).toLocaleString('ru-RU')}
            </div>
          ` : ''}
          
          ${report.admin_note ? `
            <div class="note" style="margin-top: 8px; font-size: 13px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3);">
              <strong>Примечание администратора:</strong> ${report.admin_note}
            </div>
          ` : ''}
          
          ${adminActions}
        </div>
      `;
    }).join('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const reportData = {
      user_id: currentUser.id,
      dossier_id: formData.get('dossier_id') || null,
      title: formData.get('title'),
      body: formData.get('body'),
      evidence: formData.get('evidence') || null,
      location: formData.get('location') || null,
      observed_at: formData.get('observed_at') ? new Date(formData.get('observed_at')).toISOString() : null,
      status: 'pending'
    };

    try {
      const { error } = await supabase
        .from('community_reports')
        .insert(reportData);

      if (error) throw error;

      document.getElementById('form-error').style.display = 'none';
      document.getElementById('form-success').textContent = 'Наблюдение отправлено на модерацию.';
      document.getElementById('form-success').style.display = 'block';
      e.target.reset();
      
      setTimeout(() => {
        document.getElementById('form-success').style.display = 'none';
      }, 3000);

      await loadReports();
    } catch (error) {
      document.getElementById('form-success').style.display = 'none';
      document.getElementById('form-error').textContent = error.message || 'Ошибка при отправке наблюдения';
      document.getElementById('form-error').style.display = 'block';
    }
  }

  // Глобальные функции для модерации
  window.moderateReport = async function(reportId, newStatus) {
    const adminNote = document.getElementById(`admin-note-${reportId}`)?.value || '';
    
    await supabase
      .from('community_reports')
      .update({
        status: newStatus,
        admin_note: adminNote || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', reportId);

    await loadReports();
  };

  // Инициализация
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

