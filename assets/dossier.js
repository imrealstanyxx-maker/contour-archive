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

      // Проверяем, заблокирована ли запись
      if (entry.locked === true) {
        const els = getElements();
        if (els.head) {
          els.head.textContent = "Досье недоступно";
        }
        if (els.meta) {
          els.meta.innerHTML = `<div class="note" style="color: rgba(255, 255, 255, 0.7);">
            <p>Файл зашифрован.</p>
            <p>Доступ к материалам временно ограничен.</p>
            <p>Повторные запросы фиксируются.</p>
          </div>`;
        }
        if (els.blocks) {
          els.blocks.innerHTML = "";
        }
        if (els.editorNote) {
          els.editorNote.textContent = "—";
        }
        if (els.internalNoteSection) {
          els.internalNoteSection.style.display = "none";
        }
        return;
      }

      const els = getElements();
      
      // Проверяем, является ли это угрозой
      if (entry.isThreat) {
        // Специальный рендер для угроз
        if (els.head) {
          els.head.textContent = "ЗАСЕКРЕЧЕНО";
        }

        if (els.meta) {
          els.meta.innerHTML = `
            <div class="kv">
              <div class="kv-row">
                <div class="kv-k">ID</div>
                <div class="kv-v">${formatId(entry.id, entry.type)}</div>
              </div>
              <div class="kv-row">
                <div class="kv-k">Статус</div>
                <div class="kv-v">${statusBadge(entry.status)}</div>
              </div>
            </div>
          `;
        }

        if (els.blocks) {
          els.blocks.innerHTML = `
            <div class="threat-section">
              <div class="threat-warning-banner">Подтверждён риск для жизни</div>
              
              <div class="block threat-block">
                <div class="block-head">
                  <div class="block-title">Как это работает</div>
                </div>
                <div class="block-body">ЗАСЕКРЕЧЕНО</div>
              </div>

              <div class="block threat-block">
                <div class="block-head">
                  <div class="block-title">Триггер активации</div>
                </div>
                <div class="block-body">ЗАСЕКРЕЧЕНО</div>
              </div>

              <div class="block threat-block">
                <div class="block-head">
                  <div class="block-title">Почему это смертельно</div>
                </div>
                <div class="block-body">ЗАСЕКРЕЧЕНО</div>
              </div>

              <div class="block threat-block">
                <div class="block-head">
                  <div class="block-title">Что помогает / что не помогает</div>
                </div>
                <div class="block-body">ЗАСЕКРЕЧЕНО</div>
              </div>
            </div>
          `;
        }

        // Скрываем обычные секции для угроз
        if (els.editorNote) {
          els.editorNote.textContent = "—";
        }
        if (els.internalNoteSection) {
          els.internalNoteSection.style.display = "none";
        }

        return;
      }
      
      // Обычный рендер для не-угроз
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

      // Материалы - показываем все, включая internal и leak (если есть доступ)
      if (els.blocks) {
        const settings = window.getContourSettings ? window.getContourSettings() : {};
        let allMaterials = Array.isArray(entry.materials) ? [...entry.materials] : [];
        
        // Проверяем, откуда открыто досье (из какого фильтра доступа)
        const referrer = document.referrer;
        const isFromLeak = referrer.includes('access=leak') || sessionStorage.getItem('last_access_filter') === 'leak';
        const isFromInternal = referrer.includes('access=internal') || sessionStorage.getItem('last_access_filter') === 'internal';
        
        // Добавляем материалы утечек, если просматриваем из фильтра утечек
        if (isFromLeak && entry.access === "leak" && Array.isArray(entry.leakMaterials)) {
          allMaterials = [...allMaterials, ...entry.leakMaterials];
        }
        
        // Добавляем внутренние материалы только если есть внутренний доступ
        const hasInternalAccess = localStorage.getItem('contour_internal_access') === 'granted';
        if (hasInternalAccess && Array.isArray(entry.internalMaterials)) {
          allMaterials = [...allMaterials, ...entry.internalMaterials];
        }

        // Применяем настройки к материалам
        const detailLevel = settings.detailLevel !== undefined ? settings.detailLevel : 1;
        
        // Режим "Консервативный" - показываем только основные материалы
        if (settings.interpretationMode === 'conservative') {
          allMaterials = allMaterials.filter(m => m.kind && !m.stamp?.includes("INTERNAL"));
        }

        // Режим "Допущения" - может показывать дополнительные пометки
        // Режим "Несогласованный" - может показывать зачёркнутые материалы

        // Уровень детализации влияет на количество материалов
        if (detailLevel === 0) {
          // Сводка - показываем только первые 2 материала
          allMaterials = allMaterials.slice(0, 2);
        } else if (detailLevel === 2) {
          // Полный контекст - показываем все, включая возможные повреждённые
        }

        if (allMaterials.length === 0) {
          els.blocks.innerHTML = `<div class="note">Материалы отсутствуют или были удалены.</div>`;
        } else {
          els.blocks.innerHTML = allMaterials.map((m, index) => {
            const isInternal = m.stamp && m.stamp.includes("INTERNAL");
            let materialText = redactify(String(m.text || "")).replace(/\n/g, "<br>");
            let materialTitle = (m.kind || "Материал").replace(/</g, '&lt;').replace(/>/g, '&gt;');
            let materialStamp = (m.stamp || "").replace(/</g, '&lt;').replace(/>/g, '&gt;');

            // Режим "Несогласованный" - добавляем зачёркнутые строки
            if (settings.interpretationMode === 'inconsistent' && Math.random() > 0.7) {
              const lines = materialText.split('<br>');
              if (lines.length > 1) {
                const randomLine = Math.floor(Math.random() * lines.length);
                lines[randomLine] = `<span style="text-decoration: line-through; opacity: 0.5;">${lines[randomLine]}</span>`;
                materialText = lines.join('<br>');
              }
            }

            // Полный контекст - иногда добавляем пометки о повреждении
            if (detailLevel === 2 && Math.random() > 0.85) {
              materialStamp += ' <span style="color: rgba(239, 68, 68, 0.8);">[данные повреждены]</span>';
            }

            // Скрывать повторяющиеся формулировки
            if (settings.hideRepetitions && materialText.length < 50) {
              materialText = '<span style="opacity: 0.5; font-style: italic;">[содержимое скрыто]</span>';
            }

            return `
              <div class="block" ${isInternal ? 'data-internal="true"' : ''}>
                <div class="block-head">
                  <div class="block-title">${materialTitle}</div>
                  <div class="block-meta">${materialStamp}</div>
                </div>
                <div class="block-body">${materialText}</div>
              </div>
            `;
          }).join("");
        }
      }

      // Применяем уровень детализации
      const settings = window.getContourSettings ? window.getContourSettings() : {};
      const detailLevel = settings.detailLevel !== undefined ? settings.detailLevel : 1;

      // Примечания составителя
      if (els.editorNote) {
        if (detailLevel === 0) {
          // Сводка - скрываем примечания
          els.editorNote.textContent = "—";
        } else if (entry.dossier && entry.dossier.observe) {
          els.editorNote.innerHTML = `<strong>Рекомендации по наблюдению:</strong><br>${entry.dossier.observe}`;
        } else {
          els.editorNote.textContent = "—";
        }
      }

      // Внутренняя пометка (нестабильная)
      if (els.internalNoteSection) {
        if (detailLevel === 0) {
          // Сводка - скрываем внутренние пометки
          els.internalNoteSection.style.display = "none";
        } else if (entry.internalNote) {
          if (detailLevel === 2) {
            // Полный контекст - показываем всегда
            els.internalNoteSection.style.display = "block";
            if (els.internalNote) {
              els.internalNote.textContent = entry.internalNote;
            }
          } else {
            // Материалы - 30% вероятность показа
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
          }
        } else {
          els.internalNoteSection.style.display = "none";
        }
      }

      // Полный контекст - добавляем зачёркнутые строки и пометки о повреждении
      if (detailLevel === 2 && els.blocks) {
        const blocks = els.blocks.querySelectorAll('.block');
        blocks.forEach((block, index) => {
          // Случайно добавляем зачёркнутые строки
          if (Math.random() > 0.7) {
            const body = block.querySelector('.block-body');
            if (body) {
              const text = body.innerHTML;
              // Добавляем зачёркнутую строку в случайное место
              const lines = text.split('<br>');
              if (lines.length > 1) {
                const randomLine = Math.floor(Math.random() * lines.length);
                lines[randomLine] = `<span style="text-decoration: line-through; opacity: 0.5;">${lines[randomLine]}</span>`;
                body.innerHTML = lines.join('<br>');
              }
            }
          }
        });

        // Иногда добавляем пометку "данные повреждены"
        if (Math.random() > 0.8) {
          const firstBlock = els.blocks.querySelector('.block');
          if (firstBlock) {
            const meta = firstBlock.querySelector('.block-meta');
            if (meta) {
              meta.innerHTML += ' <span style="color: rgba(239, 68, 68, 0.8);">[данные повреждены]</span>';
            }
          }
        }
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
