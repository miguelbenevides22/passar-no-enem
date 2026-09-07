import { createMiddleware } from '@tanstack/react-start'
import { supabase, isSupabaseConfigured } from './client'

export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    try {
      if (!isSupabaseConfigured()) {
        return next({ headers: {} });
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      return next({
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
    } catch {
      return next({ headers: {} });
    }
  },
)
