import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/firstrep/',
  plugins: [react()],
  build: {
    outDir: '../_site/firstrep',
    emptyOutDir: true,
    sourcemap: false,
  },
});
