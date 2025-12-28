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
      if (item.type === "КЕ-Ф" || item.type === "КЕ-?") return "kef";
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

    const settings = window.getContourSettings ? window.getContourSettings() : {};
    const total = items.length;
    const active = items.filter(x => (x.status || "").toUpperCase() === "ACTIVE").length;
    const unknown = items.filter(x => (x.status || "").toUpperCase() === "UNKNOWN").length;
    const spb = items.filter(x =>
      x.spb_mark === true ||
      norm(x.location).includes("санкт") ||
      (x.tags || []).some(t => norm(t) === "спб")
    ).length;

    // Применяем настройки к статистике
    let displayTotal = total;
    let displayActive = active;
    let displayUnknown = unknown;
    let displaySpb = spb;

    // Режим "Консервативный" - скрываем часть статистики
    if (settings.interpretationMode === 'conservative') {
      // Не меняем числа, но они уже отфильтрованы
    }

    // Режим "Допущения" - может показывать дополнительные данные
    if (settings.interpretationMode === 'assumptions' && settings.showUnconfirmed) {
      // Может показывать больше unknown
    }

    // Сглаживать расхождения - скрываем unknown из статистики
    if (settings.smoothDiscrepancies) {
      displayUnknown = 0; // Не показываем unknown в статистике
    }

    // Поведение при несоответствиях - влияет на общее количество
    if (settings.mismatchBehavior === 'remove') {
      // Числа уже отфильтрованы
    }

    let statsHTML = `
      <div class="stat">
        <div class="k">Всего единиц</div>
        <div class="v">${displayTotal}</div>
      </div>
      <div class="stat">
        <div class="k">Активных</div>
        <div class="v">${displayActive}</div>
      </div>
    `;

    // Показываем unknown только если не сглаживаем расхождения
    if (!settings.smoothDiscrepancies || displayUnknown > 0) {
      statsHTML += `
        <div class="stat">
          <div class="k">Неизвестных</div>
          <div class="v">${displayUnknown}</div>
        </div>
      `;
    }

    statsHTML += `
      <div class="stat">
        <div class="k">Связано с СПб</div>
        <div class="v">${displaySpb}</div>
      </div>
    `;

    // Режим "Несогласованный" - добавляем предупреждение
    if (settings.interpretationMode === 'inconsistent') {
      statsHTML += `
        <div class="stat" style="color: rgba(239, 68, 68, 0.8); margin-top: 8px; font-size: 12px;">
          <div class="k">⚠ Нестабильная выдача</div>
        </div>
      `;
    }

    statsEl.innerHTML = statsHTML;
  }

  // Рендер карточки угрозы
  function renderThreatCard(item) {
    return `
      <a href="dossier.html?id=${encodeURIComponent(item.id)}" class="threat-card">
        <div class="threat-warning">Подтверждён риск для жизни</div>
        <div class="threat-id">${item.id}</div>
        <div class="threat-title">ЗАСЕКРЕЧЕНО</div>
        <div class="threat-desc">ЗАСЕКРЕЧЕНО</div>
      </a>
    `;
  }

  // Рендер одной карточки
  function renderCard(item) {
    const settings = window.getContourSettings ? window.getContourSettings() : {};
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

    // Применяем настройки интерпретации
    let title = item.title || "";
    let summary = item.summary || "";
    let additionalNotes = "";
    let statusDisplay = statusBadge(item.status);

    // Режим "Допущения" - добавляем пометки
    if (settings.interpretationMode === 'assumptions') {
      // 40% вероятность пометки для записей с неполными данными
      if ((!item.summary || item.summary.length < 30) && Math.random() > 0.6) {
        additionalNotes += '<div class="small" style="color: rgba(255,255,255,0.5); margin-top: 4px; font-style: italic;">[неподтверждённые данные]</div>';
      }
      // Для UNKNOWN всегда добавляем пометку
      if (item.status === 'UNKNOWN' && Math.random() > 0.3) {
        additionalNotes += '<div class="small" style="color: rgba(245, 158, 11, 0.8); margin-top: 4px;">[требует проверки]</div>';
      }
    }

    // Режим "Несогласованный" - добавляем противоречия
    if (settings.interpretationMode === 'inconsistent') {
      // 30% вероятность противоречия
      if (Math.random() > 0.7) {
        title = `<span style="text-decoration: line-through; opacity: 0.5;">${title}</span> <span style="color: rgba(239, 68, 68, 0.8);">[противоречие]</span>`;
      }
      // Иногда показываем зачёркнутый summary
      if (summary && Math.random() > 0.8) {
        summary = `<span style="text-decoration: line-through; opacity: 0.4;">${summary}</span>`;
      }
    }

    // Показывать неподтверждённые элементы
    if (settings.showUnconfirmed) {
      if (item.status === 'UNKNOWN') {
        additionalNotes += '<div class="small" style="color: rgba(245, 158, 11, 0.8); margin-top: 4px;">⚠ Неподтверждённый элемент</div>';
      }
      // Также помечаем записи без полных данных
      if ((!item.summary || item.summary.length < 20) && item.status !== 'UNKNOWN') {
        additionalNotes += '<div class="small" style="color: rgba(245, 158, 11, 0.6); margin-top: 4px;">[неполные данные]</div>';
      }
    }

    // Скрывать повторяющиеся формулировки
    if (settings.hideRepetitions) {
      // Скрываем слишком короткие описания
      if (summary && summary.length < 25) {
        summary = "";
      }
      // Скрываем повторяющиеся теги (если есть)
      if (tags && tags.split('</span>').length > 3) {
        // Оставляем только первые 3 тега
        const tagArray = (item.tags || []).slice(0, 3);
        tags = tagArray.map(t => `<span class="tag">${t}</span>`).join("");
      }
    }

    // Сглаживать расхождения - убираем пометки о несоответствиях
    if (settings.smoothDiscrepancies) {
      // Не показываем статус UNKNOWN как проблему - меняем на обычный badge
      if (item.status === 'UNKNOWN') {
        statusDisplay = '<span class="badge">UNKNOWN</span>';
      }
      // Убираем предупреждения о неполных данных
      if (additionalNotes.includes('[неполные данные]')) {
        additionalNotes = additionalNotes.replace(/\[неполные данные\]/g, '');
      }
    }

    // Поведение при несоответствиях - помечать
    if (settings.mismatchBehavior === 'mark') {
      // Помечаем записи с несоответствиями
      const hasMismatch = (item.status === 'ACTIVE' && !item.summary) || 
                         (item.status === 'UNKNOWN' && !item.title) ||
                         (item.type && !item.location && !item.tags?.length);
      if (hasMismatch) {
        additionalNotes += '<div class="small" style="color: rgba(239, 68, 68, 0.8); margin-top: 4px;">[несоответствие данных]</div>';
      }
    }

    // Уровень детализации влияет на отображение
    const detailLevel = settings.detailLevel !== undefined ? settings.detailLevel : 1;
    if (detailLevel === 0) {
      // Сводка - скрываем часть информации
      if (tags) tags = ""; // Скрываем теги
      if (item.location) {
        // Скрываем локацию или показываем сокращённо
        item.location = item.location.length > 20 ? item.location.substring(0, 20) + '...' : item.location;
      }
    }
    
    return `
      <a href="dossier.html?id=${encodeURIComponent(item.id)}" class="card" ${dataAccess}>
        <div class="row">
          <div>${item.id}</div>
          <div>${item.type}</div>
          ${statusBadge(item.status)}
          ${accessBadge}
        </div>
        <div class="title">${title}</div>
        <div class="small">${summary}</div>
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        ${item.location ? `<div class="small" style="margin-top: 8px; color: rgba(255,255,255,0.6);">📍 ${item.location}</div>` : ""}
        ${additionalNotes}
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
    const threats = data.filter(item => item.isThreat === true && !item.locked);
    const regularData = data.filter(item => !item.isThreat);

    // Получаем настройки
    const settings = window.getContourSettings ? window.getContourSettings() : {};
    
    // Фильтруем обычные данные строго по уровню доступа и проверяем locked
    let filtered = regularData.filter(item => {
      // Показываем только незаблокированные записи (KES-001 и KEM-002)
      if (item.locked === true) {
        return false;
      }
      
      // Сначала проверяем доступ через функцию accessOk
      if (!accessOk(item, acc)) {
        return false;
      }
      
      // Затем проверяем поиск и тип
      return matches(item, q) && typeOk(item, t);
    });
    
    // Проверяем, есть ли заблокированные записи, которые соответствуют фильтрам
    const hasLockedItems = regularData.some(item => {
      if (item.locked !== true) return false;
      if (!accessOk(item, acc)) return false;
      return matches(item, q) && typeOk(item, t);
    });

    // Применяем режим интерпретации
    if (settings.interpretationMode === 'conservative') {
      // Консервативный: меньше записей, только проверенные
      filtered = filtered.filter(item => {
        // Показываем только записи с полными данными и известным статусом
        const hasFullData = item.title && item.summary && item.summary.length > 20;
        const hasKnownStatus = item.status && item.status !== 'UNKNOWN';
        const hasLocation = item.location || item.tags?.length > 0;
        return hasFullData && hasKnownStatus && hasLocation;
      });
    } else if (settings.interpretationMode === 'assumptions') {
      // Допущения: показываем больше записей, включая неполные
      // Не фильтруем дополнительно, но добавим пометки при рендеринге
    } else if (settings.interpretationMode === 'inconsistent') {
      // Несогласованный: показываем все, включая противоречивые
      // Не фильтруем, но добавим противоречия при рендеринге
    }

    // Применяем поведение при несоответствиях
    if (settings.mismatchBehavior === 'remove') {
      // Удаляем записи с несоответствиями
      filtered = filtered.filter(item => {
        // Проверяем на несоответствия
        if (item.status === 'ACTIVE' && !item.summary) return false;
        if (item.status === 'UNKNOWN' && !item.title) return false;
        if (item.type && !item.location && !item.tags?.length) return false;
        return true;
      });
    } else if (settings.mismatchBehavior === 'mark') {
      // Помечаем записи с несоответствиями (добавим пометки при рендеринге)
    }

    // Применяем экспериментальные параметры
    if (settings.showOutsideCompilation) {
      // Показываем материалы вне компиляции - не фильтруем по типу строго
    }

    if (settings.allowDelayed) {
      // Разрешаем отложенные данные - показываем записи даже с неполными данными
      // Не фильтруем дополнительно
    }

    renderStats(filtered);

    // Обновляем список угроз (но не показываем автоматически)
    if (listThreats) {
      if (threats.length > 0) {
        listThreats.innerHTML = threats.map(renderThreatCard).join("");
        // Показываем кнопку, если есть угрозы
        if (toggleThreatsBtn) {
          toggleThreatsBtn.style.display = "flex";
        }
      } else {
        listThreats.innerHTML = "";
        if (toggleThreatsBtn) {
          toggleThreatsBtn.style.display = "none";
        }
        if (sectionThreats) {
          sectionThreats.style.display = "none";
        }
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

  // Управление видимостью угроз
  function toggleThreatsSection() {
    if (sectionThreats) {
      const isVisible = sectionThreats.style.display === "block";
      sectionThreats.style.display = isVisible ? "none" : "block";
      
      // Прокручиваем к секции, если открываем
      if (!isVisible) {
        setTimeout(() => {
          sectionThreats.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
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
      
      // Обработчик изменения настроек
      window.addEventListener('contourSettingsChanged', () => {
        renderList();
      });
    }
    if (accessEl) {
      accessEl.addEventListener("change", () => {
        updateAccessTheme();
        renderList();
        // Обновляем UI внутреннего доступа после смены темы
        updateInternalAccessUI();
      });
    }

    // Обработчики событий для кнопок угроз
    if (toggleThreatsBtn) {
      toggleThreatsBtn.addEventListener("click", toggleThreatsSection);
    }
    
    if (closeThreatsBtn) {
      closeThreatsBtn.addEventListener("click", () => {
        if (sectionThreats) {
          sectionThreats.style.display = "none";
        }
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
