import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
          price_amount: body.price,
          price_currency: 'usd',
          order_id: body.userId, // Storing User ID here
          order_description: `${body.credits}`, // Storing Credit Count here
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

  // STEP B: NowPayments is calling us (Payment Finished!)
  if (req.method === 'POST' && body.payment_status === 'finished') {
    const userId = body.order_id;
    const creditsToAdd = parseInt(body.order_description);

    try {
      // 1. Get current credits
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Add new credits
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

  return res.status(200).json({ message: "Default response" });
}
