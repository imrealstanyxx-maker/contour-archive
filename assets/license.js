// Страница заявки на лицензию наблюдателя

(() => {
  // Вопросы теста
  const testQuestions = [
    {
      id: 'q1',
      type: 'radio',
      question: 'Что означает классификация КЕ-С?',
      options: ['Субъект', 'Феномен', 'Место', 'Система'],
      correct: 0
    },
    {
      id: 'q2',
      type: 'radio',
      question: 'Какой уровень доступа требуется для просмотра внутренних материалов?',
      options: ['Публичный', 'Утечка', 'Внутренний', 'Любой'],
      correct: 2
    },
    {
      id: 'q3',
      type: 'radio',
      question: 'Что делать при обнаружении аномалии?',
      options: ['Немедленно сообщить в полицию', 'Зафиксировать наблюдение', 'Игнорировать', 'Попытаться взаимодействовать'],
      correct: 1
    },
    {
      id: 'q4',
      type: 'radio',
      question: 'Можно ли делиться наблюдениями вне системы КОНТУР?',
      options: ['Да, без ограничений', 'Только с разрешения', 'Нет, это запрещено', 'Только с другими наблюдателями'],
      correct: 2
    },
    {
      id: 'q5',
      type: 'textarea',
      question: 'Опишите основные принципы работы системы наблюдения КОНТУР (2-3 предложения).',
      placeholder: 'Ваш ответ...'
    },
    {
      id: 'q6',
      type: 'radio',
      question: 'Что означает статус "UNKNOWN" в досье?',
      options: ['Объект уничтожен', 'Статус не определён', 'Объект под контролем', 'Данные засекречены'],
      correct: 1
    },
    {
      id: 'q7',
      type: 'radio',
      question: 'Как классифицируется локация с аномальными свойствами?',
      options: ['КЕ-С', 'КЕ-Ф', 'КЕ-М', 'КЕ-В'],
      correct: 2
    },
    {
      id: 'q8',
      type: 'textarea',
      question: 'Почему важно фиксировать наблюдения точно и без искажений?',
      placeholder: 'Ваш ответ...'
    },
    {
      id: 'q9',
      type: 'radio',
      question: 'Можно ли редактировать чужие наблюдения?',
      options: ['Да, если они неточны', 'Только админам', 'Нет, никогда', 'Только с согласия автора'],
      correct: 2
    },
    {
      id: 'q10',
      type: 'textarea',
      question: 'Что вы будете делать, если обнаружите связь между несколькими аномалиями?',
      placeholder: 'Ваш ответ...'
    }
  ];

  let supabase = null;
  let currentUser = null;
  let userProfile = null;

  function showError(message, containerId = 'form-section') {
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

      if (typeof window.supabase === 'undefined') {
        showError('Не удалось загрузить Supabase SDK. Проверьте подключение к интернету.');
        return;
      }

      // Инициализация Supabase
      supabase = window.supabase.createClient(
        window.CONTOUR_CONFIG.SUPABASE_URL,
        window.CONTOUR_CONFIG.SUPABASE_ANON_KEY
      );

      // Проверка авторизации
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        window.location.href = 'login.html?return=license.html';
        return;
      }

      currentUser = user;
      userProfile = await getUserProfile(user.id);

      // Проверка роли
      if (userProfile && userProfile.role === 'admin') {
        await loadAdminPanel();
      }

      // Загрузка статуса заявки
      await loadApplicationStatus();

      // Рендер формы
      renderTestForm();
    } catch (error) {
      console.error('Error initializing license page:', error);
      showError(error.message || 'Ошибка инициализации страницы.');
    }
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

  async function loadApplicationStatus() {
    const { data, error } = await supabase
      .from('license_applications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error loading status:', error);
      return;
    }

    if (data) {
      const statusSection = document.getElementById('status-section');
      statusSection.style.display = 'block';
      
      let statusText = '';
      let statusColor = '';
      
      switch (data.status) {
        case 'submitted':
          statusText = 'Заявка отправлена и ожидает рассмотрения.';
          statusColor = 'rgba(255, 200, 0, 0.2)';
          document.getElementById('form-section').style.display = 'none';
          break;
        case 'approved':
          statusText = 'Ваша заявка одобрена. Вы получили лицензию наблюдателя.';
          statusColor = 'rgba(52, 211, 153, 0.2)';
          document.getElementById('form-section').style.display = 'none';
          break;
        case 'rejected':
          statusText = `Заявка отклонена. ${data.admin_note ? 'Причина: ' + data.admin_note : ''}`;
          statusColor = 'rgba(239, 68, 68, 0.2)';
          break;
      }

      document.getElementById('application-status').innerHTML = `
        <div class="note" style="background: ${statusColor}; border-color: ${statusColor.replace('0.2', '0.4')};">
          ${statusText}
        </div>
      `;
    }
  }

  async function loadAdminPanel() {
    const adminSection = document.getElementById('admin-section');
    adminSection.style.display = 'block';

    const { data, error } = await supabase
      .from('license_applications')
      .select(`
        *,
        profiles:user_id (username, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading applications:', error);
      return;
    }

    if (!data || data.length === 0) {
      adminSection.querySelector('.panel-body').innerHTML = '<div class="note">Заявок нет.</div>';
      return;
    }

    adminSection.querySelector('.panel-body').innerHTML = data.map(app => {
      const profile = app.profiles;
      let statusBadge = '';
      switch (app.status) {
        case 'submitted':
          statusBadge = '<span style="color: #fbbf24;">Ожидает</span>';
          break;
        case 'approved':
          statusBadge = '<span style="color: #34d399;">Одобрена</span>';
          break;
        case 'rejected':
          statusBadge = '<span style="color: #ef4444;">Отклонена</span>';
          break;
      }

      return `
        <div class="card" style="margin-bottom: 16px;">
          <div style="margin-bottom: 8px;">
            <strong>${profile?.username || profile?.email || 'Пользователь'}</strong> — ${statusBadge}
          </div>
          <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); margin-bottom: 12px;">
            Балл: ${app.score || 'не оценено'} | ${new Date(app.created_at).toLocaleDateString('ru-RU')}
          </div>
          ${app.status === 'submitted' ? `
            <div style="margin-top: 12px;">
              <textarea id="admin-note-${app.id}" class="input" placeholder="Примечание администратора" style="margin-bottom: 8px; min-height: 60px;"></textarea>
              <div style="display: flex; gap: 8px;">
                <button onclick="approveApplication('${app.id}')" class="btn-link" style="background: rgba(52, 211, 153, 0.15); border-color: rgba(52, 211, 153, 0.3); color: #34d399;">
                  Одобрить
                </button>
                <button onclick="rejectApplication('${app.id}')" class="btn-link" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: #ef4444;">
                  Отклонить
                </button>
              </div>
            </div>
          ` : app.admin_note ? `<div class="note" style="margin-top: 8px; font-size: 13px;">${app.admin_note}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function renderTestForm() {
    const container = document.getElementById('test-questions');
    container.innerHTML = testQuestions.map((q, index) => {
      if (q.type === 'radio') {
        return `
          <div style="margin-bottom: 24px;">
            <div style="margin-bottom: 12px; font-weight: 500;">${index + 1}. ${q.question}</div>
            ${q.options.map((opt, optIndex) => `
              <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                <input type="radio" name="${q.id}" value="${optIndex}" style="margin-right: 8px;" />
                ${opt}
              </label>
            `).join('')}
          </div>
        `;
      } else {
        return `
          <div style="margin-bottom: 24px;">
            <div style="margin-bottom: 12px; font-weight: 500;">${index + 1}. ${q.question}</div>
            <textarea name="${q.id}" class="input" placeholder="${q.placeholder}" style="min-height: 80px;"></textarea>
          </div>
        `;
      }
    }).join('');
  }

  function calculateScore(answers) {
    let score = 0;
    testQuestions.forEach(q => {
      if (q.type === 'radio' && answers[q.id] !== undefined) {
        if (parseInt(answers[q.id]) === q.correct) {
          score += 10;
        }
      } else if (q.type === 'textarea' && answers[q.id]) {
        // За текстовые ответы даём баллы за наличие ответа
        if (answers[q.id].trim().length > 20) {
          score += 5;
        }
      }
    });
    return score;
  }

  // Глобальные функции для админ-панели
  window.approveApplication = async function(appId) {
    const adminNote = document.getElementById(`admin-note-${appId}`)?.value || '';
    
    const { data: app } = await supabase
      .from('license_applications')
      .select('user_id')
      .eq('id', appId)
      .single();

    if (app) {
      // Обновляем статус заявки
      await supabase
        .from('license_applications')
        .update({
          status: 'approved',
          admin_note: adminNote,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', appId);

      // Обновляем роль пользователя
      await supabase
        .from('profiles')
        .update({ role: 'observer' })
        .eq('id', app.user_id);

      await loadAdminPanel();
      await loadApplicationStatus();
    }
  };

  window.rejectApplication = async function(appId) {
    const adminNote = document.getElementById(`admin-note-${appId}`)?.value || 'Заявка отклонена.';
    
    await supabase
      .from('license_applications')
      .update({
        status: 'rejected',
        admin_note: adminNote,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', appId);

    await loadAdminPanel();
  };

  // Обработка формы
  document.getElementById('license-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const answers = {};
    
    testQuestions.forEach(q => {
      if (q.type === 'radio') {
        const selected = formData.get(q.id);
        if (selected !== null) {
          answers[q.id] = selected;
        }
      } else {
        answers[q.id] = formData.get(q.id) || '';
      }
    });

    const score = calculateScore(answers);

    try {
      // Проверяем и создаём профиль если его нет
      let profile = await getUserProfile(currentUser.id);
      if (!profile) {
        // Создаём профиль с обработкой возможного конфликта
        const username = currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'user';
        
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            username: username,
            role: 'user'
          })
          .select()
          .single();
        
        if (profileError) {
          // Если профиль уже существует (например, создан триггером), просто получаем его
          if (profileError.code === '23505') { // Unique violation
            profile = await getUserProfile(currentUser.id);
            if (!profile) {
              console.error('Профиль должен был быть создан триггером, но не найден:', profileError);
              throw new Error('Профиль не найден. Попробуйте обновить страницу.');
            }
          } else {
            console.error('Ошибка создания профиля:', profileError);
            throw new Error('Не удалось создать профиль: ' + (profileError.message || 'Неизвестная ошибка'));
          }
        } else {
          profile = newProfile;
        }
      }

      const { error } = await supabase
        .from('license_applications')
        .insert({
          user_id: currentUser.id,
          answers: answers,
          score: score,
          status: 'submitted'
        });

      if (error) throw error;

      document.getElementById('form-error').style.display = 'none';
      await loadApplicationStatus();
    } catch (error) {
      document.getElementById('form-error').textContent = error.message || 'Ошибка при отправке заявки';
      document.getElementById('form-error').style.display = 'block';
    }
  });

  // Инициализация
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

