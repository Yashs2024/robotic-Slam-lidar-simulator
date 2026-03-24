import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        slam: resolve(__dirname, 'slam.html'),
        nexus: resolve(__dirname, 'nexus.html'),
        hive: resolve(__dirname, 'hive.html'),
      },
    },
  },
});
