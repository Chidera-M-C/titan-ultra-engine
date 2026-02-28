import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const options = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'nudely-auth',
  },
};

// Singleton prevents React Strict Mode double-mount from
// creating two clients that fight over the same auth lock
const supabase = globalThis._supabaseClient ?? createClient(supabaseUrl, supabaseKey, options);
globalThis._supabaseClient = supabase;

export { supabase };
