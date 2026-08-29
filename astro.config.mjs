// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://midearth.example', // {{SITE_URL}}
  build: {
    // Inline CSS so any single page can be opened straight off disk.
    inlineStylesheets: 'always',
  },
  vite: { plugins: [tailwind()] },
});
