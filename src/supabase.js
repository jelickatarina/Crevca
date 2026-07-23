import { createClient } from '@supabase/supabase-js';

// The anon/public key is safe to ship in the client bundle — access is
// restricted per-user by Postgres row-level security (see supabase/schema.sql).
const SUPABASE_URL = 'https://mjhshxiqhlttukczhbqc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaHNoeGlxaGx0dHVrY3poYnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MjkzMzAsImV4cCI6MjEwMDQwNTMzMH0.hmfsWMEuhUzTUwzNzxiDtGC85LxrZtJJaxGALBKaods';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

let authReady = null;

/** Signs in anonymously on first use; the session then persists in this browser. */
export function ensureAuth() {
  if (!authReady) {
    authReady = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
      }
    })();
  }
  return authReady;
}
