import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Sets the base path for deployment. './' ensures assets are found relative to index.html,
  // which works for GitHub Pages regardless of the repo name.
  base: './',
  build: {
    target: 'esnext',
  },
});