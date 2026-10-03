import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/manager-bootstrap
 * Body: { user_id: number|string, username?: string }
 *
 * Fleet: SHARED_*  |  Legacy (read-only language seed): VITE_* + SUPABASE_SERVICE_ROLE_KEY
 * Never writes to legacy.
 */
export const onRequestPost = async (context) => {
  const env = context.env;

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const userId = body?.user_id != null ? Number(body.user_id) : null;
  const username = (body?.username || 'Manager_User').toString().slice(0, 128);

  if (!userId || Number.isNaN(userId)) {
    return new Response(JSON.stringify({ error: 'user_id is required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const fleetUrl = env.SHARED_SUPABASE_URL;
  const fleetKey = env.SHARED_SUPABASE_SERVICE_ROLE_KEY;
  const legacyUrl = env.VITE_SUPABASE_URL;
  const legacyKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!fleetUrl || !fleetKey) {
    return new Response(JSON.stringify({ error: 'Fleet Supabase not configured' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const fleet = createClient(fleetUrl, fleetKey);
  const legacy =
    legacyUrl && legacyKey ? createClient(legacyUrl, legacyKey) : null;

  try {
    let { data: manager, error: selectErr } = await fleet
      .from('bot_managers')
      .select('user_id, username, star_balance, language')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectErr) {
      console.error('[manager-bootstrap] select error', selectErr);
      throw selectErr;
    }

    if (!manager) {
      const { data: created, error: insertErr } = await fleet
        .from('bot_managers')
        .insert([
          {
            user_id: userId,
            username,
            star_balance: 0,
            language: 'en',
          },
        ])
        .select('user_id, username, star_balance, language')
        .single();

      if (insertErr) {
        console.error('[manager-bootstrap] insert error', insertErr);
        throw insertErr;
      }
      manager = created;
    }

    const currentLang = (manager.language || '').trim();
    let finalLang = currentLang || 'en';

    // Seed from legacy ONLY if fleet language is empty
    if (!currentLang && legacy) {
      try {
        const { data: legacyUser } = await legacy
          .from('telegram_users')
          .select('language')
          .eq('telegram_user_id', String(userId))
          .maybeSingle();

        const legacyLang = (legacyUser?.language || '').trim();
        if (legacyLang) {
          finalLang = legacyLang;

          const { error: patchErr } = await fleet
            .from('bot_managers')
            .update({
              language: finalLang,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          if (patchErr) {
            console.error('[manager-bootstrap] language patch error', patchErr);
          } else {
            manager = { ...manager, language: finalLang };
          }
        }
      } catch (legacyErr) {
        console.warn('[manager-bootstrap] legacy language read failed', legacyErr);
      }
    }

    return new Response(
      JSON.stringify({
        user_id: manager.user_id,
        username: manager.username,
        star_balance: manager.star_balance ?? 0,
        language: manager.language || finalLang || 'en',
      }),
      {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[manager-bootstrap] fatal', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Bootstrap failed' }),
      {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      }
    );
  }
};

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
