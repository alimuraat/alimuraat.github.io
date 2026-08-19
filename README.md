# alimurattava.com

Personal security portfolio. Astro v5, static output, no client framework.
A page ships ~2 KB gzip of JavaScript: the backdrop harness plus that page's
one scene, and on the home page the hero terminal as well.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
npm run preview  # serve dist/
```

Two generator scripts, both already run — re-run only if you need to:

```bash
npm run fonts     # copy woff2 subsets from @fontsource into public/fonts/
npm run images    # regenerate og.png, og.svg, favicon.ico, apple-touch-icon.png
npm run worldmap  # re-bake src/data/world-path.json (only if the projection changes)
```

## Two languages

English lives at the root, Turkish under `/tr/`. English is the default and
`x-default`.

Each page exists three times, and only one of them has any markup in it:

```
src/views/Experience.astro       <- the actual page, takes lang="en" | "tr"
src/pages/experience.astro       <- <Experience lang="en" />
src/pages/tr/experience.astro    <- <Experience lang="tr" />
```

So a layout change is one edit, never two. Copy lives in `src/data/*.json`,
where **every translatable value is `{ "en": ..., "tr": ... }`** and everything
else is a plain value. `t(value, lang)` in `src/i18n.ts` resolves either shape
and falls back to English if a Turkish string is missing.

What is deliberately *not* translatable, so the two languages can never drift:
finding `id`, `severity` and `published`; nav `href`s; latitude and longitude;
years; e-mail addresses.

`Base.astro` emits `<html lang>`, the canonical URL, `hreflang` alternates for
both languages plus `x-default`, and the matching `og:locale`. The switcher in
the nav links to the same page in the other language — `basePath()` strips the
`/tr` prefix, `localePath()` adds it.

## Where each page gets its content

| View | Routes | Data it reads |
| --- | --- | --- |
| `views/Home.astro` | `/` · `/tr/` | `site.json` → `pages.home`, `heroRoles`, `links` · `boot.json` (terminal lines) |
| `views/Experience.astro` | `/experience/` · `/tr/experience/` | `site.json` → `pages.experience` · `experience.json` (whole array) |
| `views/Research.astro` | `/research/` · `/tr/research/` | `site.json` → `pages.research` · `research.json` → `findings` |
| `views/Projects.astro` | `/projects/` · `/tr/projects/` | `site.json` → `pages.projects` · `projects.json` (whole array) |
| `views/Certifications.astro` | `/certifications/` · `/tr/certifications/` | `site.json` → `pages.certifications` · `certifications.json` → `certifications`, `education`, `languages` |
| `views/Travel.astro` | `/travel/` · `/tr/travel/` | `site.json` → `pages.travel` · `places.json` → `places` · `world-path.json` (generated coastline) |
| `views/Contact.astro` | `/contact/` · `/tr/contact/` | `site.json` → `pages.contact`, `links` |
| `pages/404.astro` | any unknown path | `ui.json` → `notFound`. Bilingual and `noindex`, since the host serves it under `/tr/` too |

`site.json` also drives what every page shares: `nav` (order, hrefs, labels),
`initials` (nav brand) and `links`. All the chrome text — skip link, status
line, footer, section headings, badge labels, severity labels — is in
`ui.json`.

Each page's `<title>` and `<meta name="description">` come from its own
`pages.<key>` entry in `site.json`, per language — there is no shared generic
description.

### Data files

| File | Shape |
| --- | --- |
| `site.json` | identity, links, nav, hero roles, per-page SEO + headings |
| `ui.json` | every piece of interface text that is not page content |
| `boot.json` | hero terminal: `shell`, `summary` (screen-reader text), `lines` per language — `{p,t}` is a typed command, `{o}` is an output line |
| `experience.json` | `[{ org, when, role, summary, bullets, levelUp }]`, reverse chronological. The first entry is rendered as the current stop on the roadmap |
| `research.json` | `{ _contract, findings[] }` — see the disclosure guard below |
| `projects.json` | `[{ year, title, body }]` |
| `certifications.json` | `{ certifications[], education[], languages[] }` |
| `places.json` | `{ places: [{ lat, lon, city, country }] }` — travel markers. City and country counts on the page are derived from this, so adding a row is the whole edit |
| `world-path.json` | **generated** by `npm run worldmap`; do not hand-edit |

## The disclosure guard

`src/components/FindingRow.astro` will not render an embargoed record's details.
When a finding has `published: false`, only `title`, `state` and `embargoNote`
reach the HTML — `vendor`, `detail` and `url` are never emitted, so filling them
in early cannot leak a vendor name before the fix ships.

`published`, `severity` and `id` are single values shared by both languages, so
the guard cannot be half-lifted in one of them.

To publish CVE-2026-18205 once the record is live on nvd.nist.gov / cve.org:

1. `published: true`
2. fill `vendor`, `detail` (`{ en, tr }`), `url`
3. `state: { "en": "PUBLISHED", "tr": "YAYINLANDI" }`
4. `embargoNote` can be dropped

That is the only change needed — one entry in `src/data/research.json`.

## Design system

`src/styles/tokens.css` holds every colour and font stack; `src/styles/base.css`
holds all the layout. Components carry no scoped CSS, so the whole visual system
is readable in one file.

Fixed rules: `border-radius` is 0 everywhere, sections are separated by a 1px
line rather than boxes, red (`--sig`) is an accent and never a fill, and the only
shadow in the design is the terminal's `0 0 60px -30px var(--sig-deep)` glow.

## Backdrops

`Backdrop.astro` paints the fixed layers — glow top and bottom, canvas, scrim,
46px grid, CRT scanline — and picks one scene per page. Each scene is its own
component under `src/components/backdrops/`, so a page bundles only the one it
uses (well under 1 KB gzip each) on top of the shared harness in
`src/scripts/stage.ts`.

Two things in the harness do the heavy lifting:

- **additive** — strokes add light instead of covering what is under them, so
  overlaps bloom into a bright core rather than flattening
- **trail** — instead of clearing, the frame is faded toward transparent with a
  `destination-out` fill, which leaves motion trails while keeping the canvas
  transparent over the layers behind it

| Page | Scene | What it is |
| --- | --- | --- |
| `/` | `flux` | A few thousand particles on a curl field. Inside the sensor radius they are pushed out and swept into an orbit, so the field opens around the cursor and closes behind it; a click sends a shock ring through it |
| `/experience` | `rails` | Packets accelerating down parallel rails, trails behind them, blooming when they reach a station |
| `/research` | `interference` | Three drifting sources sampled on a lattice — bright where their waves agree, dark where they cancel |
| `/projects` | `skyline` | Isometric blocks under a band of light sweeping diagonally; roofs light and taller blocks throw a beam as it passes |
| `/certifications` | `crystal` | An icosahedron — twelve vertices, edges found by distance — turning on two axes in perspective, with a smaller one counter-rotating inside |
| `/travel` | `aurora` | Ribbons of light drifting across each other; the colour comes from where they overlap, nothing is painted bright on its own |
| `/contact` | `beacon` | Streaks turning around a core, messages falling in from the edges and being absorbed, an answer ring every few seconds |

`.bg-scrim` keeps the column the text lives in a stop or two darker than the
edges, which is what lets the scenes run bright without costing the copy any
contrast. Two dials tune the whole thing: the `trail` value per scene (lower is
longer trails) and `globalAlpha` on the draws. With a trail fade of `f`,
anything drawn in the same place every frame settles at roughly `1/f` times its
per-frame alpha — that is why the steady-state elements are set low.

Under `prefers-reduced-motion: reduce` every scene draws one composed frame and
never moves.

To add a scene: drop a component next to the others that calls `stage()`,
register it in `Backdrop.astro`, and add its name to the `BackdropVariant`
union in `Base.astro`.

## The experience roadmap

`/experience` is a route, not a table: one continuous rail down the left, a
node per stop, red and lit at the top (`is-current`) and cooling as it goes
back in time, capped with `NOW` above and `START` below.

The rail is a single gradient drawn on `.road-wrap::before` rather than
stitched together from per-item segments; each node then masks the line behind
it with the page background. `--rail-w` (the gutter) and `--rail-x` (the line's
offset inside it) are the only two numbers to touch, and the mobile breakpoint
just narrows them.

## The travel map

`scripts/make-worldmap.mjs` projects the world-atlas 110m coastline through
d3-geo equirectangular at 1000×500 and writes a single SVG path to
`src/data/world-path.json`. `world-atlas`, `topojson-client` and `d3-geo` are
dev dependencies used only at that moment — the page ships one inline `<svg>`
and no map library, no tiles, no requests.

`WorldMap.astro` places pins with the same arithmetic:

```
x = (lon + 180) / 360 * 1000
y = (90  - lat) / 180 * 500
```

The radar pulse is a CSS animation on the circle's `r`, staggered across five
`.b0`–`.b4` classes because a per-pin `animation-delay` would need an inline
`style` attribute the CSP blocks. The SVG is `aria-hidden`; the grouped city
list underneath is the accessible version.

## CSP

`public/_headers` sets `script-src 'self'` and `style-src 'self'` with no
`'unsafe-inline'`. Two build settings keep it that way, both in
`astro.config.mjs`:

- `build.inlineStylesheets: 'never'`
- `vite.build.assetsInlineLimit: 0` — without this Astro inlines any bundled
  script under 4 KB straight into the HTML, which the CSP would then block

So: no inline `<script>`, no inline `<style>`, no `define:vars`, no
`is:inline`. Data reaches client scripts through `data-` attributes instead
(see `BootTerminal.astro`). Fonts are self-hosted for the same reason —
`font-src 'self'` with no Google Fonts origin.

Verify after a build:

```bash
grep -rn "<script type=\"module\">" dist/ ; grep -rn "<style" dist/
```

Both should return nothing.

`devToolbar` is disabled in `astro.config.mjs` so the dev overlay does not sit
on top of the design while working.

## Images

`scripts/make-images.mjs` writes every raster asset with no dependencies and no
font files — the PNG encoder is 40 lines of `node:zlib`, and type is drawn from
a 5x7 bitmap font defined in the script. That is why the social card looks
pixel-plotted on purpose rather than like a missing screenshot.

| File | What it is |
| --- | --- |
| `public/og.png` | 1200×630 social card, name and title set in the bitmap font |
| `public/og.svg` | the same card as vector source, in the real fonts — edit this if you want a typographically nicer card, then export over `og.png` |
| `public/favicon.ico` | 32×32, for browsers that still request it |
| `public/apple-touch-icon.png` | 180×180 home-screen icon |
| `public/favicon.svg` | the hand-written source of the prompt-chevron mark |

## Before you point DNS at it

- Set up `contact@` and `security@alimurattava.com` — both are linked from
  `/contact/` and `/.well-known/security.txt`. Cloudflare Email Routing
  forwards them to an existing mailbox for free.
- There is **no PGP key published**. `/contact/` says to ask for one rather
  than linking a file that does not exist. To publish one:
  `gpg --armor --export security@alimurattava.com > public/pgp.txt`, add a
  `PGP KEY` entry back to `ui.json` → `cta` and a link in `views/Contact.astro`,
  and add an `Encryption:` line to `security.txt`.
- There is no CV on the site by design; `/contact/` is the route in.
- Update `Expires:` in `security.txt` before 2027-01-01, or the file goes stale.

## Deploy (GitHub Pages)

Live at **https://alimuraat.github.io**. Every push to `main` runs
`.github/workflows/deploy.yml`: `npm ci`, `npm run build`, a grep that fails the
build if any inline `<script>` or `<style>` slipped into `dist`, then
`upload-pages-artifact` / `deploy-pages`. Repository → Settings → Pages →
Source must be **GitHub Actions**.

Two things make Pages work that are easy to lose:

- `public/.nojekyll` — Pages runs Jekyll by default, and Jekyll drops every
  path starting with an underscore. Without this file the site deploys with no
  CSS and no JS, because everything lives in `_astro/`.
- The production build carries the CSP in a `<meta http-equiv>` tag, because
  Pages cannot send response headers. `public/_headers` is kept for a host that
  can (Cloudflare Pages, Netlify) and is inert here. `frame-ancestors` and HSTS
  only exist as headers, so on Pages the site relies on GitHub's own
  `X-Frame-Options: deny` and HSTS on `*.github.io`.

Nothing in the build needs network access — fonts, the map path and the images
are all committed.

After a deploy:

```bash
curl -s https://alimuraat.github.io/robots.txt
curl -s https://alimuraat.github.io/.well-known/security.txt
curl -so /dev/null -w '%{http_code}\n' https://alimuraat.github.io/nope   # 404
```

### Moving to the custom domain

When alimurattava.com is ready, three edits and a DNS record:

1. `astro.config.mjs` → `site: 'https://alimurattava.com'`
2. add `public/CNAME` containing `alimurattava.com`
3. `public/.well-known/security.txt` → update `Canonical:`
4. DNS: `A`/`AAAA` records to GitHub Pages' IPs, or a `CNAME` on `www`, then
   tick *Enforce HTTPS* in Settings → Pages

`robots.txt` and the sitemap are generated from `site`, so they follow along on
their own. Moving to Cloudflare Pages instead needs no code change at all —
`_headers` starts working and the meta CSP simply duplicates it.

## Deploy (Cloudflare Pages, alternative)

Framework preset *Astro*, build `npm run build`, output `dist`, Node 20+.
`public/_headers` and `public/.well-known/` are copied verbatim, and
`dist/404.html` is served for unknown paths.

## Adding a blog later

`/writing` drops in without touching anything here: add `@astrojs/rss` plus
`src/content/`, a `views/Writing.astro` with its two page wrappers, and one more
entry in `site.json` → `nav`. The nav, layout, i18n and SEO plumbing already
read from data.
