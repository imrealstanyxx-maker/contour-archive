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

  async function hasInternalAccess(){
    // Проверяем через Supabase
    if (window.CONTOUR_CONFIG && window.CONTOUR_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && typeof window.supabase !== 'undefined') {
      try {
        if (window.contourSupabase) {
          return await window.contourSupabase.hasInternalAccess();
        }
      } catch (e) {
        console.error('Error checking internal access:', e);
      }
    }
    
    // Fallback на старую систему
    if (window.contourAuth && window.contourAuth.hasInternalAccess) {
      const result = window.contourAuth.hasInternalAccess();
      return result instanceof Promise ? await result : result;
    }
    
    return false;
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
  // Проверяем асинхронно и добавляем материалы после проверки
  if (mode === "internal" && Array.isArray(entry.internalMaterials)) {
    hasInternalAccess().then(hasAccess => {
      if (hasAccess) {
        const materialsEl = document.getElementById("blocks");
        if (materialsEl) {
          const internalBlocks = entry.internalMaterials.map(m => {
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
          }).join("");
          materialsEl.insertAdjacentHTML('beforeend', internalBlocks);
        }
      }
    });
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

  // Загрузка наблюдений сообщества для этого досье
  loadCommunityReports(entry.id);

  // Внутренние заметки наблюдателя (нестабильное отображение)
  const internalNoteSection = document.getElementById("internal-note-section");
  const internalNoteEl = document.getElementById("internalNote");
  
  if (internalNoteSection && internalNoteEl) {
    // НАКОПИТЕЛЬНАЯ ЛОГИКА: для KES-001 система "помнит" факт просмотра
    const isAccumulativeEntry = entry.id === "KES-001";
    let noteWasSeen = false;
    
    if (isAccumulativeEntry) {
      try {
        const seenNotes = JSON.parse(localStorage.getItem("contour_seen_internal_notes") || "{}");
        noteWasSeen = seenNotes[entry.id] === true;
      } catch (e) {
        // localStorage недоступен или повреждён - ведём себя как обычно
      }
    }
    
    // Если заметка уже была просмотрена - всегда показываем сообщение об удалении
    if (isAccumulativeEntry && noteWasSeen) {
      internalNoteSection.style.display = "block";
      internalNoteEl.textContent = "Комментарий был учтён и удалён в ходе последующей сверки.";
      internalNoteEl.style.color = "rgba(255, 255, 255, 0.4)";
      internalNoteEl.style.fontStyle = "italic";
    } else {
      // Обычная логика: вероятность показа 30%
      const shouldShow = Math.random() < 0.3;
      
      if (shouldShow && entry.internalNote) {
        // Показываем заметку
        internalNoteSection.style.display = "block";
        internalNoteEl.textContent = entry.internalNote;
        internalNoteEl.style.color = "rgba(255, 255, 255, 0.6)";
        internalNoteEl.style.fontStyle = "normal";
        
        // Сохраняем факт просмотра для накопительных записей
        if (isAccumulativeEntry) {
          try {
            const seenNotes = JSON.parse(localStorage.getItem("contour_seen_internal_notes") || "{}");
            seenNotes[entry.id] = true;
            localStorage.setItem("contour_seen_internal_notes", JSON.stringify(seenNotes));
          } catch (e) {
            // localStorage недоступен - игнорируем
          }
        }
      } else {
        // Показываем сообщение об отсутствии
        internalNoteSection.style.display = "block";
        internalNoteEl.textContent = "Дополнительные комментарии отсутствуют или были удалены в ходе сверки.";
        internalNoteEl.style.color = "rgba(255, 255, 255, 0.4)";
        internalNoteEl.style.fontStyle = "italic";
      }
    }
  }

  // Добавляем кнопку избранного для авторизованных пользователей
  (async () => {
    let isAuthenticated = false;
    let userId = null;
    
    // Проверяем через Supabase
    if (window.CONTOUR_CONFIG && window.CONTOUR_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && typeof window.supabase !== 'undefined') {
      try {
        const supabase = window.supabase.createClient(
          window.CONTOUR_CONFIG.SUPABASE_URL,
          window.CONTOUR_CONFIG.SUPABASE_ANON_KEY
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          isAuthenticated = true;
          userId = user.id;
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    } else if (window.contourAuth && window.contourAuth.isAuthenticated()) {
      isAuthenticated = true;
      const userData = window.contourAuth.getUserData();
      if (userData) userId = userData.id || 'local';
    }
    
    if (!isAuthenticated) return;
    
    const favoritesKey = userId ? `contour_favorites_${userId}` : "contour_favorites";
    const favorites = JSON.parse(localStorage.getItem(favoritesKey) || localStorage.getItem("contour_favorites") || "[]");
    const isFavorite = favorites.includes(entry.id);
    
    const favoriteBtn = document.createElement("button");
    favoriteBtn.className = "btn-link";
    favoriteBtn.style.width = "100%";
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
      const favoritesKey = userId ? `contour_favorites_${userId}` : "contour_favorites";
      let favs = JSON.parse(localStorage.getItem(favoritesKey) || localStorage.getItem("contour_favorites") || "[]");
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
      localStorage.setItem(favoritesKey, JSON.stringify(favs));
    });
    
    const noteContainer = document.getElementById("editorNote")?.parentElement;
    if (noteContainer) {
      noteContainer.appendChild(favoriteBtn);
    }
  })();
  
  // Загрузка наблюдений сообщества
  async function loadCommunityReports(dossierId) {
    // Проверяем наличие Supabase
    if (!window.CONTOUR_CONFIG || window.CONTOUR_CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
      return;
    }

    try {
      const supabase = window.supabase?.createClient(
        window.CONTOUR_CONFIG.SUPABASE_URL,
        window.CONTOUR_CONFIG.SUPABASE_ANON_KEY
      );

      if (!supabase) return;

      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      
      // Загружаем наблюдения для этого досье
      const { data: reports, error } = await supabase
        .from('community_reports')
        .select(`
          *,
          profiles:user_id (username, email)
        `)
        .eq('dossier_id', dossierId)
        .in('status', ['final_approved', 'unofficial_approved'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading reports:', error);
        return;
      }

      // Загружаем pending/rejected для автора и админов
      let myReports = [];
      if (user) {
        const profile = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const { data: pendingReports } = await supabase
          .from('community_reports')
          .select(`
            *,
            profiles:user_id (username, email)
          `)
          .eq('dossier_id', dossierId)
          .in('status', ['pending', 'rejected'])
          .or(`user_id.eq.${user.id}${profile?.data?.role === 'admin' ? ',status.eq.pending' : ''}`)
          .order('created_at', { ascending: false });

        if (pendingReports) {
          myReports = pendingReports;
        }
      }

      const allReports = [...(reports || []), ...myReports];
      
      if (allReports.length > 0) {
        renderCommunityReports(allReports, user);
      }
    } catch (error) {
      console.error('Error in loadCommunityReports:', error);
    }
  }

  function renderCommunityReports(reports, currentUser) {
    const reportsSection = document.createElement('section');
    reportsSection.className = 'panel';
    reportsSection.innerHTML = `
      <div class="panel-title">Наблюдения</div>
      <div class="panel-body">
        ${reports.map(report => {
          const profile = report.profiles;
          const isUnofficial = report.status === 'unofficial_approved';
          
          return `
            <div class="block" style="margin-bottom: 16px;">
              <div class="block-head">
                <div class="block-title">${report.title} ${isUnofficial ? '<span style="color: #60a5fa; font-size: 12px;">(неофициально)</span>' : ''}</div>
                <div class="block-meta">${profile?.username || profile?.email || 'Пользователь'} • ${new Date(report.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
              <div class="block-body">${report.body.replace(/\n/g, '<br>')}</div>
              ${report.evidence ? `
                <div style="margin-top: 12px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; font-size: 13px;">
                  <strong>Доказательства:</strong> ${report.evidence.replace(/\n/g, '<br>')}
                </div>
              ` : ''}
              ${report.location ? `
                <div style="margin-top: 8px; font-size: 13px; color: rgba(255, 255, 255, 0.6);">
                  Локация: ${report.location}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Вставляем после секции материалов
    const materialsSection = document.querySelector('.panel:has(#blocks)');
    if (materialsSection && materialsSection.parentNode) {
      materialsSection.parentNode.insertBefore(reportsSection, materialsSection.nextSibling);
    }
  }

  // Запускаем инициализацию
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDossier);
  } else {
    initDossier();
  }
})();
