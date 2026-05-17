import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// This client is for DATABASE ACCESS ONLY (reading/writing your custom tables).
// All authentication is handled by Better Auth — do NOT use supabase.auth.* anywhere.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,    // Don't let Supabase manage sessions
    autoRefreshToken: false,  // Better Auth handles tokens
    detectSessionInUrl: false, // Better Auth handles OAuth callbacks
  },
});
