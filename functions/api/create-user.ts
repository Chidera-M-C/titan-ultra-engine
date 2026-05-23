import { createClient } from '@supabase/supabase-js';

export const onRequestPost = async (context: any) => {
  const env = context.env;

  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { id, email, name } = await context.request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing user id' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch current state of user from "user" table
    const { data: existing, error: fetchErr } = await supabase
      .from('user')
      .select('credits, username, avatar_url')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!existing) {
      // User doesn't exist in public.user yet — shouldn't happen since
      // Better Auth creates it, but handle gracefully
      console.error('[create-user] User not found in public.user:', id);
      return new Response(JSON.stringify({ credits: 0, username: '', avatar_url: '' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // If credits is null (DEFAULT wasn't applied), set it to 6
    if (existing.credits === null || existing.credits === undefined) {
      const { data: updated, error: updateErr } = await supabase
        .from('user')
        .update({ credits: 6 })
        .eq('id', id)
        .select('credits, username, avatar_url')
        .single();

      if (updateErr) throw updateErr;

      return new Response(JSON.stringify(updated), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return existing data — credits already set correctly
    return new Response(JSON.stringify(existing), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[create-user]', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
