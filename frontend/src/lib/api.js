const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "";
const DEVICE_ID_KEY = "blunder.deviceId";

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

export function getDeviceId() {
  let deviceId = window.localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}
