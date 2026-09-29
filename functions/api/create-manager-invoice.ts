import { createClient } from '@supabase/supabase-js';

export const onRequestPost = async (context) => {
  const env = context.env;

  // Allow the frontend origin (adjust if needed)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // or your exact frontend domain
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await context.request.json();
    const { purchase_id, package_name, paid_stars, star_amount, user_id } = body;

    if (!purchase_id || !package_name || !paid_stars || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      env.SHARED_SUPABASE_URL || env.VITE_SUPABASE_URL,
      env.SHARED_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Find an active bot belonging to this manager
    const { data: bot, error: botErr } = await supabase
      .from('managers_bots')
      .select('id, bot_token')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (botErr || !bot?.bot_token) {
      return new Response(JSON.stringify({ error: 'No active bot found for this manager' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Verify pending purchase
    const { data: purchase, error: pErr } = await supabase
      .from('managers_purchase')
      .select('*')
      .eq('id', purchase_id)
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (pErr || !purchase) {
      return new Response(JSON.stringify({ error: 'Pending purchase not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Create Telegram Stars invoice link
    const tgRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: package_name,
        description: `Bot Manager Treasury top-up · ${Number(star_amount).toLocaleString()} Stars`,
        payload: String(purchase_id),
        currency: 'XTR',
        prices: [{ label: package_name, amount: Number(paid_stars) }],
      }),
    });

    const tgData = await tgRes.json();

    if (!tgData.ok || !tgData.result) {
      console.error('[create-manager-invoice] Telegram error:', tgData);
      return new Response(JSON.stringify({ 
        error: tgData.description || 'Telegram createInvoiceLink failed' 
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ invoice_link: tgData.result }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('[create-manager-invoice] error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
