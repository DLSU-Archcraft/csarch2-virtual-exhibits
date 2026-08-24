import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [mdx(), react(), icon()],
  site: 'https://dlsu-archcraft.github.io',
  base: '/csarch2-virtual-exhibits',
  vite: {
    plugins: [tailwindcss()],
  },
});
