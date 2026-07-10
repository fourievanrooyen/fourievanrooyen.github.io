import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fourievanrooyen.github.io',
  output: 'static',
  build: {
    format: 'directory',
  },
  integrations: [sitemap()],
  vite: {
    build: {
      cssMinify: 'lightningcss',
      chunkSizeWarningLimit: 600,
      sourcemap: false,
    },
  },
});
