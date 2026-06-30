/**
 * supabase-client.js
 * Initializes the Supabase client using Vite env variables and exposes
 * it as window.supabase so existing inline scripts continue to work.
 *
 * Keys are read from .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 * and are injected at build-time by Vite — they are NOT embedded in HTML.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[VectraSim] Supabase env vars missing. Check your .env file.');
}

window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
