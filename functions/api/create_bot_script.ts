import { createClient } from '@supabase/supabase-js';

// ====================== TRANSLATIONS ======================
const translations: any = {
  en: {
    choose_language: "Please choose your language:",
    promo_caption: `Telegram is deleting your favourite video & image bots.
Public Bots gets banned, private ones doesn't.

This app lets you own your private bot that never gets banned.
You own it, control it. You decide if you want to keep it for yourself or make it public. Doesn't refuse anything. 100% Private.

Steps are simple:
1. Go to @BotFather
2. Create a new bot
3. Copy the token
4. Open our Mini App
5. Click Create New Bot and paste the token
6. Fund $10 in Stars

Boom! You've got a private fantasy bot that never goes missing.

Launch your first bot • Get 25 free generation stars.`,
    btn_launch: "🚀 Launch bot in 60s",
    btn_community: "👥 Join other bot owners",
    btn_course: "▶️ Watch our course",
    btn_support: "💬 Talk to Emma",
    support_msg: "Need help? Talk to Emma 👇",
    lang_changed: "✅ Language successfully changed to English",
  },
  ar: {
    choose_language: "الرجاء اختيار لغتك:",
    promo_caption: `تيليجرام يحذف بوتات الفيديو والصور المفضلة لديك.
البوتات العامة يتم حظرها، أما الخاصة فلا.

هذا التطبيق يتيح لك امتلاك بوت خاص بك لا يتم حظره أبداً.
أنت تملكه وتتحكم فيه. أنت تقرر إن كنت تريد الاحتفاظ به لنفسك أو جعله عاماً. لا يرفض أي شيء. 100% خاص.

الخطوات بسيطة:
1. اذهب إلى @BotFather
2. أنشئ بوتاً جديداً
3. انسخ التوكن
4. افتح تطبيقنا المصغر
5. اضغط Create New Bot وألصق التوكن
6. اشحن $10 من النجوم

Boom! أصبح لديك بوت خيالي خاص لا يختفي أبداً.

أطلق بوتك الأول • احصل على 25 نجمة مجانية.`,
    btn_launch: "🚀 أطلق البوت في 60 ثانية",
    btn_community: "👥 انضم لمالكي البوتات الآخرين",
    btn_course: "▶️ شاهد كورسنا",
    btn_support: "💬 تحدث مع إيما",
    support_msg: "تحتاج مساعدة؟ تحدث مع إيما 👇",
    lang_changed: "✅ تم تغيير اللغة بنجاح إلى العربية",
  },
  hi: {
    choose_language: "कृपया अपनी भाषा चुनें:",
    promo_caption: `Telegram आपके पसंदीदा वीडियो और इमेज बॉट्स को डिलीट कर रहा है।
पब्लिक बॉट्स बैन हो जाते हैं, प्राइवेट नहीं।

यह ऐप आपको अपना प्राइवेट बॉट रखने देता है जो कभी बैन नहीं होता।
आपके पास है, आप कंट्रोल करते हैं। आप तय करें कि इसे सिर्फ अपने लिए रखना है या पब्लिक बनाना है। कुछ भी मना नहीं करता। 100% प्राइवेट।

स्टेप्स आसान हैं:
1. @BotFather पर जाएं
2. नया बॉट बनाएं
3. टोकन कॉपी करें
4. हमारा मिनी ऐप खोलें
5. Create New Bot पर क्लिक करके टोकन पेस्ट करें
6. $10 स्टार्स फंड करें

Boom! आपके पास एक प्राइवेट फैंटेसी बॉट है जो कभी गायब नहीं होता।

अपना पहला बॉट लॉन्च करें • 25 फ्री जनरेशन स्टार्स पाएं।`,
    btn_launch: "🚀 60 सेकंड में बॉट लॉन्च करें",
    btn_community: "👥 अन्य बॉट ओनर्स से जुड़ें",
    btn_course: "▶️ हमारा कोर्स देखें",
    btn_support: "💬 एम्मा से बात करें",
    support_msg: "मदद चाहिए? एम्मा से बात करें 👇",
    lang_changed: "✅ भाषा सफलतापूर्वक हिन्दी में बदल दी गई",
  },
  ur: {
    choose_language: "براہ کرم اپنی زبان منتخب کریں:",
    promo_caption: `ٹیلیگرام آپ کے پسندیدہ ویڈیو اور امیج بوٹس ڈیلیٹ کر رہا ہے۔
پبلک بوٹس بین ہو جاتے ہیں، پرائیویٹ نہیں۔

یہ ایپ آپ کو اپنا پرائیویٹ بوٹ رکھنے دیتی ہے جو کبھی بین نہیں ہوتا۔
آپ کے پاس ہے، آپ کنٹرول کرتے ہیں۔ آپ فیصلہ کریں کہ اسے صرف اپنے لیے رکھنا ہے یا پبلک بنانا ہے۔ کچھ بھی ریفیوز نہیں کرتا۔ 100% پرائیویٹ۔

خطوات آسان ہیں:
1. @BotFather پر جائیں
2. نیا بوٹ بنائیں
3. ٹوکن کاپی کریں
4. ہمارا منی ایپ کھولیں
5. Create New Bot پر کلک کرکے ٹوکن پیسٹ کریں
6. $10 سٹارز فنڈ کریں

Boom! آپ کے پاس ایک پرائیویٹ فینٹسی بوٹ ہے جو کبھی غائب نہیں ہوتا۔

اپنا پہلا بوٹ لانچ کریں • 25 مفت جنریشن سٹارز حاصل کریں۔`,
    btn_launch: "🚀 60 سیکنڈ میں بوٹ لانچ کریں",
    btn_community: "👥 دیگر بوٹ اونرز سے جڑیں",
    btn_course: "▶️ ہمارا کورس دیکھیں",
    btn_support: "💬 اما سے بات کریں",
    support_msg: "مدد چاہیے؟ اما سے بات کریں 👇",
    lang_changed: "✅ زبان کامیابی سے اردو میں تبدیل ہو گئی",
  },
  bn: {
    choose_language: "অনুগ্রহ করে আপনার ভাষা নির্বাচন করুন:",
    promo_caption: `টেলিগ্রাম আপনার প্রিয় ভিডিও ও ইমেজ বটগুলো ডিলিট করছে।
পাবলিক বট ব্যান হয়, প্রাইভেট হয় না।

এই অ্যাপ আপনাকে নিজের প্রাইভেট বট রাখতে দেয় যা কখনো ব্যান হয় না।
আপনার মালিকানা, আপনার নিয়ন্ত্রণ। আপনি ঠিক করবেন শুধু নিজের জন্য রাখবেন নাকি পাবলিক করবেন। কিছুই রিফিউজ করে না। ১০০% প্রাইভেট।

স্টেপগুলো সহজ:
1. @BotFather এ যান
2. নতুন বট তৈরি করুন
3. টোকেন কপি করুন
4. আমাদের মিনি অ্যাপ খুলুন
5. Create New Bot ক্লিক করে টোকেন পেস্ট করুন
6. $10 স্টার ফান্ড করুন

Boom! আপনার কাছে একটি প্রাইভেট ফ্যান্টাসি বট আছে যা কখনো হারায় না।

আপনার প্রথম বট লঞ্চ করুন • ২৫টি ফ্রি জেনারেশন স্টার পান।`,
    btn_launch: "🚀 ৬০ সেকেন্ডে বট লঞ্চ করুন",
    btn_community: "👥 অন্য বট মালিকদের সাথে যোগ দিন",
    btn_course: "▶️ আমাদের কোর্স দেখুন",
    btn_support: "💬 এমমার সাথে কথা বলুন",
    support_msg: "সাহায্য দরকার? এমমার সাথে কথা বলুন 👇",
    lang_changed: "✅ ভাষা সফলভাবে বাংলায় পরিবর্তন করা হয়েছে",
  },
  ru: {
    choose_language: "Пожалуйста, выберите язык:",
    promo_caption: `Telegram удаляет ваши любимые видео и фото боты.
Публичные боты банят, приватные — нет.

Это приложение позволяет вам владеть своим приватным ботом, который никогда не банят.
Вы владеете им и контролируете. Вы решаете — оставить только для себя или сделать публичным. Ничего не отказывает. 100% приватный.

Шаги простые:
1. Перейдите к @BotFather
2. Создайте нового бота
3. Скопируйте токен
4. Откройте наше Mini App
5. Нажмите Create New Bot и вставьте токен
6. Пополните $10 звёздами

Boom! У вас есть приватный fantasy-бот, который никогда не пропадает.

Запустите своего первого бота • Получите 25 бесплатных звёзд генерации.`,
    btn_launch: "🚀 Запустить бота за 60 сек",
    btn_community: "👥 Присоединиться к владельцам ботов",
    btn_course: "▶️ Смотреть наш курс",
    btn_support: "💬 Написать Эмме",
    support_msg: "Нужна помощь? Напишите Эмме 👇",
    lang_changed: "✅ Язык успешно изменён на Русский",
  },
  es: {
    choose_language: "Por favor elige tu idioma:",
    promo_caption: `Telegram está eliminando tus bots favoritos de video e imagen.
Los bots públicos son baneados, los privados no.

Esta app te permite tener tu propio bot privado que nunca es baneado.
Tú lo posees, tú lo controlas. Tú decides si lo quieres solo para ti o hacerlo público. No rechaza nada. 100% Privado.

Los pasos son simples:
1. Ve a @BotFather
2. Crea un nuevo bot
3. Copia el token
4. Abre nuestra Mini App
5. Haz clic en Create New Bot y pega el token
6. Recarga $10 en Stars

¡Boom! Tienes un bot fantasy privado que nunca desaparece.

Lanza tu primer bot • Obtén 25 estrellas de generación gratis.`,
    btn_launch: "🚀 Lanzar bot en 60s",
    btn_community: "👥 Únete a otros dueños de bots",
    btn_course: "▶️ Ver nuestro curso",
    btn_support: "💬 Hablar con Emma",
    support_msg: "¿Necesitas ayuda? Habla con Emma 👇",
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
const VIDEO_FILE_ID = 'BAACAgQAAxkDAANeatuZ0gLN8AW4Iz4mRcAmJrH4F10AAp0gAAJF79lSO1SO9RgVd4s9BA';

const MINI_APP_URL = 'https://t.me/lovelyfantasiesbot/botui';
const CHANNEL_LINK = 'https://t.me/+vYwWjoJYk7AxODQ0';
const COURSE_LINK = 'https://t.me/NudelyBotUI/3';
const SUPPORT_URL = 'https://t.me/nudelyadmin';

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

function promoButtons(lang: string) {
  return {
    inline_keyboard: [
      [
        {
          text: t('btn_launch', lang),
          url: MINI_APP_URL,          // ← changed from web_app to url
        },
      ],
      [
        { text: t('btn_community', lang), url: CHANNEL_LINK },
      ],
      [
        { text: t('btn_course', lang), url: COURSE_LINK },
      ],
      [
        { text: t('btn_support', lang), url: SUPPORT_URL },
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

      console.log('Existing user:', existing);

      if (!existing) {
        console.log('New user → inserting + showing language menu');
        const { error: insertError } = await supabase.from('bot_managers').insert({
          user_id: tgUserId,
          username: tgUsername,
          star_balance: 0,
        });
        if (insertError) console.error('Insert error:', insertError);

        await sendMessage(BOT_TOKEN, chatId, t('choose_language', 'en'), {
          reply_markup: languageMenu(),
        });
        return new Response('OK');
      }

      // Existing user → send promo
      const lang = existing.language || 'en';
      console.log('Existing user, language =', lang, '→ sending promo');

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
        inline_keyboard: [[{ text: t('btn_support', lang), url: SUPPORT_URL }]],
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

    await sendVideo(BOT_TOKEN, chatId, t('promo_caption', lang), promoButtons(lang));
    return new Response('OK');
  }

  console.log('No matching handler');
  return new Response('OK');
};
