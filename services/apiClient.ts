import { API_BASE_URL } from '../lib/config';
import { clearAuthSession, getAuthSession, setAuthSession } from '../lib/auth';

export interface ApiErrorPayload {
  error?: string;
  message?: string;
}

const parseResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }
  return response.text().catch(() => null);
};

const buildHeaders = (headers: HeadersInit | undefined, auth?: boolean) => {
  const next = new Headers(headers);
  if (!next.has('Content-Type')) {
    next.set('Content-Type', 'application/json');
  }
  if (auth) {
    const session = getAuthSession();
    if (session?.accessToken) {
      next.set('Authorization', `Bearer ${session.accessToken}`);
    }
  }
  return next;
};

const isAuthPath = (path: string) =>
  path.startsWith('/api/auth/login') ||
  path.startsWith('/api/auth/register') ||
  path.startsWith('/api/auth/refresh') ||
  path.startsWith('/api/auth/logout');

const refreshAccessToken = async () => {
  const session = getAuthSession();
  if (!session?.refreshToken) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken })
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearAuthSession();
      }
      return null;
    }
    const data = await parseResponse(response);
    if (!data?.accessToken) {
      return null;
    }
    setAuthSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || session.refreshToken,
      user: data.user || session.user
    });
    return data.accessToken as string;
  } catch {
    return null;
  }
};

const requestWithRetry = async <T>(
  path: string,
  options: RequestInit & { auth?: boolean; skipAuthRefresh?: boolean } = {},
  retryAuth = true
): Promise<T> => {
  const { auth, headers, skipAuthRefresh, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: buildHeaders(headers, auth)
  });

  if (
    response.status === 401 &&
    auth &&
    retryAuth &&
    !skipAuthRefresh &&
    !isAuthPath(path)
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return requestWithRetry<T>(path, options, false);
    }
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    const payload = data as ApiErrorPayload | null;
    const message =
      payload?.error ||
      payload?.message ||
      (typeof data === 'string' ? data : null) ||
      'Request failed.';
    throw new Error(message);
  }
  return data as T;
};

export const apiClient = {
  async request<T>(
    path: string,
    options: RequestInit & { auth?: boolean; skipAuthRefresh?: boolean } = {}
  ): Promise<T> {
    return requestWithRetry<T>(path, options);
  },
  get<T>(path: string, options: RequestInit & { auth?: boolean; skipAuthRefresh?: boolean } = {}) {
    return apiClient.request<T>(path, { ...options, method: 'GET' });
  },
  post<T>(
    path: string,
    body: unknown,
    options: RequestInit & { auth?: boolean; skipAuthRefresh?: boolean } = {}
  ) {
    let payload: string;
    try {
      payload = JSON.stringify(body);
    } catch {
      throw new Error('Invalid request data. Please try again.');
    }
    return apiClient.request<T>(path, {
      ...options,
      method: 'POST',
      body: payload
    });
  },
  patch<T>(
    path: string,
    body: unknown,
    options: RequestInit & { auth?: boolean; skipAuthRefresh?: boolean } = {}
  ) {
    let payload: string;
    try {
      payload = JSON.stringify(body);
    } catch {
      throw new Error('Invalid request data. Please try again.');
    }
    return apiClient.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: payload
    });
  }
};
