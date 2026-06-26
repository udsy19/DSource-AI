import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backend = 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { src: new URL('./src', import.meta.url).pathname },
  },
  server: {
    proxy: {
      '/match': backend,
      '/boq': backend,
      '/products': backend,
      '/healthz': backend,
    },
  },
});
