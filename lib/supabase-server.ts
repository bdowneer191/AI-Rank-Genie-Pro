import { createClient } from '@supabase/supabase-js';

// Server-side client using process.env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  // We can't throw here because this file might be imported in contexts where
  // we check env vars later, but for API routes it's critical.
  // However, logging a warning is safer to prevent import-time crashes.
  console.warn('Missing server-side Supabase environment variables');
}

export const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
);
