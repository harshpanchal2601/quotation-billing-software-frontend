export type ApiBaseUrlEnv = Pick<ImportMetaEnv, 'DEV'> & {
  VITE_API_BASE_URL?: string;
};

export function resolveApiBaseUrl(environment: ApiBaseUrlEnv) {
  const apiBaseUrl = environment.VITE_API_BASE_URL?.trim();

  if (apiBaseUrl === undefined || apiBaseUrl.length === 0) {
    throw new Error('Missing VITE_API_BASE_URL environment variable');
  }

  return trimTrailingSlashes(apiBaseUrl);
}

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '');
}
