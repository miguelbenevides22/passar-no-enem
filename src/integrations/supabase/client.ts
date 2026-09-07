// Supabase client with guest mode fallback
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === 'Bearer ' + supabaseKey) {
      headers.delete('Authorization');
    }
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export function isSupabaseConfigured(): boolean {
  const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'] || (typeof process !== 'undefined' ? process.env?.['SUPABASE_URL'] : undefined);
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || (typeof process !== 'undefined' ? process.env?.['SUPABASE_PUBLISHABLE_KEY'] : undefined);
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'] || (typeof process !== 'undefined' ? process.env?.['SUPABASE_URL'] : undefined);
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || (typeof process !== 'undefined' ? process.env?.['SUPABASE_PUBLISHABLE_KEY'] : undefined);

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    console.warn('[Supabase] Environment variables not configured: ' + missing.join(', ') + '. Running in guest mode.');
    return null;
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    if (!_supabase) return undefined;
    return Reflect.get(_supabase, prop, receiver);
  },
});
