import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('apiClient', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('uses credentials and does not store tokens in browser storage', async () => {
    const { apiClient } = await import('./apiClient');
    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('converts safe backend errors into frontend API errors', async () => {
    const { toApiError } = await import('./apiClient');
    const error = new axios.AxiosError('Request failed', undefined, undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: { success: false, message: 'Invalid email, username or password' },
    });
    expect(toApiError(error)).toMatchObject({
      statusCode: 401,
      message: 'Invalid email, username or password',
    });
  });
});
