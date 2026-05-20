const authStorageKey = 'm_track_authenticated';
const tokenStorageKey = 'm_track_access_token';

export function hasAuthSession() {
  return sessionStorage.getItem(authStorageKey) === 'true';
}

export function markAuthSession() {
  sessionStorage.setItem(authStorageKey, 'true');
}

export function clearAuthSession() {
  sessionStorage.removeItem(authStorageKey);
  sessionStorage.removeItem(tokenStorageKey);
}

export function storeAccessToken(token: string) {
  sessionStorage.setItem(tokenStorageKey, token);
}

export function getStoredAccessToken() {
  return sessionStorage.getItem(tokenStorageKey);
}
