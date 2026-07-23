import zlib from 'node:zlib';
import fs from 'node:fs';

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function hex2rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerp(a, b, t) { return a + (b - a) * t; }

/** Points along a loose coil, reading as a friendly abstract "gut" spiral. */
function coilPoints(cx, cy, maxR, turns, samples) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const r = maxR * Math.pow(t, 0.92);
    const angle = t * turns * Math.PI * 2 - Math.PI * 0.35;
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return pts;
}

// Renders the app's "coiled gut" mark as a flat PNG icon, generated at build
// time since no image tooling is available in this environment.
function makeIcon(size, { bg, fg, highlight, maskableSafe }) {
  const [br, bgg, bb] = hex2rgb(bg);
  const [fr, fgg, fb] = hex2rgb(fg);
  const [hr, hgg, hb] = hex2rgb(highlight);
  const raw = Buffer.alloc(size * (1 + size * 4));
  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.5;
  const tubeR = size * 0.052;
  const path = coilPoints(cx, cy, size * 0.34, 2.6, 340);

  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const distCenter = Math.sqrt(dx * dx + dy * dy);
      let r = br, g = bgg, b = bb, a = 255;
      if (!maskableSafe && distCenter > outerR) {
        a = 0;
      } else {
        let minD = Infinity;
        for (let i = 0; i < path.length; i++) {
          const pdx = x - path[i][0], pdy = y - path[i][1];
          const d = pdx * pdx + pdy * pdy;
          if (d < minD) minD = d;
        }
        minD = Math.sqrt(minD);
        if (minD <= tubeR) {
          const inner = 1 - Math.min(minD / (tubeR * 0.55), 1);
          r = Math.round(lerp(fr, hr, inner));
          g = Math.round(lerp(fgg, hgg, inner));
          b = Math.round(lerp(fb, hb, inner));
        }
      }
      const idx = y * (1 + size * 4) + 1 + x * 4;
      raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b; raw[idx + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = process.argv[2] || 'public/icons';
const rose = '#D6567F';
const cream = '#FDEDF3';
const highlight = '#FFFFFF';

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir}/icon-192.png`, makeIcon(192, { bg: rose, fg: cream, highlight, maskableSafe: false }));
fs.writeFileSync(`${outDir}/icon-512.png`, makeIcon(512, { bg: rose, fg: cream, highlight, maskableSafe: false }));
fs.writeFileSync(`${outDir}/maskable-512.png`, makeIcon(512, { bg: rose, fg: cream, highlight, maskableSafe: true }));
fs.writeFileSync(`${outDir}/apple-touch-icon.png`, makeIcon(180, { bg: rose, fg: cream, highlight, maskableSafe: true }));
console.log('icons written to', outDir);
