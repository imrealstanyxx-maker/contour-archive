// Система аутентификации КОНТУР

window.contourAuth = (() => {
  // База данных пользователей
  // Владелец с полным доступом
  const ADMIN_USERS = {
    "marcelo": {
      password: "Evnegirokozyamba008@@@",
      level: "admin", // Полный доступ ко всем секретным материалам
      registered: new Date().toISOString().split('T')[0],
      verified: true,
      email: null // Владелец не требует верификации
    }
  };

  // Зарегистрированные пользователи (хранятся в localStorage)
  function getRegisteredUsers() {
    const stored = localStorage.getItem("contour_registered_users");
    if (!stored) return {};
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }

  function saveRegisteredUsers(users) {
    localStorage.setItem("contour_registered_users", JSON.stringify(users));
  }

  function getSession() {
    const sessionStr = localStorage.getItem("contour_session");
    if (!sessionStr) return null;
    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  }

  function setSession(username, userData) {
    const session = {
      username,
      level: userData.level,
      registered: userData.registered,
      loginTime: new Date().toISOString(),
      verified: userData.verified || false,
      email: userData.email || null
    };
    localStorage.setItem("contour_session", JSON.stringify(session));
    return session;
  }

  function clearSession() {
    // Очищаем только сессию, НЕ удаляем данные пользователя
    localStorage.removeItem("contour_session");
    localStorage.removeItem("contour_internal_access");
    // НЕ удаляем contour_registered_users - это база данных пользователей!
  }

  function isAuthenticated() {
    const session = getSession();
    if (!session) return false;
    
    // Проверяем админа
    if (ADMIN_USERS[session.username]) return true;
    
    // Проверяем зарегистрированных пользователей
    const registeredUsers = getRegisteredUsers();
    return registeredUsers[session.username] !== undefined;
  }

  function getUserData() {
    const session = getSession();
    if (!session) return null;
    
    // Проверяем админа
    if (ADMIN_USERS[session.username]) {
      return {
        username: session.username,
        level: "admin",
        registered: ADMIN_USERS[session.username].registered,
        loginTime: session.loginTime,
        verified: true,
        email: null
      };
    }
    
    // Проверяем зарегистрированных
    const registeredUsers = getRegisteredUsers();
    const userData = registeredUsers[session.username];
    if (!userData) return null;
    
    return {
      username: session.username,
      level: "user",
      registered: userData.registered,
      loginTime: session.loginTime,
      verified: userData.verified || false,
      email: userData.email || null
    };
  }

  function login(username, password) {
    if (!username || !password) {
      console.log("Login failed: empty username or password");
      return false;
    }
    
    username = username.toLowerCase().trim();
    
    // Проверяем админа
    const admin = ADMIN_USERS[username];
    if (admin && admin.password === password) {
      setSession(username, admin);
      console.log("Admin login successful:", username);
      return true;
    }

    // Проверяем зарегистрированных пользователей
    const registeredUsers = getRegisteredUsers();
    console.log("Registered users keys:", Object.keys(registeredUsers));
    console.log("Looking for user:", username);
    
    const user = registeredUsers[username];
    
    if (user) {
      console.log("User found, checking password...");
      // Сравниваем пароли
      if (user.password === password) {
        console.log("Password match! Setting session...");
        setSession(username, user);
        return true;
      } else {
        console.log("Password mismatch. Stored:", user.password.substring(0, 3) + "...", "Provided:", password.substring(0, 3) + "...");
      }
    } else {
      console.log("User not found in registered users");
    }

    return false;
  }

  function register(username, password, email) {
    if (!username || !password || !email) {
      return { success: false, error: "Все поля обязательны" };
    }

    username = username.toLowerCase().trim();
    
    // Проверяем, не занят ли логин
    if (ADMIN_USERS[username]) {
      return { success: false, error: "Логин занят" };
    }

    const registeredUsers = getRegisteredUsers();
    if (registeredUsers[username]) {
      return { success: false, error: "Логин уже существует" };
    }

    // Создаём нового пользователя
    const newUser = {
      password: password,
      level: "user",
      registered: new Date().toISOString().split('T')[0],
      verified: false,
      email: email.toLowerCase().trim()
    };

    registeredUsers[username] = newUser;
    saveRegisteredUsers(registeredUsers);

    // Автоматически входим
    setSession(username, newUser);

    return { success: true };
  }

  function logout() {
    clearSession();
  }

  function hasInternalAccess() {
    if (!isAuthenticated()) return false;
    
    const userData = getUserData();
    // Только админ имеет доступ к секретным материалам
    return userData && userData.level === "admin";
  }

  function isVerified() {
    const userData = getUserData();
    return userData && userData.verified === true;
  }

  // Генерация кода верификации
  function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Отправка кода верификации (в реальном приложении это было бы через email API)
  function sendVerificationCode(email) {
    const code = generateVerificationCode();
    const codes = JSON.parse(localStorage.getItem("contour_verification_codes") || "{}");
    codes[email.toLowerCase()] = {
      code: code,
      expires: Date.now() + 15 * 60 * 1000 // 15 минут
    };
    localStorage.setItem("contour_verification_codes", JSON.stringify(codes));
    
    // В реальном приложении здесь был бы вызов email API
    // Для демо показываем код в консоли
    console.log(`[DEMO] Verification code for ${email}: ${code}`);
    
    return { success: true, code: code }; // В демо возвращаем код для тестирования
  }

  function verifyEmail(email, code) {
    const codes = JSON.parse(localStorage.getItem("contour_verification_codes") || "{}");
    const codeData = codes[email.toLowerCase()];
    
    if (!codeData) {
      return { success: false, error: "Код не найден. Запросите новый код." };
    }

    if (Date.now() > codeData.expires) {
      delete codes[email.toLowerCase()];
      localStorage.setItem("contour_verification_codes", JSON.stringify(codes));
      return { success: false, error: "Код истёк. Запросите новый код." };
    }

    if (codeData.code !== code) {
      return { success: false, error: "Неверный код" };
    }

    // Верифицируем пользователя
    const session = getSession();
    if (!session) {
      return { success: false, error: "Сессия не найдена. Пожалуйста, войдите снова." };
    }

    const registeredUsers = getRegisteredUsers();
    const user = registeredUsers[session.username];
    
    if (!user) {
      return { success: false, error: "Пользователь не найден" };
    }
    
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return { success: false, error: "Email не совпадает" };
    }
    
    // Обновляем статус верификации в базе
    user.verified = true;
    registeredUsers[session.username] = user;
    saveRegisteredUsers(registeredUsers);
    
    // Обновляем сессию с актуальными данными
    setSession(session.username, user);
    
    // Удаляем использованный код
    delete codes[email.toLowerCase()];
    localStorage.setItem("contour_verification_codes", JSON.stringify(codes));
    
    return { success: true };
  }

  return {
    login,
    register,
    logout,
    isAuthenticated,
    getUserData,
    hasInternalAccess,
    isVerified,
    sendVerificationCode,
    verifyEmail
  };
})();
