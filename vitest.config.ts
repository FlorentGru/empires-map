import { defineConfig } from 'vitest/config';
import { empireIndex } from './build/empireIndex';

export default defineConfig({
  plugins: [empireIndex()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
