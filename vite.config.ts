import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
          '@components': path.resolve(__dirname, 'src/components'),
          '@hooks': path.resolve(__dirname, 'src/hooks'),
          '@services': path.resolve(__dirname, 'src/services'),
          '@contexts': path.resolve(__dirname, 'src/contexts'),
          '@reducers': path.resolve(__dirname, 'src/reducers'),
          '@schemas': path.resolve(__dirname, 'src/schemas'),
          '@types': path.resolve(__dirname, 'src/types'),
          '@utils': path.resolve(__dirname, 'src/utils'),
          '@constants': path.resolve(__dirname, 'src/constants'),
          '@lib': path.resolve(__dirname, 'src/lib'),
        }
      }
    };
});
