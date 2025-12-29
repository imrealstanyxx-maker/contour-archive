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
    if (els.meta) {
      els.meta.innerHTML = `<div class="note" style="color: rgba(239, 68, 68, 0.9);">
        <p>${message}</p>
        <p style="margin-top: 12px;"><a href="index.html" style="color: rgba(255, 255, 255, 0.8); text-decoration: underline;">← Вернуться в архив</a></p>
      </div>`;
    }
    if (els.blocks) els.blocks.innerHTML = "";
    if (els.editorNote) els.editorNote.textContent = "—";
    initDossierButtons(null);
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

  // Инициализация кнопок в досье
  function initDossierButtons(id) {
    // Кнопка копирования ссылки
    const copyLinkBtn = document.getElementById("copy-link-btn");
    if (copyLinkBtn) {
      // Удаляем старые обработчики
      const newBtn = copyLinkBtn.cloneNode(true);
      copyLinkBtn.parentNode.replaceChild(newBtn, copyLinkBtn);
      
      newBtn.addEventListener("click", () => {
        const url = window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            const originalText = newBtn.textContent;
            newBtn.textContent = "✓ Скопировано";
            setTimeout(() => {
              newBtn.textContent = originalText;
            }, 2000);
          }).catch(() => {
            copyTextToClipboard(url, newBtn);
          });
        } else {
          copyTextToClipboard(url, newBtn);
        }
      });
    }
    
    // Кнопка копирования ID
    const copyIdBtn = document.getElementById("copy-id-btn");
    if (copyIdBtn && id) {
      // Удаляем старые обработчики
      const newIdBtn = copyIdBtn.cloneNode(true);
      copyIdBtn.parentNode.replaceChild(newIdBtn, copyIdBtn);
      
      newIdBtn.addEventListener("click", () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(id).then(() => {
            const originalText = newIdBtn.textContent;
            newIdBtn.textContent = "✓ Скопировано";
            setTimeout(() => {
              newIdBtn.textContent = originalText;
            }, 2000);
          }).catch(() => {
            copyTextToClipboard(id, newIdBtn);
          });
        } else {
          copyTextToClipboard(id, newIdBtn);
        }
      });
    }
  }
  
  // Рендер оглавления досье
  function renderDossierTOC(entry) {
    const tocEl = document.getElementById("dossier-toc");
    if (!tocEl) return;
    
    const sections = [];
    
    // Проверяем наличие материалов
    let hasMaterials = false;
    if (entry.materials && entry.materials.length > 0) hasMaterials = true;
    if (entry.leakMaterials && entry.leakMaterials.length > 0) hasMaterials = true;
    const hasInternalAccess = localStorage.getItem('contour_internal_access') === 'granted';
    if (hasInternalAccess && entry.internalMaterials && entry.internalMaterials.length > 0) hasMaterials = true;
    
    if (hasMaterials) sections.push({ name: "Материалы", anchor: "materials" });
    if (entry.dossier && entry.dossier.observe) sections.push({ name: "Примечания", anchor: "editor-note" });
    if (hasInternalAccess && entry.internalNote) sections.push({ name: "Внутренний отчёт", anchor: "internal-note" });
    
    if (sections.length > 0) {
      tocEl.style.display = "block";
      tocEl.innerHTML = `
        <div style="font-size: 13px; color: rgba(255, 255, 255, 0.7); margin-bottom: 8px;">Оглавление:</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${sections.map(s => `<a href="#${s.anchor}" style="color: rgba(255, 255, 255, 0.8); text-decoration: none; padding: 4px 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; font-size: 12px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">${s.name}</a>`).join("")}
        </div>
      `;
    } else {
      tocEl.style.display = "none";
    }
  }
  
  // Рендер блока "Связано с"
  function renderDossierRelated(entry) {
    const relatedEl = document.getElementById("dossier-related");
    if (!relatedEl) return;
    
    const related = entry.dossier && entry.dossier.related;
    if (!related) {
      relatedEl.style.display = "none";
      return;
    }
    
    // Парсим связанные ID из текста related (ищем паттерны КЕ-С/001, KES-001, КЕ-М/002 и т.д.)
    const relatedIds = [];
    const typeMap = { 'С': 'S', 'М': 'M', 'Ф': 'F' };
    const matches = related.match(/КЕ-[СМФ]\/\d+|KE[SMF]-\d+/gi);
    if (matches) {
      matches.forEach(match => {
        // Преобразуем КЕ-С/001 в KES-001
        let normalized = match.toUpperCase();
        const cyrillicMatch = normalized.match(/КЕ-([СМФ])\/(\d+)/);
        if (cyrillicMatch) {
          const type = typeMap[cyrillicMatch[1]] || cyrillicMatch[1];
          normalized = `KE${type}-${cyrillicMatch[2]}`;
        }
        if (normalized && normalized.match(/^KE[SMF]-\d+$/)) {
          relatedIds.push(normalized);
        }
      });
    }
    
    if (relatedIds.length > 0) {
      relatedEl.style.display = "block";
      relatedEl.innerHTML = `
        <div style="padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;">
          <div style="font-size: 13px; color: rgba(255, 255, 255, 0.7); margin-bottom: 8px;">Связано с:</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${relatedIds.map(id => {
              const data = window.CONTOUR_DATA && Array.isArray(window.CONTOUR_DATA) 
                ? window.CONTOUR_DATA.find(e => e.id === id) 
                : null;
              const title = data ? (data.title || id) : id;
              return `<a href="dossier.html?id=${encodeURIComponent(id)}" style="color: rgba(90, 200, 250, 0.9); text-decoration: none; padding: 6px 12px; background: rgba(90, 200, 250, 0.1); border: 1px solid rgba(90, 200, 250, 0.2); border-radius: 4px; font-size: 12px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(90,200,250,0.15)'" onmouseout="this.style.background='rgba(90,200,250,0.1)'">${id}: ${title}</a>`;
            }).join("")}
          </div>
        </div>
      `;
    } else {
      // Если нет ID, показываем просто текст
      relatedEl.style.display = "block";
      relatedEl.innerHTML = `
        <div style="padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;">
          <div style="font-size: 13px; color: rgba(255, 255, 255, 0.7); margin-bottom: 8px;">Связано с:</div>
          <div style="color: rgba(255, 255, 255, 0.8); font-size: 13px;">${related.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
      `;
    }
  }

  // Fallback для копирования текста
  function copyTextToClipboard(text, btn) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      const originalText = btn.textContent;
      btn.textContent = "✓ Скопировано";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    document.body.removeChild(textarea);
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
        const els = getElements();
        if (els.head) els.head.textContent = "Досье не найдено";
        if (els.meta) {
          els.meta.innerHTML = `<div class="note" style="color: rgba(255, 255, 255, 0.7);">
            <p>Досье с ID "${id}" не найдено или доступ ограничен.</p>
            <p><a href="index.html" style="color: rgba(255, 255, 255, 0.8); text-decoration: underline;">← Вернуться в архив</a></p>
          </div>`;
        }
        if (els.blocks) els.blocks.innerHTML = "";
        initDossierButtons(id);
        return;
      }
      
      // Инициализируем кнопки
      initDossierButtons(id);

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
            <p style="margin-top: 12px;"><a href="index.html" style="color: rgba(255, 255, 255, 0.8); text-decoration: underline;">← Вернуться в архив</a></p>
          </div>`;
        }
        if (els.blocks) {
          els.blocks.innerHTML = "";
        }
        initDossierButtons(id);
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
        // Для THREAT-002 показываем досье, для остальных - ЗАСЕКРЕЧЕНО
        if (entry.id === "THREAT-002") {
          // Обычный рендер для THREAT-002
          if (els.head) {
            els.head.textContent = entry.title || "Сменщик";
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
                  <div class="kv-v">${entry.status || "—"}</div>
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
                  <div class="kv-v">
                    <div class="tags">${tags}</div>
                  </div>
                </div>
                ` : ""}
              </div>
            `;
            
            // Добавляем оглавление
            renderDossierTOC(entry);
            
            // Добавляем блок "Связано с"
            renderDossierRelated(entry);
          }
          
          // Материалы
          if (els.blocks) {
            let allMaterials = Array.isArray(entry.materials) ? [...entry.materials] : [];
            
            // Проверяем, откуда открыто досье
            const referrer = document.referrer;
            const isFromLeak = referrer.includes('access=leak') || sessionStorage.getItem('last_access_filter') === 'leak';
            
            // Добавляем материалы утечек, если просматриваем из фильтра утечек
            if (isFromLeak && Array.isArray(entry.leakMaterials)) {
              allMaterials = [...allMaterials, ...entry.leakMaterials];
            }
            
            // Добавляем внутренние материалы только если есть внутренний доступ
            const hasInternalAccess = localStorage.getItem('contour_internal_access') === 'granted';
            if (hasInternalAccess && Array.isArray(entry.internalMaterials)) {
              allMaterials = [...allMaterials, ...entry.internalMaterials];
            }
            
            if (allMaterials.length === 0) {
              els.blocks.innerHTML = `<div class="note">Материалы отсутствуют или были удалены.</div>`;
            } else {
              els.blocks.innerHTML = allMaterials.map((m, index) => {
                const isInternal = m.stamp && m.stamp.includes("INTERNAL");
                const materialText = redactify(String(m.text || "")).replace(/\n/g, "<br>");
                const materialTitle = (m.kind || "Материал").replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const materialStamp = (m.stamp || "").replace(/</g, '&lt;').replace(/>/g, '&gt;');
                
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
          
          // Примечания составителя
          const editorNoteSection = document.getElementById("editor-note-section");
          if (editorNoteSection) {
            if (entry.editorNote) {
              editorNoteSection.id = "editor-note";
              editorNoteSection.style.display = "block";
              if (els.editorNote) {
                els.editorNote.innerHTML = `<strong>Рекомендации:</strong><br>${entry.editorNote}`;
              }
            } else {
              editorNoteSection.style.display = "none";
            }
          }
          
          // Внутренняя пометка
          if (els.internalNoteSection) {
            const hasInternalAccess = localStorage.getItem('contour_internal_access') === 'granted';
            if (hasInternalAccess && entry.internalNote) {
              els.internalNoteSection.style.display = "block";
              els.internalNoteSection.id = "internal-note";
              const internalNoteTitle = document.getElementById("internal-note-title");
              if (internalNoteTitle) {
                internalNoteTitle.textContent = "Внутренний отчёт";
              }
              if (els.internalNote) {
                els.internalNote.textContent = entry.internalNote;
              }
            } else {
              els.internalNoteSection.style.display = "none";
            }
          }
          
          // Обновляем UI внутреннего доступа
          updateInternalAccessUI();
          
          return;
        } else {
          // Специальный рендер для остальных угроз (ЗАСЕКРЕЧЕНО)
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
        
        // Добавляем оглавление
        renderDossierTOC(entry);
        
        // Добавляем блок "Связано с"
        renderDossierRelated(entry);
      }

      // Материалы - показываем все, включая internal и leak (если есть доступ)
      if (els.blocks) {
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


        if (allMaterials.length === 0) {
          els.blocks.innerHTML = `<div class="note">Материалы отсутствуют или были удалены.</div>`;
        } else {
          // Добавляем якорь к секции материалов
          const materialsSection = document.getElementById("materials-section");
          if (materialsSection) {
            materialsSection.id = "materials";
          }
          els.blocks.innerHTML = allMaterials.map((m, index) => {
            const isInternal = m.stamp && m.stamp.includes("INTERNAL");
            const materialText = redactify(String(m.text || "")).replace(/\n/g, "<br>");
            const materialTitle = (m.kind || "Материал").replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const materialStamp = (m.stamp || "").replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

      // Примечания составителя
      const editorNoteSection = document.getElementById("editor-note-section");
      if (editorNoteSection) {
        if (entry.dossier && entry.dossier.observe) {
          editorNoteSection.id = "editor-note";
          editorNoteSection.style.display = "block";
          if (els.editorNote) {
            els.editorNote.innerHTML = `<strong>Рекомендации по наблюдению:</strong><br>${entry.dossier.observe}`;
          }
        } else {
          editorNoteSection.style.display = "none";
          if (els.editorNote) {
            els.editorNote.textContent = "—";
          }
        }
      }

      // Внутренняя пометка (нестабильная)
      if (els.internalNoteSection) {
        if (entry.internalNote) {
          els.internalNoteSection.style.display = "block";
          els.internalNoteSection.id = "internal-note";
          const internalNoteTitle = document.getElementById("internal-note-title");
          if (internalNoteTitle) {
            internalNoteTitle.textContent = "Внутренний отчёт";
          }
          if (els.internalNote) {
            els.internalNote.textContent = entry.internalNote;
          }
        } else {
          els.internalNoteSection.style.display = "none";
        }
      }


      // Обновляем UI внутреннего доступа
      updateInternalAccessUI();

    } catch (error) {
      console.error('Error in runDossier:', error);
      const els = getElements();
      if (els.head) els.head.textContent = "Сбой компиляции";
      if (els.meta) {
        els.meta.innerHTML = `<div class="note" style="color: rgba(239, 68, 68, 0.9);">
          <p>Сбой компиляции. Данные недоступны.</p>
          <p style="margin-top: 8px; color: rgba(255, 255, 255, 0.6); font-size: 12px; font-family: monospace;">${error.message || "Неизвестная ошибка"}</p>
          <p style="margin-top: 12px;"><a href="index.html" style="color: rgba(255, 255, 255, 0.8); text-decoration: underline;">← Вернуться в архив</a></p>
        </div>`;
      }
      if (els.blocks) els.blocks.innerHTML = "";
      initDossierButtons(null);
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
