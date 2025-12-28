(() => {
  'use strict';

  // Элементы DOM
  const qEl = document.getElementById("q");
  const typeEl = document.getElementById("type");
  const accessEl = document.getElementById("access");
  const listEl = document.getElementById("list"); // Оставляем для обратной совместимости, но не используем
  const statsEl = document.getElementById("stats");
  const toggleThreatsBtn = document.getElementById("toggle-threats");
  const closeThreatsBtn = document.getElementById("close-threats");
  
  // Элементы секций
  const sectionKes = document.getElementById("section-kes");
  const sectionKem = document.getElementById("section-kem");
  const sectionKef = document.getElementById("section-kef");
  const sectionThreats = document.getElementById("section-threats");
  const sectionEmpty = document.getElementById("section-empty");
  const listKes = document.getElementById("list-kes");
  const listKem = document.getElementById("list-kem");
  const listKef = document.getElementById("list-kef");
  const listThreats = document.getElementById("list-threats");

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
    if (t === "all" || t === "КЕ") return true;
    return item.type === t;
  }

  // Определение категории по типу или id
  function getCategory(item) {
    // Сначала проверяем поле type
    if (item.type) {
      if (item.type === "КЕ-С") return "kes";
      if (item.type === "КЕ-М") return "kem";
      if (item.type === "КЕ-Ф") return "kef";
    }
    
    // Если type нет, определяем по префиксу id
    if (item.id) {
      const prefix = item.id.substring(0, 3).toUpperCase();
      if (prefix === "KES") return "kes";
      if (prefix === "KEM") return "kem";
      if (prefix === "KEF") return "kef";
    }
    
    // По умолчанию
    return "kes";
  }

  function accessOk(item, acc) {
    // Убеждаемся, что у элемента есть поле access
    const itemAccess = item.access || "public";
    
    // СТРОГАЯ проверка: каждый уровень доступа показывает ТОЛЬКО свои материалы
    // Никаких пересечений между категориями
    if (acc === "public") {
      // Публичный - ТОЛЬКО публичные (не leak, не internal)
      return itemAccess === "public";
    }
    
    if (acc === "leak") {
      // Утечка - ТОЛЬКО утечки (не public, не internal)
      return itemAccess === "leak";
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

  // Рендер карточки угрозы
  function renderThreatCard(item) {
    return `
      <a href="dossier.html?id=${encodeURIComponent(item.id)}" class="threat-card">
        <div class="threat-warning">Угроза жизни подтверждена</div>
        <div class="threat-id">${item.id}</div>
        <div class="threat-title">${item.title}</div>
      </a>
    `;
  }

  // Рендер одной карточки
  function renderCard(item) {
    const tags = (item.tags || []).map(t => `<span class="tag">${t}</span>`).join("");
    const itemAccess = item.access || "public";
    let accessBadge = "";
    let dataAccess = "";
    
    if (itemAccess === "internal") {
      accessBadge = '<span class="badge" style="background: rgba(90, 200, 250, 0.15); border-color: rgba(90, 200, 250, 0.3); color: #5ac8fa;">INTERNAL</span>';
      dataAccess = 'data-access="internal"';
    } else if (itemAccess === "leak") {
      accessBadge = '<span class="badge" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.3); color: #f59e0b;">LEAK</span>';
      dataAccess = 'data-access="leak"';
    } else {
      dataAccess = 'data-access="public"';
    }
    
    return `
      <a href="dossier.html?id=${encodeURIComponent(item.id)}" class="card" ${dataAccess}>
        <div class="row">
          <div>${item.id}</div>
          <div>${item.type}</div>
          ${statusBadge(item.status)}
          ${accessBadge}
        </div>
        <div class="title">${item.title}</div>
        <div class="small">${item.summary || ""}</div>
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        ${item.location ? `<div class="small" style="margin-top: 8px; color: rgba(255,255,255,0.6);">📍 ${item.location}</div>` : ""}
      </a>
    `;
  }

  function renderList() {
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

    // Отделяем угрозы от обычных записей
    // Угрозы показываются всегда, независимо от фильтра доступа
    const threats = data.filter(item => item.isThreat === true);
    const regularData = data.filter(item => !item.isThreat);

    // Фильтруем обычные данные строго по уровню доступа
    const filtered = regularData.filter(item => {
      // Сначала проверяем доступ через функцию accessOk
      if (!accessOk(item, acc)) {
        return false;
      }
      
      // Затем проверяем поиск и тип
      return matches(item, q) && typeOk(item, t);
    });

    renderStats(filtered);

    // Показываем секцию угроз (всегда, если есть угрозы)
    if (sectionThreats && listThreats) {
      if (threats.length > 0) {
        sectionThreats.style.display = "block";
        listThreats.innerHTML = threats.map(renderThreatCard).join("");
      } else {
        sectionThreats.style.display = "none";
      }
    }

    // Распределяем по категориям
    const kesItems = [];
    const kemItems = [];
    const kefItems = [];

    filtered.forEach(item => {
      const category = getCategory(item);
      if (category === "kes") {
        kesItems.push(item);
      } else if (category === "kem") {
        kemItems.push(item);
      } else if (category === "kef") {
        kefItems.push(item);
      }
    });

    // Определяем, какие секции показывать на основе фильтра типа
    let showKes = false;
    let showKem = false;
    let showKef = false;

    if (t === "all" || t === "КЕ") {
      // Показываем все секции, если есть элементы
      showKes = kesItems.length > 0;
      showKem = kemItems.length > 0;
      showKef = kefItems.length > 0;
    } else if (t === "КЕ-С") {
      showKes = kesItems.length > 0;
    } else if (t === "КЕ-М") {
      showKem = kemItems.length > 0;
    } else if (t === "КЕ-Ф") {
      showKef = kefItems.length > 0;
    }

    // Рендерим секции
    if (listKes) {
      listKes.innerHTML = kesItems.map(renderCard).join("");
    }
    if (listKem) {
      listKem.innerHTML = kemItems.map(renderCard).join("");
    }
    if (listKef) {
      listKef.innerHTML = kefItems.map(renderCard).join("");
    }

    // Показываем/скрываем секции
    if (sectionKes) {
      sectionKes.style.display = showKes ? "block" : "none";
    }
    if (sectionKem) {
      sectionKem.style.display = showKem ? "block" : "none";
    }
    if (sectionKef) {
      sectionKef.style.display = showKef ? "block" : "none";
    }

    // Показываем сообщение "Ничего не найдено", если все секции пусты
    const hasAnyItems = kesItems.length > 0 || kemItems.length > 0 || kefItems.length > 0;
    if (sectionEmpty) {
      sectionEmpty.style.display = hasAnyItems ? "none" : "block";
    }
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
    const currentAccess = accessEl ? accessEl.value : "public";

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

      // Обновляем подзаголовок в зависимости от текущего фильтра
      if (subtitle) {
        if (currentAccess === "internal") {
          subtitle.textContent = "Внутренний доступ: АКТИВЕН";
          subtitle.style.color = "#5ac8fa";
        } else {
          subtitle.textContent = `Публичный архив контурных единиц (внутренний доступ активен, просмотр: ${currentAccess === "public" ? "публичный" : "утечка"})`;
          subtitle.style.color = currentAccess === "leak" ? "#f59e0b" : "rgba(255, 255, 255, 0.75)";
        }
      }

      // Добавляем класс только если выбран внутренний доступ
      if (body) {
        if (currentAccess === "internal") {
          body.classList.add("has-internal-access");
        } else {
          body.classList.remove("has-internal-access");
        }
        // НЕ добавляем internal-mode, чтобы не конфликтовать с цветовой схемой
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
        const currentAccess = accessEl ? accessEl.value : "public";
        if (currentAccess === "leak") {
          subtitle.textContent = "Публичный архив контурных единиц (неофициальная компиляция) — просмотр утечек";
          subtitle.style.color = "#f59e0b";
        } else {
          subtitle.textContent = "Публичный архив контурных единиц (неофициальная компиляция)";
          subtitle.style.color = "rgba(255, 255, 255, 0.75)";
        }
      }

      // Убираем все классы внутреннего доступа
      if (body) {
        body.classList.remove("internal-mode", "has-internal-access");
      }
    }
  }

  // Обновление цветовой схемы по уровню доступа
  function updateAccessTheme() {
    const acc = accessEl ? accessEl.value : "public";
    const body = document.body;
    const hasInternal = hasInternalAccess();
    
    // Удаляем все классы доступа
    body.classList.remove("access-public", "access-leak", "access-internal", "internal-mode");
    
    // Добавляем нужный класс в зависимости от выбранного фильтра
    // ВАЖНО: цветовая схема зависит ТОЛЬКО от выбранного фильтра, не от наличия внутреннего доступа
    if (acc === "public") {
      body.classList.add("access-public");
    } else if (acc === "leak") {
      body.classList.add("access-leak");
    } else if (acc === "internal") {
      body.classList.add("access-internal");
      // Если выбран внутренний доступ И он активирован - добавляем дополнительный класс
      if (hasInternal) {
        body.classList.add("has-internal-access");
      }
    }
    
    // Обновляем подзаголовок с учетом текущего фильтра
    const subtitle = document.getElementById("subtitle");
    if (subtitle && hasInternal) {
      if (acc === "internal") {
        subtitle.textContent = "Внутренний доступ: АКТИВЕН";
        subtitle.style.color = "#5ac8fa";
      } else {
        subtitle.textContent = `Публичный архив контурных единиц (внутренний доступ активен, просмотр: ${acc === "public" ? "публичный" : "утечка"})`;
        subtitle.style.color = acc === "leak" ? "#f59e0b" : "rgba(255, 255, 255, 0.75)";
      }
    } else if (subtitle) {
      if (acc === "leak") {
        subtitle.textContent = "Публичный архив контурных единиц (неофициальная компиляция) — просмотр утечек";
        subtitle.style.color = "#f59e0b";
      } else {
        subtitle.textContent = "Публичный архив контурных единиц (неофициальная компиляция)";
        subtitle.style.color = "rgba(255, 255, 255, 0.75)";
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
        updateAccessTheme();
        renderList();
        // Обновляем UI внутреннего доступа после смены темы
        updateInternalAccessUI();
      });
    }

    // Первичная загрузка
    updateAccessTheme();
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
