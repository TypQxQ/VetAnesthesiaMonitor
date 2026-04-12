import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import pkg from './package.json' with { type: 'json' };

const now = new Date();
const timestamp = now.getFullYear().toString() + 
  (now.getMonth() + 1).toString().padStart(2, '0') + 
  now.getDate().toString().padStart(2, '0') + '.' + 
  now.getHours().toString().padStart(2, '0') + 
  now.getMinutes().toString().padStart(2, '0');

export default defineConfig({
  plugins: [
    basicSsl()
  ],
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}-${timestamp}`)
  },
  server: {
    host: true, // Listen on all local IPs
    port: 5173,
    https: true // Force HTTPS
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/__tests__/**/*.test.js'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
