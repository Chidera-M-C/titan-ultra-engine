import { createClient } from '@supabase/supabase-js';

// ====================== TRANSLATIONS ======================
const translations: any = {
  en: {
    choose_language: "Please choose your language:",
    promo_caption: `Create your own bot in 5 simple steps:

1. Go to BotFather
2. Create a new bot
3. Copy the token
4. Open the Mini App
5. Paste the token and create your bot

You own it and you control it.`,
    btn_launch: "🔥 Be in control now",
    btn_community: "👥 Join other bot owners",
    btn_course: "▶️ Watch our course",
    btn_support: "💬 Talk to Emma",
    btn_testbot: "🧪 Try Test Bot",
    support_msg: "Need help? Talk to Emma 👇",
    community_msg: "Join other bot owners in our community 👇",
    course_msg: "Watch our course and learn how to grow your bot 👇",
    testbot_msg: "Try our test bot here 👇",
    lang_changed: "✅ Language successfully changed to English",
  },
  ar: {
    choose_language: "الرجاء اختيار لغتك:",
    promo_caption: `أنشئ بوتك الخاص في 5 خطوات بسيطة:

1. اذهب إلى BotFather
2. أنشئ بوتاً جديداً
3. انسخ التوكن
4. افتح تطبيقنا المصغر
5. ألصق التوكن وأنشئ بوتك

أنت تملكه وأنت تتحكم فيه.`,
    btn_launch: "🔥 كن المتحكم الآن",
    btn_community: "👥 انضم لمالكي البوتات الآخرين",
    btn_course: "▶️ شاهد كورسنا",
    btn_support: "💬 تحدث مع إيما",
    btn_testbot: "🧪 جرب البوت التجريبي",
    support_msg: "تحتاج مساعدة؟ تحدث مع إيما 👇",
    community_msg: "انضم لمالكي البوتات الآخرين في مجتمعنا 👇",
    course_msg: "شاهد كورسنا وتعلم كيف تنمي بوتك 👇",
    testbot_msg: "جرب البوت التجريبي هنا 👇",
    lang_changed: "✅ تم تغيير اللغة بنجاح إلى العربية",
  },
  hi: {
    choose_language: "कृपया अपनी भाषा चुनें:",
    promo_caption: `अपना प्राइवेट बॉट 5 आसान स्टेप्स में बनाएं:

1. BotFather पर जाएं
2. नया बॉट बनाएं
3. टोकन कॉपी करें
4. मिनी ऐप खोलें
5. टोकन पेस्ट करके अपना बॉट बनाएं

यह आपका है और आप इसे कंट्रोल करते हैं।`,
    btn_launch: "🔥 अब नियंत्रण अपने हाथ में लें",
    btn_community: "👥 अन्य बॉट ओनर्स से जुड़ें",
    btn_course: "▶️ हमारा कोर्स देखें",
    btn_support: "💬 एम्मा से बात करें",
    btn_testbot: "🧪 टेस्ट बॉट आज़माएं",
    support_msg: "मदद चाहिए? एम्मा से बात करें 👇",
    community_msg: "अन्य बॉट ओनर्स के कम्युनिटी में शामिल हों 👇",
    course_msg: "हमारा कोर्स देखें और अपना बॉट बढ़ाएं 👇",
    testbot_msg: "यहाँ टेस्ट बॉट आज़माएं 👇",
    lang_changed: "✅ भाषा सफलतापूर्वक हिन्दी में बदल दी गई",
  },
  ur: {
    choose_language: "براہ کرم اپنی زبان منتخب کریں:",
    promo_caption: `اپنا پرائیویٹ بوٹ 5 آسان مراحل میں بنائیں:

1. BotFather پر جائیں
2. نیا بوٹ بنائیں
3. ٹوکن کاپی کریں
4. منی ایپ کھولیں
5. ٹوکن پیسٹ کرکے اپنا بوٹ بنائیں

یہ آپ کا ہے اور آپ اسے کنٹرول کرتے ہیں۔`,
    btn_launch: "🔥 اب کنٹرول اپنے ہاتھ میں لیں",
    btn_community: "👥 دیگر بوٹ اونرز سے جڑیں",
    btn_course: "▶️ ہمارا کورس دیکھیں",
    btn_support: "💬 اما سے بات کریں",
    btn_testbot: "🧪 ٹیسٹ بوٹ آزمائیں",
    support_msg: "مدد چاہیے؟ اما سے بات کریں 👇",
    community_msg: "دیگر بوٹ اونرز کی کمیونٹی میں شامل ہوں 👇",
    course_msg: "ہمارا کورس دیکھیں اور اپنا بوٹ بڑھائیں 👇",
    testbot_msg: "یہاں ٹیسٹ بوٹ آزمائیں 👇",
    lang_changed: "✅ زبان کامیابی سے اردو میں تبدیل ہو گئی",
  },
  bn: {
    choose_language: "অনুগ্রহ করে আপনার ভাষা নির্বাচন করুন:",
    promo_caption: `আপনার নিজের প্রাইভেট বট ৫টি সহজ ধাপে তৈরি করুন:

1. BotFather এ যান
2. নতুন বট তৈরি করুন
3. টোকেন কপি করুন
4. মিনি অ্যাপ খুলুন
5. টোকেন পেস্ট করে আপনার বট তৈরি করুন

এটি আপনার এবং আপনিই এটি নিয়ন্ত্রণ করেন।`,
    btn_launch: "🔥 এখন নিয়ন্ত্রণ নিন",
    btn_community: "👥 অন্য বট মালিকদের সাথে যোগ দিন",
    btn_course: "▶️ আমাদের কোর্স দেখুন",
    btn_support: "💬 এমমার সাথে কথা বলুন",
    btn_testbot: "🧪 টেস্ট বট চেষ্টা করুন",
    support_msg: "সাহায্য দরকার? এমমার সাথে কথা বলুন 👇",
    community_msg: "অন্য বট মালিকদের কমিউনিটিতে যোগ দিন 👇",
    course_msg: "আমাদের কোর্স দেখুন এবং বট বাড়ান 👇",
    testbot_msg: "এখানে টেস্ট বট চেষ্টা করুন 👇",
    lang_changed: "✅ ভাষা সফলভাবে বাংলায় পরিবর্তন করা হয়েছে",
  },
  ru: {
    choose_language: "Пожалуйста, выберите язык:",
    promo_caption: `Создайте своего приватного бота за 5 простых шагов:

1. Перейдите к BotFather
2. Создайте нового бота
3. Скопируйте токен
4. Откройте Mini App
5. Вставьте токен и создайте бота

Вы владеете им и контролируете его.`,
    btn_launch: "🔥 Возьми контроль сейчас",
    btn_community: "👥 Присоединиться к владельцам ботов",
    btn_course: "▶️ Смотреть наш курс",
    btn_support: "💬 Написать Эмме",
    btn_testbot: "🧪 Попробовать тестовый бот",
    support_msg: "Нужна помощь? Напишите Эмме 👇",
    community_msg: "Присоединяйтесь к сообществу владельцев ботов 👇",
    course_msg: "Смотрите наш курс и развивайте своего бота 👇",
    testbot_msg: "Попробуйте тестовый бот здесь 👇",
    lang_changed: "✅ Язык успешно изменён на Русский",
  },
  es: {
    choose_language: "Por favor elige tu idioma:",
    promo_caption: `Crea tu propio bot privado en 5 pasos simples:

1. Ve a BotFather
2. Crea un nuevo bot
3. Copia el token
4. Abre la Mini App
5. Pega el token y crea tu bot

Tú lo posees y tú lo controlas.`,
    btn_launch: "🔥 Toma el control ahora",
    btn_community: "👥 Únete a otros dueños de bots",
    btn_course: "▶️ Ver nuestro curso",
    btn_support: "💬 Hablar con Emma",
    btn_testbot: "🧪 Probar bot de prueba",
    support_msg: "¿Necesitas ayuda? Habla con Emma 👇",
    community_msg: "Únete a la comunidad de dueños de bots 👇",
    course_msg: "Mira nuestro curso y haz crecer tu bot 👇",
    testbot_msg: "Prueba nuestro bot de prueba aquí 👇",
    lang_changed: "✅ Idioma cambiado exitosamente a Español",
  },
};

