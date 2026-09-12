/** REST base URL. Empty string uses same-origin paths (Vite dev proxy). */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? '';
}

/** Socket.IO base URL. Empty string uses same-origin (Vite dev proxy). */
export function getWsBaseUrl(): string {
  return import.meta.env.VITE_WS_URL ?? '';
}
