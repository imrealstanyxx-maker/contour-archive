// Страница наблюдений сообщества (через GitHub Issues, без Supabase)

(() => {
  'use strict';
  
  let currentFilter = 'all';
  let allReports = [];
  let currentUsername = null;

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
      // Ждём загрузки config.js
      let configAttempts = 0;
      while (!window.CONTOUR_CONFIG && configAttempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        configAttempts++;
      }

      // Проверка конфигурации GitHub (обязательно)
      if (!window.CONTOUR_CONFIG) {
        showError('Конфигурация не загружена. Проверьте подключение assets/config.js');
        return;
      }

      if (!window.CONTOUR_CONFIG.GITHUB_REPO || window.CONTOUR_CONFIG.GITHUB_REPO === 'owner/repo') {
        showError('GitHub репозиторий не настроен. Пожалуйста, настройте GITHUB_REPO в assets/config.js');
        return;
      }

      if (!window.CONTOUR_CONFIG.GITHUB_TOKEN || window.CONTOUR_CONFIG.GITHUB_TOKEN === 'YOUR_GITHUB_TOKEN_HERE') {
        showError('GitHub токен не настроен. Пожалуйста, настройте GITHUB_TOKEN в assets/config.js');
        return;
      }

      // Ждём загрузки github-issues.js
      let githubAttempts = 0;
      while (!window.contourGitHub && githubAttempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        githubAttempts++;
      }

      if (!window.contourGitHub) {
        console.error('window.contourGitHub не загружен после ожидания');
        showError('GitHub Issues API не загружен. Проверьте подключение assets/github-issues.js');
        return;
      }

      // Получаем имя пользователя из localStorage (простая авторизация)
      currentUsername = localStorage.getItem('contour_username') || 'anonymous';

      // Показываем форму создания для всех
      const createSection = document.getElementById('create-section');
      const noLicenseSection = document.getElementById('no-license-section');
      if (createSection) createSection.style.display = 'block';
      if (noLicenseSection) noLicenseSection.style.display = 'none';

      // Загрузка списка досье для select
      await loadDossiers();

      // Загрузка наблюдений из GitHub Issues
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

  async function loadDossiers() {
    try {
      if (!window.CONTOUR_DATA) {
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
      if (!window.contourGitHub) {
        showError('GitHub Issues API не загружен');
        return;
      }

      // Загружаем все issues
      const issues = await window.contourGitHub.getIssues({ state: 'all' });
      
      allReports = issues || [];
      console.log('Loaded reports from GitHub:', allReports.length);
      renderReports();
    } catch (error) {
      console.error('Error loading reports:', error);
      showError(error.message || 'Не удалось загрузить наблюдения из GitHub.');
      allReports = [];
      renderReports();
    }
  }

  function renderReports() {
    try {
      const container = document.getElementById('reports-list');
      if (!container) return;
      
      let filtered = [];
      
      switch (currentFilter) {
        case 'my':
          // Мои отчеты - по username
          filtered = allReports.filter(r => r.username === currentUsername);
          break;
        case 'unofficial':
          filtered = allReports.filter(r => r.status === 'unofficial_approved');
          break;
        case 'approved':
          filtered = allReports.filter(r => r.status === 'final_approved');
          break;
        case 'pending':
          filtered = allReports.filter(r => r.status === 'pending' && r.username === currentUsername);
          break;
        case 'moderation':
          // Для модерации нужен доступ к GitHub - показываем ссылку
          filtered = [];
          container.innerHTML = `
            <div class="note">
              Для модерации наблюдений откройте 
              <a href="https://github.com/${window.CONTOUR_CONFIG.GITHUB_REPO}/issues" target="_blank" style="color: #5ac8fa;">
                Issues в GitHub
              </a>
              и измените labels на issues.
            </div>
          `;
          return;
        default:
          // Все доступные наблюдения
          filtered = allReports.filter(r => 
            r.status === 'final_approved' || 
            r.status === 'unofficial_approved' ||
            r.username === currentUsername
          );
      }

      if (filtered.length === 0) {
        container.innerHTML = '<div class="note">Наблюдений нет.</div>';
        return;
      }

      const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      container.innerHTML = filtered.map(report => {
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

        return `
          <div class="card" style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
              <div>
                <div style="font-weight: 500; margin-bottom: 4px;">${escapeHtml(report.title)}</div>
                <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6);">
                  ${escapeHtml(report.username)} • ${statusBadge}
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
            
            ${report.issue_url ? `
              <div style="margin-top: 8px;">
                <a href="${report.issue_url}" target="_blank" class="btn-link" style="font-size: 13px; padding: 6px 12px;">
                  Открыть в GitHub
                </a>
              </div>
            ` : ''}
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
      
      if (formError) formError.style.display = 'none';
      if (formSuccess) formSuccess.style.display = 'none';
      
      const formData = new FormData(e.target);
      const reportData = {
        title: formData.get('title')?.trim(),
        body: formData.get('body')?.trim(),
        dossier_id: formData.get('dossier_id') || null,
        evidence: formData.get('evidence')?.trim() || null,
        location: formData.get('location')?.trim() || null,
        observed_at: formData.get('observed_at') ? new Date(formData.get('observed_at')).toISOString() : null,
        username: currentUsername
      };

      if (!reportData.title || !reportData.body) {
        if (formError) {
          formError.textContent = 'Заполните все обязательные поля.';
          formError.style.display = 'block';
        }
        return;
      }

      if (!window.contourGitHub) {
        throw new Error('GitHub Issues API не загружен');
      }

      // Создаём issue в GitHub
      const issue = await window.contourGitHub.createIssue(reportData);

      if (formError) formError.style.display = 'none';
      if (formSuccess) {
        formSuccess.innerHTML = `Наблюдение отправлено на модерацию. <a href="${issue.html_url}" target="_blank" style="color: #5ac8fa;">Открыть в GitHub</a>`;
        formSuccess.style.display = 'block';
      }

      // Очищаем форму
      e.target.reset();

      // Перезагружаем список наблюдений
      await loadReports();
      
      setTimeout(() => {
        if (formSuccess) formSuccess.style.display = 'none';
      }, 5000);
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

  // Инициализация при загрузке страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
