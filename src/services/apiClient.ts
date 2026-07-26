import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { frontendEnv } from '../config/env';

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

export type ApiError = {
  statusCode: number;
  message: string;
  errors?: unknown;
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
  baseURL: frontendEnv.apiBaseUrl,
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

    return {
      statusCode,
      message:
        responseData?.message ??
        (statusCode === 0 ? 'Network error. Please check your connection.' : 'Request failed'),
      errors: responseData?.errors,
    };
  }

  return {
    statusCode: 0,
    message: 'Something went wrong. Please try again.',
  };
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
