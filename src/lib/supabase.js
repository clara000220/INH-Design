import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* "Remember me" — when on (default), the session is kept in localStorage so it
   survives a browser restart. When off, it lives in sessionStorage and is
   cleared once the tab/browser closes, forcing a fresh sign-in next time. */
const REMEMBER_KEY = 'inh-remember';
const hasWindow = typeof window !== 'undefined';

export function setRemember(on) {
  if (hasWindow) localStorage.setItem(REMEMBER_KEY, on ? 'true' : 'false');
}
const rememberOn = () => !hasWindow || localStorage.getItem(REMEMBER_KEY) !== 'false';

// Routes auth storage to localStorage (remember) or sessionStorage (don't).
const hybridStorage = {
  getItem: (k) => (rememberOn() ? localStorage : sessionStorage).getItem(k),
  setItem: (k, v) => (rememberOn() ? localStorage : sessionStorage).setItem(k, v),
  removeItem: (k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); },
};

/* When env vars are absent we stay in demo mode (supabase === null) so the
   prototype keeps working without a backend. Real auth turns on once the
   anon key is set in .env. */
export const supabase = url && anon
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        ...(hasWindow ? { storage: hybridStorage } : {}),
      },
    })
  : null;

export const IS_LIVE = !!supabase;
