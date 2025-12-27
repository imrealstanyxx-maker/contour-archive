// Страница профиля

(() => {
  if (!window.contourAuth || !window.contourAuth.isAuthenticated()) {
    window.location.href = "login.html?return=profile.html";
    return;
  }

  const userData = window.contourAuth.getUserData();
  if (!userData) {
    window.location.href = "login.html";
    return;
  }

  // Отображаем информацию о пользователе
  const userInfoEl = document.getElementById("user-info");
  const accessLevel = userData.level === "admin" ? "Администратор (полный доступ)" : 
                     userData.level === "user" ? "Пользователь" : "Внутренний";
  const infoRows = [
    ["Логин", userData.username],
    ["Уровень доступа", accessLevel],
    ["Статус верификации", userData.verified ? "✓ Верифицирован" : "✗ Не верифицирован"],
    ["Email", userData.email || "—"],
    ["Дата регистрации", new Date(userData.registered).toLocaleDateString("ru-RU")],
    ["Последний вход", new Date(userData.loginTime).toLocaleString("ru-RU")]
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

  // Статистика активности
  const statsEl = document.getElementById("user-stats");
  const viewHistory = JSON.parse(localStorage.getItem("contour_view_history") || "[]");
  const favorites = JSON.parse(localStorage.getItem("contour_favorites") || "[]");
  
  const stats = [
    { k: "Просмотрено досье", v: viewHistory.length },
    { k: "В избранном", v: favorites.length },
    { k: "Дней в системе", v: Math.floor((new Date() - new Date(userData.registered)) / (1000 * 60 * 60 * 24)) }
  ];

  statsEl.innerHTML = stats.map(s => `
    <div class="stat">
      <div class="k">${s.k}</div>
      <div class="v">${s.v}</div>
    </div>
  `).join("");

  // История просмотров
  const historyEl = document.getElementById("view-history");
  if (viewHistory.length > 0) {
    const recent = viewHistory.slice(-10).reverse();
    historyEl.innerHTML = recent.map(item => `
      <div class="card" style="margin-bottom: 12px; padding: 12px;">
        <div class="title">${item.title}</div>
        <div class="small">${item.id} • ${new Date(item.timestamp).toLocaleString("ru-RU")}</div>
        <a href="dossier.html?id=${encodeURIComponent(item.id)}&access=internal" style="color: #5ac8fa; font-size: 13px; margin-top: 8px; display: inline-block;">
          Открыть →
        </a>
      </div>
    `).join("");
  } else {
    historyEl.innerHTML = '<div class="note">История просмотров пуста</div>';
  }

  // Избранное
  const favoritesEl = document.getElementById("favorites");
  if (favorites.length > 0) {
    const data = Array.isArray(window.CONTOUR_DATA) ? window.CONTOUR_DATA : [];
    favoritesEl.innerHTML = favorites.map(favId => {
      const item = data.find(x => x.id === favId);
      if (!item) return "";
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
  } else {
    favoritesEl.innerHTML = '<div class="note">Избранное пусто</div>';
  }

  // Статус форума
  const forumSection = document.getElementById("forum-section");
  const forumStatusEl = document.getElementById("forum-status");
  
  if (userData.verified) {
    forumStatusEl.innerHTML = `
      <div class="note" style="background: rgba(52, 211, 153, 0.1); border-color: rgba(52, 211, 153, 0.3); color: #34d399; margin-bottom: 16px;">
        ✓ Ваш аккаунт верифицирован. Доступ к форуму открыт.
      </div>
      <a href="forum.html" class="btn-link" style="width: 100%; text-align: center;">
        Перейти на форум
      </a>
    `;
  } else {
    forumStatusEl.innerHTML = `
      <div class="note" style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #ef4444;">
        ✗ Доступ к форуму ограничен. Для доступа необходимо верифицировать аккаунт через email.
      </div>
      <div class="note" style="margin-top: 12px; font-size: 12px;">
        Верификация требуется в целях безопасности для подтверждения личности пользователя.
      </div>
    `;
  }

  // Верификация
  const verificationSection = document.getElementById("verification-section");
  if (!userData.verified && userData.email) {
    verificationSection.style.display = "block";
    
    // Отправка кода при загрузке страницы
    const sendCode = () => {
      const result = window.contourAuth.sendVerificationCode(userData.email);
      if (result.success) {
        alert(`Код отправлен на ${userData.email}\n\n[DEMO] Код для тестирования: ${result.code}\n(В реальном приложении код придёт на email)`);
      }
    };
    
    sendCode();
    
    document.getElementById("verification-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const code = document.getElementById("verification-code").value.trim();
      const errorEl = document.getElementById("verification-error");
      const successEl = document.getElementById("verification-success");
      
      errorEl.style.display = "none";
      successEl.style.display = "none";
      
      const result = window.contourAuth.verifyEmail(userData.email, code);
      
      if (result.success) {
        successEl.textContent = "Email успешно верифицирован!";
        successEl.style.display = "block";
        verificationSection.style.display = "none";
        setTimeout(() => {
          location.reload();
        }, 1500);
      } else {
        errorEl.textContent = result.error || "Ошибка верификации";
        errorEl.style.display = "block";
      }
    });
    
    document.getElementById("resend-code-btn").addEventListener("click", sendCode);
  }

  // Кнопка выхода
  document.getElementById("logout-btn").addEventListener("click", () => {
    if (confirm("Вы уверены, что хотите выйти?")) {
      window.contourAuth.logout();
      window.location.href = "index.html";
    }
  });
})();

