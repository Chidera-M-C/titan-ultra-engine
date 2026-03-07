import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

// Supabase admin client — bypasses RLS for server-side credit updates
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role key, NOT anon key
);

// Vercel serverless functions don't parse multipart by default
export const config = { api: { bodyParser: false } };

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ maxFileSize: 5 * 1024 * 1024 }); // 5MB limit
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── 1. Parse multipart form data ─────────────────────────────────────────
    const { fields, files } = await parseForm(req);

    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
    const userId  = Array.isArray(fields.userId)  ? fields.userId[0]  : fields.userId;
    const credits = parseInt(Array.isArray(fields.credits) ? fields.credits[0] : fields.credits);
    const price   = parseFloat(Array.isArray(fields.price)  ? fields.price[0]  : fields.price);
    const pack    = Array.isArray(fields.pack)    ? fields.pack[0]    : fields.pack;
    const receipt = Array.isArray(files.receipt)  ? files.receipt[0]  : files.receipt;

    if (!userId || !credits || !receipt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ── 2. Upload receipt to Supabase storage ────────────────────────────────
    const fileBuffer = fs.readFileSync(receipt.filepath);
    const ext        = receipt.originalFilename?.split('.').pop() || 'jpg';
    const fileName   = `${userId}/${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('transfer_receipts')
      .upload(fileName, fileBuffer, {
        contentType: receipt.mimetype || 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload receipt' });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('transfer_receipts')
      .getPublicUrl(fileName);

    // ── 3. Fetch current credits and add new ones ────────────────────────────
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Fetch user error:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }

    const newBalance = (userData.credits ?? 0) + credits;

    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newBalance })
      .eq('id', userId);

    if (updateError) {
      console.error('Update credits error:', updateError);
      return res.status(500).json({ error: 'Failed to update credits' });
    }

    // ── 4. Insert transfer record into bank_transfers table ──────────────────
    const { error: insertError } = await supabase
      .from('bank_transfers')
      .insert({
        email:       email,
        user_id:     userId,
        credits:     credits,
        amount_usd:  price,
        pack_name:   pack,
        receipt_url: publicUrl,
        status:      'completed'
      });

    if (insertError) {
      // Non-fatal — credits already added, just log it
      console.error('Insert transfer record error:', insertError);
    }

    // ── 5. Return new balance ─────────────────────────────────────────────────
    return res.status(200).json({ success: true, newBalance });

  } catch (err) {
    console.error('Bank transfer handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
