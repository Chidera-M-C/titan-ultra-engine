import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // ── 1. Parse multipart form data via Web API ──────────────────────────
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid form data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const email   = formData.get('email');
    const userId  = formData.get('userId');
    const credits = parseInt(formData.get('credits'));
    const price   = parseFloat(formData.get('price'));
    const pack    = formData.get('pack');
    const receipt = formData.get('receipt'); // File object

    const payment_method = formData.get('payment_method') || 'bank_transfer';

    if (!userId || !credits || !receipt) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── 2. Upload receipt to Supabase storage ─────────────────────────────
    const fileBuffer = await receipt.arrayBuffer();
    const ext        = receipt.name?.split('.').pop() || 'jpg';
    const fileName   = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('transfer_receipts')
      .upload(fileName, fileBuffer, {
        contentType: receipt.type || 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload receipt' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('transfer_receipts')
      .getPublicUrl(fileName);

    // ── 3. Fetch current credits and add new ones ─────────────────────────
    const { data: userData, error: fetchError } = await supabase
      .from('user')
      .select('credits')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Fetch user error:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch user' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newBalance = (userData.credits ?? 0) + credits;

    const { error: updateError } = await supabase
      .from('user')
      .update({ credits: newBalance })
      .eq('id', userId);

    if (updateError) {
      console.error('Update credits error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update credits' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── 4. Insert transfer record ─────────────────────────────────────────
    const { error: insertError } = await supabase
      .from('bank_transfers')
      .insert({
        email:       email,
        user_id:     userId,
        credits:     credits,
        amount_usd:  price,
        pack_name:   pack,
        receipt_url: publicUrl,
        payment_method: payment_method,
        status:      'pending'
      });

    if (insertError) {
      console.error('Insert transfer record error:', insertError);
    }

    // ── 5. Return new balance ─────────────────────────────────────────────
    return new Response(JSON.stringify({ success: true, newBalance }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Bank transfer error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
