import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
};

export const onRequest = async (context: any) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const env = context.env;

  try {
    const body = await context.request.json();
    const { purchase_id, package_name, paid_stars, star_amount, user_id } = body;

    if (!purchase_id || !package_name || !paid_stars || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Prefer a dedicated system bot token for manager top-ups
    // Fallback order:
    // 1. MANAGER_INVOICE_BOT_TOKEN (recommended – add this in Cloudflare env)
    // 2. IMAGE_TELEGRAM_BOT_TOKEN (legacy)
    // 3. Any other token you already have in env
    const botToken =
      env.MANAGER_INVOICE_BOT_TOKEN ||
      env.IMAGE_TELEGRAM_BOT_TOKEN ||
      env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return new Response(JSON.stringify({ 
        error: 'No system bot token configured for manager invoices' 
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      env.SHARED_SUPABASE_URL || env.VITE_SUPABASE_URL,
      env.SHARED_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify the pending purchase belongs to this manager
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

    // Create Telegram Stars invoice link using the system bot
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
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
      return new Response(
        JSON.stringify({ error: tgData.description || 'Telegram createInvoiceLink failed' }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ invoice_link: tgData.result }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: any) {
    console.error('[create-manager-invoice] unexpected error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
