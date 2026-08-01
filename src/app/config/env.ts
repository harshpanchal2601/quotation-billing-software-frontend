import { resolveApiBaseUrl } from '@shared/api/apiBaseUrl';

type FrontendEnv = {
  apiBaseUrl: string;
};

export function parseFrontendEnv(environment: ImportMetaEnv): FrontendEnv {
  return {
    apiBaseUrl: resolveApiBaseUrl(environment),
  };
}

export const frontendEnv = parseFrontendEnv(import.meta.env);
