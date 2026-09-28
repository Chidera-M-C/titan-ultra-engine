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
  }
};

function t(key: string, lang: string = 'en', vars: Record<string, any> = {}) {
  const dict = translations[lang] || translations.en;
  let text = dict[key] || translations.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{{${k}}}`, String(v));
  }
  return text;
}

async function sendTelegramMedia(token: string, chatId: string, mediaUrl: string, isVideo: boolean, caption: string) {
  const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
  const paramName = isVideo ? 'video' : 'photo';

  await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      [paramName]: mediaUrl,
      caption,
      parse_mode: 'HTML',
    }),
  });
}

async function sendMessage(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

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

  const supabaseUrl = env.SHARED_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SHARED_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Locate Job in Supabase
  let jobTable = 'jobs';
  let { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('*')
    .eq('runpod_job_id', runpodJobId)
    .maybeSingle();

  if (!job) {
    jobTable = 'image_edits';
    const { data: legacyJob } = await supabase
      .from('image_edits')
      .select('*')
      .eq('runpod_job_id', runpodJobId)
      .maybeSingle();
    job = legacyJob;
  }

  if (!job) {
    return new Response('Job Not Found', { status: 404 });
  }

  // Prevent duplicate webhook processing
  if (job.status === 'completed' || job.status === 'failed') {
    return new Response('OK (Already Processed)', { status: 200 });
  }

  // 2. Resolve Associated Manager Bot & User Details
  let botRecord: any = null;
  if (job.bot_id) {
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
  const retailCost = job.credits_charged || (isVideo ? 5 : 1);
  const backendCost = job.backend_cost || (isVideo ? 16 : 8);

  // 3. Handle Successful Output
  if (status === 'COMPLETED' && output) {
    let mediaUrl = '';
    if (typeof output === 'string') {
      mediaUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      mediaUrl = typeof output[0] === 'string' ? output[0] : (output[0].image || output[0].video || output[0].url);
    } else if (typeof output === 'object') {
      mediaUrl = output.video || output.image || output.url || output.result || '';
    }

    if (mediaUrl) {
      // Send result to user via Telegram
      await sendTelegramMedia(
        BOT_TOKEN,
        job.telegram_chat_id,
        mediaUrl,
        isVideo,
        t('job_completed', lang, { type: isVideo ? 'Video' : 'Image' })
      );

      // Update Job status
      await supabase
        .from(jobTable)
        .update({ status: 'completed', result_url: mediaUrl })
        .eq('id', job.id);

      // Finalize Financial Accounting on Bot Record
      if (botRecord) {
        await supabase
          .from('managers_bots')
          .update({
            star_earned: (Number(botRecord.star_earned) || 0) + retailCost,
            star_spent: (Number(botRecord.star_spent) || 0) + backendCost,
            updated_at: new Date().toISOString(),
          })
          .eq('id', botRecord.id);
      }

      return new Response('OK', { status: 200 });
    }
  }

  // 4. Handle Failure & Refund Flow
  await supabase
    .from(jobTable)
    .update({ status: 'failed' })
    .eq('id', job.id);

  // Refund Retail Cost to End-User
  if (user) {
    await supabase
      .from('telegram_users')
      .update({ stars: (user.stars || 0) + retailCost })
      .eq('telegram_user_id', job.telegram_user_id);
  }

  // Refund Backend Cost to Bot Reserve Balance
  if (botRecord) {
    await supabase
      .from('managers_bots')
      .update({
        bot_star_balance: (Number(botRecord.bot_star_balance) || 0) + backendCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', botRecord.id);
  }

  // Notify User of Refund
  await sendMessage(
    BOT_TOKEN,
    job.telegram_chat_id,
    t('job_failed', lang, { cost: retailCost })
  );

  return new Response('OK (Failed Job Refunded)', { status: 200 });
};
