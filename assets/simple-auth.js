// Простая система авторизации на localStorage (без Supabase)

window.contourAuth = (() => {
  'use strict';

  function getCurrentUser() {
    try {
      const userStr = localStorage.getItem('contour_user');
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }

  function isAuthenticated() {
    return getCurrentUser() !== null;
  }

  function getUserData() {
    const user = getCurrentUser();
    if (!user) return null;
    
    return {
      username: user.username || user.email?.split('@')[0] || 'user',
      email: user.email,
      level: user.role || 'user',
      verified: user.verified || false,
      id: user.id
    };
  }

  function hasInternalAccess() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
  }

  function signOut() {
    localStorage.removeItem('contour_user');
  }

  return {
    getCurrentUser,
    isAuthenticated,
    getUserData,
    hasInternalAccess,
    signOut
  };
})();

