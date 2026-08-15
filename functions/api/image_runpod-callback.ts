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

  await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    body: form,
  });
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
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // RunPod sends the job result here
  // Typical shape: { id, status, output: { image: "..." }, error, ... }
  const jobId = body.id;
  const status = body.status; // "COMPLETED" | "FAILED" | etc.

  if (!jobId) {
    return new Response('Missing job id', { status: 400 });
  }

  // Find the matching edit record
  const { data: edit } = await supabase
    .from('image_edits')
    .select('id, telegram_user_id, telegram_chat_id, status')
    .eq('runpod_job_id', jobId)
    .maybeSingle();

  if (!edit) {
    console.error('[callback] No edit found for job', jobId);
    return new Response('OK'); // still return 200 so RunPod doesn't retry forever
  }

  // Already processed?
  if (edit.status === 'done' || edit.status === 'failed') {
    return new Response('OK');
  }

  const chatId = edit.telegram_chat_id;
  const tgUserId = edit.telegram_user_id;

  try {
    if (status === 'FAILED' || body.error) {
      throw new Error(body.error || 'RunPod job failed');
    }

    // Extract the image
    let editedBase64 =
      body.output?.image ||
      body.output?.images?.[0] ||
      body.image ||
      null;

    if (!editedBase64) {
      throw new Error('No image in RunPod output');
    }

    // Strip data URL prefix if present
    if (typeof editedBase64 === 'string' && editedBase64.startsWith('data:')) {
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
  } catch (err: any) {
    console.error('[callback] failed:', err);

    await supabase
      .from('image_edits')
      .update({ status: 'failed' })
      .eq('id', edit.id);

    await sendMessage(
      BOT_TOKEN,
      chatId,
      `❌ Something went wrong editing your photo. You haven't been charged — please try again.`
    );
  }

  return new Response('OK');
};
