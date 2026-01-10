const apiBaseUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '');

if (!apiBaseUrl) {
  throw new Error('VITE_BACKEND_URL is required. Set it in .env.local.');
}

export const API_BASE_URL = apiBaseUrl;

export const STORAGE_KEYS = {
  user: 'pawveda_user',
  auth: 'pawveda_auth'
} as const;
