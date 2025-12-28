// Система форума КОНТУР

window.contourForum = (() => {
  // Инициализация примерных тем (только если форум пуст)
  function initDefaultTopics() {
    const topics = getTopics();
    if (topics.length > 0) return; // Уже есть темы

    const defaultTopics = [
      {
        id: "topic_welcome",
        title: "Добро пожаловать на форум КОНТУР",
        content: "Этот форум предназначен для обсуждения контурных единиц, архивных материалов и связанных тем.\n\nПожалуйста, ознакомьтесь с правилами форума перед созданием тем.\n\nБудьте уважительны к другим участникам и помните о конфиденциальности.",
        author: "system",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        repliesCount: 0,
        views: 0,
        pinned: true,
        locked: false
      }
    ];

    saveTopics(defaultTopics);
  }

  // Инициализация при первой загрузке
  initDefaultTopics();
  // Проверка доступа к форуму
  async function checkForumAccess() {
    // Проверяем через Supabase
    if (window.CONTOUR_CONFIG && window.CONTOUR_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && typeof window.supabase !== 'undefined') {
      try {
        if (window.contourSupabase) {
          const isAuth = await window.contourSupabase.isAuthenticated();
          if (!isAuth) {
            alert("Для доступа к форуму необходимо войти в систему.");
            window.location.href = "login.html?return=forum.html";
            return false;
          }
          
          const userData = await window.contourSupabase.getUserData();
          if (!userData) {
            alert("Ошибка получения данных пользователя. Попробуйте войти снова.");
            window.location.href = "login.html?return=forum.html";
            return false;
          }
          
          // Проверяем верификацию email
          const user = await window.contourSupabase.getCurrentUser();
          if (user && !user.email_confirmed_at) {
            alert("Для доступа к форуму необходимо верифицировать аккаунт через email. Проверьте почту и перейдите по ссылке из письма.");
            window.location.href = "profile.html";
            return false;
          }
          
          return true;
        }
      } catch (e) {
        console.error('Error checking forum access:', e);
        // Не блокируем доступ при ошибке, просто логируем
      }
    }
    
    // Fallback на старую систему
    if (window.contourAuth && window.contourAuth.isAuthenticated) {
      const isAuth = window.contourAuth.isAuthenticated();
      if (!isAuth) {
        alert("Для доступа к форуму необходимо войти в систему.");
        window.location.href = "login.html?return=forum.html";
        return false;
      }

      const userData = window.contourAuth.getUserData();
      if (!userData || !userData.verified) {
        alert("Для доступа к форуму необходимо верифицировать аккаунт через email. Перейдите в профиль для верификации.");
        window.location.href = "profile.html";
        return false;
      }
      
      return true;
    }
    
    // Если ни одна система не доступна, разрешаем доступ (для отладки)
    console.warn('Auth systems not available, allowing forum access');
    return true;
  }

  // Получение всех тем
  function getTopics() {
    const stored = localStorage.getItem("contour_forum_topics");
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  // Сохранение тем
  function saveTopics(topics) {
    localStorage.setItem("contour_forum_topics", JSON.stringify(topics));
  }

  // Получение ответов для темы
  function getReplies(topicId) {
    const stored = localStorage.getItem(`contour_forum_replies_${topicId}`);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  // Сохранение ответов
  function saveReplies(topicId, replies) {
    localStorage.setItem(`contour_forum_replies_${topicId}`, JSON.stringify(replies));
  }

  // Создание новой темы
  async function createTopic(title, content) {
    const hasAccess = await checkForumAccess();
    if (!hasAccess) return null;

    let userData = null;
    if (window.CONTOUR_CONFIG && window.CONTOUR_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && typeof window.supabase !== 'undefined') {
      if (window.contourSupabase) {
        userData = await window.contourSupabase.getUserData();
      }
    } else if (window.contourAuth && window.contourAuth.getUserData) {
      userData = window.contourAuth.getUserData();
    }
    const topics = getTopics();
    
    const newTopic = {
      id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      content: content.trim(),
      author: userData.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      repliesCount: 0,
      views: 0,
      pinned: false,
      locked: false
    };

    topics.unshift(newTopic);
    saveTopics(topics);
    
    return newTopic;
  }

  // Добавление ответа
  async function addReply(topicId, content) {
    const hasAccess = await checkForumAccess();
    if (!hasAccess) return null;

    let userData = null;
    if (window.CONTOUR_CONFIG && window.CONTOUR_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && typeof window.supabase !== 'undefined') {
      if (window.contourSupabase) {
        userData = await window.contourSupabase.getUserData();
      }
    } else if (window.contourAuth && window.contourAuth.getUserData) {
      userData = window.contourAuth.getUserData();
    }
    const replies = getReplies(topicId);
    
    const newReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      topicId: topicId,
      content: content.trim(),
      author: userData.username,
      createdAt: new Date().toISOString(),
      edited: false
    };

    replies.push(newReply);
    saveReplies(topicId, replies);

    // Обновляем счётчик ответов в теме
    const topics = getTopics();
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
      topic.repliesCount = replies.length;
      topic.updatedAt = new Date().toISOString();
      saveTopics(topics);
    }

    return newReply;
  }

  // Получение темы по ID
  function getTopic(topicId) {
    const topics = getTopics();
    return topics.find(t => t.id === topicId);
  }

  // Увеличение просмотров
  function incrementViews(topicId) {
    const topics = getTopics();
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
      topic.views = (topic.views || 0) + 1;
      saveTopics(topics);
    }
  }

  // Удаление темы (только для админа или автора)
  async function deleteTopic(topicId) {
    const hasAccess = await checkForumAccess();
    if (!hasAccess) return false;

    let userData = null;
    if (window.CONTOUR_CONFIG && window.CONTOUR_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && typeof window.supabase !== 'undefined') {
      if (window.contourSupabase) {
        userData = await window.contourSupabase.getUserData();
      }
    } else if (window.contourAuth && window.contourAuth.getUserData) {
      userData = window.contourAuth.getUserData();
    }

    if (!userData) return false;

    const topics = getTopics();
    const topic = topics.find(t => t.id === topicId);

    if (!topic) return false;

    // Только админ или автор может удалить
    if (userData.level !== "admin" && topic.author !== userData.username) {
      return false;
    }

    const filtered = topics.filter(t => t.id !== topicId);
    saveTopics(filtered);

    // Удаляем ответы
    localStorage.removeItem(`contour_forum_replies_${topicId}`);

    return true;
  }

  return {
    checkForumAccess,
    getTopics,
    createTopic,
    getTopic,
    getReplies,
    addReply,
    incrementViews,
    deleteTopic
  };
})();

