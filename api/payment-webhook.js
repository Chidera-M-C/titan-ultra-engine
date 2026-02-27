import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use Service Role for backend updates
);

export default async function handler(req, res) {
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
      return res.status(200).json({ url: data.invoice_url });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ROUTE 2: Payment Webhook (Supabase Version)
  if (req.method === 'POST' && body.payment_status === 'finished') {
    const userId = body.order_id; 
    const creditsToPurchase = parseInt(body.order_description); 

    try {
      // 1. Get current credits
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // 2. New User: Create them with Welcome credits + Purchase
        await supabase
          .from('users')
          .insert([{ id: userId, credits: 10 + creditsToPurchase }]);
      } else {
        // 3. Existing User: Update them
        const newTotal = (user?.credits || 0) + creditsToPurchase;
        await supabase
          .from('users')
          .update({ credits: newTotal })
          .eq('id', userId);
      }

      return res.status(200).json({ message: "Credits synced to Supabase" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(200).json({ message: "Ping received" });
}
