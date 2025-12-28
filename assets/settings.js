// Система настроек Контура
// Настройки меняют поведение системы, а не улучшают опыт

(function() {
  'use strict';

  // Дефолтные настройки
  const DEFAULT_SETTINGS = {
    interpretationMode: 'standard',
    detailLevel: 1, // 0 = Сводка, 1 = Материалы, 2 = Полный контекст
    smoothDiscrepancies: false,
    showUnconfirmed: false,
    hideRepetitions: false,
    mismatchBehavior: 'ignore', // ignore, mark, remove
    allowDelayed: false,
    showOutsideCompilation: false
  };

  // Загрузка настроек из localStorage
  function loadSettings() {
    const saved = localStorage.getItem('contour_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  }

  // Сохранение настроек в localStorage
  function saveSettings(settings) {
    localStorage.setItem('contour_settings', JSON.stringify(settings));
    // Уведомляем другие скрипты об изменении настроек
    window.dispatchEvent(new CustomEvent('contourSettingsChanged', { detail: settings }));
  }

  // Получение текущих настроек
  function getSettings() {
    return loadSettings();
  }

  // Инициализация UI настроек
  function initSettingsUI() {
    const modal = document.getElementById('settings-modal');
    const btn = document.getElementById('settings-btn');
    const closeBtn = document.getElementById('settings-close');
    const resetBtn = document.getElementById('settings-reset');
    const resetMessage = document.getElementById('settings-reset-message');

    if (!modal || !btn) return;

    const settings = loadSettings();

    // Открытие модального окна
    btn.addEventListener('click', () => {
      modal.style.display = 'flex';
      updateUIFromSettings(settings);
    });

    // Закрытие модального окна
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        modal.style.display = 'none';
      }
    });

    // Обновление UI из настроек
    function updateUIFromSettings(s) {
      const modeSelect = document.getElementById('interpretation-mode');
      const detailSlider = document.getElementById('detail-level');
      const smoothCheck = document.getElementById('smooth-discrepancies');
      const unconfirmedCheck = document.getElementById('show-unconfirmed');
      const hideRepCheck = document.getElementById('hide-repetitions');
      const mismatchRadios = document.querySelectorAll('input[name="mismatch-behavior"]');
      const delayedCheck = document.getElementById('allow-delayed');
      const outsideCheck = document.getElementById('show-outside-compilation');

      if (modeSelect) modeSelect.value = s.interpretationMode;
      if (detailSlider) detailSlider.value = s.detailLevel;
      if (smoothCheck) smoothCheck.checked = s.smoothDiscrepancies;
      if (unconfirmedCheck) unconfirmedCheck.checked = s.showUnconfirmed;
      if (hideRepCheck) hideRepCheck.checked = s.hideRepetitions;
      if (mismatchRadios.length) {
        mismatchRadios.forEach(radio => {
          radio.checked = radio.value === s.mismatchBehavior;
        });
      }
      if (delayedCheck) delayedCheck.checked = s.allowDelayed;
      if (outsideCheck) outsideCheck.checked = s.showOutsideCompilation;
    }

    // Обработчики изменений
    const modeSelect = document.getElementById('interpretation-mode');
    const detailSlider = document.getElementById('detail-level');
    const smoothCheck = document.getElementById('smooth-discrepancies');
    const unconfirmedCheck = document.getElementById('show-unconfirmed');
    const hideRepCheck = document.getElementById('hide-repetitions');
    const mismatchRadios = document.querySelectorAll('input[name="mismatch-behavior"]');
    const delayedCheck = document.getElementById('allow-delayed');
    const outsideCheck = document.getElementById('show-outside-compilation');

    if (modeSelect) {
      modeSelect.addEventListener('change', (e) => {
        const s = loadSettings();
        s.interpretationMode = e.target.value;
        saveSettings(s);
      });
    }

    if (detailSlider) {
      detailSlider.addEventListener('input', (e) => {
        const s = loadSettings();
        s.detailLevel = parseInt(e.target.value);
        saveSettings(s);
      });
    }

    if (smoothCheck) {
      smoothCheck.addEventListener('change', (e) => {
        const s = loadSettings();
        s.smoothDiscrepancies = e.target.checked;
        saveSettings(s);
      });
    }

    if (unconfirmedCheck) {
      unconfirmedCheck.addEventListener('change', (e) => {
        const s = loadSettings();
        s.showUnconfirmed = e.target.checked;
        saveSettings(s);
      });
    }

    if (hideRepCheck) {
      hideRepCheck.addEventListener('change', (e) => {
        const s = loadSettings();
        s.hideRepetitions = e.target.checked;
        saveSettings(s);
      });
    }

    if (mismatchRadios.length) {
      mismatchRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            const s = loadSettings();
            s.mismatchBehavior = e.target.value;
            saveSettings(s);
          }
        });
      });
    }

    if (delayedCheck) {
      delayedCheck.addEventListener('change', (e) => {
        const s = loadSettings();
        s.allowDelayed = e.target.checked;
        saveSettings(s);
      });
    }

    if (outsideCheck) {
      outsideCheck.addEventListener('change', (e) => {
        const s = loadSettings();
        s.showOutsideCompilation = e.target.checked;
        saveSettings(s);
      });
    }

    // Кнопка сброса
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        saveSettings(DEFAULT_SETTINGS);
        updateUIFromSettings(DEFAULT_SETTINGS);
        resetMessage.style.display = 'block';
        setTimeout(() => {
          resetMessage.style.display = 'none';
        }, 3000);
      });
    }

    // Инициализация UI при загрузке
    updateUIFromSettings(settings);
  }

  // Инициализация при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsUI);
  } else {
    initSettingsUI();
  }

  // Экспорт функции получения настроек для других скриптов
  window.getContourSettings = getSettings;
})();

