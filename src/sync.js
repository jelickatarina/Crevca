import { supabase, ensureSessionLoaded, isLoggedIn } from './supabase.js';

const OUTBOX_KEY = 'syncOutbox';

function readOutbox() {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeOutbox(arr) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(arr));
}

function enqueue(item) {
  const arr = readOutbox();
  arr.push(item);
  writeOutbox(arr);
}

export function pendingCount() {
  return readOutbox().length;
}

async function runOp(item) {
  if (item.op === 'put') {
    const { error } = await supabase.from('sync_data').upsert(
      { store: item.storeName, key: item.key, data: item.data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,store,key' },
    );
    if (error) throw error;
  } else if (item.op === 'delete') {
    const { error } = await supabase.from('sync_data').delete()
      .eq('store', item.storeName).eq('key', item.key);
    if (error) throw error;
  } else if (item.op === 'clear') {
    const { error } = await supabase.from('sync_data').delete().eq('store', item.storeName);
    if (error) throw error;
  }
}

export async function drainOutbox() {
  await ensureSessionLoaded();
  if (!isLoggedIn()) return;
  const arr = readOutbox();
  while (arr.length) {
    try {
      await runOp(arr[0]);
      arr.shift();
      writeOutbox(arr);
    } catch {
      break; // stop on first failure, keep order, retry later
    }
  }
}

async function sync(item) {
  await ensureSessionLoaded();
  if (!isLoggedIn()) return; // local-only until she logs in
  try {
    await runOp(item);
  } catch {
    enqueue(item);
  }
}

export function pushToCloud(storeName, key, data) {
  return sync({ op: 'put', storeName, key: String(key), data });
}

export function deleteFromCloud(storeName, key) {
  return sync({ op: 'delete', storeName, key: String(key) });
}

export function clearCloud(storeName) {
  return sync({ op: 'clear', storeName });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => drainOutbox());
}
