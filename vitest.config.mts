import path from 'path';
import { defineConfig } from 'vitest/config';

const config = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    isolate: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/security/setup-mocks.ts'],
    // users.test.ts y tests/support|common vienen de la plantilla original del proyecto y
    // apuntan a módulos que no existen; las pruebas reales están en tests/security.
    exclude: ['tests/users.test.ts', 'node_modules/**'],
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
    },
  },
});

export default config;
