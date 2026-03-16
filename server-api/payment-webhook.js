import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function onRequestPost(context) {
  const { request, env } = context;

  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  // STEP A: User clicked Pay — generate invoice link
  if (body.price && !body.payment_status) {
    try {
      const response = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'x-api-key': env.NOWPAYMENTS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price_amount: parseFloat(body.price),
          price_currency: 'usd',
          order_id: body.userId,
          order_description: `${body.credits}`,
          success_url: env.APP_URL || 'https://nudely.pages.dev/',
          cancel_url: env.APP_URL || 'https://nudely.pages.dev/',
        })
      });

      const data = await response.json();
      return new Response(JSON.stringify({ url: data.invoice_url }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  // STEP B: NowPayments IPN callback
  if (body.payment_status) {
    const signature = request.headers.get('x-nowpayments-sig');
    const ipnSecret = env.NOWPAYMENTS_IPN_SECRET;

    if (!signature || !ipnSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const sortedBody = Object.keys(body).sort().reduce((obj, key) => {
      obj[key] = body[key];
      return obj;
    }, {});

    const hmac = crypto.createHmac('sha512', ipnSecret);
    hmac.update(JSON.stringify(sortedBody));
    const checkSignature = hmac.digest('hex');

    if (signature !== checkSignature) {
      console.error('❌ Invalid IPN Signature detected!');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
    }

    if (body.payment_status === 'finished') {
      const userId = body.order_id;
      const creditsToAdd = parseInt(body.order_description);

      try {
        const { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('credits')
          .eq('id', userId)
          .single();

        if (fetchError) throw fetchError;

        const newBalance = (userData.credits || 0) + creditsToAdd;

        const { error: updateError } = await supabase
          .from('users')
          .update({ credits: newBalance })
          .eq('id', userId);

        if (updateError) throw updateError;

        console.log(`✅ Added ${creditsToAdd} credits to user ${userId}`);
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        console.error('Webhook Update Error:', err.message);
        return new Response(JSON.stringify({ error: 'Failed to update credits' }), { status: 500 });
      }
    }
  }

  return new Response(JSON.stringify({ message: 'Ping received' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
