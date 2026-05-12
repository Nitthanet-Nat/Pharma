import { AuthUser } from '../types';

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message =
      error && typeof error === 'object' && 'error' in error
        ? String((error as { error?: unknown }).error)
        : `Auth API failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
};

export const authService = {
  async me() {
    const result = await requestJson<{ user: AuthUser | null }>('/api/auth/me');
    return result.user;
  },

  async login(identifier: string, password: string) {
    const result = await requestJson<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, email: identifier, username: identifier, password }),
    });
    return result.user;
  },

  async register(name: string, email: string, password: string, username?: string) {
    const result = await requestJson<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, username }),
    });
    return result.user;
  },

  async logout() {
    await requestJson<{ ok: true }>('/api/auth/logout', { method: 'POST' });
  },
};
