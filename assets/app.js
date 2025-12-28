(() => {
  'use strict';

  // Элементы DOM
  const qEl = document.getElementById("q");
  const typeEl = document.getElementById("type");
  const accessEl = document.getElementById("access");
  const listEl = document.getElementById("list");
  const statsEl = document.getElementById("stats");

  // Данные
  const data = Array.isArray(window.CONTOUR_DATA) ? window.CONTOUR_DATA : [];

  // Утилиты
  function norm(s) {
    return (s || "").toString().trim().toLowerCase();
  }

  function hasInternalAccess() {
    return localStorage.getItem('contour_internal_access') === 'granted';
  }

  // Фильтрация
  function matches(item, q) {
    if (!q) return true;
    const hay = [
      norm(item.title),
      norm(item.summary),
      norm(item.location),
      ...(item.tags || []).map(norm)
    ].join(" ");
    return hay.includes(norm(q));
  }

  function typeOk(item, t) {
    if (t === "all") return true;
    return item.type === t;
  }

  function accessOk(item, acc) {
    // Убеждаемся, что у элемента есть поле access
    const itemAccess = item.access || "public";
    
    // Строгая проверка: каждый уровень доступа показывает только свои материалы
    if (acc === "public") {
      // Публичный - ТОЛЬКО публичные (не leak, не internal)
      return itemAccess === "public";
    }
    
    if (acc === "leak") {
      // Утечка - ТОЛЬКО публичные И утечки (не internal)
      return itemAccess === "public" || itemAccess === "leak";
    }
    
    if (acc === "internal") {
      // Проверяем наличие внутреннего доступа
      if (!hasInternalAccess()) {
        // Перенаправляем на страницу ввода кода
        if (accessEl && accessEl.value === "internal") {
          setTimeout(() => {
            window.location.href = `internal-access.html?return=${encodeURIComponent(window.location.pathname)}`;
          }, 100);
          accessEl.value = "public";
        }
        return false;
      }
      // Внутренний - ТОЛЬКО внутренние материалы
      return itemAccess === "internal";
    }
    
    return false;
  }

  // Рендеринг
  function statusBadge(status) {
    const s = (status || "UNKNOWN").toUpperCase();
    const cls = s === "ACTIVE" ? "badge green" : (s === "UNKNOWN" ? "badge red" : "badge");
    return `<span class="${cls}">${s}</span>`;
  }

  function renderStats(items) {
    if (!statsEl) return;

    const total = items.length;
    const active = items.filter(x => (x.status || "").toUpperCase() === "ACTIVE").length;
    const unknown = items.filter(x => (x.status || "").toUpperCase() === "UNKNOWN").length;
    const spb = items.filter(x =>
      x.spb_mark === true ||
      norm(x.location).includes("санкт") ||
      (x.tags || []).some(t => norm(t) === "спб")
    ).length;

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

  function renderList() {
    if (!listEl) return;

    const q = qEl ? qEl.value.trim() : "";
    const t = typeEl ? typeEl.value : "all";
    const acc = accessEl ? accessEl.value : "public";

    // Проверяем внутренний доступ перед фильтрацией
    if (acc === "internal") {
      const hasAccess = hasInternalAccess();
      if (!hasAccess && accessEl && accessEl.value === "internal") {
        // Перенаправляем на страницу ввода кода
        setTimeout(() => {
          window.location.href = `internal-access.html?return=${encodeURIComponent(window.location.pathname)}`;
        }, 100);
        accessEl.value = "public";
        return;
      }
    }

    // Фильтруем данные строго по уровню доступа
    const filtered = data.filter(item => {
      // Сначала проверяем доступ через функцию accessOk
      if (!accessOk(item, acc)) {
        return false;
      }
      
      // Затем проверяем поиск и тип
      return matches(item, q) && typeOk(item, t);
    });

    renderStats(filtered);

    // Рендерим список
    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="note">Ничего не найдено.</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(item => {
      const tags = (item.tags || []).map(t => `<span class="tag">${t}</span>`).join("");
      const isInternal = item.access === "internal";
      
      return `
        <a href="dossier.html?id=${encodeURIComponent(item.id)}" class="card" ${isInternal ? 'data-internal="true"' : ''}>
          <div class="row">
            <div>${item.id}</div>
            <div>${item.type}</div>
            ${statusBadge(item.status)}
            ${isInternal ? '<span class="badge" style="background: rgba(90, 200, 250, 0.15); border-color: rgba(90, 200, 250, 0.3); color: #5ac8fa;">INTERNAL</span>' : ''}
          </div>
          <div class="title">${item.title}</div>
          <div class="small">${item.summary || ""}</div>
          ${tags ? `<div class="tags">${tags}</div>` : ""}
          ${item.location ? `<div class="small" style="margin-top: 8px; color: rgba(255,255,255,0.6);">📍 ${item.location}</div>` : ""}
        </a>
      `;
    }).join("");
  }

  // Отключение внутреннего доступа
  function revokeInternalAccess() {
    localStorage.removeItem('contour_internal_access');
    updateInternalAccessUI();
    renderList();
    
    // Если был выбран внутренний доступ, переключаем на публичный
    if (accessEl && accessEl.value === "internal") {
      accessEl.value = "public";
    }
  }

  // UI внутреннего доступа
  function updateInternalAccessUI() {
    const hasAccess = hasInternalAccess();
    const banner = document.getElementById("internal-access-banner");
    const subtitle = document.getElementById("subtitle");
    const body = document.body;

    if (hasAccess) {
      // Показываем баннер
      if (banner) {
        banner.style.display = "block";
        setTimeout(() => banner.classList.add("show"), 100);
        
        // Обновляем содержимое баннера с кнопкой отключения
        const bannerContent = banner.querySelector(".internal-banner-content");
        if (bannerContent && !bannerContent.querySelector(".revoke-btn")) {
          const revokeBtn = document.createElement("button");
          revokeBtn.className = "btn-link revoke-btn";
          revokeBtn.style.cssText = "margin-left: 12px; padding: 6px 12px; font-size: 12px; background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: #ef4444;";
          revokeBtn.textContent = "Отключить доступ";
          revokeBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm("Отключить внутренний доступ?")) {
              revokeInternalAccess();
            }
          });
          bannerContent.appendChild(revokeBtn);
        }
      }

      // Обновляем подзаголовок
      if (subtitle) {
        subtitle.textContent = "Внутренний доступ: АКТИВЕН";
        subtitle.style.color = "#5ac8fa";
      }

      // Добавляем класс для стилизации
      if (body) {
        body.classList.add("internal-mode");
      }

      // Обработчик закрытия баннера (только один раз)
      const closeBtn = document.getElementById("close-banner");
      if (closeBtn && !closeBtn.hasAttribute("data-listener")) {
        closeBtn.setAttribute("data-listener", "true");
        closeBtn.addEventListener("click", () => {
          if (banner) {
            banner.classList.remove("show");
            setTimeout(() => {
              banner.style.display = "none";
              // Показываем кнопку возврата баннера
              const showBannerBtn = document.getElementById("show-banner-btn");
              if (showBannerBtn) {
                showBannerBtn.style.display = "inline-block";
              }
            }, 400);
          }
        });
      }
      
      // Добавляем кнопку для возврата баннера в controls (если баннер скрыт)
      let showBannerBtn = document.getElementById("show-banner-btn");
      if (!showBannerBtn && document.querySelector(".controls")) {
        showBannerBtn = document.createElement("button");
        showBannerBtn.id = "show-banner-btn";
        showBannerBtn.className = "btn-link";
        showBannerBtn.style.cssText = "background: rgba(90, 200, 250, 0.15); border-color: rgba(90, 200, 250, 0.3); color: #5ac8fa;";
        showBannerBtn.textContent = "🔓 Внутренний доступ";
        showBannerBtn.addEventListener("click", () => {
          if (banner) {
            banner.style.display = "block";
            setTimeout(() => banner.classList.add("show"), 100);
          }
        });
        const controls = document.querySelector(".controls");
        if (controls) {
          // Вставляем после кнопок "О архиве" и "Неполная компиляция"
          const aboutLink = controls.querySelector('a[href="about.html"]');
          if (aboutLink && aboutLink.nextSibling) {
            controls.insertBefore(showBannerBtn, aboutLink.nextSibling);
          } else {
            controls.appendChild(showBannerBtn);
          }
        }
      }
      
      // Показываем кнопку только если баннер скрыт
      if (showBannerBtn) {
        const isBannerVisible = banner && banner.classList.contains("show");
        showBannerBtn.style.display = isBannerVisible ? "none" : "inline-block";
      }
    } else {
      // Скрываем баннер
      if (banner) {
        banner.classList.remove("show");
        banner.style.display = "none";
      }

      // Удаляем кнопку возврата баннера
      const showBannerBtn = document.getElementById("show-banner-btn");
      if (showBannerBtn) {
        showBannerBtn.remove();
      }

      // Возвращаем обычный подзаголовок
      if (subtitle) {
        subtitle.textContent = "Публичный архив контурных единиц (неофициальная компиляция)";
        subtitle.style.color = "rgba(255, 255, 255, 0.75)";
      }

      // Убираем класс
      if (body) {
        body.classList.remove("internal-mode");
      }
    }
  }

  // Инициализация
  function init() {
    // Обработчики событий
    if (qEl) {
      qEl.addEventListener("input", renderList);
    }
    if (typeEl) {
      typeEl.addEventListener("change", renderList);
    }
    if (accessEl) {
      accessEl.addEventListener("change", () => {
        renderList();
        updateInternalAccessUI();
      });
    }

    // Первичная загрузка
    updateInternalAccessUI();
    renderList();
  }

  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
