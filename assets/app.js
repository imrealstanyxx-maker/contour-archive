(() => {
  const qEl = document.getElementById("q");
  const typeEl = document.getElementById("type");
  const accessEl = document.getElementById("access");
  const listEl = document.getElementById("list");
  const statsEl = document.getElementById("stats");
  const authButtonsEl = document.getElementById("auth-buttons");

  const data = Array.isArray(window.CONTOUR_DATA) ? window.CONTOUR_DATA : [];

  // Система накопительных эффектов Контура
  function getContourState() {
    const stored = localStorage.getItem("contour_system_state");
    if (!stored) {
      return {
        visitCount: 0,
        hiddenEntries: [],
        permanentSpbOffset: 0,
        filterCount: 0,
        lastFilterTime: null,
        correctionsApplied: false
      };
    }
    try {
      return JSON.parse(stored);
    } catch {
      return {
        visitCount: 0,
        hiddenEntries: [],
        permanentSpbOffset: 0,
        filterCount: 0,
        lastFilterTime: null,
        correctionsApplied: false
      };
    }
  }

  function saveContourState(state) {
    localStorage.setItem("contour_system_state", JSON.stringify(state));
  }

  async function hasInternalAccess(){
    // Проверяем через Supabase
    if (window.CONTOUR_CONFIG && window.CONTOUR_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && typeof window.supabase !== 'undefined') {
      try {
        if (window.contourSupabase) {
          return await window.contourSupabase.hasInternalAccess();
        }
      } catch (e) {
        console.warn('Error checking internal access:', e);
      }
    }
    
    // Fallback на старую систему
    if (window.contourAuth && window.contourAuth.hasInternalAccess) {
      const result = window.contourAuth.hasInternalAccess();
      return result instanceof Promise ? await result : result;
    }
    
    return false;
  }

  // Обновляем кнопки входа/профиля
  async function updateAuthButtons(){
    if (!authButtonsEl) return;
    
    const forumLinkEl = document.getElementById("forum-link");
    const communityLinkEl = document.getElementById("community-link");
    
    // Проверяем авторизацию через Supabase
    let isAuth = false;
    let userData = null;
    
    if (window.CONTOUR_CONFIG && window.CONTOUR_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && typeof window.supabase !== 'undefined') {
      try {
        if (window.contourSupabase) {
          isAuth = await window.contourSupabase.isAuthenticated();
          if (isAuth) {
            userData = await window.contourSupabase.getUserData();
          }
        }
      } catch (e) {
        // Игнорируем ошибки проверки авторизации
        console.warn('Auth check failed, showing login button:', e);
      }
    } else {
      // Fallback на старую систему
      if (window.contourAuth && window.contourAuth.isAuthenticated()) {
        isAuth = true;
        userData = window.contourAuth.getUserData();
      }
    }
    
    if (isAuth && userData) {
      // Используем username из профиля, если есть, иначе email до собаки
      const displayName = userData.username || (userData.email ? userData.email.split('@')[0] : "Профиль");
      authButtonsEl.innerHTML = `
        <a class="btn-link" href="profile.html" style="background: rgba(90, 200, 250, 0.15); border-color: rgba(90, 200, 250, 0.3); color: #5ac8fa;">
          ${displayName}
        </a>
      `;
      
      // Показываем ссылку на наблюдения для observer/admin
      if (communityLinkEl && (userData.level === 'observer' || userData.level === 'admin')) {
        communityLinkEl.style.display = "inline-block";
      } else if (communityLinkEl) {
        communityLinkEl.style.display = "none";
      }
      
      // Показываем ссылку на форум для всех авторизованных (верификация не обязательна)
      if (forumLinkEl) {
        forumLinkEl.style.display = "inline-block";
      }
    } else {
      // Всегда показываем кнопки входа и регистрации, если не авторизованы
      // Выделяем их визуально для лучшей заметности
      authButtonsEl.innerHTML = `
        <a class="btn-link" href="login.html" style="background: rgba(90, 200, 250, 0.2); border-color: rgba(90, 200, 250, 0.4); color: #5ac8fa; font-weight: 500;">Вход</a>
        <a class="btn-link" href="register.html" style="background: rgba(52, 211, 153, 0.15); border-color: rgba(52, 211, 153, 0.3); color: #34d399; font-weight: 500;">Регистрация</a>
      `;
      if (forumLinkEl) forumLinkEl.style.display = "none";
      if (communityLinkEl) communityLinkEl.style.display = "none";
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

  async function updateInternalAccessUI(){
    const body = document.body;
    const sub = document.querySelector(".brand .sub");
    const accessSelect = document.getElementById("access");
    
    // Проверяем доступ через Supabase
    let hasAccess = false;
    let userData = null;
    
    if (window.CONTOUR_CONFIG && window.CONTOUR_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && typeof window.supabase !== 'undefined') {
      try {
        if (window.contourSupabase) {
          hasAccess = await window.contourSupabase.hasInternalAccess();
          if (hasAccess) {
            userData = await window.contourSupabase.getUserData();
          }
        }
      } catch (e) {
        console.warn('Error checking internal access:', e);
      }
    } else if (window.contourAuth && window.contourAuth.hasInternalAccess) {
      hasAccess = window.contourAuth.hasInternalAccess();
      if (hasAccess && window.contourAuth.getUserData) {
        userData = window.contourAuth.getUserData();
      }
    }
    
    if (hasAccess && accessEl.value === "internal") {
      body.classList.add("internal-mode");
      if (sub) {
        const displayName = userData?.username || (userData?.email ? userData.email.split('@')[0] : "");
        sub.textContent = `Внутренний доступ: АКТИВЕН${displayName ? ` (${displayName})` : ""}`;
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
    
    // Обновляем кнопки авторизации после изменения доступа
    await updateAuthButtons();
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
      // Для фильтрации возвращаем false, админ увидит материалы после загрузки через updateInternalAccessUI
      if (item.access === "internal") {
        // Временно скрываем, будет показано после проверки доступа
        return false;
      }
      
      // Обычные пользователи видят публичные и утечки
      return item.access === "public" || item.access === "leak";
    }
    // Публичный доступ - только публичные записи
    if (acc === "public") return item.access === "public";
    // Утечка - только утечки (без публичных)
    if (acc === "leak") return item.access === "leak";
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
    const state = getContourState();
    const total = items.length;
    const active = items.filter(x => (x.status || "").toUpperCase() === "ACTIVE").length;
    const unknown = items.filter(x => (x.status || "").toUpperCase() === "UNKNOWN").length;

    const spb = items.filter(x =>
      x.spb_mark === true ||
      norm(x.location).includes("санкт") ||
      (x.tags || []).some(t => norm(t) === "спб")
    ).length;

    // НАКОПИТЕЛЬНЫЙ ЭФФЕКТ: вероятность ошибки уменьшается с посещениями
    // Но цена - необратимая потеря информации
    const visitCount = state.visitCount || 0;
    const errorProbability = Math.max(0.05, 0.15 - (visitCount * 0.01));
    
    // КОРРЕКТНАЯ ОШИБКА: счётчики логичны, но иногда слегка неточны
    const correctionFactor = Math.random() < errorProbability ? (Math.random() < 0.5 ? -1 : 1) : 0;
    const correctedTotal = total + correctionFactor;
    
    // НЕОБРАТИМОСТЬ: "Следы коррекции" могут навсегда уменьшиться
    const correctedSpb = spb + state.permanentSpbOffset + (Math.random() < errorProbability ? (Math.random() < 0.5 ? -1 : 0) : 0);
    
    // Если "Следы коррекции" уменьшились случайно и это первое посещение после 5-7 заходов
    if (visitCount >= 5 && visitCount <= 7 && !state.correctionsApplied && correctedSpb < spb) {
      state.permanentSpbOffset = -1;
      state.correctionsApplied = true;
      saveContourState(state);
    }

    const rows = [
      { k: "Записей", v: Math.max(0, correctedTotal) },
      { k: "Активных", v: active },
      { k: "Неясный статус", v: unknown },
      { k: "Следы коррекции", v: Math.max(0, correctedSpb) }
    ];

    // ВАЖНО: это ровно под твой style.css (.stat .k/.v)
    statsEl.innerHTML = rows.map(r => `
      <div class="stat">
        <div class="k">${r.k}</div>
        <div class="v">${r.v}</div>
      </div>
    `).join("");
    
    // Сообщение после 5-7 заходов о накопленных исправлениях
    if (visitCount >= 5 && visitCount <= 7 && state.correctionsApplied) {
      const noteEl = document.getElementById("contour-note");
      if (noteEl && !noteEl.dataset.shown) {
        noteEl.style.display = "block";
        noteEl.innerHTML = `<div class="note" style="background: rgba(90, 200, 250, 0.1); border-color: rgba(90, 200, 250, 0.3); color: rgba(90, 200, 250, 0.9); padding: 12px; border-radius: 8px; margin: 16px 0;">Часть расхождений устранена в ходе повторного просмотра. Система наблюдения стабилизирована.</div>`;
        noteEl.dataset.shown = "true";
        setTimeout(() => {
          noteEl.style.opacity = "0";
          setTimeout(() => noteEl.style.display = "none", 300);
        }, 5000);
      }
    }
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
    const state = getContourState();
    const q = norm(qEl.value);
    const t = typeEl.value;
    const mode = accessEl.value;

    // ЗАЩИТНАЯ РЕАКЦИЯ КОНТУРА: при частых фильтрациях снижается точность
    const now = Date.now();
    const timeSinceLastFilter = state.lastFilterTime ? (now - state.lastFilterTime) : Infinity;
    
    if (timeSinceLastFilter < 2000) { // Фильтрация чаще чем раз в 2 секунды
      state.filterCount = (state.filterCount || 0) + 1;
    } else {
      state.filterCount = 0;
    }
    
    state.lastFilterTime = now;
    saveContourState(state);

    let filtered = data
      .filter(x => accessOk(x, mode))
      .filter(x => typeOk(x, t))
      .filter(x => matches(x, q))
      .filter(x => !state.hiddenEntries.includes(x.id)); // НЕОБРАТИМОСТЬ: скрытые записи не возвращаются

    // КОРРЕКТНАЯ ОШИБКА: иногда одна запись "пропускается" фильтром
    // НАКОПИТЕЛЬНЫЙ ЭФФЕКТ: вероятность уменьшается с посещениями
    const visitCount = state.visitCount || 0;
    const hideProbability = Math.max(0.03, 0.12 - (visitCount * 0.01));
    
    // ЗАЩИТНАЯ РЕАКЦИЯ: при частых фильтрациях вероятность ошибки увеличивается
    const adjustedProbability = state.filterCount > 5 ? Math.min(0.25, hideProbability * 1.5) : hideProbability;
    
    if (filtered.length > 3 && !q && Math.random() < adjustedProbability) {
      // Случайно скрываем одну запись
      const hiddenIndex = Math.floor(Math.random() * filtered.length);
      const hiddenEntry = filtered[hiddenIndex];
      
      // НЕОБРАТИМОСТЬ: если запись скрыта, она больше не вернётся
      if (!state.hiddenEntries.includes(hiddenEntry.id)) {
        state.hiddenEntries.push(hiddenEntry.id);
        saveContourState(state);
      }
      
      filtered = filtered.filter((_, i) => i !== hiddenIndex);
    }
    
    // Предупреждение при частых фильтрациях
    if (state.filterCount > 8) {
      const warningEl = document.getElementById("contour-warning");
      if (warningEl) {
        warningEl.style.display = "block";
        warningEl.innerHTML = `<div class="note" style="background: rgba(255, 200, 0, 0.1); border-color: rgba(255, 200, 0, 0.3); color: rgba(255, 200, 0, 0.9); padding: 12px; border-radius: 8px; margin: 16px 0;">Избыточные запросы снижают достоверность выборки.</div>`;
        setTimeout(() => {
          warningEl.style.opacity = "0";
          setTimeout(() => warningEl.style.display = "none", 300);
        }, 3000);
      }
    }

    // Сводку логичнее показывать по тому, что ты реально сейчас видишь
    renderStats(filtered);

    listEl.innerHTML = filtered.map(x => card(x, mode)).join("");
    
    // После рендера проверяем доступ админа и показываем internal материалы
    if (mode === "internal") {
      hasInternalAccess().then(hasAccess => {
        if (hasAccess) {
          // Показываем internal записи для админа
          const internalItems = data.filter(x => x.access === "internal");
          if (internalItems.length > 0) {
            const existingIds = new Set(filtered.map(x => x.id));
            const newItems = internalItems.filter(x => !existingIds.has(x.id));
            if (newItems.length > 0) {
              listEl.insertAdjacentHTML('beforeend', newItems.map(x => card(x, mode)).join(""));
              renderStats([...filtered, ...newItems]);
            }
          }
        }
      });
    }

    if (!filtered.length){
      // КОРРЕКТНАЯ ОШИБКА: "ничего не найдено" - правда, но неполная
      const allAvailable = data.filter(x => accessOk(x, mode)).length;
      const message = allAvailable > 0 
        ? "Попробуй другой запрос или уровень доступа."
        : "Попробуй другой запрос или уровень доступа.";
      
      listEl.innerHTML = `
        <div class="card" style="pointer-events:none;">
          <div class="title">Ничего не найдено</div>
          <div class="small">${message}</div>
        </div>
      `;
    }
  }

  // Обработка изменения уровня доступа
  accessEl.addEventListener("change", async () => {
    // Обновляем UI доступа
    await updateInternalAccessUI();
    
    if (accessEl.value === "internal") {
      const hasAccess = await hasInternalAccess();
      if (!hasAccess) {
        // Сохраняем текущий режим доступа в URL
        const currentUrl = window.location.pathname;
        const currentSearch = window.location.search;
        let returnUrl = currentUrl + currentSearch;
        
        // Добавляем access=internal к URL, если его там нет
        if (!returnUrl.includes('access=internal')) {
          returnUrl += (returnUrl.includes('?') ? '&' : '?') + 'access=internal';
        }
        
        // Перенаправляем на страницу входа
        window.location.href = `login.html?return=${encodeURIComponent(returnUrl)}`;
        return;
      }
    }
    await updateInternalAccessUI();
    render();
  });

  qEl.addEventListener("input", render);
  typeEl.addEventListener("change", render);

  // Проверяем URL параметр access=internal
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("access") === "internal") {
    accessEl.value = "internal";
    hasInternalAccess().then(hasAccess => {
      if (hasAccess) {
        showInternalAccessBanner();
      }
    });
  }

  // Инициализация: увеличиваем счётчик посещений
  const state = getContourState();
  state.visitCount = (state.visitCount || 0) + 1;
  saveContourState(state);

  // Инициализация
  // Ждём загрузки Supabase SDK перед обновлением кнопок
  if (typeof window.supabase !== 'undefined') {
    updateAuthButtons();
  } else {
    // Ждём загрузки Supabase SDK
    const checkSupabase = setInterval(() => {
      if (typeof window.supabase !== 'undefined') {
        clearInterval(checkSupabase);
        updateAuthButtons();
      }
    }, 100);
    
    // Таймаут на случай если SDK не загрузится
    setTimeout(() => {
      clearInterval(checkSupabase);
      updateAuthButtons();
    }, 5000);
  }
  
  updateInternalAccessUI();
  render();

  // Обновляем кнопки при изменении доступа
  setInterval(() => {
    updateAuthButtons();
  }, 2000);
})();
