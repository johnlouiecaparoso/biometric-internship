import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.');
}

// Abort any request that takes longer than 15 seconds so the UI never
// gets stuck in an infinite loading state (e.g. when the Supabase free-tier
// project is paused and waking up, or on a slow connection).
const fetchWithTimeout = (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  // If the caller already passed a signal, chain it so either side can abort.
  if (options.signal) {
    (options.signal as AbortSignal).addEventListener('abort', () => controller.abort());
  }
  const timer = setTimeout(() => controller.abort(), 15_000);
  return fetch(url as RequestInfo, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: { fetch: fetchWithTimeout },
});
