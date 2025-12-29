(() => {
  'use strict';

  // Фрагменты данных - только связанные с KES-001 и KEM-002
  const fragments = [
    // Уровень 0 - реальные фрагменты
    {
      id: 'FRAG-00A',
      name: 'README.partial',
      level: 0,
      content: 'Это не архив. Это остаток компиляции.\nЕсли вы читаете это через стандартный интерфейс — вы уже поздно.\nИнструкции доступны: /help',
      tags: []
    },
    {
      id: 'FRAG-00B',
      name: 'index.delta',
      level: 0,
      content: 'Сводка: расхождение списков обнаружено.\nРазница: 1 запись.\nПричина: отсутствует.\nПовторная сверка: отключена по инициативе составителя.',
      tags: []
    },
    {
      id: 'FRAG-00E',
      name: 'latch.memo',
      level: 0,
      content: 'Если компиляция зависает на одном и том же месте —\nне перезагружать.\nКлюч используется только один раз.\nflag: LATCH',
      tags: []
    },
    {
      id: 'FRAG-00F',
      name: 'km02.entry',
      level: 0,
      content: 'Табличка появилась на стене, где нет дверей по плану.\nМаршрут "вёл сам".',
      tags: ['KEM-002']
    },
    {
      id: 'FRAG-00G',
      name: 'km02.camera_gap',
      level: 0,
      content: 'Провал фиксации в момент входа повторяется.\nЭто не похоже на помехи.\nСкорее на отказ принять событие.',
      tags: ['KEM-002']
    },
    {
      id: 'FRAG-00K',
      name: 'kes01.zero_record',
      level: 0,
      content: 'KES-001: Нулевая запись.\nОснование внесения: закрытие несоответствия учёта.\nКартотека-7, ячейка 3-14. Лицо №0.',
      tags: ['KES-001']
    },
    // Уровень 0 - зашифрованные заглушки
    {
      id: 'FRAG-ENC-01',
      name: 'vault-01.enc',
      level: 0,
      content: 'encrypted',
      tags: [],
      encrypted: true
    },
    {
      id: 'FRAG-ENC-02',
      name: 'vault-02.enc',
      level: 0,
      content: 'encrypted',
      tags: [],
      encrypted: true
    },
    {
      id: 'FRAG-ENC-03',
      name: 'vault-03.enc',
      level: 0,
      content: 'encrypted',
      tags: [],
      encrypted: true
    },
    {
      id: 'FRAG-ENC-04',
      name: 'vault-04.enc',
      level: 0,
      content: 'encrypted',
      tags: [],
      encrypted: true
    },
    {
      id: 'FRAG-ENC-05',
      name: 'vault-05.enc',
      level: 0,
      content: 'encrypted',
      tags: [],
      encrypted: true
    },
    {
      id: 'FRAG-ENC-06',
      name: 'vault-06.enc',
      level: 0,
      content: 'encrypted',
      tags: [],
      encrypted: true
    },
    {
      id: 'FRAG-ENC-07',
      name: 'vault-07.enc',
      level: 0,
      content: 'encrypted',
      tags: [],
      encrypted: true
    },
    {
      id: 'FRAG-ENC-08',
      name: 'vault-08.enc',
      level: 0,
      content: 'encrypted',
      tags: [],
      encrypted: true
    },
    // Уровень 1
    {
      id: 'FRAG-10B',
      name: 'incident.09',
      level: 1,
      content: 'ИНЦ-09:\nВ помещении было 4 человека.\nПосле выхода каждый был уверен, что выходил пятым.\nНа видео видно, что один из них не входит в кадр ни разу.\nНо голос его слышен всегда.\nвывод прекращён по коду: CUTOFF',
      tags: []
    },
    {
      id: 'FRAG-10D',
      name: 'kes01.service_string',
      level: 1,
      content: 'KES-001:\nПосле попытки закрыть запись в документах появилась строка "обслуживание".\nНикто не смог назвать человека.\nСтрока была "всегда".',
      tags: ['KES-001']
    },
    {
      id: 'FRAG-10G',
      name: 'kes01.exit_sign',
      level: 1,
      content: 'KES-001:\nТабличка "СЛУЖЕБНЫЙ ВЫХОД" появилась на участке стены после попытки закрыть несоответствие в реестре.\nУчасток должен быть глухим по планам.',
      tags: ['KES-001']
    },
    {
      id: 'FRAG-10E',
      name: 'km02.registry_shift',
      level: 1,
      content: 'После инцидента в ведомости появилась строка "обслуживание".\nНикто не смог назвать человека.\nСтрока была "всегда".',
      tags: ['KEM-002']
    },
    {
      id: 'FRAG-10F',
      name: 'km02.note_short',
      level: 1,
      content: 'Не ищите выход.\nОн появляется не для выхода.',
      tags: ['KEM-002']
    },
    {
      id: 'FRAG-10H',
      name: 'th02.name_ban',
      level: 1,
      content: 'THREAT-002:\nФИО запрещены к использованию в документации.\nПроизнесение имени ускоряет процесс переноса.',
      tags: ['THREAT-002']
    },
    {
      id: 'FRAG-10I',
      name: 'th02.empty_string',
      level: 1,
      content: 'THREAT-002:\nПосле контакта в реестрах появляется пустая строка.\nМесто для "обслуживания".\nНикто не может назвать человека.',
      tags: ['THREAT-002']
    },
    // Уровень 1 - зашифрованные заглушки
    {
      id: 'FRAG-ENC-09',
      name: 'vault-09.enc',
      level: 1,
      content: 'encrypted',
      tags: [],
      encrypted: true
    },
    {
      id: 'FRAG-ENC-10',
      name: 'vault-10.enc',
      level: 1,
      content: 'encrypted',
      tags: [],
      encrypted: true
    },
    // Уровень 2
    {
      id: 'FRAG-20A',
      name: 'cutoff.report',
      level: 2,
      content: 'КОД ЗАВЕРШЕНИЯ: CUTOFF\nУровень доступа повышен не по заявке.\nПричина: внешняя синхронизация.\n\nДальнейший вывод частично изъят.\n[██████████]\nНе присваивать класс.\nКласс присваивает оно.\n[██████████]\nПервые три случая — смерть без причины.\nЧетвёртый случай — смерть с правильной причиной.',
      tags: []
    },
    {
      id: 'FRAG-20B',
      name: 'km02.incident_05',
      level: 2,
      content: 'ИНЦ-05 (эвакуация):\nПри пересчёте людей после тревоги обнаружено несоответствие.\nСвидетели называют субъекта, но не могут описать момент, когда он отделился от группы.\nЧерез несколько часов найден в техзоне.\nПричина смерти классифицирована как несчастный случай.\nОтдельно отмечено: отсутствие убедимых подтверждений входа в зону.',
      tags: ['KEM-002']
    },
    {
      id: 'FRAG-20C',
      name: 'th02.exit_sign',
      level: 2,
      content: 'THREAT-002:\nПосле контакта табличка "СЛУЖЕБНЫЙ ВЫХОД" появляется в местах, где её не должно быть.\nСлужебные маршруты начинают "вести" к субъекту.\nМеханизм среды совпадает со служебными выходами.',
      tags: ['THREAT-002']
    }
  ];

  // Элементы DOM
  const outputEl = document.getElementById('terminal-output');
  const inputEl = document.getElementById('terminal-input');

  // История команд
  let commandHistory = [];
  let historyIndex = -1;

  // Получить текущий уровень доступа
  function getLevel() {
    const level = localStorage.getItem('contour_terminal_level');
    return level ? parseInt(level, 10) : 0;
  }

  // Установить уровень доступа
  function setLevel(level) {
    localStorage.setItem('contour_terminal_level', level.toString());
  }

  // Получить найденные ключи
  function getFoundKeys() {
    const keys = localStorage.getItem('contour_terminal_keys');
    return keys ? JSON.parse(keys) : [];
  }

  // Сохранить найденный ключ
  function saveKey(key) {
    const keys = getFoundKeys();
    if (!keys.includes(key)) {
      keys.push(key);
      localStorage.setItem('contour_terminal_keys', JSON.stringify(keys));
    }
  }

  // Вывод в терминал
  function print(text, className = '') {
    if (!outputEl) return;
    const line = document.createElement('div');
    line.className = `terminal-line ${className}`;
    line.textContent = text;
    outputEl.appendChild(line);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  // Вывод многострочного текста
  function printMultiline(text, className = '') {
    const lines = text.split('\n');
    lines.forEach(line => print(line, className));
  }

  // Декодирование base64
  function decodeBase64(str) {
    try {
      return atob(str);
    } catch (e) {
      return null;
    }
  }

  // Декодирование hex
  function decodeHex(str) {
    try {
      const hex = str.replace(/[^0-9a-fA-F]/g, '');
      if (hex.length % 2 !== 0) return null;
      let result = '';
      for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.substr(i, 2), 16);
        if (byte === 0) return null; // Нулевой байт = не текст
        result += String.fromCharCode(byte);
      }
      return result;
    } catch (e) {
      return null;
    }
  }

  // Автоопределение формата и декодирование
  function autoDecode(str) {
    // Пробуем base64
    const base64Result = decodeBase64(str);
    if (base64Result && /^[\x20-\x7E\s]*$/.test(base64Result)) {
      return { format: 'base64', result: base64Result };
    }

    // Пробуем hex
    const hexResult = decodeHex(str);
    if (hexResult && /^[\x20-\x7E\s]*$/.test(hexResult)) {
      return { format: 'hex', result: hexResult };
    }

    return null;
  }

  // Получить доступные фрагменты
  function getAvailableFragments() {
    const level = getLevel();
    return fragments.filter(f => f.level <= level);
  }

  // Найти фрагмент по имени или id
  function findFragment(query) {
    const available = getAvailableFragments();
    return available.find(f => 
      f.name.toLowerCase() === query.toLowerCase() || 
      f.id.toLowerCase() === query.toLowerCase()
    );
  }

  // Команды
  const commands = {
    help: () => {
      print('Доступные инструкции:');
      print('  help          — список команд');
      print('  clear         — очистить вывод');
      print('  status        — текущий уровень доступа');
      print('  ls            — список доступных фрагментов');
      print('  cat <name>    — показать фрагмент');
      print('  open <id>     — показать фрагмент по id');
      print('  grep <word>   — поиск по фрагментам');
      print('  decode <str>  — декодировать (base64/hex)');
      print('  verify <key>  — проверить ключ доступа');
      print('Примечание: часть контейнеров недоступна (шифрование).');
    },

    clear: () => {
      if (outputEl) {
        outputEl.innerHTML = '';
      }
    },

    status: () => {
      const level = getLevel();
      const keys = getFoundKeys();
      print(`Уровень доступа: ${level}`);
      if (keys.length > 0) {
        print(`Найдено ключей: ${keys.length}`);
      }
    },

    ls: () => {
      const available = getAvailableFragments();
      if (available.length === 0) {
        print('совпадений не найдено');
        return;
      }
      available.forEach(f => {
        if (f.encrypted) {
          print(`  ${f.name} (${f.id}) [зашифрован]`);
        } else {
          print(`  ${f.name} (${f.id})`);
        }
      });
    },

    cat: (args) => {
      if (!args || args.trim() === '') {
        print('неизвестная инструкция: укажите имя фрагмента');
        return;
      }
      const fragment = findFragment(args.trim());
      if (!fragment) {
        print('совпадений не найдено');
        return;
      }
      if (fragment.encrypted) {
        print('Невозможно прочитать: контейнер зашифрован.');
        print('Причина: сверка не завершена.');
        return;
      }
      printMultiline(fragment.content);
    },

    open: (args) => {
      if (!args || args.trim() === '') {
        print('неизвестная инструкция: укажите id фрагмента');
        return;
      }
      const fragment = findFragment(args.trim());
      if (!fragment) {
        print('совпадений не найдено');
        return;
      }
      if (fragment.encrypted) {
        print('Невозможно прочитать: контейнер зашифрован.');
        print('Причина: сверка не завершена.');
        return;
      }
      printMultiline(fragment.content);
    },

    grep: (args) => {
      if (!args || args.trim() === '') {
        print('неизвестная инструкция: укажите поисковый запрос');
        return;
      }
      const query = args.trim().toLowerCase();
      const available = getAvailableFragments();
      const matches = available.filter(f => 
        !f.encrypted && (
          f.content.toLowerCase().includes(query) ||
          f.name.toLowerCase().includes(query) ||
          f.tags.some(t => t.toLowerCase().includes(query))
        )
      );
      
      if (matches.length === 0) {
        print('совпадений не найдено');
        return;
      }

      matches.forEach(f => {
        print(`  ${f.name} (${f.id})`);
        // Показываем контекст, если это поиск по коду завершения
        if (query === 'код' || query === 'завершения' || query === 'cutoff') {
          const lines = f.content.split('\n');
          const relevantLine = lines.find(l => l.toLowerCase().includes(query));
          if (relevantLine) {
            print(`    ${relevantLine}`);
          }
        }
      });
    },

    decode: (args) => {
      if (!args || args.trim() === '') {
        print('неизвестная инструкция: укажите строку для декодирования');
        return;
      }
      const str = args.trim();
      const result = autoDecode(str);
      if (!result) {
        print('декодирование не удалось');
        return;
      }
      print(`Формат: ${result.format}`);
      printMultiline(result.result);
    },

    verify: (args) => {
      if (!args || args.trim() === '') {
        print('неизвестная инструкция: укажите ключ');
        return;
      }
      const key = args.trim().toUpperCase();
      const currentLevel = getLevel();
      const foundKeys = getFoundKeys();

      if (key === 'LATCH' && currentLevel === 0) {
        setLevel(1);
        saveKey('LATCH');
        print('ключ принят');
        print('уровень повышен');
      } else if (key === 'CUTOFF' && currentLevel === 1) {
        setLevel(2);
        saveKey('CUTOFF');
        print('ключ принят');
        print('уровень повышен');
      } else if (foundKeys.includes(key)) {
        print('ключ уже использован');
      } else {
        print('доступ ограничен');
      }
    }
  };

  // Обработка команды
  function executeCommand(input) {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Сохраняем в историю
    commandHistory.push(trimmed);
    historyIndex = commandHistory.length;

    // Показываем команду
    print(`> ${trimmed}`, 'terminal-prompt');

    // Обработка /help как алиаса для help
    let commandInput = trimmed;
    if (commandInput.startsWith('/')) {
      commandInput = commandInput.substring(1);
    }

    // Парсим команду
    const parts = commandInput.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    // Выполняем команду
    if (commands[cmd]) {
      try {
        commands[cmd](args);
      } catch (e) {
        print('ошибка выполнения', 'terminal-error');
      }
    } else {
      print('неизвестная инструкция', 'terminal-error');
    }
  }

  // Обработка ввода
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = inputEl.value;
        executeCommand(value);
        inputEl.value = '';
        historyIndex = commandHistory.length;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
          historyIndex--;
          inputEl.value = commandHistory[historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          inputEl.value = commandHistory[historyIndex];
        } else {
          historyIndex = commandHistory.length;
          inputEl.value = '';
        }
      }
    });
  }

  // Приветственное сообщение
  print('Служебный ввод активирован.');
  print('Введите /help для списка инструкций.');
  print('');
})();
