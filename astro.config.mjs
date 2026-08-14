// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Canonical URLs, hreflang alternates, og:image and the sitemap are all built
  // from this. Moving to alimurattava.com later means changing this one line
  // and adding public/CNAME — see README > Moving to the custom domain.
  site: 'https://alimuraat.github.io',
  output: 'static',
  integrations: [sitemap()],
  // No floating dev widget over the design while working.
  devToolbar: { enabled: false },
  build: {
    // Keep CSS in external files so the CSP can stay free of 'unsafe-inline'.
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // Same reason, for JS: Astro inlines a bundled <script> into the HTML
      // when it is smaller than assetsInlineLimit. Both of our scripts are
      // well under the 4KB default, so the limit goes to 0 and every script
      // ships as its own /_astro/*.js file that `script-src 'self'` allows.
      assetsInlineLimit: 0,
    },
  },
});
