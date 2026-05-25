import { createClient } from '@supabase/supabase-js';

const PACKAGES: Record<string, { name: string; credits: number; stars: number }> = {
  starter: { name: 'Starter',  credits: 100,  stars: 750  },
  creator: { name: 'Creator',  credits: 500,  stars: 3000 },
  master:  { name: 'Master',   credits: 1500, stars: 7500 },
};

const PENDING_EXPIRY_MINUTES = 20;
const SOLD_EXPIRY_DAYS       = 7;

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

// Generate a minimal SVG image containing the code — works in Cloudflare Workers
function generateCodeImage(code: string, packageName: string, credits: number): Uint8Array {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a0a"/>
      <stop offset="100%" style="stop-color:#1a0a2e"/>
    </linearGradient>
  </defs>
  <rect width="600" height="300" fill="url(#bg)" rx="20"/>
  <rect x="20" y="20" width="560" height="260" fill="none" stroke="#a855f7" stroke-width="2" rx="16" stroke-dasharray="8,4" opacity="0.5"/>
  <text x="300" y="60" font-family="monospace" font-size="14" fill="#888" text-anchor="middle">NUDELY.ORG — OFFICIAL CREDIT CODE</text>
  <text x="300" y="160" font-family="monospace" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="8">${code}</text>
  <text x="300" y="210" font-family="monospace" font-size="16" fill="#a855f7" text-anchor="middle">${packageName} Pack · ${credits} Credits</text>
  <text x="300" y="255" font-family="monospace" font-size="12" fill="#555" text-anchor="middle">Single-use · Valid 7 days · nudely.org</text>
</svg>`;

  return new TextEncoder().encode(svg);
}

export const onRequestPost = async (context: any) => {
  const env = context.env;
  const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
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

  // ── /start or /help ──────────────────────────────────────────────────────
  if (update.message?.text === '/start' || update.message?.text === '/help') {
    const chatId    = update.message.chat.id;
    const firstName = update.message.from?.first_name || 'there';

    await sendMessage(BOT_TOKEN, chatId,
      `👋 Hey <b>${firstName}</b>! Welcome to the <b>Nudely Official Top-Up</b> bot.\n\n` +
      `Here you can buy credits using Telegram Stars ⭐ to use on <b>nudely.org</b>.\n\n` +
      `<b>How it works:</b>\n` +
      `1. Pick a package below\n` +
      `2. Pay with Telegram Stars ⭐\n` +
      `3. Your unique code is revealed inside the locked message\n` +
      `4. Enter it at nudely.org → Add Credits → Telegram\n\n` +
      `⚠️ <b>Codes are single-use and valid for 7 days. Never share your code.</b>\n\n` +
      `Which package would you like?`,
      { reply_markup: packageMenu() }
    );
    return new Response('OK');
  }

  // ── /checkpayment ────────────────────────────────────────────────────────
  if (update.message?.text === '/checkpayment') {
    const chatId   = update.message.chat.id;
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
        `No active codes found.\n\nUse /start to buy a package.`
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

  // ── Package selection ────────────────────────────────────────────────────
  if (update.callback_query?.data?.startsWith('pkg_')) {
    const query      = update.callback_query;
    const chatId     = query.message.chat.id;
    const tgUserId   = String(query.from.id);
    const tgUsername = query.from.username || '';
    const packageId  = query.data.replace('pkg_', '');
    const pkg        = PACKAGES[packageId];

    if (!pkg) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: query.id }),
      });
      return new Response('OK');
    }

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

    // Save as pending
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
      await sendMessage(BOT_TOKEN, chatId, '❌ Something went wrong. Please try /start again.');
      return new Response('OK');
    }

    // Generate SVG image with the code embedded
    const svgBytes = generateCodeImage(code, pkg.name, pkg.credits);

    // Upload SVG to Telegram first to get a file_id, then use in sendPaidMedia
    // We use sendDocument to upload, get file_id, then use sendPaidMedia with photo
    // Actually — use multipart form to send the image directly via sendPaidMedia
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);

    // Build multipart body
    const mediaJson = JSON.stringify([{ type: 'photo', media: 'attach://code_image' }]);

    let body = '';
    body += `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="star_count"\r\n\r\n${pkg.stars}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="media"\r\n\r\n${mediaJson}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n🔒 Pay ${pkg.stars.toLocaleString()} ⭐ to reveal your ${pkg.name} code\n\n📦 ${pkg.name} · ⚡ ${pkg.credits} credits\n⏳ Valid 7 days after payment · Single-use\n\nRedeem at nudely.org → Add Credits → Telegram\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="payload"\r\n\r\n${code}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`;

    // Add the SVG image part
    const preamble = new TextEncoder().encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="code_image"; filename="code.svg"\r\nContent-Type: image/svg+xml\r\n\r\n`
    );
    const suffix = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
    const textBody = new TextEncoder().encode(body);

    const combined = new Uint8Array(textBody.length + preamble.length + svgBytes.length + suffix.length);
    combined.set(textBody, 0);
    combined.set(preamble, textBody.length);
    combined.set(svgBytes, textBody.length + preamble.length);
    combined.set(suffix, textBody.length + preamble.length + svgBytes.length);

    const paidRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPaidMedia`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: combined,
    });

    if (!paidRes.ok) {
      const errBody = await paidRes.text();
      console.error('[telegram-webhook] sendPaidMedia failed:', errBody);
      await sendMessage(BOT_TOKEN, chatId, `❌ Failed to send payment request. Please try /start again.`);
    } else {
      await sendMessage(BOT_TOKEN, chatId,
        `⏱ <b>Complete payment within 20 minutes.</b>\n\n` +
        `After paying Stars ⭐, your code image will be revealed in the message above.\n\n` +
        `Use /checkpayment anytime to retrieve active codes.`
      );
    }

    return new Response('OK');
  }

  // ── Pre-checkout ─────────────────────────────────────────────────────────
  if (update.pre_checkout_query) {
    await answerPreCheckout(BOT_TOKEN, update.pre_checkout_query.id, true);
    return new Response('OK');
  }

  // ── Successful payment ───────────────────────────────────────────────────
  if (update.message?.successful_payment) {
    const payment  = update.message.successful_payment;
    const chatId   = update.message.chat.id;
    const tgUserId = String(update.message.from.id);
    const code     = payment.invoice_payload;

    const { data: codeRow } = await supabase
      .from('telegram_codes')
      .select('package_id, package_name, credits')
      .eq('code', code)
      .maybeSingle();

    const pkg = codeRow ? PACKAGES[codeRow.package_id] : null;

    const soldExpiry = new Date(Date.now() + SOLD_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await supabase
      .from('telegram_codes')
      .update({ status: 'sold', expires_at: soldExpiry.toISOString() })
      .eq('code', code)
      .eq('telegram_user_id', tgUserId);

    await sendMessage(BOT_TOKEN, chatId,
      `✅ <b>Payment confirmed!</b>\n\n` +
      `Your ${pkg?.name || 'credit'} code is now active in the message above.\n` +
      `Scroll up, tap the revealed image to see your code.\n\n` +
      `⏳ Valid for <b>7 days</b>\n` +
      `⚠️ <b>Single-use — do not share your code.</b>\n\n` +
      `Use /checkpayment to retrieve your code anytime.\n` +
      `Redeem at nudely.org → Add Credits → Telegram`
    );

    return new Response('OK');
  }

  return new Response('OK');
};