// Инициализация страницы форума
if (window.location.pathname.includes("forum.html")) {
  (async () => {
    const hasAccess = await window.contourForum.checkForumAccess();
    if (!hasAccess) return;

    const topicsListEl = document.getElementById("topics-list");
    const newTopicBtn = document.getElementById("new-topic-btn");

    async function renderTopics() {
      const topics = window.contourForum.getTopics();
      
      if (topics.length === 0) {
        topicsListEl.innerHTML = `
          <div class="note" style="text-align: center; padding: 32px;">
            Пока нет тем. Создайте первую тему для обсуждения!
          </div>
        `;
        return;
      }

      let userData = null;
      if (window.contourSupabase) {
        userData = await window.contourSupabase.getUserData();
      } else if (window.contourAuth) {
        userData = window.contourAuth.getUserData();
      }
      
      topicsListEl.innerHTML = topics.map(topic => {
        const date = new Date(topic.createdAt).toLocaleString("ru-RU");
        const isPinned = topic.pinned ? "📌 " : "";
        const isLocked = topic.locked ? "🔒 " : "";
        const canDelete = userData && (userData.level === "admin" || topic.author === userData.username);
        
        return `
          <div class="topic-card">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
              <div style="flex: 1;">
                <div class="title" style="margin-bottom: 6px;">
                  <a href="topic.html?id=${encodeURIComponent(topic.id)}" style="color: inherit; text-decoration: none; display: block;">
                    ${isPinned}${isLocked}${topic.title}
                  </a>
                </div>
                <div class="small" style="margin-bottom: 12px; line-height: 1.5;">
                  ${topic.content.substring(0, 200)}${topic.content.length > 200 ? "..." : ""}
                </div>
              </div>
              ${canDelete ? `
                <button onclick="(async () => { if(confirm('Удалить тему?')) { await window.contourForum.deleteTopic('${topic.id}'); location.reload(); } })()" 
                        style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; margin-left: 12px;">
                  ×
                </button>
              ` : ""}
            </div>
            <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: rgba(255, 255, 255, 0.6);">
              <span><strong style="color: rgba(255, 255, 255, 0.8);">Автор:</strong> ${topic.author}</span>
              <span><strong style="color: rgba(255, 255, 255, 0.8);">Ответов:</strong> ${topic.repliesCount || 0}</span>
              <span><strong style="color: rgba(255, 255, 255, 0.8);">Просмотров:</strong> ${topic.views || 0}</span>
              <span>${date}</span>
            </div>
          </div>
        `;
      }).join("");
    }

    newTopicBtn.addEventListener("click", () => {
      // Создаём модальное окно для новой темы
      const modal = document.createElement("div");
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      `;

      modal.innerHTML = `
        <div class="panel" style="max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
          <div class="panel-title">Создать новую тему</div>
          <div class="panel-body">
            <form id="new-topic-form">
              <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; color: rgba(255, 255, 255, 0.8); font-size: 14px;">Название темы</label>
                <input id="topic-title" class="input" type="text" placeholder="Введите название темы" required style="width: 100%;" />
              </div>
              <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; color: rgba(255, 255, 255, 0.8); font-size: 14px;">Содержание</label>
                <textarea id="topic-content" class="input" rows="8" placeholder="Опишите тему обсуждения..." required style="width: 100%; resize: vertical; font-family: inherit;"></textarea>
              </div>
              <div id="topic-error" class="note" style="display: none; color: #ef4444; margin-bottom: 12px;"></div>
              <div style="display: flex; gap: 12px;">
                <button type="submit" class="btn-link" style="flex: 1;">Создать тему</button>
                <button type="button" id="cancel-topic" class="btn-link" style="background: rgba(255, 255, 255, 0.05);">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const form = modal.querySelector("#new-topic-form");
      const cancelBtn = modal.querySelector("#cancel-topic");
      const errorEl = modal.querySelector("#topic-error");
      const titleInput = modal.querySelector("#topic-title");
      const contentInput = modal.querySelector("#topic-content");

      titleInput.focus();

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        errorEl.style.display = "none";

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title || !content) {
          errorEl.textContent = "Заполните все поля";
          errorEl.style.display = "block";
          return;
        }

        if (title.length < 3) {
          errorEl.textContent = "Название темы должно быть не менее 3 символов";
          errorEl.style.display = "block";
          return;
        }

        if (content.length < 10) {
          errorEl.textContent = "Содержание темы должно быть не менее 10 символов";
          errorEl.style.display = "block";
          return;
        }

        (async () => {
          try {
            const topic = await window.contourForum.createTopic(title, content);
            if (topic) {
              document.body.removeChild(modal);
              window.location.href = `topic.html?id=${encodeURIComponent(topic.id)}`;
            } else {
              errorEl.textContent = "Ошибка при создании темы. Убедитесь, что вы авторизованы и верифицированы.";
              errorEl.style.display = "block";
            }
          } catch (error) {
            console.error('Error creating topic:', error);
            errorEl.textContent = "Ошибка при создании темы. Попробуйте позже.";
            errorEl.style.display = "block";
          }
        })();
      });

      cancelBtn.addEventListener("click", () => {
        document.body.removeChild(modal);
      });

      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
    });

    renderTopics().catch(err => console.error('Error rendering topics:', err));
  })();
}

