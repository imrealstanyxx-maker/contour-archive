(() => {
  const qEl = document.getElementById("q");
  const typeEl = document.getElementById("type");
  const accessEl = document.getElementById("access");
  const listEl = document.getElementById("list");
  const statsEl = document.getElementById("stats");

  const data = Array.isArray(window.CONTOUR_DATA) ? window.CONTOUR_DATA : [];

  function norm(s){
    return (s || "").toString().trim().toLowerCase();
  }

  function matches(item, q){
    if (!q) return true;
    const hay = [
      norm(item.title),
      norm(item.summary),
      norm(item.location),
      ...(item.tags || []).map(norm)
    ].join(" ");
    return hay.includes(norm(q));
  }

  function typeOk(item, t){
    if (t === "all") return true;
    return item.type === t;
  }

  function accessOk(item, acc){
    if (acc === "public") {
      return item.access === "public";
    }
    if (acc === "leak") {
      return item.access === "public" || item.access === "leak";
    }
    if (acc === "internal") {
      // Проверяем наличие внутреннего доступа
      const hasInternalAccess = localStorage.getItem('contour_internal_access') === 'granted';
      if (!hasInternalAccess) {
        // Перенаправляем на страницу ввода кода
        if (accessEl && accessEl.value === "internal") {
          setTimeout(() => {
            window.location.href = `internal-access.html?return=${encodeURIComponent(window.location.pathname)}`;
          }, 100);
          accessEl.value = "public";
        }
        return false;
      }
      // С внутренним доступом показываем всё
      return true;
    }
    return false;
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

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat">
          <div class="k">Всего единиц</div>
          <div class="v">${total}</div>
        </div>
        <div class="stat">
          <div class="k">Активных</div>
          <div class="v">${active}</div>
        </div>
        <div class="stat">
          <div class="k">Неизвестных</div>
          <div class="v">${unknown}</div>
        </div>
        <div class="stat">
          <div class="k">Связано с СПб</div>
          <div class="v">${spb}</div>
        </div>
      `;
    }
  }

  function renderList(mode = null){
    if (!listEl) return;
    
    const q = qEl ? qEl.value.trim() : "";
    const t = typeEl ? typeEl.value : "all";
    const acc = mode || (accessEl ? accessEl.value : "public");

    const filtered = data.filter(item => 
      matches(item, q) && 
      typeOk(item, t) && 
      accessOk(item, acc)
    );

    renderStats(filtered);

    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="note">Ничего не найдено.</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(item => {
      const tags = (item.tags || []).map(t => `<span class="tag">${t}</span>`).join("");
      return `
        <a href="dossier.html?id=${encodeURIComponent(item.id)}" class="card">
          <div class="row">
            <div>${item.id}</div>
            <div>${item.type}</div>
            ${statusBadge(item.status)}
          </div>
          <div class="title">${item.title}</div>
          <div class="small">${item.summary || ""}</div>
          ${tags ? `<div class="tags">${tags}</div>` : ""}
          ${item.location ? `<div class="small" style="margin-top: 8px; color: rgba(255,255,255,0.6);">📍 ${item.location}</div>` : ""}
        </a>
      `;
    }).join("");
  }

  // Инициализация
  if (qEl) {
    qEl.addEventListener("input", () => renderList());
  }
  if (typeEl) {
    typeEl.addEventListener("change", () => renderList());
  }
  if (accessEl) {
    accessEl.addEventListener("change", () => renderList());
  }

  renderList();
})();
