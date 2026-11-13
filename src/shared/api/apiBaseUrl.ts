export type ApiBaseUrlEnv = Pick<ImportMetaEnv, 'DEV'> & {
  VITE_API_BASE_URL?: string;
};

export function resolveApiBaseUrl(environment: ApiBaseUrlEnv) {
  const apiBaseUrl = environment.VITE_API_BASE_URL?.trim();

  if (apiBaseUrl === undefined || apiBaseUrl.length === 0) {
    throw new Error('Missing VITE_API_BASE_URL environment variable');
  }

  const relative = apiBaseUrl.startsWith('/') && !apiBaseUrl.startsWith('//');
  try {
    const parsed = new URL(apiBaseUrl, relative ? 'https://configuration.invalid' : undefined);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname === '/') throw new Error('Invalid API configuration');
    return relative ? parsed.pathname.replace(/\/+$/, '') : `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch {
    throw new Error('Invalid VITE_API_BASE_URL: use an HTTP(S) URL or root-relative API path, including the API prefix, without credentials, query or fragment');
  }
}
