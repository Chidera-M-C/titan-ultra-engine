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
      .select('credits, username, avatar_url, traffic_source, referrer')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!existing) {
      console.error('[create-user] User not found in public.user:', id);
      return new Response(JSON.stringify({ credits: 0, username: '', avatar_url: '' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only update traffic_source if it's still the default "direct"
    // meaning this is effectively first login and we have a better source
    const shouldUpdateSource =
      (existing.traffic_source === 'direct' || existing.traffic_source === null) &&
      traffic_source &&
      traffic_source !== 'direct';

    if (shouldUpdateSource || existing.credits === null) {
      const { data: updated, error: updateErr } = await supabase
        .from('user')
        .update({
          credits: existing.credits ?? 6,
          traffic_source: shouldUpdateSource ? traffic_source : (existing.traffic_source ?? 'direct'),
          referrer: shouldUpdateSource ? (referrer || '') : (existing.referrer ?? ''),
        })
        .eq('id', id)
        .select('credits, username, avatar_url, traffic_source, referrer')
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