function t(key: string, lang: string = 'en') {
  const dict = translations[lang] || translations.en;
  return dict[key] || translations.en[key] || key;
}

async function getUserLanguage(supabase: any, telegramUserId: number | string) {
  try {
    const { data } = await supabase
      .from('bot_managers')
      .select('language')
      .eq('user_id', telegramUserId)
      .maybeSingle();
    return data?.language || 'en';
  } catch {
    return 'en';
  }
}

// ====================== HELPERS ======================
const VIDEO_FILE_ID = 'BAACAgQAAxkDAAM4auHRlXvd8168bAWtOdbM8mOT1lsAAkwfAAIRMBFTTufGIaN0P6A9BA';
const CTA_URL = 'https://t.me/botui_test_motherbot';
const CHANNEL_LINK = 'https://t.me/+vYwWjoJYk7AxODQ0';
const COURSE_LINK = 'https://t.me/NudelyBotUI/3';
const SUPPORT_URL = 'https://t.me/emma_melnyk';
const TESTBOT_URL = 'https://t.me/botui_test_motherbot'; // ← replace this later

async function sendMessage(token: string, chatId: number | string, text: string, extra: any = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error('[sendMessage] FAILED', data);
  }
  return data;
}

async function sendVideo(token: string, chatId: number | string, caption: string, reply_markup: any) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      video: VIDEO_FILE_ID,
      caption,
      parse_mode: 'HTML',
      reply_markup,
    }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error('[sendVideo] FAILED', JSON.stringify(data));
    // Fallback → send as normal message if video fails
    await sendMessage(token, chatId, caption, { reply_markup });
  }
  return data;
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

