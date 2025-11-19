import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
    // Include Next.js API routes in test coverage
    include: [
      'src/**/*.{test,spec}.{js,jsx}',
      'app/**/*.{test,spec}.{js,jsx}',
    ],
  },
});

