import { createClient } from '@supabase/supabase-js';

export const onRequestPost = async (context: any) => {
  const env = context.env;

  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { code, package_id, user_id } = await context.request.json();

    if (!code || !package_id || !user_id) {
      return json({ error: 'Missing required fields.' }, 400);
    }

    const cleanCode = code.trim().toUpperCase();

    // Fetch the code
    const { data: codeRow, error: fetchErr } = await supabase
      .from('telegram_codes')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    // Validate
    if (!codeRow) {
      return json({ error: 'Invalid code. Please check and try again.' }, 400);
    }
    if (codeRow.status === 'redeemed') {
      return json({ error: 'This code has already been used.' }, 400);
    }
    if (codeRow.status === 'expired' || new Date(codeRow.expires_at) < new Date()) {
      // Mark expired if not already
      await supabase.from('telegram_codes').update({ status: 'expired' }).eq('code', cleanCode);
      return json({ error: 'This code has expired.' }, 400);
    }
    if (codeRow.status === 'pending') {
      return json({ error: 'This code has not been paid for yet.' }, 400);
    }
    if (codeRow.package_id !== package_id) {
      return json({
        error: `This code is for the ${codeRow.package_name} package, not the one you selected.`
      }, 400);
    }

    // All good — add credits and mark redeemed
    const { data: userData, error: userErr } = await supabase
      .from('user')
      .select('credits')
      .eq('id', user_id)
      .single();

    if (userErr) throw userErr;

    const newCredits = (userData.credits ?? 0) + codeRow.credits;

    const { error: updateUserErr } = await supabase
      .from('user')
      .update({ credits: newCredits })
      .eq('id', user_id);

    if (updateUserErr) throw updateUserErr;

    const { error: updateCodeErr } = await supabase
      .from('telegram_codes')
      .update({
        status: 'redeemed',
        redeemed_by: user_id,
        redeemed_at: new Date().toISOString(),
      })
      .eq('code', cleanCode);

    if (updateCodeErr) throw updateCodeErr;

    return json({
      success: true,
      credits_added: codeRow.credits,
      new_total: newCredits,
      package_name: codeRow.package_name,
    });

  } catch (err: any) {
    console.error('[redeem-code]', err.message);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
