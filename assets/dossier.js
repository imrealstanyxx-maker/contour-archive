(() => {
  function qs(name){
    return new URLSearchParams(location.search).get(name);
  }
  
  // Ждём загрузки данных
  function initDossier() {
    const data = Array.isArray(window.CONTOUR_DATA) ? window.CONTOUR_DATA : [];
    
    if (!data || data.length === 0) {
      // Если данные ещё не загружены, ждём (максимум 5 секунд)
      const startTime = Date.now();
      const checkData = () => {
        const data = Array.isArray(window.CONTOUR_DATA) ? window.CONTOUR_DATA : [];
        if (data && data.length > 0) {
          runDossier(data);
        } else if (Date.now() - startTime < 5000) {
          setTimeout(checkData, 100);
        } else {
          // Таймаут - показываем ошибку
          const elHead = document.getElementById("head");
          const elMeta = document.getElementById("meta");
          const elBlocks = document.getElementById("blocks");
          const elNote = document.getElementById("editorNote");
          
          if (elHead) elHead.textContent = "Ошибка загрузки";
          if (elMeta) elMeta.innerHTML = `<div class="note">Не удалось загрузить данные. Проверьте подключение.</div>`;
          if (elBlocks) elBlocks.innerHTML = "";
          if (elNote) elNote.textContent = "—";
        }
      };
      checkData();
      return;
    }
    
    runDossier(data);
  }
  
  function runDossier(data) {

  function hasInternalAccess(){
    if (!window.contourAuth) return false;
    return window.contourAuth.hasInternalAccess();
  }

  // Сохраняем историю просмотров
  function saveViewHistory(entry){
    if (!window.contourAuth || !window.contourAuth.isAuthenticated()) return;
    let history = JSON.parse(localStorage.getItem("contour_view_history") || "[]");
    history.push({
      id: entry.id,
      title: entry.title,
      timestamp: new Date().toISOString()
    });
    // Оставляем только последние 50 записей
    history = history.slice(-50);
    localStorage.setItem("contour_view_history", JSON.stringify(history));
  }

  function canSee(entry, mode){
    if (mode === "public") return entry.access === "public";
    if (mode === "leak") return entry.access === "public" || entry.access === "leak";
    if (mode === "internal") {
      // Нужна авторизация
      if (!window.contourAuth || !window.contourAuth.isAuthenticated()) {
        return false;
      }
      
      // Секретные материалы только для админа
      if (entry.access === "internal") {
        return hasInternalAccess();
      }
      
      // Обычные пользователи видят публичные и утечки
      return entry.access === "public" || entry.access === "leak";
    }
    return false;
  }

  function redactify(text){
    return (text || "").replace(/█+/g, m => `<span class="redacted">${m}</span>`);
  }

  const id = qs("id");
  const mode = qs("access") || "public";

  // Показываем баннер, если есть внутренний доступ
  if (mode === "internal" && hasInternalAccess()) {
    document.body.classList.add("internal-mode");
    const sub = document.querySelector(".brand .sub");
    if (sub) {
      sub.textContent = "Внутренний доступ: АКТИВЕН";
      sub.style.color = "#5ac8fa";
    }
    
    const banner = document.getElementById("internal-access-banner");
    if (banner) {
      banner.style.display = "block";
      setTimeout(() => {
        banner.classList.add("show");
      }, 10);
    }
    
    // Закрытие баннера
    const closeBannerBtn = document.getElementById("close-banner");
    if (closeBannerBtn) {
      closeBannerBtn.addEventListener("click", () => {
        banner.classList.remove("show");
        setTimeout(() => {
          banner.style.display = "none";
        }, 300);
      });
    }
  }

  const entry = data.find(x => x.id === id);

  const elHead = document.getElementById("head");
  const elMeta = document.getElementById("meta");
  const elBlocks = document.getElementById("blocks");
  const elNote = document.getElementById("editorNote");

  if (!entry){
    elHead.textContent = "Досье не найдено";
    elMeta.innerHTML = `<div class="note">Запись отсутствует в текущей компиляции.</div>`;
    elBlocks.innerHTML = "";
    elNote.textContent = "—";
    return;
  }

  if (!canSee(entry, mode)){
    elHead.textContent = "Доступ запрещён";
    elMeta.innerHTML = `<div class="note">Эта запись недоступна при текущем уровне доступа.</div>`;
    elBlocks.innerHTML = "";
    elNote.textContent = "Попытка чтения зафиксирована.";
    return;
  }

  function formatId(id, type){
    if (!id) return id;
    const match = id.match(/^KE([SFM])-(\d+)$/);
    if (match) {
      const typeMap = { S: "С", F: "Ф", M: "М" };
      return `КЕ-${typeMap[match[1]]}/${match[2]}`;
    }
    return id;
  }

  const displayId = formatId(entry.id, entry.type);
  elHead.textContent = `${entry.type || "КЕ"} / ${displayId} — ${entry.title || "Без названия"}`;

  // Сохраняем в историю просмотров
  saveViewHistory(entry);

  const d = entry.dossier || {};
  
  // Показываем полную локацию при внутреннем доступе
  let location = entry.location || "не раскрыто";
  if (mode === "internal" && hasInternalAccess()) {
    if (entry.id === "KEM-002") {
      location = "Санкт-Петербург, ул. Псковская, д. 18 (Государственный архив СПб, лестничный пролёт между 3-4 этажами)";
    }
  }
  
  const metaRows = [
    ["Идентификатор", displayId],
    ["Тип", entry.type || "КЕ"],
    ["Статус", (entry.status || "UNKNOWN").toUpperCase()],
    ["Локация", location],
    ["Уровень доступа", entry.access || "public"],
    ["Риск", d.risk || "—"],
    ["Наблюдение", d.observe || "—"],
    ["Первое упоминание", d.firstSeen || "—"],
    ["Связано", d.related || "—"],
  ];
  
  // Добавляем заметку о запаздывании, если есть
  if (d.note) {
    metaRows.push(["Примечание", d.note]);
  }

  elMeta.innerHTML = `
    <div class="kv">
      ${metaRows.map(([k,v]) => `
        <div class="kv-row">
          <div class="kv-k">${k}</div>
          <div class="kv-v">${redactify(String(v))}</div>
        </div>
      `).join("")}
    </div>
  `;

  let materials = Array.isArray(entry.materials) ? entry.materials : [];
  
  // Добавляем внутренние материалы, только если есть полный доступ (админ)
  if (mode === "internal" && hasInternalAccess() && Array.isArray(entry.internalMaterials)) {
    materials = [...materials, ...entry.internalMaterials];
  }

  elBlocks.innerHTML = materials.map(m => {
    const isInternal = m.stamp && m.stamp.includes("INTERNAL");
    return `
    <div class="block" ${isInternal ? 'data-internal="true"' : ''}>
      <div class="block-head">
        <div class="block-title">${m.kind || "Материал"}</div>
        <div class="block-meta">${m.stamp || ""}</div>
      </div>
      <div class="block-body">${redactify(String(m.text || "")).replace(/\n/g, "<br>")}</div>
    </div>
    `;
  }).join("") || `<div class="note">Материалы отсутствуют или были удалены.</div>`;

  elNote.textContent = entry.editorNote || "—";

  // Добавляем кнопку избранного для авторизованных пользователей
  if (window.contourAuth && window.contourAuth.isAuthenticated()) {
    const favorites = JSON.parse(localStorage.getItem("contour_favorites") || "[]");
    const isFavorite = favorites.includes(entry.id);
    
    const favoriteBtn = document.createElement("button");
    favoriteBtn.className = "btn-link";
    favoriteBtn.style.marginTop = "16px";
    favoriteBtn.textContent = isFavorite ? "★ В избранном" : "☆ Добавить в избранное";
    favoriteBtn.style.background = isFavorite 
      ? "rgba(90, 200, 250, 0.15)" 
      : "rgba(255, 255, 255, 0.05)";
    favoriteBtn.style.borderColor = isFavorite 
      ? "rgba(90, 200, 250, 0.3)" 
      : "rgba(255, 255, 255, 0.1)";
    favoriteBtn.style.color = isFavorite ? "#5ac8fa" : "rgba(255, 255, 255, 0.8)";
    
    favoriteBtn.addEventListener("click", () => {
      let favs = JSON.parse(localStorage.getItem("contour_favorites") || "[]");
      if (isFavorite) {
        favs = favs.filter(id => id !== entry.id);
        favoriteBtn.textContent = "☆ Добавить в избранное";
        favoriteBtn.style.background = "rgba(255, 255, 255, 0.05)";
        favoriteBtn.style.borderColor = "rgba(255, 255, 255, 0.1)";
        favoriteBtn.style.color = "rgba(255, 255, 255, 0.8)";
      } else {
        favs.push(entry.id);
        favoriteBtn.textContent = "★ В избранном";
        favoriteBtn.style.background = "rgba(90, 200, 250, 0.15)";
        favoriteBtn.style.borderColor = "rgba(90, 200, 250, 0.3)";
        favoriteBtn.style.color = "#5ac8fa";
      }
      localStorage.setItem("contour_favorites", JSON.stringify(favs));
    });
    
    const noteContainer = document.getElementById("editorNote").parentElement;
    if (noteContainer) {
      noteContainer.appendChild(favoriteBtn);
    }
  }
  }
  
  // Запускаем инициализацию
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDossier);
  } else {
    initDossier();
  }
})();
