import { createClient } from '@supabase/supabase-js';

const PACKAGES: Record<string, { name: string; credits: number; stars: number }> = {
  starter: { name: 'Starter', credits: 100, stars: 750 },
  creator: { name: 'Pro',     credits: 500, stars: 3000 },
  master:  { name: 'Studio',  credits: 1500, stars: 7500 },
};

const CREDITS_PER_EDIT = 4;
const FREE_CREDITS = 15;

// TODO: point this at your actual image-editing handler (same one your frontend calls)
const EDIT_HANDLER_URL = 'https://yoursite.com/api/edit-image';

async function sendMessage(token: string, chatId: number | string, text: string, extra: any = {}) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  });
}

async function sendPhoto(token: string, chatId: number | string, photoBase64: string, caption?: string) {
  // Telegram needs multipart form data for a raw photo upload
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', caption);
  const blob = await (await fetch(`data:image/png;base64,${photoBase64}`)).blob();
  form.append('photo', blob, 'edited.png');
  await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
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

function creditMenu() {
  return {
    inline_keyboard: [
      [{ text: '⚡ Starter — 100 credits (750 ⭐)', callback_data: 'buy_starter' }],
      [{ text: '🔥 Pro — 500 credits (3,000 ⭐)', callback_data: 'buy_creator' }],
      [{ text: '👑 Studio — 1,500 credits (7,500 ⭐)', callback_data: 'buy_master' }],
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

  // ── /start: register the user, give free credits ────────────────────────
  if (update.message?.text === '/start') {
    const chatId     = update.message.chat.id;
    const tgUserId   = String(update.message.from.id);
    const tgUsername = update.message.from?.username || '';
    const firstName  = update.message.from?.first_name || 'there';

    // Create the user if they don't exist yet; leave credits alone if they do
    const { data: existing } = await supabase
      .from('telegram_users')
      .select('id, credits')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    if (!existing) {
      await supabase.from('telegram_users').insert({
        telegram_user_id: tgUserId,
        telegram_username: tgUsername,
        first_name: firstName,
        credits: FREE_CREDITS,
      });
    }

    await sendMessage(BOT_TOKEN, chatId,
      `👋 Hey <b>${firstName}</b>!\n\n` +
      `Upload a photo with an instruction (e.g. "make the background a sunset", "remove the object on the left"), and send it — our AI will edit it for you.\n\n` +
      `You've got <b>${FREE_CREDITS} free credits</b> to start (each edit costs ${CREDITS_PER_EDIT}).`
    );
    return new Response('OK');
  }

  // ── /credits: check balance ──────────────────────────────────────────────
  if (update.message?.text === '/credits') {
    const chatId   = update.message.chat.id;
    const tgUserId = String(update.message.from.id);
    const { data: user } = await supabase
      .from('telegram_users')
      .select('credits')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    await sendMessage(BOT_TOKEN, chatId,
      `💳 You have <b>${user?.credits ?? 0} credits</b> left.\n\nUse /buy to top up.`
    );
    return new Response('OK');
  }

  // ── /buy: show packages ──────────────────────────────────────────────────
  if (update.message?.text === '/buy') {
    await sendMessage(BOT_TOKEN, update.message.chat.id,
      `Pick a credit package:`, { reply_markup: creditMenu() }
    );
    return new Response('OK');
  }

  // ── Photo + instruction upload → run the edit ────────────────────────────
  if (update.message?.photo) {
    const chatId    = update.message.chat.id;
    const tgUserId  = String(update.message.from.id);
    const caption   = update.message.caption || '';

    if (!caption) {
      await sendMessage(BOT_TOKEN, chatId, `Please add an instruction as the caption on your photo — e.g. "make it black and white".`);
      return new Response('OK');
    }

    // Check credit balance first
    const { data: user } = await supabase
      .from('telegram_users')
      .select('credits')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    if (!user || user.credits < CREDITS_PER_EDIT) {
      await sendMessage(BOT_TOKEN, chatId,
        `⚠️ You don't have enough credits for this edit (need ${CREDITS_PER_EDIT}).\n\nUse /buy to top up.`,
        { reply_markup: creditMenu() }
      );
      return new Response('OK');
    }

    await sendMessage(BOT_TOKEN, chatId, `🔄 Editing your photo... this usually takes about a minute.`);

    // Telegram sends multiple sizes — take the largest
    const photos = update.message.photo;
    const largest = photos[photos.length - 1];
    const fileUrl = await getFileUrl(BOT_TOKEN, largest.file_id);

    // Download the image and convert to base64, same as your frontend does
    const imgRes = await fetch(fileUrl);
    const imgBuffer = await imgRes.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));

    // Log the request
    const { data: editRow } = await supabase
      .from('image_edits')
      .insert({ telegram_user_id: tgUserId, instruction: caption, status: 'processing' })
      .select('id')
      .single();

    try {
      // Call your existing image-editing handler — same call your web frontend makes
      const editRes = await fetch(EDIT_HANDLER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, instruction: caption }),
      });

      if (!editRes.ok) throw new Error(`Handler returned ${editRes.status}`);
      const result = await editRes.json();
      const editedBase64 = result.image; // adjust field name to match your handler's response

      // Deduct credits and send result
      await supabase
        .from('telegram_users')
        .update({ credits: user.credits - CREDITS_PER_EDIT })
        .eq('telegram_user_id', tgUserId);

      await supabase
        .from('image_edits')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', editRow?.id);

      await sendPhoto(BOT_TOKEN, chatId, editedBase64, `✅ Done! ${user.credits - CREDITS_PER_EDIT} credits left.`);
    } catch (err) {
      console.error('[bot] edit failed:', err);
      await supabase
        .from('image_edits')
        .update({ status: 'failed' })
        .eq('id', editRow?.id);
      await sendMessage(BOT_TOKEN, chatId, `❌ Something went wrong editing your photo. You haven't been charged — please try again.`);
    }

    return new Response('OK');
  }

  // ── Package selection → Telegram Stars invoice ───────────────────────────
  if (update.callback_query?.data?.startsWith('buy_')) {
    const query     = update.callback_query;
    const chatId    = query.message.chat.id;
    const tgUserId  = String(query.from.id);
    const packageId = query.data.replace('buy_', '');
    const pkg       = PACKAGES[packageId];

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
        credits: pkg.credits,
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
        title: `${pkg.name} — ${pkg.credits} credits`,
        description: `Top up your photo-editing credits.`,
        payload: purchase?.id, // used to find this purchase after payment
        currency: 'XTR', // Telegram Stars
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

  // ── Successful payment → add credits ─────────────────────────────────────
  if (update.message?.successful_payment) {
    const chatId      = update.message.chat.id;
    const tgUserId    = String(update.message.from.id);
    const purchaseId  = update.message.successful_payment.invoice_payload;

    const { data: purchase } = await supabase
      .from('telegram_purchases')
      .select('credits, package_name')
      .eq('id', purchaseId)
      .maybeSingle();

    if (purchase) {
      const { data: user } = await supabase
        .from('telegram_users')
        .select('credits')
        .eq('telegram_user_id', tgUserId)
        .maybeSingle();

      const newBalance = (user?.credits || 0) + purchase.credits;

      await supabase
        .from('telegram_users')
        .update({ credits: newBalance })
        .eq('telegram_user_id', tgUserId);

      await supabase
        .from('telegram_purchases')
        .update({ status: 'sold' })
        .eq('id', purchaseId);

      await sendMessage(BOT_TOKEN, chatId,
        `✅ <b>Payment confirmed!</b>\n\n📦 ${purchase.package_name} — +${purchase.credits} credits\n💳 New balance: <b>${newBalance} credits</b>\n\nSend a photo with an instruction to keep editing!`
      );
    }

    return new Response('OK');
  }

  return new Response('OK');
};
