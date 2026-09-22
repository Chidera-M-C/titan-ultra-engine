import { createClient } from '@supabase/supabase-js';
import { t, getUserLanguage } from './i18n';

const PACKAGES: Record<string, { name: string; stars: number }> = {
  pack8:    { name: '1 Image',           stars: 8 },
  pack80:   { name: '10 Img / 5 vid',    stars: 80 },
  pack300:  { name: '37 Img / 18 vid',   stars: 300 },
  pack550:  { name: '68 Img / 34 vid',   stars: 550 },
  pack2400: { name: '300 Img / 150 vid', stars: 2400 },
  pack4500: { name: '562 Img / 281 vid', stars: 4500 },
};

const STARS_IMAGE = 8;
const STARS_VIDEO = 16;
const FREE_STARS = 8;

const IMAGE_HANDLER_URL = 'https://api.runpod.ai/v2/em5th9pvdrelyb/run';
const VIDEO_HANDLER_URL = 'https://api.runpod.ai/v2/x35b5gomf1482c/run';

async function sendMessage(token: string, chatId: number | string, text: string, extra: any = {}) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  });
}

async function getFileUrl(token: string, fileId: string): Promise<string> {
  const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const data = await res.json();
  return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
}

async function answerPreCheckout(token: string, id: string, ok: boolean, errorMessage?: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pre_checkout_query_id: id, ok, error_message: errorMessage }),
  });
}

function languageMenu() {
  return {
    inline_keyboard: [
      [
        { text: '🇸🇦 العربية', callback_data: 'lang_ar' },
        { text: '🇮🇳 हिन्दी', callback_data: 'lang_hi' },
      ],
      [
        { text: '🇵🇰 اردو', callback_data: 'lang_ur' },
        { text: '🇧🇩 বাংলা', callback_data: 'lang_bn' },
      ],
      [
        { text: '🇷🇺 Русский', callback_data: 'lang_ru' },
        { text: '🇪🇸 Español', callback_data: 'lang_es' },
      ],
      [
        { text: '🇬🇧 English', callback_data: 'lang_en' },
      ],
    ],
  };
}

function creditMenu() {
  return {
    inline_keyboard: [
      [{ text: '8 ⭐ — $0.10 (1 img)', callback_data: 'buy_pack8' }],
      [{ text: '80 ⭐ — $1 (10 img / 5 vid)', callback_data: 'buy_pack80' }],
      [{ text: '300 ⭐ — $3.75 (37 img / 18 vid)', callback_data: 'buy_pack300' }],
      [{ text: '550 ⭐ — $6.70 (68 img / 34 vid)', callback_data: 'buy_pack550' }],
      [{ text: '2,400 ⭐ — $30 (300 img / 150 vid)', callback_data: 'buy_pack2400' }],
      [{ text: '4,500 ⭐ — $56.25 (562 img / 281 vid)', callback_data: 'buy_pack4500' }],
    ],
  };
}

function choiceMenu(lang: string) {
  return {
    inline_keyboard: [
      [
        { text: t('image_btn', lang, { cost: STARS_IMAGE }), callback_data: 'choose_image' },
        { text: t('video_btn', lang, { cost: STARS_VIDEO }), callback_data: 'choose_video' },
      ],
    ],
  };
}

