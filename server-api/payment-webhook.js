import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // STEP A: User clicked Pay — generate invoice link
    if (body.price && !body.payment_status) {
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

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`NowPayments error: ${response.status} - ${text}`);
      }

      const data = await response.json();

      if (!data.invoice_url) {
        throw new Error(`No invoice_url returned: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ url: data.invoice_url }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // STEP B: NowPayments IPN callback
    if (body.payment_status) {
      const signature = request.headers.get('x-nowpayments-sig');
      const ipnSecret = env.NOWPAYMENTS_IPN_SECRET;

      if (!signature || !ipnSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const sortedBody = Object.keys(body).sort().reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

      const encoder = new TextEncoder();
      const keyData = encoder.encode(ipnSecret);
      const msgData = encoder.encode(JSON.stringify(sortedBody));

      const cryptoKey = await crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
      const checkSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (signature !== checkSignature) {
        console.error('❌ Invalid IPN Signature detected!');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (body.payment_status === 'finished') {
        const userId = body.order_id;
        const creditsToAdd = parseInt(body.order_description);

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
      }
    }

    return new Response(JSON.stringify({ message: 'Ping received' }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('payment-webhook error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
