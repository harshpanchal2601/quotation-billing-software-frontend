import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const resolveAlias = (path: string) => new URL(path, import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': resolveAlias('./src/app'),
      '@shared': resolveAlias('./src/shared'),
      '@features': resolveAlias('./src/features'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/shared/test/setup.ts',
    globals: true,
  },
});
