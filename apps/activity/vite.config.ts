import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../../',
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    // Tunnel domains (ngrok, cloudflared) change on every restart
    allowedHosts: true,
    // Discord Activity: Vite proxies /api to the local backend.
    // Discord URL mapping `/` → tunnel forwards /api here, then to :3000.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    cors: true,
    headers: {
      // Allow embedding via the Discord proxy during local development
      'X-Frame-Options': 'ALLOWALL',
      // Allow screen capture API inside Discord's iframe
      'Permissions-Policy': 'display-capture=*',
    },
    // Required when the app is loaded through HTTPS tunnel (Discord desktop/web)
    hmr: {
      clientPort: 443,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
