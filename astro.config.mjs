// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://midearth.ai',
  server: { port: 4323 },
  build: {
    // Inline CSS so any single page can be opened straight off disk.
    inlineStylesheets: 'always',
  },
  integrations: [react()],
  vite: {
    plugins: [tailwind()],
    build: {
      rollupOptions: {
        output: {
          // three.js + @react-three/fiber (pulled in only by the
          // AgentAssembly hero animation) otherwise get bundled straight
          // into that component's own chunk, producing one 800KB+ blob.
          // Splitting them into their own vendor chunk doesn't shrink
          // the bytes a first-time visitor downloads, but it lets the
          // browser fetch this rarely-changing vendor code as a
          // separate, independently cacheable file from the
          // page-specific glue code around it (and download it over
          // HTTP/2 alongside the smaller chunk rather than as one
          // monolithic file). client:load is untouched — this section
          // is intentionally above-the-fold-immediate, see Assembly.astro.
          manualChunks(id) {
            if (id.includes("node_modules/three") || id.includes("node_modules/@react-three")) {
              return "three-vendor";
            }
          },
        },
      },
    },
  },
});
