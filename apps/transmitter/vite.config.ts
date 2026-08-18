import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    headers: {
      // Allow screen capture API — this page runs in a real browser context, not an iframe
      'Permissions-Policy': 'display-capture=(self)',
      'X-Frame-Options': 'DENY',
    },
    fs: {
      // Disable strict filesystem checks — query params like ?url=wss://... were
      // being misinterpreted as file paths and rejected by Vite's allow list.
      strict: false,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
