import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* When env vars are absent we stay in demo mode (supabase === null) so the
   prototype keeps working without a backend. Real auth turns on once the
   anon key is set in .env. */
export const supabase = url && anon
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export const IS_LIVE = !!supabase;
