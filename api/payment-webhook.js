import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Use the exact names visible in your Vercel Dashboard
  const supabaseUrl = process.env.VITE_SUPABASE_URL; 
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars. Found:", { url: !!supabaseUrl, key: !!supabaseKey });
    return res.status(500).json({ error: "Server configuration missing" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const body = req.body;

  if (req.method === 'POST' && body.price && !body.payment_status) {
    try {
      const response = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.NOWPAYMENTS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price_amount: body.price,
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

  // Handle NowPayments finished event
  if (req.method === 'POST' && body.payment_status === 'finished') {
     // ... (your existing credit update logic)
     return res.status(200).json({ status: 'ok' });
  }

  return res.status(200).json({ message: "Ping received" });
}
