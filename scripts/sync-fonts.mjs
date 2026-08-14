/**
 * Copies the woff2 subsets we actually use out of node_modules/@fontsource
 * into public/fonts/ so the site self-hosts its fonts.
 *
 * Self-hosting is what lets the CSP stay at `font-src 'self'` with no
 * Google Fonts origins — see public/_headers.
 *
 * Run with: npm run fonts
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'fonts');
mkdirSync(out, { recursive: true });

const families = [
  { pkg: 'jetbrains-mono', weights: [400, 500, 700] },
  { pkg: 'ibm-plex-sans', weights: [400, 500, 600] },
];

let copied = 0;
for (const { pkg, weights } of families) {
  for (const subset of ['latin', 'latin-ext']) {
    for (const weight of weights) {
      const file = `${pkg}-${subset}-${weight}-normal.woff2`;
      const src = join(root, 'node_modules', '@fontsource', pkg, 'files', file);
      if (!existsSync(src)) {
        console.error(`missing: ${src}`);
        process.exitCode = 1;
        continue;
      }
      copyFileSync(src, join(out, file));
      copied++;
    }
  }
}
console.log(`${copied} woff2 files -> public/fonts/`);
