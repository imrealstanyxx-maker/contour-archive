// Неполная компиляция - нестабильный список исключённых материалов

(() => {
  const listEl = document.getElementById("partial-list");
  if (!listEl) return;

  // Система накопительных эффектов
  function getPartialState() {
    try {
      const stored = localStorage.getItem("contour_partial_state");
      if (!stored) {
        return {
          visitCount: 0,
          lastVisit: null,
          seenFragments: [],
          degradationLevel: 0
        };
      }
      return JSON.parse(stored);
    } catch {
      return {
        visitCount: 0,
        lastVisit: null,
        seenFragments: [],
        degradationLevel: 0
      };
    }
  }

  function savePartialState(state) {
    try {
      localStorage.setItem("contour_partial_state", JSON.stringify(state));
    } catch (e) {
      // localStorage недоступен - игнорируем
    }
  }

  // Расширенный список фрагментов с разными уровнями "интересности"
  const baseFragments = [
    { text: "КЕ-▮▮▮ — классификация не завершена", weight: 1 },
    { text: "Материал изъят до сверки", weight: 1 },
    { text: "Источник утратил контекст", weight: 1 },
    { text: "Фиксация отменена без указания причины", weight: 1 },
    { text: "Запись существует только в производных ссылках", weight: 1 },
    { text: "Данные повреждены при передаче", weight: 1 },
    { text: "Классификация противоречит установленным правилам", weight: 1 },
    { text: "Материал удалён по запросу источника", weight: 1 },
    { text: "Связь с другими объектами не установлена", weight: 1 },
    { text: "Статус наблюдения не определён", weight: 1 },
    { text: "Локация не подтверждена", weight: 1 },
    { text: "Временные метки противоречат друг другу", weight: 1 },
    { text: "Доступ к источнику ограничен", weight: 1 },
    { text: "Материал помечен как нестабильный", weight: 1 },
    { text: "Сверка не завершена", weight: 1 },
    { text: "Запись существует только в архивах", weight: 1 },
    { text: "Классификация требует уточнения", weight: 1 },
    { text: "Источник недоступен для проверки", weight: 1 },
    // Более интересные фрагменты (реже появляются)
    { text: "Упоминание о КЕ-С/001 в удалённых протоколах", weight: 0.3, hint: true },
    { text: "Связь с лестничным пролётом не подтверждена", weight: 0.4, hint: true },
    { text: "Материал о сдвиге формулировок изъят", weight: 0.3, hint: true },
    { text: "Запись о кабинете без назначения удалена", weight: 0.4, hint: true },
    { text: "Данные о человеке из списка нестабильны", weight: 0.3, hint: true },
    { text: "Протокол звонка без номера утрачен", weight: 0.4, hint: true },
    { text: "Информация о профиле без лица ограничена", weight: 0.3, hint: true },
    { text: "Картотека-7: дополнительные записи отсутствуют", weight: 0.2, hint: true },
    { text: "Санкт-Петербург: часть материалов недоступна", weight: 0.3, hint: true },
    { text: "Связь между объектами не документирована", weight: 0.4 },
    { text: "Материал содержит противоречивые данные", weight: 0.5 },
    { text: "Источник требует дополнительной проверки", weight: 0.6 },
    { text: "Запись существует в альтернативной классификации", weight: 0.3 },
    { text: "Данные частично восстановлены из резервных копий", weight: 0.4 },
    { text: "Материал помечен для последующего рассмотрения", weight: 0.5 },
    { text: "Связь с внешней системой наблюдения не установлена", weight: 0.2 },
    { text: "Запись удалена в ходе автоматической сверки", weight: 0.4 },
    { text: "Источник не отвечает на запросы", weight: 0.5 },
    { text: "Материал содержит неразрешённые ссылки", weight: 0.3 },
    { text: "Классификация не соответствует текущим стандартам", weight: 0.4 }
  ];

  function renderPartialList() {
    const state = getPartialState();
    const now = Date.now();
    
    // Увеличиваем счётчик посещений
    state.visitCount = (state.visitCount || 0) + 1;
    
    // Проверяем деградацию (при частых посещениях список "ухудшается")
    const timeSinceLastVisit = state.lastVisit ? (now - state.lastVisit) : Infinity;
    if (timeSinceLastVisit < 10000) { // Меньше 10 секунд между посещениями
      state.degradationLevel = Math.min(5, (state.degradationLevel || 0) + 1);
    } else if (timeSinceLastVisit > 3600000) { // Больше часа
      state.degradationLevel = Math.max(0, (state.degradationLevel || 0) - 1);
    }
    
    state.lastVisit = now;
    
    // Фильтруем фрагменты по весу (с учётом деградации)
    let availableFragments = baseFragments.filter(f => {
      const threshold = 1 - (state.degradationLevel * 0.1);
      return Math.random() < (f.weight * threshold);
    }).map(f => f.text);
    
    // Если деградация высокая, добавляем "плохие" фрагменты
    if (state.degradationLevel > 3) {
      availableFragments.push("Данные недоступны.");
      availableFragments.push("Связь с сервером потеряна.");
    }
    
    // Если фрагментов слишком мало, добавляем базовые
    if (availableFragments.length < 5) {
      const basicFragments = baseFragments.filter(f => f.weight === 1).map(f => f.text);
      availableFragments = [...availableFragments, ...basicFragments.slice(0, 8)];
    }
    
    // Перемешиваем порядок
    availableFragments.sort(() => Math.random() - 0.5);
    
    // Удаляем 1-3 случайных элемента (нестабильность)
    const removeCount = Math.random() < 0.3 ? 1 : (Math.random() < 0.6 ? 2 : 3);
    for (let i = 0; i < removeCount && availableFragments.length > 3; i++) {
      const randomIndex = Math.floor(Math.random() * availableFragments.length);
      availableFragments.splice(randomIndex, 1);
    }
    
    // Фильтруем фрагменты, связанные с KES-001 и KEM-002
    const allowedFragments = availableFragments.filter(f => {
      return f.includes('КЕ-С/001') || f.includes('КЕ-М/002') || 
             f.includes('лестничн') || f.includes('Лицо №0') ||
             f.includes('Картотека-7');
    });
    
    // Добавляем строку-заглушку в конце
    availableFragments = [...allowedFragments];
    if (availableFragments.length < baseFragments.filter(f => f.weight === 1).length) {
      availableFragments.push("Список сокращён. Часть материалов исключена и зашифрована.");
    } else {
      availableFragments.push("Список сокращён. Часть материалов исключена и зашифрована.");
    }
    
    // Сохраняем состояние
    savePartialState(state);
    
    // Генерируем HTML с разными уровнями визуального выделения
    if (availableFragments.length === 0) {
      listEl.innerHTML = '<div class="note" style="color: rgba(255, 255, 255, 0.4); font-style: italic;">Материалы отсутствуют.</div>';
    } else {
      listEl.innerHTML = availableFragments.map((fragment, index) => {
        // Разная прозрачность для создания глубины
        const opacity = 0.4 + (Math.random() * 0.3);
        const isHint = baseFragments.find(f => f.text === fragment && f.hint);
        const borderColor = isHint ? "rgba(90, 200, 250, 0.2)" : "rgba(255, 255, 255, 0.1)";
        const textColor = isHint ? `rgba(90, 200, 250, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
        
        return `<div class="note" style="color: ${textColor}; margin-bottom: 8px; padding: 8px; border-left: 2px solid ${borderColor}; transition: opacity 0.3s;">${fragment}</div>`;
      }).join("");
    }
  }

  // Запускаем при загрузке страницы
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderPartialList);
  } else {
    renderPartialList();
  }
})();

