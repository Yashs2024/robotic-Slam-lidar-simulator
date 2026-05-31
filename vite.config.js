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
        aero: resolve(__dirname, 'aero.html'),
        hive_landing: resolve(__dirname, 'src/hive_landing.html'),
        slam_landing: resolve(__dirname, 'src/slam_landing.html'),
        nexus_landing: resolve(__dirname, 'src/nexus_landing.html'),
      },
    },
  },
});
