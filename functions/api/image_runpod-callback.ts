import { createClient } from '@supabase/supabase-js';

// ====================== TRANSLATIONS ======================
const translations: any = {
  en: {
    job_completed: "✨ Your {{type}} is ready!",
    job_failed: "❌ Generation failed. Your {{cost}} stars have been refunded to your balance.",
  },
  ar: {
    job_completed: "✨ {{type}} الخاص بك جاهز!",
    job_failed: "❌ فشلت عملية الإنشاء. تم إرجاع {{cost}} نجوم إلى رصيدك.",
  },
  hi: {
    job_completed: "✨ आपका {{type}} तैयार है!",
    job_failed: "❌ जनरेशन विफल रहा। आपके {{cost}} स्टार्स आपके बैलेंस में वापस कर दिए गए हैं।",
  },
  ur: {
    job_completed: "✨ آپ کا {{type}} تیار ہے!",
    job_failed: "❌ جنریشن ناکام ہوگئی۔ آپ کے {{cost}} ستارے آپ کے بیلنس میں واپس کر دیے گئے ہیں۔",
  },
  bn: {
    job_completed: "✨ আপনার {{type}} তৈরি!",
    job_failed: "❌ জেনারেশন ব্যর্থ হয়েছে। আপনার {{cost}} স্টার ব্যালেন্সে ফেরত দেওয়া হয়েছে।",
  },
  ru: {
    job_completed: "✨ Ваш {{type}} готов!",
    job_failed: "❌ Ошибка генерации. Ваши {{cost}} звёзд возвращены на баланс.",
  },
  es: {
    job_completed: "✨ ¡Tu {{type}} está listo!",
    job_failed: "❌ Error en la generación. Se te han reembolsado {{cost}} estrellas a tu saldo.",
  },
};

function t(key: string, lang: string = 'en', vars: Record<string, any> = {}) {
  const dict = translations[lang] || translations.en;
  let text = dict[key] || translations.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{{${k}}}`, String(v));
  }
  return text;
}

// ====================== HELPERS ======================
const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const stripDataPrefix = (value: string) =>
  value.startsWith('data:') ? value.split(',')[1] : value;

const base64ToBytes = (b64: string) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

async function sendTelegramMedia(
  token: string,
  chatId: string,
  media: string,
  isVideo: boolean,
  caption: string
) {
  const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
  const paramName = isVideo ? 'video' : 'photo';
  let res: Response;

  if (isHttpUrl(media)) {
    res = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        [paramName]: media,
        caption,
        parse_mode: 'HTML',
      }),
    });
  } else {
    const bytes = base64ToBytes(stripDataPrefix(media));
    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append(
      paramName,
      new Blob([bytes], { type: isVideo ? 'video/mp4' : 'image/jpeg' }),
      isVideo ? 'result.mp4' : 'result.jpg'
    );
    res = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
      method: 'POST',
      body: form,
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram ${endpoint} failed ${res.status}: ${text}`);
  }
}

