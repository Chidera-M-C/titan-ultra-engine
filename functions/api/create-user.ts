import { createClient } from '@supabase/supabase-js';

export const onRequestPost = async (context: any) => {
  const env = context.env;

  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { id, email, name, traffic_source, referrer } = await context.request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing user id' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('user')
      .select('credits, username, avatar_url, traffic_source')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!existing) {
      console.error('[create-user] User not found in public.user:', id);
      return new Response(JSON.stringify({ credits: 0, username: '', avatar_url: '' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // New user — traffic_source will be null, set it along with credits
    if (existing.credits === null || existing.credits === undefined || existing.traffic_source === null) {
      const { data: updated, error: updateErr } = await supabase
        .from('user')
        .update({
          credits: existing.credits ?? 6,
          traffic_source: traffic_source || 'direct',
          referrer: referrer || '',
        })
        .eq('id', id)
        .select('credits, username, avatar_url, traffic_source')
        .single();

      if (updateErr) throw updateErr;
      return new Response(JSON.stringify(updated), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

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