// Only one CTA button
function promoButtons(lang: string) {
  return {
    inline_keyboard: [
      [
        {
          text: t('btn_launch', lang),
          url: CTA_URL,
        },
      ],
    ],
  };
}

// ====================== MAIN HANDLER ======================
export const onRequestPost = async (context: any) => {
  const env = context.env;
  const secretHeader = context.request.headers.get('X-Telegram-Bot-Api-Secret-Token');

  if (!env.CREATE_BOT_SECRET || secretHeader !== env.CREATE_BOT_SECRET) {
    console.error('Unauthorized - secret mismatch');
    return new Response('Unauthorized', { status: 401 });
  }

  const BOT_TOKEN = env.CREATE_BOT_TOKEN;
  if (!BOT_TOKEN) {
    console.error('CREATE_BOT_TOKEN missing');
    return new Response('Bot token missing', { status: 500 });
  }

  const fleetSupabaseUrl = env.SHARED_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const fleetServiceKey = env.SHARED_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(fleetSupabaseUrl, fleetServiceKey);

  let update: any;
  try {
    update = await context.request.json();
  } catch (e) {
    console.error('JSON parse error', e);
    return new Response('Bad Request', { status: 400 });
  }

  console.log('Update received:', JSON.stringify({
    hasMessage: !!update.message,
    text: update.message?.text,
    hasCallback: !!update.callback_query,
    callbackData: update.callback_query?.data,
  }));

  // ── /start ───────────────────────────────────────────────────────────────
  // Now always shows promo immediately (no language picker first)
  if (update.message?.text === '/start' || update.message?.text?.startsWith('/start ')) {
    console.log('→ Handling /start');
    const chatId = update.message.chat.id;
    const tgUserId = Number(update.message.from.id);
    const tgUsername = update.message.from?.username || null;

    try {
      const { data: existing, error } = await supabase
        .from('bot_managers')
        .select('user_id, language')
        .eq('user_id', tgUserId)
        .maybeSingle();

      if (error) {
        console.error('Supabase select error:', error);
      }

      if (!existing) {
        // New user → insert with default language 'en'
        const { error: insertError } = await supabase.from('bot_managers').insert({
          user_id: tgUserId,
          username: tgUsername,
          star_balance: 0,
          language: 'en',
        });
        if (insertError) console.error('Insert error:', insertError);
      }

      // Always send promo immediately
      const lang = existing?.language || 'en';
      console.log('Sending promo, language =', lang);
      await sendVideo(BOT_TOKEN, chatId, t('promo_caption', lang), promoButtons(lang));
      return new Response('OK');
    } catch (err: any) {
      console.error('/start fatal error:', err?.message || err);
      await sendMessage(BOT_TOKEN, chatId, 'Something went wrong. Please try again.');
      return new Response('OK');
    }
  }

  // ── /language ────────────────────────────────────────────────────────────
  if (update.message?.text === '/language') {
    console.log('→ Handling /language');
    const chatId = update.message.chat.id;
    const lang = await getUserLanguage(supabase, update.message.from.id);
    await sendMessage(BOT_TOKEN, chatId, t('choose_language', lang), {
      reply_markup: languageMenu(),
    });
    return new Response('OK');
  }

  // ── /support ─────────────────────────────────────────────────────────────
  if (update.message?.text === '/support') {
    console.log('→ Handling /support');
    const chatId = update.message.chat.id;
    const lang = await getUserLanguage(supabase, update.message.from.id);

    await sendMessage(BOT_TOKEN, chatId, t('support_msg', lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: t('btn_support', lang), url: SUPPORT_URL }],
        ],
      },
    });
    return new Response('OK');
  }

  // ── /community ──────────────────────────────────────────────────────────
  if (update.message?.text === '/community') {
    console.log('→ Handling /community');
    const chatId = update.message.chat.id;
    const lang = await getUserLanguage(supabase, update.message.from.id);

    await sendMessage(BOT_TOKEN, chatId, t('community_msg', lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: t('btn_community', lang), url: CHANNEL_LINK }],
        ],
      },
    });
    return new Response('OK');
  }

  // ── /courses ────────────────────────────────────────────────────────────
  if (update.message?.text === '/courses') {
    console.log('→ Handling /courses');
    const chatId = update.message.chat.id;
    const lang = await getUserLanguage(supabase, update.message.from.id);

    await sendMessage(BOT_TOKEN, chatId, t('course_msg', lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: t('btn_course', lang), url: COURSE_LINK }],
        ],
      },
    });
    return new Response('OK');
  }

  // ── /testbot ─────────────────────────────────────────────────────────────
  if (update.message?.text === '/testbot') {
    console.log('→ Handling /testbot');
    const chatId = update.message.chat.id;
    const lang = await getUserLanguage(supabase, update.message.from.id);

    await sendMessage(BOT_TOKEN, chatId, t('testbot_msg', lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: t('btn_testbot', lang), url: TESTBOT_URL }],
        ],
      },
    });
    return new Response('OK');
  }

  // ── Language selection ───────────────────────────────────────────────────
  if (update.callback_query?.data?.startsWith('lang_')) {
    console.log('→ Handling language selection');
    const lang = update.callback_query.data.replace('lang_', '');
    const tgUserId = Number(update.callback_query.from.id);
    const chatId = update.callback_query.message.chat.id;
    const tgUsername = update.callback_query.from.username || null;

    await supabase
      .from('bot_managers')
      .update({
        language: lang,
        username: tgUsername,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', tgUserId);

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: update.callback_query.id,
        text: t('lang_changed', lang),
        show_alert: true,
      }),
    });

    // After changing language → show promo again
    await sendVideo(BOT_TOKEN, chatId, t('promo_caption', lang), promoButtons(lang));
    return new Response('OK');
  }

  console.log('No matching handler');
  return new Response('OK');
};
