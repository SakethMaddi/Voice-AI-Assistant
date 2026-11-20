/**
 * Runtime Configuration Helper for Backend API & WebSocket connection
 */

export function getBackendBaseUrl(): string {
  // 1. Check user-configured override in localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('VOICE_AI_BACKEND_URL');
    if (stored && stored.trim()) {
      return stored.trim().replace(/\/+$/, '');
    }
  }

  // 2. Check Vite environment variable
  const metaEnv = (import.meta as any).env;
  const envUrl = (metaEnv?.VITE_BACKEND_URL || metaEnv?.VITE_API_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // 3. Fallback to same host / local proxy
  return '';
}

export function setBackendBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (trimmed) {
      localStorage.setItem('VOICE_AI_BACKEND_URL', trimmed);
    } else {
      localStorage.removeItem('VOICE_AI_BACKEND_URL');
    }
  }
}

export function getApiBaseUrl(): string {
  const backend = getBackendBaseUrl();
  if (backend) {
    return backend.endsWith('/api') ? backend : `${backend}/api`;
  }
  return '/api';
}

export function getWebSocketUrl(): string {
  const backend = getBackendBaseUrl();
  if (backend) {
    const cleanUrl = backend.replace(/\/api$/, '');
    const wsProtocol = cleanUrl.startsWith('https:') ? 'wss:' : 'ws:';
    const wsHost = cleanUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}//${wsHost}/ws`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
}
