(() => {
  const qEl = document.getElementById("q");
  const typeEl = document.getElementById("type");
  const accessEl = document.getElementById("access");
  const listEl = document.getElementById("list");
  const statsEl = document.getElementById("stats");
  const authButtonsEl = document.getElementById("auth-buttons");

  const data = Array.isArray(window.CONTOUR_DATA) ? window.CONTOUR_DATA : [];

  function hasInternalAccess(){
    if (!window.contourAuth) return false;
    return window.contourAuth.hasInternalAccess();
  }

  // Обновляем кнопки входа/профиля
  function updateAuthButtons(){
    if (!authButtonsEl) return;
    
    const forumLinkEl = document.getElementById("forum-link");
    
    // Проверяем любую авторизацию, не только админа
    if (window.contourAuth && window.contourAuth.isAuthenticated()) {
      const userData = window.contourAuth.getUserData();
      authButtonsEl.innerHTML = `
        <a class="btn-link" href="profile.html" style="background: rgba(90, 200, 250, 0.15); border-color: rgba(90, 200, 250, 0.3); color: #5ac8fa;">
          ${userData ? userData.username : "Профиль"}
        </a>
      `;
      
      // Показываем ссылку на форум только для верифицированных
      if (forumLinkEl && userData && userData.verified) {
        forumLinkEl.style.display = "inline-block";
      } else if (forumLinkEl) {
        forumLinkEl.style.display = "none";
      }
    } else {
      authButtonsEl.innerHTML = `
        <a class="btn-link" href="login.html" style="background: rgba(90, 200, 250, 0.1); border-color: rgba(90, 200, 250, 0.2);">
          Вход
        </a>
      `;
      if (forumLinkEl) forumLinkEl.style.display = "none";
    }
  }

  function showInternalAccessBanner(){
    const banner = document.getElementById("internal-access-banner");
    if (banner) {
      banner.style.display = "block";
      setTimeout(() => {
        banner.classList.add("show");
      }, 10);
      
      // Автоматически скрыть через 5 секунд
      setTimeout(() => {
        hideInternalAccessBanner();
      }, 5000);
    }
  }

  function hideInternalAccessBanner(){
    const banner = document.getElementById("internal-access-banner");
    if (banner) {
      banner.classList.remove("show");
      setTimeout(() => {
        banner.style.display = "none";
      }, 300);
    }
  }

  function updateInternalAccessUI(){
    const body = document.body;
    const sub = document.querySelector(".brand .sub");
    const accessSelect = document.getElementById("access");
    const hasAccess = hasInternalAccess();
    
    if (hasAccess && accessEl.value === "internal") {
      body.classList.add("internal-mode");
      if (sub) {
        const userData = window.contourAuth.getUserData();
        sub.textContent = `Внутренний доступ: АКТИВЕН (${userData ? userData.username : ""})`;
        sub.style.color = "#5ac8fa";
      }
      if (accessSelect) {
        accessSelect.style.borderColor = "rgba(90, 200, 250, 0.5)";
        accessSelect.style.background = "rgba(90, 200, 250, 0.1)";
      }
    } else {
      body.classList.remove("internal-mode");
      if (sub) {
        sub.textContent = "Публичный архив контурных единиц (неофициальная компиляция)";
        sub.style.color = "rgba(255, 255, 255, 0.75)";
      }
      if (accessSelect) {
        accessSelect.style.borderColor = "";
        accessSelect.style.background = "";
      }
    }
  }

  function norm(s){
    return (s || "").toString().trim().toLowerCase();
  }

  function matches(item, q){
    if (!q) return true;
    const hay = [
      item.id, item.type, item.status, item.access,
      item.title, item.summary, item.location,
      ...(item.tags || [])
    ].map(norm).join(" ");
    return hay.includes(q);
  }

  function accessOk(item, acc){
    if (acc === "internal") {
      // Для внутреннего доступа нужна авторизация
      if (!window.contourAuth || !window.contourAuth.isAuthenticated()) {
        if (accessEl.value === "internal") {
          setTimeout(() => {
            window.location.href = `login.html?return=${encodeURIComponent(window.location.pathname)}`;
          }, 100);
          accessEl.value = "public";
        }
        return false;
      }
      
      // Только админ видит секретные материалы
      const hasSecretAccess = hasInternalAccess();
      if (item.access === "internal") {
        return hasSecretAccess;
      }
      
      // Обычные пользователи видят публичные и утечки
      return item.access === "public" || item.access === "leak";
    }
    if (acc === "public") return item.access === "public";
    if (acc === "leak") return item.access === "public" || item.access === "leak";
    return false;
  }

  function typeOk(item, t){
    if (t === "all") return true;
    if (t === "КЕ") return true;
    return item.type === t;
  }

  function statusBadge(status){
    const s = (status || "UNKNOWN").toUpperCase();
    const cls = s === "ACTIVE" ? "badge green" : (s === "UNKNOWN" ? "badge red" : "badge");
    return `<span class="${cls}">${s}</span>`;
  }

  function renderStats(items){
    const total = items.length;
    const active = items.filter(x => (x.status || "").toUpperCase() === "ACTIVE").length;
    const unknown = items.filter(x => (x.status || "").toUpperCase() === "UNKNOWN").length;

    const spb = items.filter(x =>
      x.spb_mark === true ||
      norm(x.location).includes("санкт") ||
      (x.tags || []).some(t => norm(t) === "спб")
    ).length;

    const rows = [
      { k: "Записей", v: total },
      { k: "Активных", v: active },
      { k: "Неясный статус", v: unknown },
      { k: "Следы коррекции", v: spb }
    ];

    // ВАЖНО: это ровно под твой style.css (.stat .k/.v)
    statsEl.innerHTML = rows.map(r => `
      <div class="stat">
        <div class="k">${r.k}</div>
        <div class="v">${r.v}</div>
      </div>
    `).join("");
  }

  function formatId(id, type){
    // Преобразуем KES-001 в КЕ-С/001, KEM-002 в КЕ-М/002 и т.д.
    if (!id) return id;
    const match = id.match(/^KE([SFM])-(\d+)$/);
    if (match) {
      const typeMap = { S: "С", F: "Ф", M: "М" };
      return `КЕ-${typeMap[match[1]]}/${match[2]}`;
    }
    return id;
  }

  function card(item, mode){
    const url = `dossier.html?id=${encodeURIComponent(item.id)}&access=${encodeURIComponent(mode)}`;
    const tags = (item.tags || []).slice(0, 6).map(t => `<span class="tag">${t}</span>`).join("");
    const displayId = formatId(item.id, item.type);

    return `
      <a class="card" href="${url}">
        <div class="row">
          <span class="badge">${item.type || "КЕ"}</span>
          ${statusBadge(item.status)}
        </div>

        <div class="title">${displayId} — ${item.title || "Без названия"}</div>
        <div class="small">${item.summary || ""}</div>

        <div class="small">Локация: ${item.location || "не раскрыто"}</div>

        <div class="tags">${tags}</div>
      </a>
    `;
  }

  function render(){
    const q = norm(qEl.value);
    const t = typeEl.value;
    const mode = accessEl.value;

    const filtered = data
      .filter(x => accessOk(x, mode))
      .filter(x => typeOk(x, t))
      .filter(x => matches(x, q));

    // Сводку логичнее показывать по тому, что ты реально сейчас видишь
    renderStats(filtered);

    listEl.innerHTML = filtered.map(x => card(x, mode)).join("");

    if (!filtered.length){
      listEl.innerHTML = `
        <div class="card" style="pointer-events:none;">
          <div class="title">Ничего не найдено</div>
          <div class="small">Попробуй другой запрос или уровень доступа.</div>
        </div>
      `;
    }
  }

  // Обработка изменения уровня доступа
  accessEl.addEventListener("change", () => {
    if (accessEl.value === "internal" && !hasInternalAccess()) {
      // Перенаправляем на страницу входа
      window.location.href = `login.html?return=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    updateInternalAccessUI();
    render();
  });

  qEl.addEventListener("input", render);
  typeEl.addEventListener("change", render);

  // Проверяем URL параметр access=internal
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("access") === "internal") {
    accessEl.value = "internal";
    if (hasInternalAccess()) {
      showInternalAccessBanner();
    }
  }

  // Инициализация
  updateAuthButtons();
  updateInternalAccessUI();
  render();

  // Обновляем кнопки при изменении доступа
  setInterval(() => {
    updateAuthButtons();
  }, 1000);
})();
