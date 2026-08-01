import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { resolveApiBaseUrl } from './apiBaseUrl';

export type ApiSuccessResponse<TData> = {
  success: true;
  message: string;
  data: TData;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  errors?: unknown;
};

export type ApiFieldErrors = Record<string, string>;

export type ApiError = {
  statusCode: number;
  message: string;
  errors?: unknown;
  fieldErrors: ApiFieldErrors;
  retryable: boolean;
  cancelled: boolean;
  isAuthError: boolean;
  isConflict: boolean;
  isFileSizeError: boolean;
  isFileTypeError: boolean;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  skipAuthRefresh?: boolean;
  hasRetriedAfterRefresh?: boolean;
};

let refreshPromise: Promise<void> | null = null;
let authenticationFailureHandler: (() => void) | null = null;

export function setAuthenticationFailureHandler(handler: (() => void) | null) {
  authenticationFailureHandler = handler;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env),
  withCredentials: true,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function createSkipAuthRefreshConfig(config: AxiosRequestConfig = {}): AxiosRequestConfig {
  return {
    ...config,
    skipAuthRefresh: true,
  } as AxiosRequestConfig;
}

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const statusCode = error.response?.status ?? 0;
    const responseData = error.response?.data;
    const fieldErrors = extractFieldErrors(responseData?.errors);
    const cancelled = axios.isCancel(error) || error.code === AxiosError.ERR_CANCELED;

    return {
      statusCode,
      message: normaliseApiErrorMessage(statusCode, responseData?.message, error),
      errors: responseData?.errors,
      fieldErrors,
      retryable: !cancelled && isRetryableStatus(statusCode),
      cancelled,
      isAuthError: statusCode === 401,
      isConflict: statusCode === 409,
      isFileSizeError: statusCode === 413,
      isFileTypeError: statusCode === 415,
    };
  }

  return {
    statusCode: 0,
    message: 'Something went wrong. Please try again.',
    fieldErrors: {},
    retryable: false,
    cancelled: false,
    isAuthError: false,
    isConflict: false,
    isFileSizeError: false,
    isFileTypeError: false,
  };
}

function normaliseApiErrorMessage(
  statusCode: number,
  backendMessage: string | undefined,
  error: AxiosError<ApiErrorResponse>,
) {
  if (axios.isCancel(error) || error.code === AxiosError.ERR_CANCELED) return '';
  if (error.code === AxiosError.ECONNABORTED || error.code === 'ETIMEDOUT') {
    return 'The request took too long. Please try again.';
  }

  if (statusCode >= 500) return fallbackMessageForStatus(statusCode);

  const message = backendMessage?.trim();
  if (message !== undefined && message.length > 0 && isSafeUserMessage(message)) return message;

  return fallbackMessageForStatus(statusCode);
}

function fallbackMessageForStatus(statusCode: number) {
  if (statusCode === 0) return 'We could not connect to the server. Check your connection and try again.';
  if (statusCode === 400 || statusCode === 422) return 'Please check the highlighted fields and try again.';
  if (statusCode === 401) return 'Your session has expired. Please sign in again.';
  if (statusCode === 403) return 'You do not have permission to perform this action.';
  if (statusCode === 404) return 'The requested record could not be found.';
  if (statusCode === 408) return 'The request took too long. Please try again.';
  if (statusCode === 409) return 'A record with these details already exists.';
  if (statusCode === 413) return 'The selected file is too large.';
  if (statusCode === 415) return 'This file type is not supported.';
  if (statusCode === 429) return 'Too many requests. Please wait a moment and try again.';
  if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
    return 'The service is temporarily unavailable. Please try again shortly.';
  }
  if (statusCode >= 500) return 'Something went wrong while processing your request. Please try again.';
  return 'Something went wrong. Please try again.';
}

function isRetryableStatus(statusCode: number) {
  return statusCode === 0 || statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}

function isSafeUserMessage(message: string) {
  const unsafePattern =
    /(axios|network error|request failed|prisma|zoderror|stack|sql\b|select\b|insert\b|update\b|delete\b|errno|econn|etimedout|smtp|node_modules|\/users\/|at\s+\S+\s+\()/i;
  return !unsafePattern.test(message);
}

function extractFieldErrors(errors: unknown): ApiFieldErrors {
  if (!isRecord(errors)) return {};

  const flattenedErrors = errors.fieldErrors;
  if (isRecord(flattenedErrors)) return fieldErrorsFromRecord(flattenedErrors);

  if (Array.isArray(errors.issues)) return fieldErrorsFromIssues(errors.issues);
  if (Array.isArray(errors.errors)) return fieldErrorsFromIssues(errors.errors);

  return fieldErrorsFromRecord(errors);
}

function fieldErrorsFromRecord(record: Record<string, unknown>): ApiFieldErrors {
  return Object.entries(record).reduce<ApiFieldErrors>((accumulator, [field, value]) => {
    const message = messageFromFieldErrorValue(value);
    if (message !== null) accumulator[field] = message;
    return accumulator;
  }, {});
}

function fieldErrorsFromIssues(issues: unknown[]): ApiFieldErrors {
  return issues.reduce<ApiFieldErrors>((accumulator, issue) => {
    if (!isRecord(issue)) return accumulator;

    const path = issue.path;
    const field = Array.isArray(path) ? path.map(String).join('.') : typeof path === 'string' ? path : null;
    const message = typeof issue.message === 'string' ? issue.message.trim() : '';

    if (field !== null && field.length > 0 && message.length > 0) accumulator[field] = message;
    return accumulator;
  }, {});
}

function messageFromFieldErrorValue(value: unknown) {
  if (typeof value === 'string') {
    const message = value.trim();
    return message.length > 0 ? message : null;
  }

  if (Array.isArray(value)) {
    const message = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return message?.trim() ?? null;
  }

  if (isRecord(value) && typeof value.message === 'string') {
    const message = value.message.trim();
    return message.length > 0 ? message : null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRefreshRequest(config: InternalAxiosRequestConfig | undefined) {
  return config?.url?.includes('/auth/refresh') === true;
}

async function refreshSession() {
  if (refreshPromise === null) {
    refreshPromise = apiClient
      .post('/auth/refresh', undefined, createSkipAuthRefreshConfig())
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      originalRequest === undefined ||
      originalRequest.skipAuthRefresh === true ||
      originalRequest.hasRetriedAfterRefresh === true ||
      isRefreshRequest(originalRequest)
    ) {
      return Promise.reject(error);
    }

    originalRequest.hasRetriedAfterRefresh = true;

    try {
      await refreshSession();
      return apiClient(originalRequest);
    } catch (refreshError) {
      authenticationFailureHandler?.();
      return Promise.reject(refreshError);
    }
  },
);

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    hasRetriedAfterRefresh?: boolean;
  }
}
