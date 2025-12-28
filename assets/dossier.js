(() => {
  'use strict';
  
  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function getElements() {
    return {
      head: document.getElementById("head"),
      meta: document.getElementById("meta"),
      blocks: document.getElementById("blocks"),
      editorNote: document.getElementById("editorNote"),
      internalNote: document.getElementById("internalNote"),
      internalNoteSection: document.getElementById("internal-note-section")
    };
  }

  function showError(message) {
    const els = getElements();
    if (els.head) els.head.textContent = "Ошибка";
    if (els.meta) els.meta.innerHTML = `<div class="note" style="color: #ef4444;">${message}</div>`;
    if (els.blocks) els.blocks.innerHTML = "";
    if (els.editorNote) els.editorNote.textContent = "—";
  }

  function showLoading() {
    const els = getElements();
    if (els.head) els.head.textContent = "Загрузка…";
    if (els.meta) els.meta.innerHTML = `<div class="note">Загрузка данных…</div>`;
    if (els.blocks) els.blocks.innerHTML = "";
    if (els.editorNote) els.editorNote.textContent = "—";
  }

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

  function statusBadge(status) {
    const s = (status || "UNKNOWN").toUpperCase();
    const cls = s === "ACTIVE" ? "badge green" : (s === "UNKNOWN" ? "badge red" : "badge");
    return `<span class="${cls}">${s}</span>`;
  }

  async function runDossier() {
    try {
      showLoading();
      
      const id = qs("id");
      if (!id) {
        showError("Не указан ID досье.");
        return;
      }

      const data = await waitForData();
      const entry = data.find(e => e.id === id);
      
      if (!entry) {
        showError(`Досье с ID "${id}" не найдено.`);
        return;
      }

      const els = getElements();
      
      // Заголовок
      if (els.head) {
        els.head.textContent = entry.title || "Без названия";
      }

      // Метаданные
      if (els.meta) {
        const tags = (entry.tags || []).map(t => `<span class="tag">${t}</span>`).join("");
        els.meta.innerHTML = `
          <div class="kv">
            <div class="kv-row">
              <div class="kv-k">ID</div>
              <div class="kv-v">${formatId(entry.id, entry.type)}</div>
            </div>
            <div class="kv-row">
              <div class="kv-k">Тип</div>
              <div class="kv-v">${entry.type || "—"}</div>
            </div>
            <div class="kv-row">
              <div class="kv-k">Статус</div>
              <div class="kv-v">${statusBadge(entry.status)}</div>
            </div>
            ${entry.location ? `
            <div class="kv-row">
              <div class="kv-k">Локация</div>
              <div class="kv-v">${entry.location}</div>
            </div>
            ` : ""}
            ${tags ? `
            <div class="kv-row">
              <div class="kv-k">Теги</div>
              <div class="kv-v">${tags}</div>
            </div>
            ` : ""}
          </div>
        `;
      }

      // Материалы - показываем все, включая internal (если есть доступ)
      if (els.blocks) {
        let allMaterials = Array.isArray(entry.materials) ? [...entry.materials] : [];
        
        // Добавляем внутренние материалы только если есть внутренний доступ
        const hasInternalAccess = localStorage.getItem('contour_internal_access') === 'granted';
        if (hasInternalAccess && Array.isArray(entry.internalMaterials)) {
          allMaterials = [...allMaterials, ...entry.internalMaterials];
        }

        if (allMaterials.length === 0) {
          els.blocks.innerHTML = `<div class="note">Материалы отсутствуют или были удалены.</div>`;
        } else {
          els.blocks.innerHTML = allMaterials.map(m => {
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
        }
      }

      // Примечания составителя
      if (els.editorNote) {
        if (entry.dossier && entry.dossier.observe) {
          els.editorNote.innerHTML = `<strong>Рекомендации по наблюдению:</strong><br>${entry.dossier.observe}`;
        } else {
          els.editorNote.textContent = "—";
        }
      }

      // Внутренняя пометка (нестабильная)
      if (els.internalNoteSection && entry.internalNote) {
        // 30% вероятность показа
        if (Math.random() < 0.3) {
          els.internalNoteSection.style.display = "block";
          if (els.internalNote) {
            els.internalNote.textContent = entry.internalNote;
          }
        } else {
          els.internalNoteSection.style.display = "block";
          if (els.internalNote) {
            els.internalNote.textContent = "Дополнительные комментарии отсутствуют или были удалены в ходе сверки.";
          }
        }
      } else if (els.internalNoteSection) {
        els.internalNoteSection.style.display = "none";
      }

      // Обновляем UI внутреннего доступа
      updateInternalAccessUI();

    } catch (error) {
      console.error('Error in runDossier:', error);
      showError(error.message || "Произошла ошибка при загрузке досье.");
    }
  }

  // Проверка и отображение внутреннего доступа
  function updateInternalAccessUI() {
    const hasAccess = localStorage.getItem('contour_internal_access') === 'granted';
    const banner = document.getElementById("internal-access-banner");
    const subtitle = document.getElementById("subtitle");
    const body = document.body;

    if (hasAccess) {
      // Показываем баннер
      if (banner) {
        banner.style.display = "block";
        setTimeout(() => {
          banner.classList.add("show");
        }, 100);
      }

      // Обновляем подзаголовок
      if (subtitle) {
        subtitle.textContent = "Просмотр досье — Внутренний доступ: АКТИВЕН";
        subtitle.style.color = "#5ac8fa";
      }

      // Добавляем класс для стилизации
      if (body) {
        body.classList.add("internal-mode");
      }

      // Обработчик закрытия баннера
      const closeBtn = document.getElementById("close-banner");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          if (banner) {
            banner.classList.remove("show");
            setTimeout(() => {
              banner.style.display = "none";
            }, 400);
          }
        });
      }
    } else {
      // Скрываем баннер
      if (banner) {
        banner.classList.remove("show");
        banner.style.display = "none";
      }

      // Возвращаем обычный подзаголовок
      if (subtitle) {
        subtitle.textContent = "Просмотр досье";
        subtitle.style.color = "rgba(255, 255, 255, 0.75)";
      }

      // Убираем класс
      if (body) {
        body.classList.remove("internal-mode");
      }
    }
  }

  // Запуск при загрузке страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDossier);
  } else {
    runDossier();
  }
})();