async function sendMessage(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

// ====================== MAIN HANDLER ======================
export const onRequestPost = async (context: any) => {
  const env = context.env;

  let payload: any;
  try {
    payload = await context.request.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const runpodJobId = payload.id;
  const status = payload.status; // "COMPLETED" | "FAILED"
  const output = payload.output;

  if (!runpodJobId) {
    return new Response('Missing Job ID', { status: 400 });
  }

  console.log('[callback] incoming', {
    runpodJobId,
    status,
    hasOutput: !!output,
    hasShared: !!(env.SHARED_SUPABASE_URL && env.SHARED_SUPABASE_SERVICE_ROLE_KEY),
    hasVite: !!(env.VITE_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  });

  // ── Dual-project lookup ────────────────────────────────────────────────
  // 1) New / fleet project  → table "jobs"
  // 2) Old / legacy project → table "image_edits"
  let job: any = null;
  let jobTable = 'jobs';
  let supabase: any = null;
  let isLegacy = false;

  // Try fleet (SHARED) first
  if (env.SHARED_SUPABASE_URL && env.SHARED_SUPABASE_SERVICE_ROLE_KEY) {
    const fleet = createClient(
      env.SHARED_SUPABASE_URL,
      env.SHARED_SUPABASE_SERVICE_ROLE_KEY
    );
    const { data, error } = await fleet
      .from('jobs')
      .select('*')
      .eq('runpod_job_id', runpodJobId)
      .maybeSingle();

    console.log('[callback] fleet lookup', {
      found: !!data,
      error: error?.message || null,
      runpodJobId,
    });

    if (data) {
      job = data;
      supabase = fleet;
      jobTable = 'jobs';
      isLegacy = false;
    }
  } else {
    console.warn('[callback] SHARED env vars missing — skipping fleet lookup');
  }

  // Fallback to legacy (VITE) if not found
  if (!job && env.VITE_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const legacy = createClient(
      env.VITE_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data, error } = await legacy
      .from('image_edits')
      .select('*')
      .eq('runpod_job_id', runpodJobId)
      .maybeSingle();

    console.log('[callback] legacy lookup', {
      found: !!data,
      error: error?.message || null,
      runpodJobId,
    });

    if (data) {
      job = data;
      supabase = legacy;
      jobTable = 'image_edits';
      isLegacy = true;
    }
  } else if (!job) {
    console.warn('[callback] VITE env vars missing — skipping legacy lookup');
  }

  if (!job || !supabase) {
    console.error('[callback] Job not found in either project', runpodJobId);
    return new Response('Job Not Found', { status: 404 });
  }

  console.log('[callback] job found', {
    table: jobTable,
    isLegacy,
    jobId: job.id,
    status: job.status,
    bot_id: job.bot_id || null,
  });

  // Prevent duplicate webhook processing
  if (
    job.status === 'completed' ||
    job.status === 'done' ||
    job.status === 'failed'
  ) {
    return new Response('OK (Already Processed)', { status: 200 });
  }

  // ── Resolve bot + user ─────────────────────────────────────────────────
  let botRecord: any = null;
  if (job.bot_id && !isLegacy) {
    const { data: b } = await supabase
      .from('managers_bots')
      .select('*')
      .eq('id', job.bot_id)
      .maybeSingle();
    botRecord = b;
  }

  const BOT_TOKEN = botRecord?.bot_token || env.IMAGE_TELEGRAM_BOT_TOKEN;

  const { data: user } = await supabase
    .from('telegram_users')
    .select('stars, language')
    .eq('telegram_user_id', job.telegram_user_id)
    .maybeSingle();

  const lang = user?.language || 'en';
  const isVideo = job.job_type === 'video';
  const retailCost = Number(job.credits_charged) || (isVideo ? 16 : 8);
  const backendCost = Number(job.backend_cost) || (isVideo ? 16 : 8);

  // ── SUCCESS path ───────────────────────────────────────────────────────
  if (status === 'COMPLETED' && output) {
    let mediaUrl = '';

    if (typeof output === 'string') {
      mediaUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      mediaUrl =
        typeof output[0] === 'string'
          ? output[0]
          : output[0].image || output[0].video || output[0].url || '';
    } else if (typeof output === 'object' && output !== null) {
      mediaUrl =
        output.video ||
        output.videos?.[0] ||
        output.image ||
        output.images?.[0] ||
        output.url ||
        output.result ||
        '';
    }

    if (mediaUrl && typeof mediaUrl === 'string') {
      const alreadyUrl = isHttpUrl(mediaUrl);
      let resultUrl: string | null = alreadyUrl ? mediaUrl : null;
      let delivered = false;

      try {
        // Upload base64 results to storage for a permanent URL
        if (!alreadyUrl) {
          const bytes = base64ToBytes(stripDataPrefix(mediaUrl));
          const contentType = isVideo ? 'video/mp4' : 'image/jpeg';
          const ext = isVideo ? 'mp4' : 'jpg';
          const fileName = `edited/${job.id}-${Date.now()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('bot-edits')
            .upload(fileName, new Blob([bytes], { type: contentType }), {
              contentType,
              upsert: true,
            });

          if (uploadError) {
            console.warn('[callback] Storage upload failed:', uploadError.message);
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('bot-edits')
              .getPublicUrl(fileName);
            resultUrl = publicUrlData.publicUrl;
          }
        }

        // Deliver to Telegram
        await sendTelegramMedia(
          BOT_TOKEN,
          String(job.telegram_chat_id),
          mediaUrl,
          isVideo,
          t('job_completed', lang, { type: isVideo ? 'Video' : 'Image' })
        );
        delivered = true;
      } catch (err: any) {
        console.error('[callback] Delivery failed:', err?.message || err);
      }

      if (delivered) {
        // Update job row
        const jobUpdate =
          jobTable === 'image_edits'
            ? {
                status: 'done',
                completed_at: new Date().toISOString(),
                edited_image: resultUrl,
              }
            : {
                status: 'completed',
                result_url: resultUrl,
              };

        await supabase.from(jobTable).update(jobUpdate).eq('id', job.id);

        // Fleet accounting: only add star_earned.
        // star_spent + bot_star_balance were already updated when the job started.
        if (botRecord) {
          await supabase
            .from('managers_bots')
            .update({
              star_earned: (Number(botRecord.star_earned) || 0) + retailCost,
              updated_at: new Date().toISOString(),
            })
            .eq('id', botRecord.id);
        }

        return new Response('OK', { status: 200 });
      }
      // Delivery failed → fall through to refund
    }
  }

  // ── FAILURE / refund path ──────────────────────────────────────────────
  await supabase
    .from(jobTable)
    .update({ status: 'failed' })
    .eq('id', job.id);

  // Refund retail cost to the end-user
  if (user) {
    await supabase
      .from('telegram_users')
      .update({ stars: (Number(user.stars) || 0) + retailCost })
      .eq('telegram_user_id', job.telegram_user_id);
  }

  // Refund backend cost to bot reserve + reverse star_spent
  if (botRecord) {
    await supabase
      .from('managers_bots')
      .update({
        bot_star_balance: (Number(botRecord.bot_star_balance) || 0) + backendCost,
        star_spent: Math.max(0, (Number(botRecord.star_spent) || 0) - backendCost),
        updated_at: new Date().toISOString(),
      })
      .eq('id', botRecord.id);
  }

  // Notify user
  try {
    await sendMessage(
      BOT_TOKEN,
      String(job.telegram_chat_id),
      t('job_failed', lang, { cost: retailCost })
    );
  } catch (e) {
    console.error('[callback] Failed to send refund message', e);
  }

  return new Response('OK (Failed Job Refunded)', { status: 200 });
};
