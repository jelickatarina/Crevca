import { store } from '../db.js';
import { isoDate, daysBetween } from './date.js';
import { SYMPTOMS } from '../data/symptoms.js';

export async function stoolStatsForRange(startIso, endIso) {
  const all = (await store.getAll('stoolEntries')).filter((e) => {
    const d = isoDate(new Date(e.timestamp));
    return d >= startIso && d <= endIso;
  });
  const totalDays = daysBetween(startIso, endIso) + 1;
  const avgPerDay = totalDays ? all.length / totalDays : 0;
  const typeCounts = {};
  for (const e of all) typeCounts[e.bristolTip] = (typeCounts[e.bristolTip] || 0) + 1;
  let mostCommon = null, max = 0;
  for (const [t, c] of Object.entries(typeCounts)) {
    if (c > max) { max = c; mostCommon = Number(t); }
  }
  const wateryDays = new Set(
    all.filter((e) => e.bristolTip >= 6).map((e) => isoDate(new Date(e.timestamp)))
  ).size;
  return { count: all.length, avgPerDay, mostCommon, wateryDays, typeCounts, entries: all };
}

export async function symptomStatsForRange(startIso, endIso) {
  const all = (await store.getAll('symptomEntries')).filter((e) => {
    const d = isoDate(new Date(e.timestamp));
    return d >= startIso && d <= endIso;
  });
  const bySymptom = {};
  for (const s of SYMPTOMS) bySymptom[s] = [];
  for (const e of all) {
    if (!bySymptom[e.simptom]) bySymptom[e.simptom] = [];
    bySymptom[e.simptom].push(e.jacina);
  }
  const avg = {};
  for (const [s, arr] of Object.entries(bySymptom)) {
    avg[s] = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  }
  return { entries: all, avgBySymptom: avg };
}

export async function todayMaxBySymptom(dateIso) {
  const all = (await store.getAll('symptomEntries')).filter((e) => isoDate(new Date(e.timestamp)) === dateIso);
  const max = {};
  for (const e of all) {
    max[e.simptom] = Math.max(max[e.simptom] ?? -Infinity, e.jacina);
  }
  return max;
}

export async function urgencyDaysInRange(startIso, endIso) {
  const all = (await store.getAll('symptomEntries')).filter((e) => {
    const d = isoDate(new Date(e.timestamp));
    if (d < startIso || d > endIso) return false;
    return (e.simptom === 'Dijareja' || e.simptom === 'Nagon za WC') && e.jacina >= 6;
  });
  return new Set(all.map((e) => isoDate(new Date(e.timestamp)))).size;
}

export async function therapyAdherenceForRange(startIso, endIso) {
  const items = (await store.getAll('therapyItems')).filter((i) => !!i.vreme);
  const logs = await store.getAll('therapyLogs');
  const days = daysBetween(startIso, endIso) + 1;
  if (!items.length || days <= 0) return { pct: null, taken: 0, total: 0 };
  const total = items.length * days;
  let taken = 0;
  for (const log of logs) {
    if (log.date >= startIso && log.date <= endIso && log.taken) taken++;
  }
  return { pct: total ? Math.round((taken / total) * 100) : null, taken, total };
}
