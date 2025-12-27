// Неполная компиляция - нестабильный список исключённых материалов

(() => {
  const listEl = document.getElementById("partial-list");
  if (!listEl) return;

  // Базовый список фрагментов
  const baseFragments = [
    "КЕ-▮▮▮ — классификация не завершена",
    "Материал изъят до сверки",
    "Источник утратил контекст",
    "Фиксация отменена без указания причины",
    "Запись существует только в производных ссылках",
    "Данные повреждены при передаче",
    "Классификация противоречит установленным правилам",
    "Материал удалён по запросу источника",
    "Связь с другими объектами не установлена",
    "Статус наблюдения не определён",
    "Локация не подтверждена",
    "Временные метки противоречат друг другу",
    "Доступ к источнику ограничен",
    "Материал помечен как нестабильный",
    "Сверка не завершена",
    "Запись существует только в архивах",
    "Классификация требует уточнения",
    "Источник недоступен для проверки"
  ];

  function renderPartialList() {
    // Создаём копию массива для работы
    let fragments = [...baseFragments];
    
    // Перемешиваем порядок
    fragments.sort(() => Math.random() - 0.5);
    
    // Удаляем 1-2 случайных элемента (нестабильность)
    const removeCount = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < removeCount && fragments.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * fragments.length);
      fragments.splice(randomIndex, 1);
    }
    
    // Иногда (20% вероятность) добавляем строку о неполноте списка
    if (Math.random() < 0.2) {
      fragments.push("Список неполон.");
    }
    
    // Генерируем HTML
    if (fragments.length === 0) {
      listEl.innerHTML = '<div class="note" style="color: rgba(255, 255, 255, 0.4); font-style: italic;">Материалы отсутствуют.</div>';
    } else {
      listEl.innerHTML = fragments.map(fragment => 
        `<div class="note" style="color: rgba(255, 255, 255, 0.6); margin-bottom: 8px; padding: 8px; border-left: 2px solid rgba(255, 255, 255, 0.1);">${fragment}</div>`
      ).join("");
    }
  }

  // Запускаем при загрузке страницы
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderPartialList);
  } else {
    renderPartialList();
  }
})();

