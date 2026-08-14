/**
 * Generates every raster asset the site serves:
 *   public/og.png             1200x630 social card
 *   public/og.svg             the same card as editable vector source
 *   public/apple-touch-icon.png  180x180 home-screen icon
 *   public/favicon.ico        32x32 for browsers that still ask for it
 *
 * No dependencies and no font files: PNG is encoded by hand with node:zlib and
 * type is drawn from the 5x7 bitmap font below, which is why the card looks
 * deliberately pixel-plotted rather than like a missing screenshot.
 *
 * Run with: npm run images
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
mkdirSync(pub, { recursive: true });

/* ------------------------------------------------------------- palette --- */
const BG = [0x07, 0x07, 0x08];
const LINE = [0x1b, 0x1b, 0x20];
const INK = [0xec, 0xec, 0xed];
const DIM = [0x8a, 0x8a, 0x93];
const FAINT = [0x55, 0x55, 0x5e];
const SIG = [0xff, 0x33, 0x44];

/* ------------------------------------------------------- 5x7 pixel font --- */
const FONT = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01110',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '11111 00100 00100 00100 00100 00100 11111',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10001 10001 10001 10001',
  N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 01110 00011',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 11011 10001',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110',
  1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111',
  3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010',
  5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110',
  7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
  '.': '00000 00000 00000 00000 00000 01100 01100',
  ',': '00000 00000 00000 00000 01100 00100 01000',
  ':': '00000 01100 01100 00000 01100 01100 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  '/': '00001 00010 00010 00100 01000 01000 10000',
  '·': '00000 00000 01100 01100 00000 00000 00000',
};

/* ------------------------------------------------------------- surface --- */
function surface(W, H) {
  const px = new Uint8Array(W * H * 3);

  const set = (x, y, rgb) => {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    px[i] = rgb[0];
    px[i + 1] = rgb[1];
    px[i + 2] = rgb[2];
  };

  const blend = (x, y, rgb, a) => {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
    const i = (y * W + x) * 3;
    px[i] = Math.round(px[i] * (1 - a) + rgb[0] * a);
    px[i + 1] = Math.round(px[i + 1] * (1 - a) + rgb[1] * a);
    px[i + 2] = Math.round(px[i + 2] * (1 - a) + rgb[2] * a);
  };

  const rect = (x, y, w, h, rgb) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, rgb);
  };

  const fill = (rgb) => rect(0, 0, W, H, rgb);

  /** Thick line, stamped square by square — plenty for icon-sized art. */
  const line = (x0, y0, x1, y1, w, rgb) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      rect(Math.round(x0 + (x1 - x0) * u - w / 2), Math.round(y0 + (y1 - y0) * u - w / 2), w, w, rgb);
    }
  };

  /** Draws `str` with the 5x7 font. Returns the width it consumed. */
  const text = (str, x, y, scale, rgb, gap = 1) => {
    const advance = (5 + gap) * scale;
    let cx = x;
    for (const raw of str.toUpperCase()) {
      const glyph = FONT[raw] ?? FONT[' '];
      const rows = glyph.split(' ');
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < 5; c++) {
          if (rows[r][c] === '1') rect(cx + c * scale, y + r * scale, scale, scale, rgb);
        }
      }
      cx += advance;
    }
    return cx - x - gap * scale;
  };

  const width = (str, scale, gap = 1) => str.length * (5 + gap) * scale - gap * scale;

  return { px, W, H, set, blend, rect, fill, line, text, width };
}

