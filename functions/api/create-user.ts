import { createClient } from '@supabase/supabase-js';

export const onRequestPost = async (context: any) => {
  const env = context.env;

  // Service role key bypasses RLS entirely — only use server-side
  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { id, email, name } = await context.request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing user id' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user already exists (idempotent)
    const { data: existing } = await supabase
      .from('users')
      .select('credits, username, avatar_url')
      .eq('id', id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify(existing), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // New user — insert with 6 starter credits
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ id, credits: 6, username: '', avatar_url: '' })
      .select('credits, username, avatar_url')
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(newUser), {
      status: 201, headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[create-user]', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
