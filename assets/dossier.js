(() => {
  'use strict';
  
  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  // Безопасное получение элементов DOM
  function getElements() {
    return {
      head: document.getElementById("head"),
      meta: document.getElementById("meta"),
      blocks: document.getElementById("blocks"),
      editorNote: document.getElementById("editorNote")
    };
  }

  // Показываем ошибку
  function showError(message) {
    const els = getElements();
    if (els.head) els.head.textContent = "Ошибка";
    if (els.meta) els.meta.innerHTML = `<div class="note" style="color: #ef4444;">${message}</div>`;
    if (els.blocks) els.blocks.innerHTML = "";
    if (els.editorNote) els.editorNote.textContent = "—";
  }

  // Показываем загрузку
  function showLoading() {
    const els = getElements();
    if (els.head) els.head.textContent = "Загрузка…";
    if (els.meta) els.meta.innerHTML = `<div class="note">Загрузка данных…</div>`;
    if (els.blocks) els.blocks.innerHTML = "";
    if (els.editorNote) els.editorNote.textContent = "—";
  }

  // Ждём загрузки данных с таймаутом
  async function waitForData(maxWait = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      if (window.CONTOUR_DATA && Array.isArray(window.CONTOUR_DATA) && window.CONTOUR_DATA.length > 0) {
        return window.CONTOUR_DATA;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error("Не удалось загрузить данные. Проверьте подключение к интернету.");
  }

  // Ждём инициализации Supabase
  async function waitForSupabase(maxWait = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      if (typeof window.supabase !== 'undefined' && window.contourSupabase) {
        const client = window.contourSupabase.getSupabase();
        if (client) {
          return client;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return null; // Supabase не обязателен для просмотра досье
  }

  async function hasInternalAccess() {
    try {
      if (window.contourSupabase) {
        return await window.contourSupabase.hasInternalAccess();
      }
    } catch (e) {
      console.warn('Error checking internal access:', e);
    }
    return false;
  }

  async function canSee(entry, mode) {
    if (mode === "public") return entry.access === "public";
    if (mode === "leak") return entry.access === "public" || entry.access === "leak";
    if (mode === "internal") {
      try {
        let isAuth = false;
        if (window.contourSupabase) {
          isAuth = await window.contourSupabase.isAuthenticated();
        }
        
        if (!isAuth) {
          return false;
        }
        
        if (entry.access === "internal") {
          return await hasInternalAccess();
        }
        
        return entry.access === "public" || entry.access === "leak";
      } catch (e) {
        console.warn('Error checking access:', e);
        return false;
      }
    }
    return false;
  }

  function redactify(text) {
    return (text || "").replace(/█+/g, m => `<span class="redacted">${m}</span>`);
  }

  function formatId(id, type) {
    if (!id) return id;
    const match = id.match(/^KE([SFM])-(\d+)$/);
    if (match) {
      const typeMap = { S: "С", F: "Ф", M: "М" };
      return `КЕ-${typeMap[match[1]]}/${match[2]}`;
    }
    return id;
  }

  function saveViewHistory(entry) {
    try {
      if (window.contourSupabase) {
        window.contourSupabase.isAuthenticated().then(isAuth => {
          if (isAuth) {
            let history = JSON.parse(localStorage.getItem("contour_view_history") || "[]");
            history.push({
              id: entry.id,
              title: entry.title,
              timestamp: new Date().toISOString()
            });
            history = history.slice(-50);
            localStorage.setItem("contour_view_history", JSON.stringify(history));
          }
        }).catch(() => {});
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  }

  // Загрузка наблюдений сообщества
  async function loadCommunityReports(dossierId) {
    try {
      if (!window.CONTOUR_CONFIG || window.CONTOUR_CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
        return;
      }

      const supabase = await waitForSupabase();
      if (!supabase) return;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError && userError.message !== 'Invalid Refresh Token: Refresh Token Not Found') {
        console.warn('Error getting user:', userError);
      }

      // Загружаем публичные наблюдения
      const { data: reports, error: reportsError } = await supabase
        .from('community_reports')
        .select(`
          *,
          profiles:user_id (username, email)
        `)
        .eq('dossier_id', dossierId)
        .in('status', ['final_approved', 'unofficial_approved'])
        .order('created_at', { ascending: false });

      if (reportsError) {
        // RLS может блокировать - это нормально для неавторизованных
        if (reportsError.code !== 'PGRST301' && reportsError.code !== '42501') {
          console.warn('Error loading reports:', reportsError);
        }
        return;
      }

      // Загружаем pending/rejected для автора и админов
      let myReports = [];
      if (user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          const { data: pendingReports, error: pendingError } = await supabase
            .from('community_reports')
            .select(`
              *,
              profiles:user_id (username, email)
            `)
            .eq('dossier_id', dossierId)
            .in('status', ['pending', 'rejected'])
            .or(`user_id.eq.${user.id}${profile?.role === 'admin' ? ',status.eq.pending' : ''}`)
            .order('created_at', { ascending: false });

          if (!pendingError && pendingReports) {
            myReports = pendingReports;
          }
        } catch (e) {
          console.warn('Error loading user reports:', e);
        }
      }

      const allReports = [...(reports || []), ...myReports];
      
      if (allReports.length > 0) {
        renderCommunityReports(allReports);
      }
    } catch (error) {
      console.warn('Error in loadCommunityReports:', error);
    }
  }

  function renderCommunityReports(reports) {
    try {
      // Разделяем на approved и unofficial
      const approved = reports.filter(r => r.status === 'final_approved');
      const unofficial = reports.filter(r => r.status === 'unofficial_approved');
      const pending = reports.filter(r => r.status === 'pending' || r.status === 'rejected');

      const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      // Подтверждённые наблюдения (часть досье)
      if (approved.length > 0) {
        const approvedSection = document.createElement('section');
        approvedSection.className = 'panel';
        approvedSection.innerHTML = `
          <div class="panel-title">Подтверждённые наблюдения</div>
          <div class="panel-body">
            ${approved.map(report => {
              const profile = report.profiles;
              return `
                <div class="block" style="margin-bottom: 16px;">
                  <div class="block-head">
                    <div class="block-title">${escapeHtml(report.title || '')}</div>
                    <div class="block-meta">${escapeHtml(profile?.username || profile?.email || 'Пользователь')} • ${new Date(report.created_at).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <div class="block-body">${escapeHtml(report.body || '').replace(/\n/g, '<br>')}</div>
                  ${report.evidence ? `
                    <div style="margin-top: 12px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; font-size: 13px;">
                      <strong>Доказательства:</strong> ${escapeHtml(report.evidence || '').replace(/\n/g, '<br>')}
                    </div>
                  ` : ''}
                  ${report.location ? `
                    <div style="margin-top: 8px; font-size: 13px; color: rgba(255, 255, 255, 0.6);">
                      Локация: ${escapeHtml(report.location || '')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;

        const materialsSection = document.querySelector('.panel:has(#blocks)');
        if (materialsSection && materialsSection.parentNode) {
          materialsSection.parentNode.insertBefore(approvedSection, materialsSection.nextSibling);
        }
      }

      // Неофициальные наблюдения (отдельный блок)
      if (unofficial.length > 0) {
        const unofficialSection = document.createElement('section');
        unofficialSection.className = 'panel';
        unofficialSection.style.background = 'rgba(96, 165, 250, 0.05)';
        unofficialSection.style.borderColor = 'rgba(96, 165, 250, 0.2)';
        unofficialSection.innerHTML = `
          <div class="panel-title">Неофициальные наблюдения</div>
          <div class="panel-body">
            <div class="note" style="margin-bottom: 16px; font-size: 13px;">
              Следующие наблюдения не включены в официальную компиляцию и могут содержать непроверенную информацию.
            </div>
            ${unofficial.map(report => {
              const profile = report.profiles;
              return `
                <div class="block" style="margin-bottom: 16px;">
                  <div class="block-head">
                    <div class="block-title">${escapeHtml(report.title || '')} <span style="color: #60a5fa; font-size: 12px;">(неофициально)</span></div>
                    <div class="block-meta">${escapeHtml(profile?.username || profile?.email || 'Пользователь')} • ${new Date(report.created_at).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <div class="block-body">${escapeHtml(report.body || '').replace(/\n/g, '<br>')}</div>
                  ${report.evidence ? `
                    <div style="margin-top: 12px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; font-size: 13px;">
                      <strong>Доказательства:</strong> ${escapeHtml(report.evidence || '').replace(/\n/g, '<br>')}
                    </div>
                  ` : ''}
                  ${report.location ? `
                    <div style="margin-top: 8px; font-size: 13px; color: rgba(255, 255, 255, 0.6);">
                      Локация: ${escapeHtml(report.location || '')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;

        const materialsSection = document.querySelector('.panel:has(#blocks)');
        if (materialsSection && materialsSection.parentNode) {
          materialsSection.parentNode.insertBefore(unofficialSection, materialsSection.nextSibling);
        }
      }

      // Pending/rejected только для автора и админа
      if (pending.length > 0) {
        const pendingSection = document.createElement('section');
        pendingSection.className = 'panel';
        pendingSection.style.background = 'rgba(251, 191, 36, 0.05)';
        pendingSection.style.borderColor = 'rgba(251, 191, 36, 0.2)';
        pendingSection.innerHTML = `
          <div class="panel-title">Мои заявки</div>
          <div class="panel-body">
            ${pending.map(report => {
              const profile = report.profiles;
              const statusText = report.status === 'pending' ? 'На рассмотрении' : 'Отклонено';
              const statusColor = report.status === 'pending' ? '#fbbf24' : '#ef4444';
              return `
                <div class="block" style="margin-bottom: 16px;">
                  <div class="block-head">
                    <div class="block-title">${escapeHtml(report.title || '')} <span style="color: ${statusColor}; font-size: 12px;">(${statusText})</span></div>
                    <div class="block-meta">${escapeHtml(profile?.username || profile?.email || 'Пользователь')} • ${new Date(report.created_at).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <div class="block-body">${escapeHtml(report.body || '').replace(/\n/g, '<br>')}</div>
                  ${report.admin_note ? `
                    <div class="note" style="margin-top: 8px; font-size: 13px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3);">
                      <strong>Примечание администратора:</strong> ${escapeHtml(report.admin_note || '')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;

        const materialsSection = document.querySelector('.panel:has(#blocks)');
        if (materialsSection && materialsSection.parentNode) {
          materialsSection.parentNode.insertBefore(pendingSection, materialsSection.nextSibling);
        }
      }
    } catch (e) {
      console.warn('Error rendering reports:', e);
    }
  }

  async function runDossier(data) {
    try {
      const id = qs("id");
      const mode = qs("access") || "public";
      const els = getElements();

      if (!id) {
        showError("Не указан ID досье.");
        return;
      }

      const entry = data.find(x => x.id === id);

      if (!entry) {
        showError("Запись отсутствует в текущей компиляции.");
        return;
      }

      const canView = await canSee(entry, mode);
      if (!canView) {
        showError("Эта запись недоступна при текущем уровне доступа.");
        if (els.editorNote) els.editorNote.textContent = "Попытка чтения зафиксирована.";
        return;
      }

      // Показываем баннер внутреннего доступа
      if (mode === "internal") {
        const hasAccess = await hasInternalAccess();
        if (hasAccess) {
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
        }
      }

      const displayId = formatId(entry.id, entry.type);
      if (els.head) els.head.textContent = `${entry.type || "КЕ"} / ${displayId} — ${entry.title || "Без названия"}`;

      saveViewHistory(entry);

      const d = entry.dossier || {};
      
      let location = entry.location || "не раскрыто";
      if (mode === "internal" && entry.id === "KEM-002") {
        const hasAccess = await hasInternalAccess();
        if (hasAccess) {
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
      
      if (d.note) {
        metaRows.push(["Примечание", d.note]);
      }

      if (els.meta) {
        els.meta.innerHTML = `
          <div class="kv">
            ${metaRows.map(([k, v]) => `
              <div class="kv-row">
                <div class="kv-k">${k}</div>
                <div class="kv-v">${redactify(String(v))}</div>
              </div>
            `).join("")}
          </div>
        `;
      }

      let materials = Array.isArray(entry.materials) ? entry.materials : [];
      
      // Добавляем внутренние материалы для админа
      if (mode === "internal" && Array.isArray(entry.internalMaterials)) {
        const hasAccess = await hasInternalAccess();
        if (hasAccess && els.blocks) {
          const internalBlocks = entry.internalMaterials.map(m => {
            const isInternal = m.stamp && m.stamp.includes("INTERNAL");
            return `
            <div class="block" ${isInternal ? 'data-internal="true"' : ''}>
              <div class="block-head">
                <div class="block-title">${(m.kind || "Материал").replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                <div class="block-meta">${(m.stamp || "").replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              </div>
              <div class="block-body">${redactify(String(m.text || "")).replace(/\n/g, "<br>")}</div>
            </div>
            `;
          }).join("");
          els.blocks.insertAdjacentHTML('beforeend', internalBlocks);
        }
      }

      if (els.blocks) {
        els.blocks.innerHTML = materials.map(m => {
          const isInternal = m.stamp && m.stamp.includes("INTERNAL");
          return `
          <div class="block" ${isInternal ? 'data-internal="true"' : ''}>
            <div class="block-head">
              <div class="block-title">${(m.kind || "Материал").replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              <div class="block-meta">${(m.stamp || "").replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
            <div class="block-body">${redactify(String(m.text || "")).replace(/\n/g, "<br>")}</div>
          </div>
          `;
        }).join("") || `<div class="note">Материалы отсутствуют или были удалены.</div>`;
      }

      if (els.editorNote) els.editorNote.textContent = entry.editorNote || "—";

      // Загружаем наблюдения сообщества (не блокируем рендеринг)
      loadCommunityReports(entry.id).catch(() => {});

      // Внутренние заметки наблюдателя
      const internalNoteSection = document.getElementById("internal-note-section");
      const internalNoteEl = document.getElementById("internalNote");
      
      if (internalNoteSection && internalNoteEl) {
        const isAccumulativeEntry = entry.id === "KES-001";
        let noteWasSeen = false;
        
        if (isAccumulativeEntry) {
          try {
            const seenNotes = JSON.parse(localStorage.getItem("contour_seen_internal_notes") || "{}");
            noteWasSeen = seenNotes[entry.id] === true;
          } catch (e) {
            // Игнорируем
          }
        }
        
        if (isAccumulativeEntry && noteWasSeen) {
          internalNoteSection.style.display = "block";
          internalNoteEl.textContent = "Комментарий был учтён и удалён в ходе последующей сверки.";
          internalNoteEl.style.color = "rgba(255, 255, 255, 0.4)";
          internalNoteEl.style.fontStyle = "italic";
        } else {
          const shouldShow = Math.random() < 0.3;
          
          if (shouldShow && entry.internalNote) {
            internalNoteSection.style.display = "block";
            internalNoteEl.textContent = entry.internalNote;
            internalNoteEl.style.color = "rgba(255, 255, 255, 0.6)";
            internalNoteEl.style.fontStyle = "normal";
            
            if (isAccumulativeEntry) {
              try {
                const seenNotes = JSON.parse(localStorage.getItem("contour_seen_internal_notes") || "{}");
                seenNotes[entry.id] = true;
                localStorage.setItem("contour_seen_internal_notes", JSON.stringify(seenNotes));
              } catch (e) {
                // Игнорируем
              }
            }
          } else {
            internalNoteSection.style.display = "block";
            internalNoteEl.textContent = "Дополнительные комментарии отсутствуют или были удалены в ходе сверки.";
            internalNoteEl.style.color = "rgba(255, 255, 255, 0.4)";
            internalNoteEl.style.fontStyle = "italic";
          }
        }
      }

      // Кнопка избранного
      (async () => {
        try {
          let isAuthenticated = false;
          let userId = null;
          
          if (window.contourSupabase) {
            isAuthenticated = await window.contourSupabase.isAuthenticated();
            if (isAuthenticated) {
              const userData = await window.contourSupabase.getUserData();
              if (userData) userId = userData.id;
            }
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
          
          const noteContainer = els.editorNote?.parentElement;
          if (noteContainer) {
            noteContainer.appendChild(favoriteBtn);
          }
        } catch (e) {
          console.warn('Error adding favorite button:', e);
        }
      })();
    } catch (error) {
      console.error('Error in runDossier:', error);
      showError(error.message || "Произошла ошибка при загрузке досье.");
    }
  }

  // Главная функция инициализации
  async function initDossier() {
    try {
      showLoading();
      
      // Ждём загрузки данных
      const data = await waitForData();
      
      // Запускаем рендеринг
      await runDossier(data);
    } catch (error) {
      console.error('Error initializing dossier:', error);
      showError(error.message || "Не удалось загрузить досье. Проверьте подключение к интернету.");
    }
  }

  // Запускаем инициализацию после загрузки DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDossier);
  } else {
    // DOM уже загружен, но ждём немного для загрузки скриптов
    setTimeout(initDossier, 100);
  }
})();
