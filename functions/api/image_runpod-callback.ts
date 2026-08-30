import { createClient } from '@supabase/supabase-js';

const STARS_PER_EDIT = 8;

async function sendPhoto(token: string, chatId: number | string, photoBase64: string, caption?: string) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', caption);

  const byteCharacters = atob(photoBase64);
  const byteArrays = [];
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArrays.push(byteCharacters.charCodeAt(i));
  }
  const blob = new Blob([new Uint8Array(byteArrays)], { type: 'image/jpeg' });
  form.append('photo', blob, 'edited.jpg');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram sendPhoto failed ${res.status}: ${text}`);
  }
}

async function sendMessage(token: string, chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

export const onRequestPost = async (context: any) => {
  const env = context.env;
  const BOT_TOKEN = env.IMAGE_TELEGRAM_BOT_TOKEN;

  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  let body: any;
  try {
    body = await context.request.json();
  } catch (e) {
    console.error('[callback] Failed to parse JSON body', e);
    return new Response('Bad Request', { status: 400 });
  }

  const jobId = body.id;
  const status = body.status;

  console.log('[callback] job:', jobId, 'status:', status);

  if (status !== 'COMPLETED' && status !== 'FAILED') {
    return new Response('OK');
  }

  if (!jobId) return new Response('OK');

  const { data: edit, error: findError } = await supabase
    .from('image_edits')
    .select('id, telegram_user_id, telegram_chat_id, status')
    .eq('runpod_job_id', jobId)
    .maybeSingle();

  if (findError || !edit) {
    console.error('[callback] Edit not found for job', jobId);
    return new Response('OK');
  }

  if (edit.status === 'done') {
    return new Response('OK');
  }

  const chatId = edit.telegram_chat_id;
  const tgUserId = edit.telegram_user_id;

  if (!chatId) return new Response('OK');

  try {
    if (status === 'FAILED' || body.error) {
      throw new Error(body.error || 'RunPod job failed');
    }

    let editedBase64: string | null =
      body.output?.image ||
      body.output?.images?.[0] ||
      (Array.isArray(body.output) ? body.output[0]?.image || body.output[0] : null) ||
      body.image ||
      body.result?.image ||
      null;

    if (!editedBase64 && typeof body.output === 'string' && body.output.length > 500) {
      editedBase64 = body.output;
    }

    if (!editedBase64) {
      throw new Error('No image found in RunPod output');
    }

    if (editedBase64.startsWith('data:')) {
      editedBase64 = editedBase64.split(',')[1];
    }

    // Convert to Blob for Storage
    const byteCharacters = atob(editedBase64);
    const byteArrays = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteArrays], { type: 'image/jpeg' });

    const fileName = `edited/${edit.id}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('bot-edits')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('bot-edits')
      .getPublicUrl(fileName);

    const editedImageUrl = publicUrlData.publicUrl;

    // Deduct stars
    const { data: user } = await supabase
      .from('telegram_users')
      .select('stars')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    const newStars = Math.max(0, (user?.stars ?? 0) - STARS_PER_EDIT);

    if (user) {
      await supabase
        .from('telegram_users')
        .update({ stars: newStars })
        .eq('telegram_user_id', tgUserId);
    }

    // Update edit record
    await supabase
      .from('image_edits')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        edited_image: editedImageUrl,
        credits_charged: STARS_PER_EDIT,
      })
      .eq('id', edit.id);

    // Send result
    await sendPhoto(
      BOT_TOKEN,
      chatId,
      editedBase64,
      `✅ Done!\nYou have ${newStars} ⭐ left.`
    );

    console.log('[callback] Success →', chatId);
  } catch (err: any) {
    console.error('[callback] FAILED:', err?.message || err);

    await supabase
      .from('image_edits')
      .update({ status: 'failed' })
      .eq('id', edit.id);

    try {
      await sendMessage(
        BOT_TOKEN,
        chatId,
        `❌ Something went wrong editing your photo. You haven't been charged — please try again.`
      );
    } catch (e) {
      console.error('[callback] Failed to send error message', e);
    }
  }

  return new Response('OK');
};
