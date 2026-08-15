import { createClient } from '@supabase/supabase-js';

const CREDITS_PER_EDIT = 4;

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

  console.log('[callback] Received payload keys:', Object.keys(body));
  console.log('[callback] job id:', body.id);
  console.log('[callback] status:', body.status);
  console.log('[callback] has output?', !!body.output);
  console.log('[callback] output keys:', body.output ? Object.keys(body.output) : null);

  const jobId = body.id;

  if (!jobId) {
    console.error('[callback] Missing job id');
    return new Response('Missing job id', { status: 400 });
  }

  // Find the matching edit record
  const { data: edit, error: findError } = await supabase
    .from('image_edits')
    .select('id, telegram_user_id, telegram_chat_id, status')
    .eq('runpod_job_id', jobId)
    .maybeSingle();

  if (findError) {
    console.error('[callback] Supabase find error:', findError);
  }

  if (!edit) {
    console.error('[callback] No edit found for job', jobId);
    // Still return 200 so RunPod stops retrying
    return new Response('OK');
  }

  console.log('[callback] Found edit:', edit.id, 'status:', edit.status, 'chat:', edit.telegram_chat_id);

  // Already processed?
  if (edit.status === 'done' || edit.status === 'failed') {
    console.log('[callback] Already processed, skipping');
    return new Response('OK');
  }

  const chatId = edit.telegram_chat_id;
  const tgUserId = edit.telegram_user_id;

  if (!chatId) {
    console.error('[callback] Missing telegram_chat_id on edit record');
    return new Response('OK');
  }

  try {
    if (body.status === 'FAILED' || body.error) {
      throw new Error(body.error || body.status || 'RunPod job failed');
    }

    // Try every common place the image can be
    let editedBase64: string | null =
      body.output?.image ||
      body.output?.images?.[0] ||
      body.output?.[0]?.image ||
      body.image ||
      body.result?.image ||
      null;

    // Sometimes the whole output is just the base64 string
    if (!editedBase64 && typeof body.output === 'string' && body.output.length > 1000) {
      editedBase64 = body.output;
    }

    if (!editedBase64) {
      console.error('[callback] Could not find image. Full output sample:', JSON.stringify(body.output)?.slice(0, 300));
      throw new Error('No image found in RunPod output');
    }

    console.log('[callback] Image found, length:', editedBase64.length);

    // Strip data URL prefix if present
    if (editedBase64.startsWith('data:')) {
      editedBase64 = editedBase64.split(',')[1];
    }

    // Deduct credits
    const { data: user } = await supabase
      .from('telegram_users')
      .select('credits')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    if (user) {
      await supabase
        .from('telegram_users')
        .update({ credits: Math.max(0, user.credits - CREDITS_PER_EDIT) })
        .eq('telegram_user_id', tgUserId);
    }

    // Mark done
    await supabase
      .from('image_edits')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
      })
      .eq('id', edit.id);

    // Send the photo
    await sendPhoto(
      BOT_TOKEN,
      chatId,
      editedBase64,
      `✅ Done! ${Math.max(0, (user?.credits ?? 0) - CREDITS_PER_EDIT)} credits left.`
    );

    console.log('[callback] Successfully sent photo to', chatId);
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
      console.error('[callback] Also failed to send error message', e);
    }
  }

  return new Response('OK');
};
