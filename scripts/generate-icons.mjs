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

// Renders the app's "rhythm arc" mark (ring + center dot) as a flat PNG icon,
// generated at build time since no image tooling is available in this environment.
function makeIcon(size, { bg, fg, maskableSafe }) {
  const [br, bgg, bb] = hex2rgb(bg);
  const [fr, fgg, fb] = hex2rgb(fg);
  const raw = Buffer.alloc(size * (1 + size * 4));
  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.5;
  const ringOuter = outerR * 0.78;
  const ringInner = ringOuter - size * 0.085;
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let r = br, g = bgg, b = bb, a = 255;
      if (!maskableSafe && dist > outerR) {
        a = 0;
      } else {
        const angle = Math.atan2(dy, dx);
        const inRingBand = dist <= ringOuter && dist >= ringInner;
        const isUpperArc = angle > -Math.PI * 0.98 && angle < -0.02;
        if (inRingBand && isUpperArc) { r = fr; g = fgg; b = fb; }
        const dotR = size * 0.06;
        if (dist < dotR) { r = fr; g = fgg; b = fb; }
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

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir}/icon-192.png`, makeIcon(192, { bg: rose, fg: cream, maskableSafe: false }));
fs.writeFileSync(`${outDir}/icon-512.png`, makeIcon(512, { bg: rose, fg: cream, maskableSafe: false }));
fs.writeFileSync(`${outDir}/maskable-512.png`, makeIcon(512, { bg: rose, fg: cream, maskableSafe: true }));
fs.writeFileSync(`${outDir}/apple-touch-icon.png`, makeIcon(180, { bg: rose, fg: cream, maskableSafe: true }));
console.log('icons written to', outDir);
