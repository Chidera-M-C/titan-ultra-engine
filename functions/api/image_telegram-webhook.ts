import { createClient } from '@supabase/supabase-js';

// ====================== TRANSLATIONS ======================
const translations: any = {
  en: {
    choose_language: "Please choose your language:",
    welcome: "👋 Hey <b>{{name}}</b>!\n\nSend me a photo with a short instruction.\n\nI’ll ask if you want an <b>Image</b> or a <b>Video</b>.\n\n🖼 Image = {{img}} ⭐\n🎬 Video = {{vid}} ⭐\n\nYou’ve got <b>{{free}} free stars</b>.",
    credits: "⭐ You have <b>{{stars}} stars</b> left.\n\nUse /buy to top up.",
    pick_package: "Pick a package:",
    need_caption: "Please add a short instruction as the caption of your photo.\n\nExample: \"make her pose in style\" or \"change clothes\"",
    how_do_you_want: "How do you want it?",
    image_btn: "🖼 Image — {{cost}} ⭐",
    video_btn: "🎬 Video — {{cost}} ⭐",
    not_enough: "⚠️ Not enough stars.\n\nYou need:\n• {{img}} ⭐ for an Image\n• {{vid}} ⭐ for a Video\n\nYou currently have <b>{{balance}} ⭐</b>.\n\nUse /buy to top up.",
    no_pending: "No pending photo found. Please send a new photo.",
    generating_image: "🖼 Editing your photo... this usually takes 20–30 seconds.",
    generating_video: "🎬 Generating your video... this usually takes 60–90 seconds.",
    error_generic: "❌ Something went wrong. Please try again.",
    error_job: "❌ Something went wrong starting the job. You haven't been charged — please try again.",
    payment_success: "✅ <b>Payment confirmed!</b>\n\n📦 {{package}}\n⭐ +{{stars}} stars",
    payment_bonus: "\n🎁 {{bonus}}",
    payment_balance: "\n💳 New balance: <b>{{balance}} stars</b>\n\nSend a photo with an instruction to continue.",
    invoice_description: "Top up your stars for images & videos.",
  },
  ar: {
    choose_language: "الرجاء اختيار لغتك:",
    welcome: "👋 مرحباً <b>{{name}}</b>!\n\nأرسل لي صورة مع تعليمات قصيرة.\n\nسأسألك إذا كنت تريد <b>صورة</b> أو <b>فيديو</b>.\n\n🖼 صورة = {{img}} ⭐\n🎬 فيديو = {{vid}} ⭐\n\nلديك <b>{{free}} نجوم مجانية</b>.",
    credits: "⭐ رصيدك الحالي: <b>{{stars}} نجمة</b>\n\nاستخدم /buy لإضافة رصيد.",
    pick_package: "اختر الباقة:",
    need_caption: "الرجاء إضافة تعليمات قصيرة كتعليق على الصورة.\n\nمثال: \"اجعلها تتخذ وضعية أنيقة\" أو \"غيّر الملابس\"",
    how_do_you_want: "كيف تريدها؟",
    image_btn: "🖼 صورة — {{cost}} ⭐",
    video_btn: "🎬 فيديو — {{cost}} ⭐",
    not_enough: "⚠️ ليس لديك نجوم كافية.\n\nتحتاج:\n• {{img}} ⭐ للصورة\n• {{vid}} ⭐ للفيديو\n\nرصيدك الحالي: <b>{{balance}} ⭐</b>\n\nاستخدم /buy لإضافة رصيد.",
    no_pending: "لم يتم العثور على صورة قيد الانتظار. يرجى إرسال صورة جديدة.",
    generating_image: "🖼 جاري تعديل صورتك... عادة ما يستغرق 20–30 ثانية.",
    generating_video: "🎬 جاري إنشاء الفيديو... عادة ما يستغرق 60–90 ثانية.",
    error_generic: "❌ حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    error_job: "❌ حدث خطأ أثناء بدء المهمة. لم يتم خصم أي نجوم — يرجى المحاولة مرة أخرى.",
    payment_success: "✅ <b>تم تأكيد الدفع!</b>\n\n📦 {{package}}\n⭐ +{{stars}} نجمة",
    payment_bonus: "\n🎁 {{bonus}}",
    payment_balance: "\n💳 الرصيد الجديد: <b>{{balance}} نجمة</b>\n\nأرسل صورة مع تعليمات للمتابعة.",
    invoice_description: "اشحن رصيدك من النجوم للصور والفيديوهات.",
  },
  hi: {
    choose_language: "कृपया अपनी भाषा चुनें:",
    welcome: "👋 नमस्ते <b>{{name}}</b>!\n\nमुझे एक फोटो भेजें और संक्षिप्त निर्देश लिखें।\n\nमैं पूछूंगा कि आपको <b>इमेज</b> चाहिए या <b>वीडियो</b>।\n\n🖼 इमेज = {{img}} ⭐\n🎬 वीडियो = {{vid}} ⭐\n\nआपके पास <b>{{free}} मुफ्त स्टार्स</b> हैं।",
    credits: "⭐ आपके पास <b>{{stars}} स्टार्स</b> बचे हैं।\n\nटॉप-अप के लिए /buy का उपयोग करें।",
    pick_package: "पैकेज चुनें:",
    need_caption: "कृपया फोटो के कैप्शन में छोटा निर्देश लिखें।\n\nउदाहरण: \"उसे स्टाइलिश पोज़ में बनाओ\" या \"कपड़े बदलो\"",
    how_do_you_want: "आप कैसे चाहेंगे?",
    image_btn: "🖼 इमेज — {{cost}} ⭐",
    video_btn: "🎬 वीडियो — {{cost}} ⭐",
    not_enough: "⚠️ पर्याप्त स्टार्स नहीं हैं।\n\nआपको चाहिए:\n• इमेज के लिए {{img}} ⭐\n• वीडियो के लिए {{vid}} ⭐\n\nवर्तमान बैलेंस: <b>{{balance}} ⭐</b>\n\nटॉप-अप के लिए /buy करें।",
    no_pending: "कोई लंबित फोटो नहीं मिली। कृपया नई फोटो भेजें।",
    generating_image: "🖼 आपकी फोटो एडिट हो रही है... आमतौर पर 20–30 सेकंड लगते हैं।",
    generating_video: "🎬 आपका वीडियो बन रहा है... आमतौर पर 60–90 सेकंड लगते हैं।",
    error_generic: "❌ कुछ गलत हो गया। कृपया फिर से कोशिश करें।",
    error_job: "❌ जॉब शुरू करने में समस्या हुई। आपसे कोई स्टार नहीं कटे — कृपया फिर कोशिश करें।",
    payment_success: "✅ <b>भुगतान सफल!</b>\n\n📦 {{package}}\n⭐ +{{stars}} स्टार्स",
    payment_bonus: "\n🎁 {{bonus}}",
    payment_balance: "\n💳 नया बैलेंस: <b>{{balance}} स्टार्स</b>\n\nजारी रखने के लिए फोटो + निर्देश भेजें।",
    invoice_description: "इमेज और वीडियो के लिए स्टार्स टॉप-अप करें।",
  },
  ur: {
    choose_language: "براہ کرم اپنی زبان منتخب کریں:",
    welcome: "👋 السلام علیکم <b>{{name}}</b>!\n\nمجھے ایک تصویر بھیجیں اور مختصر ہدایت لکھیں۔\n\nمیں پوچھوں گا کہ آپ <b>تصویر</b> چاہتے ہیں یا <b>ویڈیو</b>۔\n\n🖼 تصویر = {{img}} ⭐\n🎬 ویڈیو = {{vid}} ⭐\n\nآپ کے پاس <b>{{free}} مفت ستارے</b> ہیں۔",
    credits: "⭐ آپ کے پاس <b>{{stars}} ستارے</b> باقی ہیں۔\n\nٹاپ اپ کے لیے /buy استعمال کریں۔",
    pick_package: "پیکج منتخب کریں:",
    need_caption: "براہ کرم تصویر کے کیپشن میں مختصر ہدایت لکھیں۔\n\nمثال: \"اسے اسٹائلش پوز میں بناؤ\" یا \"کپڑے تبدیل کرو\"",
    how_do_you_want: "آپ کیسے چاہتے ہیں؟",
    image_btn: "🖼 تصویر — {{cost}} ⭐",
    video_btn: "🎬 ویڈیو — {{cost}} ⭐",
    not_enough: "⚠️ کافی ستارے نہیں ہیں۔\n\nآپ کو چاہیے:\n• تصویر کے لیے {{img}} ⭐\n• ویڈیو کے لیے {{vid}} ⭐\n\nموجودہ بیلنس: <b>{{balance}} ⭐</b>\n\nٹاپ اپ کے لیے /buy کریں۔",
    no_pending: "کوئی زیر التوا تصویر نہیں ملی۔ براہ کرم نئی تصویر بھیجیں۔",
    generating_image: "🖼 آپ کی تصویر ایڈٹ ہو رہی ہے... عام طور پر 20–30 سیکنڈ لگتے ہیں۔",
    generating_video: "🎬 آپ کی ویڈیو بن رہی ہے... عام طور پر 60–90 سیکنڈ لگتے ہیں۔",
    error_generic: "❌ کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔",
    error_job: "❌ جاب شروع کرنے میں مسئلہ پیش آیا۔ آپ سے کوئی ستارہ نہیں کاٹا گیا — دوبارہ کوشش کریں۔",
    payment_success: "✅ <b>ادائیگی کامیاب!</b>\n\n📦 {{package}}\n⭐ +{{stars}} ستارے",
    payment_bonus: "\n🎁 {{bonus}}",
    payment_balance: "\n💳 نیا بیلنس: <b>{{balance}} ستارے</b>\n\nجاری رکھنے کے لیے تصویر + ہدایت بھیجیں۔",
    invoice_description: "تصاویر اور ویڈیوز کے لیے ستارے ٹاپ اپ کریں۔",
  },
  bn: {
    choose_language: "অনুগ্রহ করে আপনার ভাষা নির্বাচন করুন:",
    welcome: "👋 হ্যালো <b>{{name}}</b>!\n\nআমাকে একটি ছবি পাঠান এবং সংক্ষিপ্ত নির্দেশ লিখুন।\n\nআমি জিজ্ঞাসা করব আপনি <b>ইমেজ</b> চান নাকি <b>ভিডিও</b>।\n\n🖼 ইমেজ = {{img}} ⭐\n🎬 ভিডিও = {{vid}} ⭐\n\nআপনার কাছে <b>{{free}}টি ফ্রি স্টার</b> আছে।",
    credits: "⭐ আপনার কাছে <b>{{stars}} স্টার</b> বাকি আছে।\n\nটপ-আপ করতে /buy ব্যবহার করুন।",
    pick_package: "প্যাকেজ বেছে নিন:",
    need_caption: "অনুগ্রহ করে ছবির ক্যাপশনে সংক্ষিপ্ত নির্দেশ লিখুন।\n\nউদাহরণ: \"তাকে স্টাইলিশ পোজে রাখো\" বা \"জামাকাপড় পরিবর্তন করো\"",
    how_do_you_want: "আপনি কীভাবে চান?",
    image_btn: "🖼 ইমেজ — {{cost}} ⭐",
    video_btn: "🎬 ভিডিও — {{cost}} ⭐",
    not_enough: "⚠️ পর্যাপ্ত স্টার নেই।\n\nআপনার দরকার:\n• ইমেজের জন্য {{img}} ⭐\n• ভিডিওর জন্য {{vid}} ⭐\n\nবর্তমান ব্যালেন্স: <b>{{balance}} ⭐</b>\n\nটপ-আপ করতে /buy করুন।",
    no_pending: "কোনো অপেক্ষমাণ ছবি পাওয়া যায়নি। অনুগ্রহ করে নতুন ছবি পাঠান।",
    generating_image: "🖼 আপনার ছবি এডিট করা হচ্ছে... সাধারণত ২০–৩০ সেকেন্ড লাগে।",
    generating_video: "🎬 আপনার ভিডিও তৈরি হচ্ছে... সাধারণত ৬০–৯০ সেকেন্ড লাগে।",
    error_generic: "❌ কিছু ভুল হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    error_job: "❌ জব শুরু করতে সমস্যা হয়েছে। আপনার কোনো স্টার কাটা হয়নি — আবার চেষ্টা করুন।",
    payment_success: "✅ <b>পেমেন্ট সফল!</b>\n\n📦 {{package}}\n⭐ +{{stars}} স্টার",
    payment_bonus: "\n🎁 {{bonus}}",
    payment_balance: "\n💳 নতুন ব্যালেন্স: <b>{{balance}} স্টার</b>\n\nচালিয়ে যেতে ছবি + নির্দেশ পাঠান।",
    invoice_description: "ইমেজ ও ভিডিওর জন্য স্টার টপ-আপ করুন।",
  },
  ru: {
    choose_language: "Пожалуйста, выберите язык:",
    welcome: "👋 Привет, <b>{{name}}</b>!\n\nПришли мне фото с коротким описанием.\n\nЯ спрошу, хочешь ли ты <b>Изображение</b> или <b>Видео</b>.\n\n🖼 Изображение = {{img}} ⭐\n🎬 Видео = {{vid}} ⭐\n\nУ тебя есть <b>{{free}} бесплатных звёзд</b>.",
    credits: "⭐ У тебя осталось <b>{{stars}} звёзд</b>.\n\nИспользуй /buy для пополнения.",
    pick_package: "Выбери пакет:",
    need_caption: "Пожалуйста, добавь короткое описание в подпись к фото.\n\nПример: \"сделай её в стильной позе\" или \"измени одежду\"",
    how_do_you_want: "Как ты хочешь?",
    image_btn: "🖼 Изображение — {{cost}} ⭐",
    video_btn: "🎬 Видео — {{cost}} ⭐",
    not_enough: "⚠️ Недостаточно звёзд.\n\nТебе нужно:\n• {{img}} ⭐ за изображение\n• {{vid}} ⭐ за видео\n\nТекущий баланс: <b>{{balance}} ⭐</b>\n\nИспользуй /buy для пополнения.",
    no_pending: "Ожидающее фото не найдено. Пожалуйста, отправь новое фото.",
    generating_image: "🖼 Редактирую твоё фото... обычно занимает 20–30 секунд.",
    generating_video: "🎬 Создаю видео... обычно занимает 60–90 секунд.",
    error_generic: "❌ Что-то пошло не так. Попробуй ещё раз.",
    error_job: "❌ Ошибка при запуске задачи. Звёзды не списаны — попробуй снова.",
    payment_success: "✅ <b>Оплата подтверждена!</b>\n\n📦 {{package}}\n⭐ +{{stars}} звёзд",
    payment_bonus: "\n🎁 {{bonus}}",
    payment_balance: "\n💳 Новый баланс: <b>{{balance}} звёзд</b>\n\nОтправь фото с описанием, чтобы продолжить.",
    invoice_description: "Пополни звёзды для изображений и видео.",
  },
  es: {
    choose_language: "Por favor elige tu idioma:",
    welcome: "👋 ¡Hola <b>{{name}}</b>!\n\nEnvíame una foto con una instrucción corta.\n\nTe preguntaré si quieres una <b>Imagen</b> o un <b>Video</b>.\n\n🖼 Imagen = {{img}} ⭐\n🎬 Video = {{vid}} ⭐\n\nTienes <b>{{free}} estrellas gratis</b>.",
    credits: "⭐ Te quedan <b>{{stars}} estrellas</b>.\n\nUsa /buy para recargar.",
    pick_package: "Elige un paquete:",
    need_caption: "Por favor agrega una instrucción corta como descripción de la foto.\n\nEjemplo: \"hazla posar con estilo\" o \"cambia la ropa\"",
    how_do_you_want: "¿Cómo lo quieres?",
    image_btn: "🖼 Imagen — {{cost}} ⭐",
    video_btn: "🎬 Video — {{cost}} ⭐",
    not_enough: "⚠️ No tienes suficientes estrellas.\n\nNecesitas:\n• {{img}} ⭐ para una Imagen\n• {{vid}} ⭐ para un Video\n\nSaldo actual: <b>{{balance}} ⭐</b>\n\nUsa /buy para recargar.",
    no_pending: "No se encontró ninguna foto pendiente. Por favor envía una nueva foto.",
    generating_image: "🖼 Editando tu foto... normalmente tarda 20–30 segundos.",
    generating_video: "🎬 Generando tu video... normalmente tarda 60–90 segundos.",
    error_generic: "❌ Algo salió mal. Por favor intenta de nuevo.",
    error_job: "❌ Error al iniciar el trabajo. No se te cobraron estrellas — intenta de nuevo.",
    payment_success: "✅ <b>¡Pago confirmado!</b>\n\n📦 {{package}}\n⭐ +{{stars}} estrellas",
    payment_bonus: "\n🎁 {{bonus}}",
    payment_balance: "\n💳 Nuevo saldo: <b>{{balance}} estrellas</b>\n\nEnvía una foto con una instrucción para continuar.",
    invoice_description: "Recarga estrellas para imágenes y videos.",
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

async function getUserLanguage(supabase: any, telegramUserId: string) {
  try {
    const { data } = await supabase
      .from('telegram_users')
      .select('language')
      .eq('telegram_user_id', telegramUserId)
      .maybeSingle();
    return data?.language || 'en';
  } catch {
    return 'en';
  }
}
// ====================== END TRANSLATIONS ======================

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
      [{ text: '8 ⭐ — $0.10 (1 img 🖼)', callback_data: 'buy_pack8' }],
      [{ text: '80 ⭐ — $1 (10 img 🖼 / 5 vid 🎬)', callback_data: 'buy_pack80' }],
      [{ text: '300 ⭐ — $3.75 (37 img 🖼 / 18 vid 🎬)', callback_data: 'buy_pack300' }],
      [{ text: '550 ⭐ — $6.70 (68 img 🖼 / 34 vid 🎬)', callback_data: 'buy_pack550' }],
      [{ text: '2,400 ⭐ — $30 (300 img 🖼 / 150 vid 🎬)', callback_data: 'buy_pack2400' }],
      [{ text: '4,500 ⭐ — $56.25 (562 img 🖼 / 281 vid 🎬)', callback_data: 'buy_pack4500' }],
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
  if (update.message?.text === '/start') {
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

    if (!existing?.language) {
      await sendMessage(BOT_TOKEN, chatId, t('choose_language', 'en'), {
        reply_markup: languageMenu(),
      });
      return new Response('OK');
    }

    const lang = existing.language;
    await sendMessage(BOT_TOKEN, chatId, t('welcome', lang, {
      name: firstName,
      img: STARS_IMAGE,
      vid: STARS_VIDEO,
      free: FREE_STARS,
    }));
    return new Response('OK');
  }

  // ── /language ────────────────────────────────────────────────────────────
  if (update.message?.text === '/language') {
    const chatId = update.message.chat.id;
    const tgUserId = String(update.message.from.id);
    const lang = await getUserLanguage(supabase, tgUserId);

    await sendMessage(BOT_TOKEN, chatId, t('choose_language', lang), {
      reply_markup: languageMenu(),
    });
    return new Response('OK');
  }

  // ── Language selection ───────────────────────────────────────────────────
  if (update.callback_query?.data?.startsWith('lang_')) {
    const lang = update.callback_query.data.replace('lang_', '');
    const tgUserId = String(update.callback_query.from.id);
    const chatId = update.callback_query.message.chat.id;
    const firstName = update.callback_query.from.first_name || 'there';

    // Update user language
    await supabase
      .from('telegram_users')
      .update({ language: lang })
      .eq('telegram_user_id', tgUserId);
    
    // Also update all pending purchases of this user
    await supabase
      .from('telegram_purchases')
      .update({ language: lang })
      .eq('telegram_user_id', tgUserId)
      .eq('status', 'pending');

    const confirmTexts: any = {
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

    await sendMessage(BOT_TOKEN, chatId, t('welcome', lang, {
      name: firstName,
      img: STARS_IMAGE,
      vid: STARS_VIDEO,
      free: FREE_STARS,
    }));

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

    await sendMessage(BOT_TOKEN, chatId, t('credits', lang, { stars: user?.stars ?? 0 }));
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

  // ── Photo + caption ──────────────────────────────────────────────────────
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

    if (alreadyProcessed) return new Response('OK');

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
        .upload(refFileName, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage.from('bot-edits').getPublicUrl(refFileName);

      await supabase.from('image_edits').insert({
        telegram_user_id: tgUserId,
        instruction: caption,
        user_prompt: caption,
        reference_image: publicUrlData.publicUrl,
        status: 'awaiting_choice',
        telegram_update_id: updateId,
        telegram_chat_id: String(chatId),
        job_type: null,
      });

      await sendMessage(BOT_TOKEN, chatId, t('how_do_you_want', lang), {
        reply_markup: choiceMenu(lang),
      });
    } catch (err: any) {
      console.error('[bot] photo error:', err);
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
      await sendMessage(BOT_TOKEN, chatId, t('not_enough', lang, {
        img: STARS_IMAGE,
        vid: STARS_VIDEO,
        balance: user?.stars ?? 0,
      }), { reply_markup: creditMenu() });
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
      await sendMessage(BOT_TOKEN, chatId, isVideo ? t('generating_video', lang) : t('generating_image', lang));

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
        ? { input: { prompt: pending.user_prompt, start_image: dataUrl, duration: 6 }, webhook: callbackUrl }
        : { input: { prompt: pending.user_prompt, image: dataUrl }, webhook: callbackUrl };

      const editRes = await fetch(handlerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.RUNPOD_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!editRes.ok) throw new Error(await editRes.text());

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
        language: lang,          // ← Add this line
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
      .select('stars, package_name, incentive_offered, extra_stars, extra_images, extra_videos, incentive_claimed, language')
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
        .update({ status: 'sold', incentive_claimed: true })
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

        const bonusText = bonusParts.length > 0 ? bonusParts.join(' + ') : `+${purchase.extra_stars} bonus stars`;
        confirmMsg += t('payment_bonus', lang, { bonus: bonusText });
      }

      confirmMsg += t('payment_balance', lang, { balance: newBalance });

      await sendMessage(BOT_TOKEN, chatId, confirmMsg);
    }

    return new Response('OK');
  }

  return new Response('OK');
};
