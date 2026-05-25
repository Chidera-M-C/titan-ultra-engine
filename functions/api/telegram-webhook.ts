import { createClient } from '@supabase/supabase-js';

// ── Constants ────────────────────────────────────────────────────────────────
const PACKAGES: Record<string, { name: string; credits: number; stars: number }> = {
  starter: { name: 'Starter',  credits: 100,  stars: 750  },
  creator: { name: 'Creator',  credits: 500,  stars: 3000 },
  master:  { name: 'Master',   credits: 1500, stars: 7500 },
};

const PENDING_EXPIRY_MINUTES = 20;
const SOLD_EXPIRY_DAYS       = 7;

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function sendMessage(token: string, chatId: number | string, text: string, extra: any = {}) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  });
}

async function answerPreCheckout(token: string, id: string, ok: boolean, errorMessage?: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pre_checkout_query_id: id, ok, error_message: errorMessage }),
  });
}

function packageMenu() {
  return {
    inline_keyboard: [
      [{ text: '⚡ Starter — 100 credits ($10 / 750 ⭐)', callback_data: 'pkg_starter' }],
      [{ text: '🔥 Creator — 500 credits ($40 / 3,000 ⭐)', callback_data: 'pkg_creator' }],
      [{ text: '👑 Master — 1,500 credits ($100 / 7,500 ⭐)', callback_data: 'pkg_master' }],
    ],
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────
export const onRequestPost = async (context: any) => {
  const env = context.env;
  const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
  const WEBHOOK_SECRET = env.TELEGRAM_WEBHOOK_SECRET;

  // Verify secret header to prevent unauthorized calls
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

  // ── /start or /help ──────────────────────────────────────────────────────
  if (update.message?.text === '/start' || update.message?.text === '/help') {
    const chatId = update.message.chat.id;
    const firstName = update.message.from?.first_name || 'there';

    await sendMessage(BOT_TOKEN, chatId,
      `👋 Hey <b>${firstName}</b>! Welcome to the <b>Nudely Official Top-Up</b> bot.\n\n` +
      `Here you can buy credits using Telegram Stars ⭐ to use on <b>nudely.org</b>.\n\n` +
      `<b>How it works:</b>\n` +
      `1. Pick a package below\n` +
      `2. Pay with Telegram Stars\n` +
      `3. Your unique code is revealed\n` +
      `4. Enter the code at nudely.org → Add Credits → Telegram\n\n` +
      `⚠️ <b>Codes are single-use and valid for 7 days after purchase. Never share your code.</b>\n\n` +
      `Which package would you like?`,
      { reply_markup: packageMenu() }
    );
    return new Response('OK');
  }

  // ── /checkpayment ────────────────────────────────────────────────────────
  if (update.message?.text === '/checkpayment') {
    const chatId  = update.message.chat.id;
    const tgUserId = String(update.message.from.id);

    const { data: codes } = await supabase
      .from('telegram_codes')
      .select('code, package_name, credits, status, expires_at')
      .eq('telegram_user_id', tgUserId)
      .eq('status', 'sold')
      .order('created_at', { ascending: false })
      .limit(3);

    if (!codes || codes.length === 0) {
      await sendMessage(BOT_TOKEN, chatId,
        `No pending codes found for your account.\n\nUse /start to buy a package.`
      );
    } else {
      let msg = `<b>Your active codes:</b>\n\n`;
      for (const c of codes) {
        const exp = new Date(c.expires_at).toLocaleDateString('en-GB');
        msg += `📦 <b>${c.package_name}</b> — ${c.credits} credits\n`;
        msg += `🔑 Code: <code>${c.code}</code>\n`;
        msg += `⏳ Expires: ${exp}\n\n`;
      }
      msg += `Redeem at nudely.org → Add Credits → Telegram`;
      await sendMessage(BOT_TOKEN, chatId, msg);
    }
    return new Response('OK');
  }

  // ── Package selection (inline keyboard callback) ─────────────────────────
  if (update.callback_query?.data?.startsWith('pkg_')) {
    const query     = update.callback_query;
    const chatId    = query.message.chat.id;
    const tgUserId  = String(query.from.id);
    const tgUsername = query.from.username || '';
    const packageId = query.data.replace('pkg_', '');
    const pkg       = PACKAGES[packageId];

    if (!pkg) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: query.id }),
      });
      return new Response('OK');
    }

    // Answer callback to remove loading spinner
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: query.id }),
    });

    // Generate unique code
    let code = '';
    let attempts = 0;
    while (attempts < 10) {
      code = generateCode();
      const { data: existing } = await supabase
        .from('telegram_codes')
        .select('code')
        .eq('code', code)
        .maybeSingle();
      if (!existing) break;
      attempts++;
    }

    // Save to DB as pending (expires in 20 min)
    const pendingExpiry = new Date(Date.now() + PENDING_EXPIRY_MINUTES * 60 * 1000);
    const { error: insertErr } = await supabase
      .from('telegram_codes')
      .insert({
        code,
        package_id: packageId,
        package_name: pkg.name,
        credits: pkg.credits,
        stars: pkg.stars,
        status: 'pending',
        telegram_user_id: tgUserId,
        telegram_username: tgUsername,
        expires_at: pendingExpiry.toISOString(),
      });

    if (insertErr) {
      await sendMessage(BOT_TOKEN, chatId, '❌ Something went wrong generating your code. Please try again.');
      return new Response('OK');
    }

    // Send as paid media (stars)
    const caption =
      `🔑 <b>Your ${pkg.name} Code</b>\n\n` +
      `<code>${code}</code>\n\n` +
      `📦 Package: ${pkg.name}\n` +
      `⚡ Credits: ${pkg.credits}\n` +
      `⏳ Valid for <b>7 days</b> after payment\n\n` +
      `⚠️ <b>Single-use. Never share this code.</b>\n\n` +
      `Redeem at nudely.org → Add Credits → Telegram`;

    // Send paid media message
    const paidRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPaidMedia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        star_count: pkg.stars,
        media: [{ type: 'photo', media: 'https://nudely.org/nudely-logo.png' }],
        caption,
        parse_mode: 'HTML',
        payload: code,
      }),
    });

    if (!paidRes.ok) {
      const errBody = await paidRes.text();
      console.error('[telegram-webhook] sendPaidMedia failed:', errBody);
      await sendMessage(BOT_TOKEN, chatId,
        `❌ Failed to send payment request. Please try /start again.`
      );
    } else {
      await sendMessage(BOT_TOKEN, chatId,
        `⏱ <b>You have 20 minutes to complete payment.</b>\n\n` +
        `After paying, your code will be revealed in the message above.\n` +
        `Use /checkpayment anytime to retrieve your active codes.`
      );
    }

    return new Response('OK');
  }

  // ── Pre-checkout query (Telegram requires you to confirm) ────────────────
  if (update.pre_checkout_query) {
    const query = update.pre_checkout_query;
    // Always approve — validation happens on successful_payment
    await answerPreCheckout(BOT_TOKEN, query.id, true);
    return new Response('OK');
  }

  // ── Successful payment ───────────────────────────────────────────────────
  if (update.message?.successful_payment) {
    const payment   = update.message.successful_payment;
    const chatId    = update.message.chat.id;
    const tgUserId  = String(update.message.from.id);

    const code = payment.invoice_payload;
    // Look up package from DB using the code
    const { data: codeRow } = await supabase
      .from('telegram_codes')
      .select('package_id, package_name')
      .eq('code', code)
      .maybeSingle();
    const packageId = codeRow?.package_id;
    const pkg       = PACKAGES[packageId];

    if (!code || !pkg) {
      await sendMessage(BOT_TOKEN, chatId,
        `⚠️ Payment received but something went wrong linking your code.\n` +
        `Please use /checkpayment or contact support.`
      );
      return new Response('OK');
    }

    // Mark code as sold, update expiry to 7 days from now
    const soldExpiry = new Date(Date.now() + SOLD_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const { error: updateErr } = await supabase
      .from('telegram_codes')
      .update({
        status: 'sold',
        expires_at: soldExpiry.toISOString(),
      })
      .eq('code', code)
      .eq('telegram_user_id', tgUserId);

    if (updateErr) {
      console.error('[telegram-webhook] Failed to mark code as sold:', updateErr.message);
    }

    await sendMessage(BOT_TOKEN, chatId,
      `✅ <b>Payment confirmed!</b>\n\n` +
      `Your ${pkg.name} code is now active.\n` +
      `It's valid for <b>7 days</b>.\n\n` +
      `To retrieve your code anytime: /checkpayment\n\n` +
      `⚠️ <b>This code is single-use. Do not share it — anyone who uses it first gets the credits.</b>`
    );

    return new Response('OK');
  }

  return new Response('OK');
};
