import { seedFoods } from './data/foods.js';
import { seedTherapy } from './data/therapy.js';
import { pushToCloud, deleteFromCloud, clearCloud } from './sync.js';

const DB_NAME = 'dnevnik-ritma';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('therapyItems')) {
        db.createObjectStore('therapyItems', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('therapyLogs')) {
        // key: `${itemId}_${date}` -> { itemId, date, taken }
        db.createObjectStore('therapyLogs', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('prnLogs')) {
        const s = db.createObjectStore('prnLogs', { keyPath: 'id' });
        s.createIndex('itemId', 'itemId');
      }
      if (!db.objectStoreNames.contains('symptomEntries')) {
        db.createObjectStore('symptomEntries', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('stoolEntries')) {
        db.createObjectStore('stoolEntries', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('fodmapVerdicts')) {
        db.createObjectStore('fodmapVerdicts', { keyPath: 'groupIndex' });
      }
      if (!db.objectStoreNames.contains('foods')) {
        db.createObjectStore('foods', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(storeName, mode) {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// keyPath field per store, used to mirror writes to the cloud backup (see sync.js)
const KEY_FIELDS = {
  therapyItems: 'id',
  therapyLogs: 'key',
  prnLogs: 'id',
  symptomEntries: 'id',
  stoolEntries: 'id',
  fodmapVerdicts: 'groupIndex',
  foods: 'id',
  settings: 'key',
};

export const store = {
  async getAll(name) {
    const s = await tx(name, 'readonly');
    return reqToPromise(s.getAll());
  },
  async get(name, key) {
    const s = await tx(name, 'readonly');
    return reqToPromise(s.get(key));
  },
  async put(name, value) {
    const s = await tx(name, 'readwrite');
    const result = await reqToPromise(s.put(value));
    const keyField = KEY_FIELDS[name];
    if (keyField) pushToCloud(name, value[keyField], value);
    return result;
  },
  async delete(name, key) {
    const s = await tx(name, 'readwrite');
    const result = await reqToPromise(s.delete(key));
    if (KEY_FIELDS[name]) deleteFromCloud(name, key);
    return result;
  },
  async clear(name) {
    const s = await tx(name, 'readwrite');
    const result = await reqToPromise(s.clear());
    if (KEY_FIELDS[name]) clearCloud(name);
    return result;
  },
};

export function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

const STORE_NAMES = [
  'therapyItems', 'therapyLogs', 'prnLogs', 'symptomEntries',
  'stoolEntries', 'fodmapVerdicts', 'foods', 'settings',
];

export async function wipeAllData() {
  for (const name of STORE_NAMES) {
    await store.clear(name);
  }
}

export async function getSetting(key, fallback = null) {
  const row = await store.get('settings', key);
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  await store.put('settings', { key, value });
}

export async function initDB() {
  await openDB();
  const started = await getSetting('fodmapStartDate');
  if (!started) {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await setSetting('fodmapStartDate', iso);
  }
  const seeded = await getSetting('foodsSeeded');
  if (!seeded) {
    for (const f of seedFoods) {
      await store.put('foods', f);
    }
    await setSetting('foodsSeeded', true);
  }
  const therapySeeded = await getSetting('therapySeeded');
  if (!therapySeeded) {
    for (const t of seedTherapy) {
      await store.put('therapyItems', { ...t, arhivirano: false, createdAt: Date.now() });
    }
    await setSetting('therapySeeded', true);
  }
}
