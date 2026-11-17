import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = process.env.VITE_API_PROXY || 'http://localhost:3000';
const STATS = process.env.VITE_STATS_PROXY || 'http://localhost:8000';

// The dev server proxies the APIs so the SPA, the API and the OAuth cookies share one origin
// (same topology as the nginx gateway used in Docker/Kubernetes).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/stats': { target: STATS, changeOrigin: true }, // Django (must precede /api)
      '/api': { target: API, changeOrigin: true },
      '/oauth': { target: API, changeOrigin: true },
      '/.well-known': { target: API, changeOrigin: true },
      '/uploads': { target: API, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.js',
  },
});
