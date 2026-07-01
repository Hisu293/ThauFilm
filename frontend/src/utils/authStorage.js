const AUTH_STORAGE_KEYS = [
  'cinema_token',
  'cinema_refresh_token',
  'cinema_user',
];

export const getAccessToken = () => localStorage.getItem('cinema_token');

export const hasStoredAuthToken = () => Boolean(getAccessToken());

export const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const clearAuthStorageAndReload = () => {
  if (!hasStoredAuthToken()) return;
  clearAuthStorage();
  window.dispatchEvent(new CustomEvent('auth:invalid-token'));
};