// Инициализация страницы темы
if (window.location.pathname.includes("topic.html")) {
  (async () => {
    const hasAccess = await window.contourForum.checkForumAccess();
    if (!hasAccess) return;

    const topicId = new URLSearchParams(location.search).get("id");
    if (!topicId) {
      window.location.href = "forum.html";
      return;
    }

    const topic = window.contourForum.getTopic(topicId);
    if (!topic) {
      window.location.href = "forum.html";
      return;
    }

    // Увеличиваем просмотры
    window.contourForum.incrementViews(topicId);

    const topicPanel = document.getElementById("topic-panel");
    const topicContent = document.getElementById("topic-content");
    const repliesList = document.getElementById("replies-list");
    const replyForm = document.getElementById("reply-form");
    const replyText = document.getElementById("reply-text");
    const replyError = document.getElementById("reply-error");

    // Отображаем тему
    topicPanel.querySelector(".panel-title").textContent = topic.title;
    topicContent.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; gap: 16px; margin-bottom: 12px; font-size: 13px; color: rgba(255, 255, 255, 0.7);">
          <span>Автор: <strong>${topic.author}</strong></span>
          <span>Создано: ${new Date(topic.createdAt).toLocaleString("ru-RU")}</span>
          <span>Ответов: ${topic.repliesCount || 0}</span>
          <span>Просмотров: ${topic.views || 0}</span>
        </div>
        <div style="white-space: pre-wrap; line-height: 1.7; color: rgba(255, 255, 255, 0.9);">
          ${topic.content.replace(/\n/g, "<br>")}
        </div>
      </div>
    `;

    // Отображаем ответы
    async function renderReplies() {
      const replies = window.contourForum.getReplies(topicId);
      
      if (replies.length === 0) {
        repliesList.innerHTML = `
          <div class="note" style="text-align: center; padding: 24px;">
            Пока нет ответов. Будьте первым!
          </div>
        `;
        return;
      }

      let userData = null;
      if (window.contourSupabase) {
        userData = await window.contourSupabase.getUserData();
      } else if (window.contourAuth) {
        userData = window.contourAuth.getUserData();
      }
      
      repliesList.innerHTML = replies.map(reply => {
        const date = new Date(reply.createdAt).toLocaleString("ru-RU");
        const canDelete = userData && (userData.level === "admin" || reply.author === userData.username);
        
        return `
          <div class="reply-card">
            <div class="reply-header">
              <div>
                <div class="reply-author">${reply.author}</div>
                ${reply.edited ? '<div style="font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-top: 2px;">(отредактировано)</div>' : ''}
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <div class="reply-date">${date}</div>
                ${canDelete ? `
                  <button onclick="if(confirm('Удалить ответ?')) { 
                    const replies = JSON.parse(localStorage.getItem('contour_forum_replies_${topicId}') || '[]');
                    const filtered = replies.filter(r => r.id !== '${reply.id}');
                    localStorage.setItem('contour_forum_replies_${topicId}', JSON.stringify(filtered));
                    location.reload();
                  }" 
                  style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 11px;">
                    ×
                  </button>
                ` : ""}
              </div>
            </div>
            <div class="reply-content">
              ${reply.content.replace(/\n/g, "<br>")}
            </div>
          </div>
        `;
      }).join("");
    }

    // Форма ответа
    replyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      replyError.style.display = "none";

      const content = replyText.value.trim();
      if (!content) {
        replyError.textContent = "Введите текст ответа";
        replyError.style.display = "block";
        return;
      }

      const reply = window.contourForum.addReply(topicId, content);
      if (reply) {
        replyText.value = "";
        renderReplies();
        // Прокручиваем к новому ответу
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        }, 100);
      } else {
        replyError.textContent = "Ошибка при добавлении ответа";
        replyError.style.display = "block";
      }
    });

    renderReplies().catch(err => console.error('Error rendering replies:', err));
  })();
}

