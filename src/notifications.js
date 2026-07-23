import { store } from './db.js';

const timers = new Map();

export function notificationsSupported() {
  return typeof Notification !== 'undefined';
}

export function permissionState() {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

function msUntilNext(vreme) {
  const [h, m] = vreme.split(':').map(Number);
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}

async function fire(item) {
  if (permissionState() !== 'granted') return;
  const body = `Vreme je za: ${item.naziv} (${item.vreme})`;
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) {
      reg.showNotification('Dnevnik ritma', { body, icon: '/icons/icon-192.png', tag: `therapy-${item.id}` });
    } else {
      new Notification('Dnevnik ritma', { body, icon: '/icons/icon-192.png' });
    }
  } catch {
    // ignore — notification display can fail silently across browsers
  }
}

export async function scheduleAllReminders() {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();

  if (permissionState() !== 'granted') return;

  const items = await store.getAll('therapyItems');
  for (const item of items) {
    if (item.arhivirano || !item.vreme || !item.podsetnik_ukljucen) continue;
    const ms = msUntilNext(item.vreme);
    const timer = setTimeout(async () => {
      await fire(item);
      scheduleAllReminders();
    }, Math.min(ms, 2147483647));
    timers.set(item.id, timer);
  }
}
