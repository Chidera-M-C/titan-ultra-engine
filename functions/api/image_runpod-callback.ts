import { createClient } from '@supabase/supabase-js';

const STARS_IMAGE = 8;
const STARS_VIDEO = 16;

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

async function sendVideo(token: string, chatId: number | string, videoBase64: string, caption?: string) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', caption);

  const byteCharacters = atob(videoBase64);
  const byteArrays = [];
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArrays.push(byteCharacters.charCodeAt(i));
  }
  const blob = new Blob([new Uint8Array(byteArrays)], { type: 'video/mp4' });
  form.append('video', blob, 'result.mp4');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram sendVideo failed ${res.status}: ${text}`);
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
    .select('id, telegram_user_id, telegram_chat_id, status, job_type, credits_charged')
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
  const isVideo = edit.job_type === 'video';
  const cost = edit.credits_charged || (isVideo ? STARS_VIDEO : STARS_IMAGE);

  if (!chatId) return new Response('OK');

  try {
    if (status === 'FAILED' || body.error) {
      throw new Error(body.error || 'RunPod job failed');
    }

    // ── Extract result ────────────────────────────────────────────────────
    let resultBase64: string | null = null;

    if (isVideo) {
      // Video handler returns { video: "data:video/mp4;base64,..." }
      resultBase64 =
        body.output?.video ||
        body.output?.videos?.[0] ||
        (typeof body.output === 'string' ? body.output : null) ||
        body.video ||
        null;
    } else {
      // Image handler
      resultBase64 =
        body.output?.image ||
        body.output?.images?.[0] ||
        (Array.isArray(body.output) ? body.output[0]?.image || body.output[0] : null) ||
        body.image ||
        body.result?.image ||
        null;

      if (!resultBase64 && typeof body.output === 'string' && body.output.length > 500) {
        resultBase64 = body.output;
      }
    }

    if (!resultBase64) {
      throw new Error(isVideo ? 'No video found in RunPod output' : 'No image found in RunPod output');
    }

    // Strip data URL prefix if present
    if (resultBase64.startsWith('data:')) {
      resultBase64 = resultBase64.split(',')[1];
    }

    // ── Upload to storage (optional but good for history) ─────────────────
    const byteCharacters = atob(resultBase64);
    const byteArrays = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays[i] = byteCharacters.charCodeAt(i);
    }

    const contentType = isVideo ? 'video/mp4' : 'image/jpeg';
    const ext = isVideo ? 'mp4' : 'jpg';
    const blob = new Blob([byteArrays], { type: contentType });
    const fileName = `edited/${edit.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('bot-edits')
      .upload(fileName, blob, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.warn('[callback] Storage upload failed:', uploadError.message);
      // Continue anyway – we still send the result to the user
    }

    const { data: publicUrlData } = supabase.storage
      .from('bot-edits')
      .getPublicUrl(fileName);
    const resultUrl = publicUrlData.publicUrl;

    // ── Deduct stars ──────────────────────────────────────────────────────
    const { data: user } = await supabase
      .from('telegram_users')
      .select('stars')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    const newStars = Math.max(0, (user?.stars ?? 0) - cost);

    if (user) {
      await supabase
        .from('telegram_users')
        .update({ stars: newStars })
        .eq('telegram_user_id', tgUserId);
    }

    // ── Update record ─────────────────────────────────────────────────────
    await supabase
      .from('image_edits')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        edited_image: resultUrl,
        credits_charged: cost,
      })
      .eq('id', edit.id);

    // ── Send result to user ───────────────────────────────────────────────
    const caption = `✅ Done!\nYou have ${newStars} ⭐ left.`;

    if (isVideo) {
      await sendVideo(BOT_TOKEN, chatId, resultBase64, caption);
    } else {
      await sendPhoto(BOT_TOKEN, chatId, resultBase64, caption);
    }

    console.log(`[callback] Success (${isVideo ? 'video' : 'image'}) →`, chatId);
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
        `❌ Something went wrong. You haven't been charged — please try again.`
      );
    } catch (e) {
      console.error('[callback] Failed to send error message', e);
    }
  }

  return new Response('OK');
};
