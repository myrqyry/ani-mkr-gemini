import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    reporters: ['default', 'html'],
    outputFile: 'test-report/index.html',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'src': path.resolve(__dirname, 'src'),
      'prompts': path.resolve(__dirname, 'prompts.ts'),
    }
  }
});