export const onRequestPost = async (context: any) => {
  const env = context.env;
  const BOT_TOKEN = env.IMAGE_TELEGRAM_BOT_TOKEN;
  const WEBHOOK_SECRET = env.TELEGRAM_WEBHOOK_SECRET;
  const secretHeader = context.request.headers.get('X-Telegram-Bot-Api-Secret-Token');

  if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  let update: any;
  try {
    update = await context.request.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // ── /start ───────────────────────────────────────────────────────────────
  if (update.message?.text === '/strt') {
    const chatId = update.message.chat.id;
    const tgUserId = String(update.message.from.id);
    const tgUsername = update.message.from?.username || '';
    const firstName = update.message.from?.first_name || 'there';

    const { data: existing } = await supabase
      .from('telegram_users')
      .select('id, stars, language')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    if (!existing) {
      await supabase.from('telegram_users').insert({
        telegram_user_id: tgUserId,
        telegram_username: tgUsername,
        first_name: firstName,
        stars: FREE_STARS,
        language: null,
      });
    }

    // Force language selection if not set
    // Force language selection if not set
    if (!existing?.language) {
      await sendMessage(
        BOT_TOKEN,
        chatId,
        t('choose_language', 'en'),
        { reply_markup: languageMenu() }
      );
      return new Response('OK');
    }

    const lang = existing.language;
    await sendMessage(
      BOT_TOKEN,
      chatId,
      t('welcome', lang, {
        name: firstName,
        img: STARS_IMAGE,
        vid: STARS_VIDEO,
        free: FREE_STARS,
      })
    );
    return new Response('OK');
  }

  // ── /language ────────────────────────────────────────────────────────────
  if (update.message?.text === '/language') {
    const chatId = update.message.chat.id;
    const tgUserId = String(update.message.from.id);
    const lang = await getUserLanguage(supabase, tgUserId);

    await sendMessage(
      BOT_TOKEN,
      chatId,
      t('choose_language', lang),
      { reply_markup: languageMenu() }
    );
    return new Response('OK');
  }

  // ── Language selection ───────────────────────────────────────────────────
  if (update.callback_query?.data?.startsWith('lang_')) {
    const lang = update.callback_query.data.replace('lang_', '');
    const tgUserId = String(update.callback_query.from.id);
    const chatId = update.callback_query.message.chat.id;
    const firstName = update.callback_query.from.first_name || 'there';

    // Save language
    await supabase
      .from('telegram_users')
      .update({ language: lang })
      .eq('telegram_user_id', tgUserId);

    // Confirmation messages per language
    const confirmTexts: Record<string, string> = {
      ar: '✅ تم تغيير اللغة بنجاح إلى العربية',
      hi: '✅ भाषा सफलतापूर्वक हिन्दी में बदल दी गई',
      ur: '✅ زبان کامیابی سے اردو میں تبدیل ہو گئی',
      bn: '✅ ভাষা সফলভাবে বাংলায় পরিবর্তন করা হয়েছে',
      ru: '✅ Язык успешно изменён на Русский',
      es: '✅ Idioma cambiado exitosamente a Español',
      en: '✅ Language successfully changed to English',
    };

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: update.callback_query.id,
        text: confirmTexts[lang] || confirmTexts.en,
        show_alert: true,
      }),
    });

    // Send welcome in the new language
    await sendMessage(
      BOT_TOKEN,
      chatId,
      t('welcome', lang, {
        name: firstName,
        img: STARS_IMAGE,
        vid: STARS_VIDEO,
        free: FREE_STARS,
      })
    );

    return new Response('OK');
  }

  // ── /credits or /stars ───────────────────────────────────────────────────
  if (update.message?.text === '/credits' || update.message?.text === '/stars') {
    const chatId = update.message.chat.id;
    const tgUserId = String(update.message.from.id);
    const lang = await getUserLanguage(supabase, tgUserId);

    const { data: user } = await supabase
      .from('telegram_users')
      .select('stars')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    await sendMessage(
      BOT_TOKEN,
      chatId,
      t('credits', lang, { stars: user?.stars ?? 0 })
    );
    return new Response('OK');
  }

  // ── /buy ─────────────────────────────────────────────────────────────────
  if (update.message?.text === '/buy') {
    const lang = await getUserLanguage(supabase, String(update.message.from.id));
    await sendMessage(BOT_TOKEN, update.message.chat.id, t('pick_package', lang), {
      reply_markup: creditMenu(),
    });
    return new Response('OK');
  }

  // ── Photo + caption → Ask Image or Video ─────────────────────────────────
  if (update.message?.photo) {
    const chatId = update.message.chat.id;
    const tgUserId = String(update.message.from.id);
    const caption = update.message.caption || '';
    const updateId = update.update_id;
    const lang = await getUserLanguage(supabase, tgUserId);

    if (!caption) {
      await sendMessage(BOT_TOKEN, chatId, t('need_caption', lang));
      return new Response('OK');
    }

    const { data: alreadyProcessed } = await supabase
      .from('image_edits')
      .select('id')
      .eq('telegram_update_id', updateId)
      .maybeSingle();

    if (alreadyProcessed) {
      return new Response('OK');
    }

    try {
      const photos = update.message.photo;
      const largest = photos[photos.length - 1];
      const fileUrl = await getFileUrl(BOT_TOKEN, largest.file_id);
      const imgRes = await fetch(fileUrl);
      const imgBuffer = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(imgBuffer);
      const blob = new Blob([bytes], { type: 'image/jpeg' });

      const refFileName = `reference/${tgUserId}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('bot-edits')
        .upload(refFileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload reference image: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('bot-edits')
        .getPublicUrl(refFileName);
      const referenceImageUrl = publicUrlData.publicUrl;

      await supabase.from('image_edits').insert({
        telegram_user_id: tgUserId,
        instruction: caption,
        user_prompt: caption,
        reference_image: referenceImageUrl,
        status: 'awaiting_choice',
        telegram_update_id: updateId,
        telegram_chat_id: String(chatId),
        job_type: null,
      });

      await sendMessage(
        BOT_TOKEN,
        chatId,
        t('how_do_you_want', lang),
        { reply_markup: choiceMenu(lang) }
      );
    } catch (err: any) {
      console.error('[bot] photo handling failed:', err);
      await sendMessage(BOT_TOKEN, chatId, t('error_generic', lang));
    }

    return new Response('OK');
  }

  // ── Choice: Image or Video ───────────────────────────────────────────────
  if (update.callback_query?.data === 'choose_image' || update.callback_query?.data === 'choose_video') {
    const query = update.callback_query;
    const chatId = query.message.chat.id;
    const tgUserId = String(query.from.id);
    const isVideo = query.data === 'choose_video';
    const cost = isVideo ? STARS_VIDEO : STARS_IMAGE;
    const jobType = isVideo ? 'video' : 'image';
    const lang = await getUserLanguage(supabase, tgUserId);

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: query.id }),
    });

    const { data: user } = await supabase
      .from('telegram_users')
      .select('stars')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    if (!user || user.stars < cost) {
      await sendMessage(
        BOT_TOKEN,
        chatId,
        t('not_enough', lang, {
          img: STARS_IMAGE,
          vid: STARS_VIDEO,
          balance: user?.stars ?? 0,
        }),
        { reply_markup: creditMenu() }
      );
      return new Response('OK');
    }

    const { data: pending } = await supabase
      .from('image_edits')
      .select('*')
      .eq('telegram_user_id', tgUserId)
      .eq('status', 'awaiting_choice')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pending) {
      await sendMessage(BOT_TOKEN, chatId, t('no_pending', lang));
      return new Response('OK');
    }

    try {
      await sendMessage(
        BOT_TOKEN,
        chatId,
        isVideo ? t('generating_video', lang) : t('generating_image', lang)
      );

      const imgRes = await fetch(pending.reference_image);
      const imgBuffer = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(imgBuffer);

      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const base64Image = btoa(binary);
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;

      const callbackUrl = `https://nudely.org/api/image_runpod-callback`;
      const handlerUrl = isVideo ? VIDEO_HANDLER_URL : IMAGE_HANDLER_URL;

      const payload = isVideo
        ? {
            input: {
              prompt: pending.user_prompt,
              start_image: dataUrl,
              duration: 6,
            },
            webhook: callbackUrl,
          }
        : {
            input: {
              prompt: pending.user_prompt,
              image: dataUrl,
            },
            webhook: callbackUrl,
          };

      const editRes = await fetch(handlerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.RUNPOD_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!editRes.ok) {
        const errText = await editRes.text();
        throw new Error(`RunPod submit failed ${editRes.status}: ${errText}`);
      }

      const job = await editRes.json();

      await supabase
        .from('image_edits')
        .update({
          status: 'processing',
          job_type: jobType,
          runpod_job_id: job.id,
          credits_charged: cost,
        })
        .eq('id', pending.id);
    } catch (err: any) {
      console.error('[bot] job start failed:', err);
      await sendMessage(BOT_TOKEN, chatId, t('error_job', lang));
    }

    return new Response('OK');
  }

  // ── Package selection ────────────────────────────────────────────────────
  if (update.callback_query?.data?.startsWith('buy_')) {
    const query = update.callback_query;
    const chatId = query.message.chat.id;
    const tgUserId = String(query.from.id);
    const packageId = query.data.replace('buy_', '');
    const pkg = PACKAGES[packageId];
    const lang = await getUserLanguage(supabase, tgUserId);

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: query.id }),
    });

    if (!pkg) return new Response('OK');

    const { data: purchase } = await supabase
      .from('telegram_purchases')
      .insert({
        telegram_user_id: tgUserId,
        package_name: pkg.name,
        stars: pkg.stars,
        status: 'pending',
      })
      .select('id')
      .single();

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendInvoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        title: pkg.name,
        description: t('invoice_description', lang),
        payload: purchase?.id,
        currency: 'XTR',
        prices: [{ label: pkg.name, amount: pkg.stars }],
      }),
    });

    return new Response('OK');
  }

  // ── Pre-checkout ─────────────────────────────────────────────────────────
  if (update.pre_checkout_query) {
    await answerPreCheckout(BOT_TOKEN, update.pre_checkout_query.id, true);
    return new Response('OK');
  }

  // ── Successful payment ───────────────────────────────────────────────────
  if (update.message?.successful_payment) {
    const chatId = update.message.chat.id;
    const tgUserId = String(update.message.from.id);
    const purchaseId = update.message.successful_payment.invoice_payload;
    const lang = await getUserLanguage(supabase, tgUserId);

    const { data: purchase } = await supabase
      .from('telegram_purchases')
      .select('stars, package_name, incentive_offered, extra_stars, extra_images, extra_videos, incentive_claimed')
      .eq('id', purchaseId)
      .maybeSingle();

    if (purchase) {
      let starsToAdd = purchase.stars;

      if (purchase.incentive_offered && !purchase.incentive_claimed && purchase.extra_stars > 0) {
        starsToAdd += purchase.extra_stars;
      }

      const { data: user } = await supabase
        .from('telegram_users')
        .select('stars')
        .eq('telegram_user_id', tgUserId)
        .maybeSingle();

      const newBalance = (user?.stars || 0) + starsToAdd;

      await supabase
        .from('telegram_users')
        .update({ stars: newBalance })
        .eq('telegram_user_id', tgUserId);

      await supabase
        .from('telegram_purchases')
        .update({
          status: 'sold',
          incentive_claimed: true,
        })
        .eq('id', purchaseId);

      let confirmMsg = t('payment_success', lang, {
        package: purchase.package_name,
        stars: purchase.stars,
      });

      if (purchase.incentive_offered && purchase.extra_stars > 0) {
        const extraImages = purchase.extra_images || 0;
        const extraVideos = purchase.extra_videos || 0;
        const bonusParts: string[] = [];

        if (extraVideos > 0) bonusParts.push(`${extraVideos} extra video${extraVideos !== 1 ? 's' : ''}`);
        if (extraImages > 0) bonusParts.push(`${extraImages} extra image${extraImages !== 1 ? 's' : ''}`);

        const bonusText = bonusParts.length > 0
          ? bonusParts.join(' + ')
          : `+${purchase.extra_stars} bonus stars`;

        confirmMsg += t('payment_bonus', lang, { bonus: bonusText });
      }

      confirmMsg += t('payment_balance', lang, { balance: newBalance });

      await sendMessage(BOT_TOKEN, chatId, confirmMsg);
    }

    return new Response('OK');
  }

  return new Response('OK');
};
