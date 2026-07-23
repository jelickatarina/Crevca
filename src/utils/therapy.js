import { store } from '../db.js';
import { BLOCK_ORDER, blockForTime, isoDate, startOfWeek, startOfMonth, daysBetween } from './date.js';

/** Archives therapy items whose trajanje_dana (auto-archive duration) has elapsed. */
export async function archiveExpiredTherapy(now = new Date()) {
  const todayIso = isoDate(now);
  const items = await store.getAll('therapyItems');
  for (const item of items) {
    if (item.arhivirano || !item.trajanje_dana) continue;
    const startIso = isoDate(new Date(item.createdAt));
    if (daysBetween(startIso, todayIso) >= item.trajanje_dana) {
      await store.put('therapyItems', { ...item, arhivirano: true });
    }
  }
}

export function daysRemaining(item, now = new Date()) {
  if (!item.trajanje_dana) return null;
  const startIso = isoDate(new Date(item.createdAt));
  const elapsed = daysBetween(startIso, isoDate(now));
  return Math.max(item.trajanje_dana - elapsed, 0);
}

export async function loadTherapyData(dateIso) {
  const items = (await store.getAll('therapyItems')).filter(i => !i.arhivirano);
  const allLogs = await store.getAll('therapyLogs');
  const logsToday = {};
  for (const log of allLogs) {
    if (log.date === dateIso) logsToday[log.itemId] = log.taken;
  }
  return { items, logsToday };
}

export function groupByBlock(items) {
  const map = { Jutro: [], Podne: [], 'Veče': [], 'Noć': [] };
  const prn = [];
  for (const it of items) {
    if (!it.vreme) {
      prn.push(it);
      continue;
    }
    const b = blockForTime(it.vreme);
    map[b].push(it);
  }
  for (const b of Object.keys(map)) map[b].sort((a, c) => a.vreme.localeCompare(c.vreme));
  return { map, prn };
}

export function blockStats(map, logsToday) {
  const stats = {};
  for (const b of BLOCK_ORDER) {
    const arr = map[b];
    const total = arr.length;
    const taken = arr.filter(it => logsToday[it.id]).length;
    stats[b] = { total, taken };
  }
  return stats;
}

export async function toggleTherapyTaken(itemId, dateIso) {
  const key = `${itemId}_${dateIso}`;
  const existing = await store.get('therapyLogs', key);
  const taken = !(existing && existing.taken);
  await store.put('therapyLogs', { key, itemId, date: dateIso, taken });
  return taken;
}

export async function logPrnUse(itemId) {
  const id = `${itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await store.put('prnLogs', { id, itemId, timestamp: Date.now() });
}

export async function removeLastPrnUse(itemId) {
  const all = (await store.getAll('prnLogs')).filter(l => l.itemId === itemId);
  if (!all.length) return;
  all.sort((a, b) => b.timestamp - a.timestamp);
  await store.delete('prnLogs', all[0].id);
}

export async function prnCounts(itemId, now = new Date()) {
  const all = (await store.getAll('prnLogs')).filter(l => l.itemId === itemId);
  const todayIso = isoDate(now);
  const weekStart = startOfWeek(todayIso);
  const monthStart = startOfMonth(todayIso);
  let today = 0, week = 0, month = 0;
  for (const l of all) {
    const dIso = isoDate(new Date(l.timestamp));
    if (dIso === todayIso) today++;
    if (dIso >= weekStart) week++;
    if (dIso >= monthStart) month++;
  }
  return { today, week, month };
}

export async function allPrnCountsToday(items, now = new Date()) {
  const todayIso = isoDate(now);
  const weekStart = startOfWeek(todayIso);
  const monthStart = startOfMonth(todayIso);
  const ids = new Set(items.map(i => i.id));
  const all = (await store.getAll('prnLogs')).filter(l => ids.has(l.itemId));
  let today = 0, week = 0, month = 0;
  for (const l of all) {
    const dIso = isoDate(new Date(l.timestamp));
    if (dIso === todayIso) today++;
    if (dIso >= weekStart) week++;
    if (dIso >= monthStart) month++;
  }
  return { today, week, month };
}
