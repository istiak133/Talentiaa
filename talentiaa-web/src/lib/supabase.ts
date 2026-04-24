import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isMissingCredentials = !supabaseUrl || !supabaseAnonKey ||
  supabaseUrl === 'your_supabase_url_here' ||
  supabaseAnonKey === 'your_supabase_anon_key_here';

if (isMissingCredentials) {
  console.warn(
    '⚠️ Supabase credentials missing! Update .env file:\n' +
    '  VITE_SUPABASE_URL=your_url\n' +
    '  VITE_SUPABASE_ANON_KEY=your_key\n' +
    'Get these from: Supabase Dashboard → Settings → API'
  );
}

// Create client even with empty strings — pages will show graceful errors
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export { isMissingCredentials };
