// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://midearth.ai',
  build: {
    // Inline CSS so any single page can be opened straight off disk.
    inlineStylesheets: 'always',
  },
  integrations: [react()],
  vite: { plugins: [tailwind()] },
});
