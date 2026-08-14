/**
 * Bakes the world coastline into src/data/world-path.json as a single SVG path.
 *
 * world-atlas + d3-geo are build-time only — the site ships the resulting
 * string and nothing else, so there is no map library and no network request
 * at runtime.
 *
 * Projection is plain equirectangular at 1000x500, which means the travel page
 * can place a city with the same two lines of arithmetic:
 *   x = (lon + 180) / 360 * 1000
 *   y = (90 - lat) / 180 * 500
 *
 * Run with: npm run worldmap
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { feature } from 'topojson-client';
import { geoEquirectangular, geoPath } from 'd3-geo';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const W = 1000;
const H = 500;
/* Crop the poles: Antarctica and the top of the Arctic add a lot of path data
   for nothing. Keeps roughly 85°N .. 55°S. */
const TOP = 14;
const BOTTOM = 414;

const topo = JSON.parse(
  readFileSync(join(root, 'node_modules', 'world-atlas', 'land-110m.json'), 'utf8')
);
const land = feature(topo, topo.objects.land);

const projection = geoEquirectangular()
  .scale(W / (2 * Math.PI))
  .translate([W / 2, H / 2])
  .clipExtent([
    [0, TOP],
    [W, BOTTOM],
  ]);

/* Whole units only. At 110m resolution behind a hairline stroke the quantised
   coastline is indistinguishable from the precise one, and it takes the path
   from 19 KB gzipped to 12 KB. */
const d = geoPath(projection)(land).replace(/-?\d+\.\d+/g, (n) => Number(n).toFixed(0));

const out = {
  viewBox: `0 ${TOP} ${W} ${BOTTOM - TOP}`,
  width: W,
  height: H,
  d,
};

writeFileSync(join(root, 'src', 'data', 'world-path.json'), JSON.stringify(out) + '\n');
console.log(`src/data/world-path.json — ${(d.length / 1024).toFixed(1)} KB of path data`);
