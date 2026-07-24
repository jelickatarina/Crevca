import { store, STORE_NAMES, KEY_FIELDS } from './db.js';
import { supabase, signUp, signIn, signOut, isLoggedIn, currentEmail, ensureSessionLoaded } from './supabase.js';
import { drainOutbox } from './sync.js';

export { isLoggedIn, currentEmail, ensureSessionLoaded };

/** Pulls every cloud row for this account into local IndexedDB (restore on a new device). */
async function pullFromCloud() {
  const { data, error } = await supabase.from('sync_data').select('store,key,data');
  if (error) throw error;
  const seenKeys = {};
  for (const row of data) {
    (seenKeys[row.store] ||= new Set()).add(row.key);
    await store.put(row.store, row.data, { skipCloud: true });
  }
  return seenKeys;
}

/** Pushes local records that weren't already in the cloud (data created before login). */
async function pushLocalOnly(seenKeys) {
  for (const name of STORE_NAMES) {
    const keyField = KEY_FIELDS[name];
    const rows = await store.getAll(name);
    const seen = seenKeys[name] || new Set();
    for (const row of rows) {
      const key = String(row[keyField]);
      if (!seen.has(key)) {
        await store.put(name, row);
      }
    }
  }
}

async function afterAuth() {
  const seenKeys = await pullFromCloud();
  await pushLocalOnly(seenKeys);
  await drainOutbox();
}

/**
 * Single entry point for the login screen: tries to sign in, and if that
 * fails (no such account yet) creates one instead — no separate "register"
 * step, since this is a single-user app.
 */
export async function continueAuth(email, password) {
  try {
    await signIn(email, password);
  } catch {
    try {
      const result = await signUp(email, password);
      if (!result.session) {
        return { needsEmailConfirm: true };
      }
    } catch (signUpErr) {
      if (/registered/i.test(signUpErr.message || '')) {
        throw new Error('Pogrešna lozinka za taj email.');
      }
      throw signUpErr;
    }
  }
  await afterAuth();
  return { needsEmailConfirm: false };
}

export async function logout() {
  await signOut();
}
