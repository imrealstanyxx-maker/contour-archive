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
  
  // Новые элементы для фильтров
  const filterResultsPanel = document.getElementById("filter-results-panel");
  const resultsCountEl = document.getElementById("results-count");
  const activeFiltersEl = document.getElementById("active-filters");
  const resetFiltersBtn = document.getElementById("reset-filters-btn");
  const lockedMaterialsPanel = document.getElementById("locked-materials-panel");
  const lockedCountEl = document.getElementById("locked-count");
  const terminalIndicatorEl = document.getElementById("terminal-indicator");
  
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
  
  // Состояние фильтров по тегам
  let activeTags = new Set();

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

  function tagsOk(item, activeTagsSet) {
    if (activeTagsSet.size === 0) return true;
    const itemTags = (item.tags || []).map(norm);
    return Array.from(activeTagsSet).some(tag => itemTags.includes(norm(tag)));
  }

  // Сохранение состояния в URL и sessionStorage
  function saveState() {
    try {
      const q = qEl ? qEl.value : "";
      const type = typeEl ? typeEl.value : "all";
      const access = accessEl ? accessEl.value : "public";
      const tags = Array.from(activeTags);
      
      const state = {
        q: q,
        type: type,
        access: access,
        tags: tags,
        scrollY: window.scrollY
      };
      sessionStorage.setItem('contour_archive_state', JSON.stringify(state));
      
      // Сохранение в URL через query params
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (type && type !== 'all' && type !== 'КЕ') params.set('type', type);
      if (access && access !== 'public') params.set('access', access);
      if (tags.length > 0) params.set('tags', tags.join(','));
      
      const newUrl = params.toString() 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      
      // Обновляем URL без перезагрузки
      window.history.replaceState({}, '', newUrl);
    } catch (e) {
      // Игнорируем ошибки
    }
  }

  // Восстановление состояния из URL или sessionStorage
  function restoreState() {
    try {
      // Сначала пробуем восстановить из URL
      const params = new URLSearchParams(window.location.search);
      const urlQ = params.get('q');
      const urlType = params.get('type');
      const urlAccess = params.get('access');
      const urlTags = params.get('tags');
      
      if (urlQ !== null || urlType !== null || urlAccess !== null || urlTags !== null) {
        // Восстанавливаем из URL
        if (qEl && urlQ !== null) qEl.value = urlQ;
        if (typeEl && urlType !== null) typeEl.value = urlType;
        if (accessEl && urlAccess !== null) accessEl.value = urlAccess;
        if (urlTags) {
          activeTags = new Set(urlTags.split(',').filter(t => t));
        }
      } else {
        // Восстанавливаем из sessionStorage
        const saved = sessionStorage.getItem('contour_archive_state');
        if (saved) {
          const state = JSON.parse(saved);
          if (qEl && state.q) qEl.value = state.q;
          if (typeEl && state.type) typeEl.value = state.type;
          if (accessEl && state.access) accessEl.value = state.access;
          if (state.tags && Array.isArray(state.tags)) {
            activeTags = new Set(state.tags);
          }
        }
      }
      
      // Восстанавливаем скролл после рендера
      setTimeout(() => {
        try {
          const saved = sessionStorage.getItem('contour_archive_state');
          if (saved) {
            const state = JSON.parse(saved);
            if (state.scrollY) window.scrollTo(0, state.scrollY);
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }, 100);
    } catch (e) {
      // Игнорируем ошибки
    }
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

    const total = items.length;
    const active = items.filter(x => (x.status || "").toUpperCase() === "ACTIVE").length;
    const unknown = items.filter(x => (x.status || "").toUpperCase() === "UNKNOWN").length;
    const spb = items.filter(x =>
      x.spb_mark === true ||
      norm(x.location).includes("санкт") ||
      (x.tags || []).some(t => norm(t) === "спб")
    ).length;
    
    // Подсчитываем заблокированные контейнеры
    const lockedCount = (data || []).filter(item => 
      !item.isThreat && item.locked === true
    ).length;

    const statsHTML = `
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
      <div class="stat">
        <div class="k">Скрыто контейнеров</div>
        <div class="v">${lockedCount > 0 ? lockedCount : '—'}</div>
      </div>
    `;

    statsEl.innerHTML = statsHTML;
  }

  // Рендер карточки угрозы
  function renderThreatCard(item) {
    // Для THREAT-002 показываем информацию, для остальных - ЗАСЕКРЕЧЕНО
    if (item.id === "THREAT-002") {
      const title = item.title || "Сменщик";
      const summary = item.summary || "";
      const status = item.status || "";
      return `
        <a href="dossier.html?id=${encodeURIComponent(item.id)}" class="threat-card">
          <div class="threat-warning">Подтверждён риск для жизни</div>
          <div class="threat-id">${item.id}</div>
          <div class="threat-title">${title}</div>
          ${status ? `<div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-bottom: 8px;">${status}</div>` : ""}
          <div class="threat-desc">${summary}</div>
        </a>
      `;
    } else {
      return `
        <a href="dossier.html?id=${encodeURIComponent(item.id)}" class="threat-card">
          <div class="threat-warning">Подтверждён риск для жизни</div>
          <div class="threat-id">${item.id}</div>
          <div class="threat-title">ЗАСЕКРЕЧЕНО</div>
          <div class="threat-desc">ЗАСЕКРЕЧЕНО</div>
        </a>
      `;
    }
  }

  // Рендер плейсхолдера "ЗАШИФРОВАНО"
  function renderPlaceholderCard() {
    return `
      <div class="card" style="opacity: 0.6; cursor: default; pointer-events: none;">
        <div class="row">
          <div style="color: rgba(255, 255, 255, 0.4);">—</div>
          <div style="color: rgba(255, 255, 255, 0.4);">—</div>
          <span class="badge" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: rgba(239, 68, 68, 0.6);">ЗАШИФРОВАНО</span>
        </div>
        <div class="title" style="color: rgba(255, 255, 255, 0.5);">Контейнер изъят</div>
        <div class="small" style="color: rgba(255, 255, 255, 0.4);">Ожидается повторная компиляция.</div>
      </div>
    `;
  }
  
  // Рендер карточек с плейсхолдерами
  function renderCardsWithPlaceholders(items, minCount) {
    const cards = items.map(renderCard);
    const placeholderCount = Math.max(0, Math.min(4, minCount - items.length));
    for (let i = 0; i < placeholderCount; i++) {
      cards.push(renderPlaceholderCard());
    }
    return cards.join("");
  }
  
  // Рендер одной карточки
  function renderCard(item) {
    const itemTags = item.tags || [];
    const tags = itemTags.map(t => {
      const isActive = activeTags.has(t);
      // Экранируем для HTML и для использования в JavaScript
      // Экранируем для HTML
      const htmlEscapedTag = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      // Экранируем для использования в onclick
      const jsEscapedTag = t.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      return `<span class="tag ${isActive ? 'active' : ''}" data-tag="${htmlEscapedTag}" onclick="event.stopPropagation(); if(window.toggleTag)window.toggleTag('${jsEscapedTag}');">${htmlEscapedTag}</span>`;
    }).join("");
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

    const title = item.title || "";
    const summary = item.summary || "";
    
    // Сохраняем состояние перед переходом
    const href = `dossier.html?id=${encodeURIComponent(item.id)}`;
    
    return `
      <a href="${href}" class="card" ${dataAccess} onclick="window.saveArchiveState && window.saveArchiveState();">
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
      </a>
    `;
  }
  
  // Переключение тега
  window.toggleTag = function(tag) {
    if (activeTags.has(tag)) {
      activeTags.delete(tag);
    } else {
      activeTags.add(tag);
    }
    saveState();
    renderList();
  };
  
  // Сохранение состояния перед переходом
  window.saveArchiveState = saveState;

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
      
      // Затем проверяем поиск, тип и теги
      return matches(item, q) && typeOk(item, t) && tagsOk(item, activeTags);
    });
    
    // Проверяем, есть ли заблокированные записи, которые соответствуют фильтрам
    const lockedItems = regularData.filter(item => {
      if (item.locked !== true) return false;
      if (!accessOk(item, acc)) return false;
      return matches(item, q) && typeOk(item, t) && tagsOk(item, activeTags);
    });

    // Обновляем индикаторы результатов и фильтров
    updateFilterIndicators(filtered.length, q, t, acc);
    updateLockedMaterials(lockedItems.length);
    updateTerminalIndicator();
    
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

    // Рендерим секции с плейсхолдерами
    if (listKes) {
      listKes.innerHTML = renderCardsWithPlaceholders(kesItems, 2);
    }
    if (listKem) {
      listKem.innerHTML = renderCardsWithPlaceholders(kemItems, 2);
    }
    if (listKef) {
      listKef.innerHTML = renderCardsWithPlaceholders(kefItems, 2);
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
    
    // Обновляем пустые секции на "Материалы изъяты"
    updateEmptySections(showKes, showKem, showKef, kesItems.length, kemItems.length, kefItems.length);
    
    saveState();
  }
  
  // Обновление индикаторов фильтров
  function updateFilterIndicators(count, q, t, acc) {
    const hasActiveFilters = q || (t !== "all" && t !== "КЕ") || acc !== "public" || activeTags.size > 0;
    
    if (filterResultsPanel) {
      filterResultsPanel.style.display = hasActiveFilters ? "block" : "none";
    }
    
    if (resultsCountEl) {
      if (hasActiveFilters) {
        resultsCountEl.textContent = `Найдено записей: ${count}`;
      } else {
        resultsCountEl.textContent = "";
      }
    }
    
    if (activeFiltersEl && hasActiveFilters) {
      const chips = [];
      
      if (q) {
        chips.push(createFilterChip("Поиск", q, "search", q));
      }
      
      if (t !== "all" && t !== "КЕ") {
        const typeLabel = t === "КЕ-С" ? "КЕ-С" : t === "КЕ-М" ? "КЕ-М" : t === "КЕ-Ф" ? "КЕ-Ф" : t;
        chips.push(createFilterChip("Тип", typeLabel, "type", t));
      }
      
      if (acc !== "public") {
        const accessLabel = acc === "leak" ? "Утечка" : acc === "internal" ? "Внутренний" : acc;
        chips.push(createFilterChip("Доступ", accessLabel, "access", acc));
      }
      
      Array.from(activeTags).forEach(tag => {
        chips.push(createFilterChip("Тег", tag, "tag", tag));
      });
      
      activeFiltersEl.innerHTML = chips.join("");
      
      // Добавляем обработчики на кнопки удаления
      activeFiltersEl.querySelectorAll('.filter-chip-remove').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const chip = this.closest('.filter-chip');
          if (chip) {
            const filterType = chip.getAttribute('data-filter-type');
            const filterValue = chip.getAttribute('data-filter-value');
            
            if (filterType === "search") {
              if (qEl) qEl.value = "";
            } else if (filterType === "type") {
              if (typeEl) typeEl.value = "all";
            } else if (filterType === "access") {
              if (accessEl) accessEl.value = "public";
            } else if (filterType === "tag") {
              activeTags.delete(filterValue);
            }
            
            saveState();
            renderList();
          }
        });
      });
    }
  }
  
  function createFilterChip(label, value, filterType, filterValue) {
    const escapedValue = (value || "").toString().replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedFilterType = (filterType || "").replace(/"/g, '&quot;');
    const escapedFilterValue = (filterValue || "").toString().replace(/"/g, '&quot;');
    return `
      <div class="filter-chip" data-filter-type="${escapedFilterType}" data-filter-value="${escapedFilterValue}">
        <span>${label}: ${escapedValue}</span>
        <span class="filter-chip-remove">×</span>
      </div>
    `;
  }
  
  // Обновление блока заблокированных материалов
  function updateLockedMaterials(count) {
    if (lockedMaterialsPanel) {
      lockedMaterialsPanel.style.display = count > 0 ? "block" : "none";
      if (lockedCountEl && count > 0) {
        lockedCountEl.textContent = `(изъято: ${count})`;
      }
    }
  }
  
  // Обновление индикатора терминала
  function updateTerminalIndicator() {
    if (!terminalIndicatorEl) return;
    
    try {
      const level = localStorage.getItem('contour_terminal_level');
      const newFragments = localStorage.getItem('contour_terminal_new_fragments');
      
      if (level || newFragments) {
        let text = "";
        if (level) {
          const levelNum = parseInt(level, 10) || 0;
          text = `Сеанс ввода: уровень ${levelNum}`;
        }
        if (newFragments) {
          const count = parseInt(newFragments, 10) || 0;
          if (count > 0) {
            text += (text ? ". " : "") + `Новые фрагменты: ${count}`;
          }
        }
        if (text) {
          terminalIndicatorEl.textContent = text;
          terminalIndicatorEl.style.display = "block";
        } else {
          terminalIndicatorEl.style.display = "none";
        }
      } else {
        terminalIndicatorEl.style.display = "none";
      }
    } catch (e) {
      terminalIndicatorEl.style.display = "none";
    }
  }
  
  // Обновление пустых секций
  function updateEmptySections(showKes, showKem, showKef, kesCount, kemCount, kefCount) {
    // Логика пустых секций обрабатывается выше - секции скрываются, если нет элементов
    // Этот блок можно использовать для дополнительной логики в будущем
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

  // Сброс всех фильтров
  function resetAllFilters() {
    if (qEl) qEl.value = "";
    if (typeEl) typeEl.value = "all";
    if (accessEl) accessEl.value = "public";
    activeTags.clear();
    // Очищаем URL
    window.history.replaceState({}, '', window.location.pathname);
    saveState();
    renderList();
  }
  
  // Инициализация
  function init() {
    try {
      // Восстанавливаем состояние
      restoreState();
      
      // Дебаунс для поиска
      let searchTimeout = null;
      if (qEl) {
        qEl.addEventListener("input", () => {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            saveState();
            renderList();
          }, 300); // 300ms дебаунс
        });
      }
      
      // Горячие клавиши
      document.addEventListener('keydown', (e) => {
        // "/" фокусирует поиск (если не в input/textarea)
        if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          e.preventDefault();
          if (qEl) {
            qEl.focus();
          }
        }
        // "Esc" закрывает модальные окна/баннеры
        if (e.key === 'Escape') {
          // Закрываем баннер внутреннего доступа если открыт
          const banner = document.getElementById("internal-access-banner");
          if (banner && banner.style.display !== 'none') {
            const closeBtn = document.getElementById("close-banner");
            if (closeBtn) closeBtn.click();
          }
          // Закрываем секцию угроз если открыта
          if (sectionThreats && sectionThreats.style.display === 'block') {
            const closeThreats = document.getElementById("close-threats");
            if (closeThreats) closeThreats.click();
          }
        }
      });
      if (typeEl) {
        typeEl.addEventListener("change", () => {
          saveState();
          renderList();
        });
      }
      if (accessEl) {
        accessEl.addEventListener("change", () => {
          updateAccessTheme();
          saveState();
          renderList();
          // Обновляем UI внутреннего доступа после смены темы
          updateInternalAccessUI();
        });
      }
      
      // Кнопка сброса фильтров
      if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener("click", resetAllFilters);
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
    } catch (error) {
      console.error('Error in init:', error);
      showError('Сбой компиляции. Данные недоступны.', error.message);
    }
  }
  
  // Показ ошибки
  function showError(message, details) {
    const errorHTML = `
      <section class="panel" style="border-left: 3px solid rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.05); margin-top: 20px;">
        <div class="panel-title" style="color: rgba(239, 68, 68, 0.9);">Сбой компиляции</div>
        <div class="panel-body">
          <div class="note" style="color: rgba(255, 255, 255, 0.8);">${message}</div>
          ${details ? `<div class="small" style="margin-top: 8px; color: rgba(255, 255, 255, 0.5); font-family: monospace; font-size: 11px;">${details}</div>` : ""}
        </div>
      </section>
    `;
    
    const wrap = document.querySelector('.wrap');
    if (wrap) {
      wrap.insertAdjacentHTML('afterbegin', errorHTML);
    }
  }

  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
