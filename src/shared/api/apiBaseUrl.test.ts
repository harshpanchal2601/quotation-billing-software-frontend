import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './apiBaseUrl';

describe('API configuration', () => {
  it.each([
    [' http://localhost:3004/api/v1/// ', 'http://localhost:3004/api/v1'],
    ['https://erp.example.invalid/backend/api/v1/', 'https://erp.example.invalid/backend/api/v1'],
    ['/api/v1/', '/api/v1'],
  ])('normalizes a configured API prefix: %s', (configured, expected) => {
    expect(resolveApiBaseUrl({ DEV: false, VITE_API_BASE_URL: configured })).toBe(expected);
  });
  it.each(['', 'api/v1', '//other.invalid/api/v1', 'file:///api/v1', 'https://user:secret@example.invalid/api/v1', 'https://example.invalid/', '/api/v1?secret=private', '/api/v1#fragment'])('rejects an ambiguous or unsafe configuration: %s', (configured) => {
    expect(() => resolveApiBaseUrl({ DEV: true, VITE_API_BASE_URL: configured })).toThrow();
  });
});
