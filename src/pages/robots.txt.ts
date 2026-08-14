import type { APIRoute } from 'astro';

/* Generated rather than kept in public/ so the sitemap URL always matches
   `site` in astro.config.mjs — one place to change when the domain changes. */
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
