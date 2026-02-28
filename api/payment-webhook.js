import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Check variables inside handler to prevent silent crashes
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL: Supabase environment variables are missing!");
    return res.status(500).json({ error: "Server configuration missing" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const body = req.body;

  // ROUTE 1: Create Payment Invoice
  if (req.method === 'POST' && body.price && !body.payment_status) {
    try {
      const { price, userId, credits } = body;
      
      const response = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.NOWPAYMENTS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price_amount: price,
          price_currency: 'usd',
          order_id: userId,
          order_description: `${credits}`, 
          success_url: 'https://titan-ultra-engine.vercel.app/', 
          cancel_url: 'https://titan-ultra-engine.vercel.app/',
        })
      });

      const data = await response.json();
      if (!data.invoice_url) throw new Error(data.message || "NowPayments failed to return a URL");
      
      return res.status(200).json({ url: data.invoice_url });
    } catch (err) {
      console.error("Webhook Internal Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ROUTE 2: Payment Webhook (from NowPayments)
  if (req.method === 'POST' && body.payment_status === 'finished') {
    // ... your existing credit update logic ...
    return res.status(200).json({ message: "Success" });
  }

  return res.status(200).json({ message: "Ping" });
}
