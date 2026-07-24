import { createClient } from '@supabase/supabase-js';

// The anon/public key is safe to ship in the client bundle — access is
// restricted per-user by Postgres row-level security (see supabase/schema.sql).
const SUPABASE_URL = 'https://mjhshxiqhlttukczhbqc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaHNoeGlxaGx0dHVrY3poYnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MjkzMzAsImV4cCI6MjEwMDQwNTMzMH0.hmfsWMEuhUzTUwzNzxiDtGC85LxrZtJJaxGALBKaods';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

let cachedSession = null;
let sessionReady = null;

async function initSession() {
  const { data: { session } } = await supabase.auth.getSession();
  cachedSession = session;
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedSession = session;
  });
  return cachedSession;
}

export function ensureSessionLoaded() {
  if (!sessionReady) sessionReady = initSession();
  return sessionReady;
}

export function isLoggedIn() {
  return !!cachedSession;
}

export function currentEmail() {
  return cachedSession?.user?.email || null;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  cachedSession = data.session;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  cachedSession = data.session;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  cachedSession = null;
}
