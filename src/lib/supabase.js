import { createClient } from '@supabase/supabase-js';

// These come from your Supabase Dashboard -> Settings -> API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use a singleton pattern to prevent multiple instances from fighting over the same lock
if (!window.supabaseInstance) {
  window.supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Changing the storageKey clears out any old, "orphaned" locks that are stuck in your browser
      storageKey: 'titan-ultra-auth-v3', 
      flowType: 'pkce', // Recommended for modern web apps
    },
  });
}

export const supabase = window.supabaseInstance;
