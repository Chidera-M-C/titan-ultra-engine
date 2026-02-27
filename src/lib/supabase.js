import { createClient } from '@supabase/supabase-js';

// These come from your Supabase Dashboard -> Settings -> API
const supabaseUrl = import.meta.env.https://rtklziobobnsqxsozmoq.supabase.co;
const supabaseKey = import.meta.env.sb_publishable_-RmylFTABAYLkyk9s4qK0g_n-WGxHq3;

export const supabase = createClient(supabaseUrl, supabaseKey);
