import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET; 
  const supabase = createClient(supabaseUrl, supabaseKey);

  const body = req.body;

  // STEP A: User clicked a button (Generating the Link)
  if (req.method === 'POST' && body.price && !body.payment_status) {
    try {
      const response = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.NOWPAYMENTS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price_amount: parseFloat(body.price),
          price_currency: 'usd',
          order_id: body.userId,
          order_description: `${body.credits}`,
          success_url: 'https://titan-ultra-engine.vercel.app/', 
          cancel_url: 'https://titan-ultra-engine.vercel.app/',
        })
      });

      const data = await response.json();
      return res.status(200).json({ url: data.invoice_url });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // STEP B: NowPayments calling us (The IPN Callback)
  if (req.method === 'POST' && body.payment_status) {
    // 1. SECURITY: Verify the signature
    const signature = req.headers['x-nowpayments-sig'];
    if (!signature || !ipnSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Sort body to match NowPayments signing order
    const sortedBody = Object.keys(body).sort().reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});
    
    const hmac = crypto.createHmac('sha512', ipnSecret);
    hmac.update(JSON.stringify(sortedBody));
    const checkSignature = hmac.digest('hex');

    if (signature !== checkSignature) {
      console.error("❌ Invalid IPN Signature detected!");
      return res.status(400).json({ error: "Invalid signature" });
    }

    // 2. LOGIC: Update credits if status is "finished"
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

        console.log(`✅ Success: Added ${creditsToAdd} credits to user ${userId}`);
        return res.status(200).json({ received: true });
      } catch (err) {
        console.error("Webhook Update Error:", err.message);
        return res.status(500).json({ error: "Failed to update credits" });
      }
    }
  }

  return res.status(200).json({ message: "Ping received" });
}