/* ----------------------------------------------------------- PNG codec --- */
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function encodePNG({ px, W, H }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  const rows = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    rows[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(rows, y * (1 + W * 3) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --------------------------------------------------------- shared look --- */
function backdrop(s, { grid = 46, glow = 0.16, scan = true } = {}) {
  s.fill(BG);

  for (let y = 0; y < s.H; y++) {
    const fade = Math.max(0, 1 - y / (s.H * 0.85));
    for (let x = 0; x < s.W; x++) {
      if (x % grid === 0 || y % grid === 0) s.blend(x, y, LINE, 0.9 * fade);
    }
  }

  for (let y = 0; y < s.H; y++) {
    for (let x = 0; x < s.W; x++) {
      const dx = (x - s.W / 2) / (s.W * 0.47);
      const dy = (y + s.H * 0.14) / (s.H * 0.64);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 1) s.blend(x, y, SIG, glow * (1 - d) * (1 - d));
    }
  }

  if (scan) {
    for (let y = 0; y < s.H; y += 3) for (let x = 0; x < s.W; x++) s.blend(x, y, [255, 255, 255], 0.03);
  }

  for (let x = 0; x < s.W; x++) {
    s.set(x, 0, LINE);
    s.set(x, s.H - 1, LINE);
  }
  for (let y = 0; y < s.H; y++) {
    s.set(0, y, LINE);
    s.set(s.W - 1, y, LINE);
  }
}

/* ------------------------------------------------------------- og.png --- */
{
  const s = surface(1200, 630);
  backdrop(s);

  /* AMT in a hairline box, same idea as the nav brand */
  const brand = s.width('AMT', 4);
  s.rect(96, 84, brand + 28, 56, LINE);
  s.rect(97, 85, brand + 26, 54, BG);
  s.text('AMT', 110, 98, 4, INK);

  s.text('ALI MURAT TAVA', 96, 208, 10, INK);
  s.text('SENIOR CYBER SECURITY ENGINEER', 96, 322, 4, SIG);
  s.text('OFFENSIVE SECURITY · APPLICATION SECURITY · GOVERNANCE', 96, 382, 3, DIM);
  s.text('ISTANBUL, TURKIYE', 96, 424, 3, DIM);
  s.rect(96, 486, 420, 3, SIG);
  s.text('ALIMURATTAVA.COM', 96, 528, 3, FAINT);

  writeFileSync(join(pub, 'og.png'), encodePNG(s));
}

/* --------------------------------------------------- og.svg (editable) --- */
writeFileSync(
  join(pub, 'og.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="50%" cy="0%" r="70%">
      <stop offset="0%" stop-color="#ff3344" stop-opacity=".2"/>
      <stop offset="100%" stop-color="#ff3344" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="46" height="46" patternUnits="userSpaceOnUse">
      <path d="M46 0H0V46" fill="none" stroke="#1b1b20" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#070708"/>
  <rect width="1200" height="630" fill="url(#grid)" opacity=".7"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="96" y="84" width="120" height="56" fill="none" stroke="#1b1b20"/>
  <text x="112" y="123" font-family="JetBrains Mono, monospace" font-weight="700" font-size="30" fill="#ececed" letter-spacing="4">AMT</text>
  <text x="96" y="262" font-family="JetBrains Mono, monospace" font-weight="700" font-size="76" fill="#ececed" letter-spacing="-2">Ali Murat Tava</text>
  <text x="96" y="332" font-family="JetBrains Mono, monospace" font-size="27" fill="#ff3344" letter-spacing="2">Senior Cyber Security Engineer</text>
  <text x="96" y="388" font-family="IBM Plex Sans, sans-serif" font-size="23" fill="#8a8a93">Offensive security · Application security · Security governance</text>
  <text x="96" y="428" font-family="IBM Plex Sans, sans-serif" font-size="23" fill="#8a8a93">Istanbul, Türkiye</text>
  <rect x="96" y="486" width="420" height="3" fill="#ff3344"/>
  <text x="96" y="540" font-family="JetBrains Mono, monospace" font-size="20" fill="#55555e" letter-spacing="3">ALIMURATTAVA.COM</text>
  <rect x="0.5" y="0.5" width="1199" height="629" fill="none" stroke="#1b1b20"/>
</svg>
`
);

/* ------------------------------------------------------------- icons --- */
/** The favicon mark: a terminal prompt chevron and caret, drawn to any size. */
function icon(size) {
  const s = surface(size, size);
  s.fill(BG);
  const u = size / 32;
  const w = Math.max(2, Math.round(3 * u));
  s.line(9 * u, 9 * u, 18 * u, 16 * u, w, SIG);
  s.line(18 * u, 16 * u, 9 * u, 23 * u, w, SIG);
  s.rect(Math.round(20 * u), Math.round(21.5 * u), Math.round(6 * u), w, SIG);
  return s;
}

const touch = encodePNG(icon(180));
writeFileSync(join(pub, 'apple-touch-icon.png'), touch);

/* ICO with a single 32x32 PNG payload — supported since Windows Vista. */
{
  const png = encodePNG(icon(32));
  const dir = Buffer.alloc(22);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type: icon
  dir.writeUInt16LE(1, 4); // one image
  dir[6] = 32; // width
  dir[7] = 32; // height
  dir[8] = 0; // palette
  dir[9] = 0; // reserved
  dir.writeUInt16LE(1, 10); // colour planes
  dir.writeUInt16LE(32, 12); // bits per pixel
  dir.writeUInt32LE(png.length, 14);
  dir.writeUInt32LE(22, 18); // offset of the payload
  writeFileSync(join(pub, 'favicon.ico'), Buffer.concat([dir, png]));
}

console.log('wrote og.png, og.svg, apple-touch-icon.png, favicon.ico');
