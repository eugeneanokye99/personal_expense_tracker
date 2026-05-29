import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Supabase admin client — uses service role key.
 * Bypasses Row Level Security. Only use server-side.
 * Never expose the service role key to the frontend.
 */
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
