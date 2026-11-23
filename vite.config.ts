import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'render-engine': ['pixi.js', 'matter-js'],
          'react-vendor': ['react', 'react-dom', 'react-dom/client', 'react-router'],
          'motion-vendor': ['motion'],
          'local-storage': ['dexie'],
        },
      },
    },
  },
});
