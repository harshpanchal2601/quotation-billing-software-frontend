type FrontendEnv = {
  apiBaseUrl: string;
};

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '');
}

export function parseFrontendEnv(environment: ImportMetaEnv): FrontendEnv {
  const apiBaseUrl = environment.VITE_API_BASE_URL?.trim();

  if (apiBaseUrl === undefined || apiBaseUrl.length === 0) {
    if (environment.DEV) {
      throw new Error('Missing VITE_API_BASE_URL environment variable');
    }

    return { apiBaseUrl: '' };
  }

  return {
    apiBaseUrl: trimTrailingSlashes(apiBaseUrl),
  };
}

export const frontendEnv = parseFrontendEnv(import.meta.env);
