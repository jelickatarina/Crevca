export const BLOCK_ORDER = ['Jutro', 'Podne', 'Veče', 'Noć'];

const DAY_NAMES = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];
const MONTH_NAMES = [
  'januar', 'februar', 'mart', 'april', 'maj', 'jun',
  'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar',
];

export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function daysBetween(isoA, isoB) {
  const a = parseISO(isoA), b = parseISO(isoB);
  return Math.round((b - a) / 86400000);
}

export function formatLongDate(d = new Date()) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()}. ${MONTH_NAMES[d.getMonth()]}`;
}

export function formatShortDate(iso) {
  const d = parseISO(iso);
  return `${d.getDate()}. ${MONTH_NAMES[d.getMonth()]}`;
}

export function formatTime(d = new Date()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** vreme: "HH:MM" -> block name, po potrebi (null/empty) -> null */
export function blockForTime(vreme) {
  if (!vreme) return null;
  const [h] = vreme.split(':').map(Number);
  if (h >= 4 && h <= 10) return 'Jutro';
  if (h >= 11 && h <= 15) return 'Podne';
  if (h >= 16 && h <= 20) return 'Veče';
  return 'Noć'; // 21-23, 0-3
}

export function currentBlock(d = new Date()) {
  const h = d.getHours();
  if (h >= 4 && h <= 10) return 'Jutro';
  if (h >= 11 && h <= 15) return 'Podne';
  if (h >= 16 && h <= 20) return 'Veče';
  return 'Noć';
}

export function nextBlock(block) {
  const idx = BLOCK_ORDER.indexOf(block);
  return BLOCK_ORDER[(idx + 1) % BLOCK_ORDER.length];
}

export function startOfWeek(iso) {
  const d = parseISO(iso);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return isoDate(d);
}

export function startOfMonth(iso) {
  const d = parseISO(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function rangeDates(startIso, endIso) {
  const out = [];
  let cur = startIso;
  while (cur <= endIso) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}
