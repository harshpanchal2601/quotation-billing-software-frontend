import { resolveApiBaseUrl } from './apiBaseUrl';

export function resolveAssetUrl(assetUrl: string | null | undefined, version?: string) {
  if (assetUrl === null || assetUrl === undefined || assetUrl.trim().length === 0) return null;
  const trimmed = assetUrl.trim();
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return withVersion(normaliseStoragePath(trimmed), version);

  const path = normaliseStoragePath(trimmed);
  if (path.startsWith('/storage/')) return withVersion(`${apiOrigin()}${path}`, version);
  if (path.startsWith('/api/')) return withVersion(`${apiOrigin()}${path}`, version);
  return null;
}

function apiOrigin() {
  const apiBaseUrl = resolveApiBaseUrl(import.meta.env);
  if (apiBaseUrl.length === 0) return window.location.origin;
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return window.location.origin;
  }
}

function withVersion(url: string, version?: string) {
  if (version === undefined || version.length === 0) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set('v', version);
    return parsed.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${encodeURIComponent(version)}`;
  }
}

function normaliseStoragePath(value: string) {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      parsed.pathname = normaliseStoragePath(parsed.pathname);
      return parsed.toString();
    } catch {
      return value;
    }
  }

  const [rawPath, query = ''] = value.split('?');
  const path = `/${rawPath.replace(/^\/+/, '').replace(/\/{2,}/g, '/')}`;
  const storagePath = path.replace(/^\/storage\/storage\//, '/storage/');
  return query.length > 0 ? `${storagePath}?${query}` : storagePath;
}
