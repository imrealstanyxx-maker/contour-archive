// Страница наблюдений сообщества

(() => {
  'use strict';
  
  let supabase = null;
  let currentUser = null;
  let userProfile = null;
  let currentFilter = 'all';
  let allReports = [];

  function showError(message, containerId = 'reports-list') {
    try {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `
          <div class="note" style="color: #ef4444; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3);">
            <strong>Сбой компиляции.</strong> ${message || 'Данные недоступны.'}
          </div>
        `;
      }
    } catch (e) {
      console.error('Error showing error message:', e);
    }
  }

  async function init() {
    try {
      // Проверка конфигурации
      if (!window.CONTOUR_CONFIG || window.CONTOUR_CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
        showError('Supabase не настроен. Пожалуйста, настройте assets/config.js с вашими данными из Supabase.');
        return;
      }

      // Инициализация Supabase
      if (typeof window.supabase === 'undefined') {
        showError('Не удалось загрузить Supabase SDK. Проверьте подключение к интернету.');
        return;
      }

      supabase = window.supabase.createClient(
        window.CONTOUR_CONFIG.SUPABASE_URL,
        window.CONTOUR_CONFIG.SUPABASE_ANON_KEY
      );

      // Проверка авторизации
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        window.location.href = 'login.html?return=community.html';
        return;
      }

      currentUser = user;
      userProfile = await getUserProfile(user.id);

      // Проверка лицензии
      if (!userProfile || (userProfile.role !== 'observer' && userProfile.role !== 'admin')) {
        const noLicenseSection = document.getElementById('no-license-section');
        const createSection = document.getElementById('create-section');
        if (noLicenseSection) noLicenseSection.style.display = 'block';
        if (createSection) createSection.style.display = 'none';
      } else {
        const noLicenseSection = document.getElementById('no-license-section');
        const createSection = document.getElementById('create-section');
        if (noLicenseSection) noLicenseSection.style.display = 'none';
        if (createSection) createSection.style.display = 'block';
        
        if (userProfile.role === 'admin') {
          const moderationBtn = document.getElementById('moderation-btn');
          if (moderationBtn) moderationBtn.style.display = 'inline-block';
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
      const reportForm = document.getElementById('report-form');
      if (reportForm) {
        reportForm.addEventListener('submit', handleSubmit);
      }
    } catch (error) {
      console.error('Error initializing community page:', error);
      showError(error.message || 'Ошибка инициализации страницы.');
    }
  }

  async function getUserProfile(userId) {
    try {
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
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  }

  async function loadDossiers() {
    try {
      if (!window.CONTOUR_DATA) {
        // Ждём загрузки данных
        let attempts = 0;
        while (!window.CONTOUR_DATA && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }
      
      const select = document.getElementById('dossier-id');
      if (!select) return;
      
      if (window.CONTOUR_DATA && Array.isArray(window.CONTOUR_DATA)) {
        window.CONTOUR_DATA.forEach(item => {
          const option = document.createElement('option');
          option.value = item.id;
          option.textContent = `${item.id} — ${item.title}`;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading dossiers:', error);
    }
  }

  async function loadReports() {
    try {
      const { data, error } = await supabase
        .from('community_reports')
        .select(`
          *,
          profiles:user_id (username, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // RLS может блокировать - это нормально
        if (error.code === 'PGRST301' || error.code === '42501') {
          allReports = [];
          renderReports();
          return;
        }
        throw error;
      }

      allReports = data || [];
      renderReports();
    } catch (error) {
      console.error('Error loading reports:', error);
      showError(error.message || 'Не удалось загрузить наблюдения.');
      allReports = [];
    }
  }

  function renderReports() {
    try {
      const container = document.getElementById('reports-list');
      if (!container) return;
      
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
              <textarea id="admin-note-${report.id}" class="input" placeholder="Примечание администратора" style="min-height: 60px; width: 100%; margin-top: 8px;">${report.admin_note || ''}</textarea>
            </div>
          `;
        }

        // Экранирование HTML для безопасности
        const escapeHtml = (text) => {
          if (!text) return '';
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        };

        return `
          <div class="card" style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
              <div>
                <div style="font-weight: 500; margin-bottom: 4px;">${escapeHtml(report.title)}</div>
                <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6);">
                  ${escapeHtml(profile?.username || profile?.email || 'Пользователь')} • ${statusBadge}
                  ${report.dossier_id ? ` • Связано с ${escapeHtml(report.dossier_id)}` : ''}
                </div>
              </div>
              <div style="font-size: 12px; color: rgba(255, 255, 255, 0.4);">
                ${new Date(report.created_at).toLocaleDateString('ru-RU')}
              </div>
            </div>
            
            <div style="margin-bottom: 8px; line-height: 1.6; white-space: pre-wrap;">
              ${escapeHtml(report.body).replace(/\n/g, '<br>')}
            </div>
            
            ${report.evidence ? `
              <div style="margin-bottom: 8px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; font-size: 13px; white-space: pre-wrap;">
                <strong>Доказательства:</strong> ${escapeHtml(report.evidence).replace(/\n/g, '<br>')}
              </div>
            ` : ''}
            
            ${report.location ? `
              <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); margin-bottom: 8px;">
                Локация: ${escapeHtml(report.location)}
              </div>
            ` : ''}
            
            ${report.observed_at ? `
              <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); margin-bottom: 8px;">
                Наблюдение: ${new Date(report.observed_at).toLocaleString('ru-RU')}
              </div>
            ` : ''}
            
            ${report.admin_note ? `
              <div class="note" style="margin-top: 8px; font-size: 13px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3);">
                <strong>Примечание администратора:</strong> ${escapeHtml(report.admin_note)}
              </div>
            ` : ''}
            
            ${adminActions}
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Error rendering reports:', error);
      showError(error.message || 'Ошибка отображения наблюдений.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      const formError = document.getElementById('form-error');
      const formSuccess = document.getElementById('form-success');
      
      if (formError) {
        formError.style.display = 'none';
      }
      if (formSuccess) {
        formSuccess.style.display = 'none';
      }
      
      const formData = new FormData(e.target);
      const reportData = {
        user_id: currentUser.id,
        dossier_id: formData.get('dossier_id') || null,
        title: formData.get('title')?.trim(),
        body: formData.get('body')?.trim(),
        evidence: formData.get('evidence')?.trim() || null,
        location: formData.get('location')?.trim() || null,
        observed_at: formData.get('observed_at') ? new Date(formData.get('observed_at')).toISOString() : null,
        status: 'pending'
      };

      if (!reportData.title || !reportData.body) {
        if (formError) {
          formError.textContent = 'Заполните все обязательные поля.';
          formError.style.display = 'block';
        }
        return;
      }

      // Убеждаемся, что профиль существует
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUser.id)
        .single();

      if (!existingProfile) {
        // Создаём профиль, если его нет
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            username: currentUser.email?.split('@')[0] || 'user',
            role: 'user'
          });
        
        if (profileError && profileError.code !== '23505') { // Игнорируем дубликаты
          console.warn('Error creating profile:', profileError);
        }
      }

      const { data: insertedData, error } = await supabase
        .from('community_reports')
        .insert(reportData)
        .select();

      if (error) {
        console.error('Error inserting report:', error);
        throw error;
      }

      if (formError) formError.style.display = 'none';
      if (formSuccess) {
        formSuccess.textContent = 'Наблюдение отправлено на модерацию.';
        formSuccess.style.display = 'block';
      }
      e.target.reset();
      
      setTimeout(() => {
        if (formSuccess) formSuccess.style.display = 'none';
      }, 3000);

      await loadReports();
    } catch (error) {
      console.error('Error submitting report:', error);
      const formError = document.getElementById('form-error');
      const formSuccess = document.getElementById('form-success');
      if (formError) {
        formError.textContent = error.message || 'Ошибка при отправке наблюдения.';
        formError.style.display = 'block';
      }
      if (formSuccess) formSuccess.style.display = 'none';
    }
  }

  // Глобальные функции для модерации
  window.moderateReport = async function(reportId, newStatus) {
    try {
      if (!userProfile || userProfile?.role !== 'admin') {
        alert('Только администратор может модерировать наблюдения.');
        return;
      }

      // При переходе unofficial -> approved требуется dossier_id
      if (newStatus === 'final_approved') {
        const report = allReports.find(r => r.id === reportId);
        if (!report || !report.dossier_id) {
          alert('Для подтверждения наблюдения для досье необходимо указать связанное досье. Сначала одобрите как неофициальное и укажите dossier_id.');
          return;
        }
      }

      const adminNoteEl = document.getElementById(`admin-note-${reportId}`);
      const adminNote = adminNoteEl?.value?.trim() || null;
      
      const { error } = await supabase
        .from('community_reports')
        .update({
          status: newStatus,
          admin_note: adminNote,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) {
        console.error('Error moderating report:', error);
        alert('Ошибка при модерации: ' + (error.message || 'Неизвестная ошибка'));
        return;
      }

      await loadReports();
    } catch (error) {
      console.error('Error in moderateReport:', error);
      alert('Ошибка при модерации: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

  // Инициализация
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100); // Небольшая задержка для загрузки скриптов
  }
})();
