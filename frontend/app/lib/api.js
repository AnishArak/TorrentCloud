export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'torrentcloud-token';

export function getToken() {
  return typeof window === 'undefined' ? '' : localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API}${path}`, { ...options, headers });
  if (response.status === 401 && typeof window !== 'undefined') {
    clearToken();
    window.location.assign('/login');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

export function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

export function formatSpeed(bytes = 0) {
  return `${(bytes / (1024 ** 2)).toFixed(1)} MB/s`;
}

export function speedOptions(limit, allowUnlimited = false) {
  const options = [1, 2, 5, 10, 20, 50, 100]
    .map((mb) => ({ value: mb, label: `${mb} MB/s`, bytes: mb * 1024 ** 2 }))
    .filter((option) => limit == null || option.bytes <= limit);
  if (allowUnlimited) options.push({ value: 'unlimited', label: 'Unlimited', bytes: null });
  return options;
}

export function speedLabel(bytes) {
  if (bytes == null) return 'Unlimited';
  return `${(bytes / (1024 ** 2)).toLocaleString(undefined, { maximumFractionDigits: 1 })} MB/s`;
}
