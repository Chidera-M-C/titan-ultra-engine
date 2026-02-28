import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL, // Removed VITE_ prefix for backend safety
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

export default async function handler(req, res) {
  const body = req.body;

  // ROUTE 1: Create Payment Invoice
  // Logic: If we have a price but no status, it's a request to GENERATE a link
  if (req.method === 'POST' && body.price && !body.payment_status) {
    try {
      const { price, userId, credits } = body;
      
      if (!userId) throw new Error("User ID is required");

      const response = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.NOWPAYMENTS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price_amount: price,
          price_currency: 'usd',
          order_id: userId, // We store Supabase UID here
          order_description: `${credits}`, // We store credit amount here
          success_url: 'https://titan-ultra-engine.vercel.app/', 
          cancel_url: 'https://titan-ultra-engine.vercel.app/',
        })
      });

      const data = await response.json();
      
      if (!data.invoice_url) {
        console.error("NowPayments Error:", data);
        throw new Error(data.message || "Failed to generate invoice URL");
      }

      return res.status(200).json({ url: data.invoice_url });
    } catch (err) {
      console.error("Invoice Generation Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ROUTE 2: Payment Webhook
  // NowPayments calls this when the user actually pays
  if (req.method === 'POST' && body.payment_status === 'finished') {
    const userId = body.order_id; 
    const creditsToPurchase = parseInt(body.order_description); 

    try {
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Create user if they don't exist in the 'users' table yet
        await supabase
          .from('users')
          .insert([{ id: userId, credits: 10 + creditsToPurchase }]);
      } else {
        const newTotal = (user?.credits || 0) + creditsToPurchase;
        await supabase
          .from('users')
          .update({ credits: newTotal })
          .eq('id', userId);
      }

      return res.status(200).json({ message: "Credits synced" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(200).json({ message: "Ping received" });
}
