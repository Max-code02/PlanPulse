import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          datenschutz: path.resolve(__dirname, 'datenschutz.html'),
          impressum: path.resolve(__dirname, 'impressum.html'),
          impressium: path.resolve(__dirname, 'impressium.html'),
          handyappel: path.resolve(__dirname, 'handyappel.html'),
          handyapple: path.resolve(__dirname, 'handyapple.html'),
          handyadriod: path.resolve(__dirname, 'handyadriod.html'),
          handyandroid: path.resolve(__dirname, 'handyandroid.html'),
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
          secure: false,
        }
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
