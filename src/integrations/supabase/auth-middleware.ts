import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

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

function createGuestSupabase(): any {
  const listResult = { data: [], error: null, count: null };
  const singleResult = { data: null, error: null };

  function makeChainable(result: any): any {
    const proxy = new Proxy(function(){}, {
      get(target: any, prop: string | symbol) {
        if (prop === 'then') {
          return function(resolve: any) { resolve(result); };
        }
        if (prop === 'maybeSingle' || prop === 'single') {
          return function() { return makeChainable(singleResult); };
        }
        if (prop === 'data' || prop === 'error' || prop === 'count') {
          return result[prop];
        }
        return function() { return proxy; };
      }
    });
    return proxy;
  }

  return {
    from: function() { return makeChainable(listResult); },
    rpc: function() {
      return makeChainable({ data: null, error: { message: 'Modo convidado: Supabase nao configurado.' } });
    },
    auth: {
      getUser: async function() { return { data: { user: null }, error: null }; },
      getSession: async function() { return { data: { session: null }, error: null }; },
      signOut: async function() { return { error: null }; },
    },
  };
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const SUPABASE_URL = typeof process !== 'undefined' ? process.env['SUPABASE_URL'] : undefined;
    const SUPABASE_PUBLISHABLE_KEY = typeof process !== 'undefined' ? process.env['SUPABASE_PUBLISHABLE_KEY'] : undefined;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      return next({
        context: {
          supabase: createGuestSupabase(),
          userId: 'guest',
          claims: null,
        },
      });
    }

    const request = getRequest();
    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header provided');
    }
    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Only Bearer tokens are supported');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }
    if (token.split('.').length !== 3) {
      throw new Error('Unauthorized: Invalid token');
    }

    const supabase = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
          headers: {
            Authorization: 'Bearer ' + token,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      throw new Error('Unauthorized: Invalid token');
    }
    if (!data.claims.sub) {
      throw new Error('Unauthorized: No user ID found in token');
    }

    return next({
      context: {
        supabase,
        userId: data.claims.sub,
        claims: data.claims,
      },
    });
  },
);
