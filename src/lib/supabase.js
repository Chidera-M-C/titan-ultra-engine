import { createClient } from '@supabase/supabase-js';

// These come from your Supabase Dashboard -> Settings -> API
const supabaseUrl = import.meta.env.https://rtklziobobnsqxsozmoq.supabase.co;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
