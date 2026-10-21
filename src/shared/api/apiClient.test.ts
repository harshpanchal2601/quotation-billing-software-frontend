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
      fieldErrors: {},
      retryable: false,
      isAuthError: true,
    });
  });

  it('sanitizes internal backend errors', async () => {
    const { toApiError } = await import('./apiClient');
    const error = new axios.AxiosError('Request failed with status code 500', undefined, undefined, undefined, {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: { success: false, message: 'PrismaClientKnownRequestError: Unique constraint failed' },
    });

    expect(toApiError(error)).toMatchObject({
      statusCode: 500,
      message: 'Something went wrong while processing your request. Please try again.',
      retryable: true,
    });
  });

  it('extracts flattened and issue-based field errors', async () => {
    const { toApiError } = await import('./apiClient');
    const flattenedError = new axios.AxiosError('Request failed', undefined, undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: {
        success: false,
        message: 'Validation failed',
        errors: { fieldErrors: { bankName: ['Bank name is required'], accountNumber: ['Account number is required'] } },
      },
    });
    const issueError = new axios.AxiosError('Request failed', undefined, undefined, undefined, {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: {
        success: false,
        message: 'Validation failed',
        errors: { issues: [{ path: ['company', 'name'], message: 'Company name is required' }] },
      },
    });

    expect(toApiError(flattenedError).fieldErrors).toEqual({
      bankName: 'Bank name is required',
      accountNumber: 'Account number is required',
    });
    expect(toApiError(issueError).fieldErrors).toEqual({
      'company.name': 'Company name is required',
    });
  });

  it('classifies conflict, file and network errors', async () => {
    const { toApiError } = await import('./apiClient');
    const conflictError = new axios.AxiosError('Request failed', undefined, undefined, undefined, {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: { success: false, message: 'Bank account already exists.' },
    });
    const fileTypeError = new axios.AxiosError('Request failed', undefined, undefined, undefined, {
      status: 415,
      statusText: 'Unsupported Media Type',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: { success: false, message: 'Use a JPEG, PNG or WebP image.' },
    });

    expect(toApiError(conflictError)).toMatchObject({
      message: 'Bank account already exists.',
      isConflict: true,
      retryable: false,
    });
    expect(toApiError(fileTypeError)).toMatchObject({
      message: 'Use a JPEG, PNG or WebP image.',
      isFileTypeError: true,
    });
    expect(toApiError(new axios.AxiosError('Network Error'))).toMatchObject({
      statusCode: 0,
      message: 'We could not connect to the server. Check your connection and try again.',
      retryable: true,
      cancelled: false,
    });
  });

  it('distinguishes cancellation, timeout and temporary service errors', async () => {
    const { toApiError } = await import('./apiClient');
    const timeoutError = new axios.AxiosError(
      'timeout of 15000ms exceeded',
      axios.AxiosError.ECONNABORTED,
    );
    const serviceError = new axios.AxiosError('Request failed', undefined, undefined, undefined, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: { success: false, message: 'upstream ETIMEDOUT /internal/path' },
    });

    expect(toApiError(new axios.CanceledError())).toMatchObject({
      message: '',
      retryable: false,
      cancelled: true,
    });
    expect(toApiError(timeoutError)).toMatchObject({
      message: 'The request took too long. Please try again.',
      retryable: true,
      cancelled: false,
    });
    expect(toApiError(serviceError)).toMatchObject({
      message: 'The service is temporarily unavailable. Please try again shortly.',
      retryable: true,
    });
  });
});
