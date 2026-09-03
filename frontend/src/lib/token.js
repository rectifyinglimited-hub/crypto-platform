export const TOKEN_STORAGE_KEY = "nexus_token";

const safeStorage = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
};

export const getToken = () => {
  const s = safeStorage();
  if (!s) return null;
  try {
    return s.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  const s = safeStorage();
  if (!s) return;
  try {
    if (token) s.setItem(TOKEN_STORAGE_KEY, token);
    else s.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

export const clearToken = () => setToken(null);
