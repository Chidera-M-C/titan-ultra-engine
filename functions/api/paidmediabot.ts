import { createClient } from '@supabase/supabase-js';

/*
  PAID MEDIA BOT  (Telegram Business)
  -----------------------------------
  A bot connected to YOUR Premium account (Settings > Business > Chatbots).
  It sends messages and locked Stars media into YOUR existing chats, as you.

  ENV VARIABLES (Cloudflare Pages > Settings > Variables and Secrets):
    PAIDMEDIA_BOT_TOKEN    token from @BotFather
    PAIDMEDIA_BOT_SECRET   any random string; also used as secret_token in setWebhook
    OWNER_ID               YOUR numeric Telegram user id (only you can command the bot)
    SHARED_SUPABASE_URL / SHARED_SUPABASE_SERVICE_ROLE_KEY   (same ones your other bots use)

  HOW YOU USE IT
    1) In the bot's own chat, send a photo or video with caption:   50 | your caption
       The bot saves it as item #N.
    2) Open any friend's chat and type:   /send N
       The bot posts the locked media there as you, then deletes your "/send N" message.
    Other commands (type them in the bot's chat): /help
*/

// ====================== HELPERS ======================
async function tg(token: string, method: string, body: any = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: any = await res.json();
  if (!data.ok) console.error(`[${method}] FAILED`, JSON.stringify(data));
  return data;
}

const esc = (s: any) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parsePriceCaption(raw: string) {
  const m = (raw || '').trim().match(/^(\d+)\s*\|\s*([\s\S]*)$/);
  if (!m) return null;
  return { price: parseInt(m[1], 10), caption: m[2].trim() };
}

const validPrice = (p: number) => Number.isInteger(p) && p >= 1 && p <= 25000;

const HELP = `<b>Paid Media Bot</b> — sends locked media from your own account.

<b>Add an item:</b> send a photo/video here with caption <code>50 | your caption</code>

<b>Send it:</b> open a friend's chat and type <code>/send 3</code>
(or from here: <code>/send 3 @username</code>)

<code>/sendfree 3</code> — send it with no payment (same ways)
<code>/price 3 80</code> — change price (or <code>/price 3 80 | new caption</code>)
<code>/delete 3</code> — remove an item
<code>/list</code> — your items
<code>/contacts</code> — chats the bot has seen
<code>/addbuyer @username</code> / <code>/buyers</code>
<code>/broadcast 3</code> — send to all buyers
<code>/balance</code> — Stars balance of the bot`;

// ====================== CONTEXT ======================
type Ctx = { token: string; owner: number; supabase: any };

const notifyOwner = (ctx: Ctx, text: string) =>
  tg(ctx.token, 'sendMessage', { chat_id: ctx.owner, text, parse_mode: 'HTML' });

async function getItem(ctx: Ctx, id: number) {
  const { data } = await ctx.supabase.from('pm_items').select('*').eq('id', id).maybeSingle();
  return data;
}

async function getConnectionId(ctx: Ctx, preferred?: string) {
  if (preferred) return preferred;
  const { data } = await ctx.supabase
    .from('pm_business_connections')
    .select('id')
    .eq('user_id', ctx.owner)
    .eq('is_enabled', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

// who = "@username" | "123456789" | undefined (undefined = current chat)
async function resolveTarget(ctx: Ctx, who: string | undefined, currentChat?: number) {
  if (!who) return currentChat ?? null;
  if (/^-?\d+$/.test(who)) return Number(who);
  const name = who.replace(/^@/, '').toLowerCase();
  const { data } = await ctx.supabase
    .from('pm_contacts')
    .select('chat_id')
    .eq('username', name)
    .maybeSingle();
  return data?.chat_id ?? null;
}

// ====================== SENDING ======================
async function sendPaid(ctx: Ctx, connId: string, chatId: number, item: any) {
  const media: any =
    item.kind === 'video'
      ? {
          type: 'video',
          media: item.file_id,
          width: item.width || undefined,
          height: item.height || undefined,
          duration: item.duration || undefined,
          supports_streaming: true,
        }
      : { type: 'photo', media: item.file_id };

  return tg(ctx.token, 'sendPaidMedia', {
    business_connection_id: connId,
    chat_id: chatId,
    star_count: item.price,
    media: [media],
    caption: item.caption || '',
    payload: `item-${item.id}`,
    protect_content: true,
  });
}

async function sendFree(ctx: Ctx, connId: string, chatId: number, item: any) {
  const isVideo = item.kind === 'video';
  return tg(ctx.token, isVideo ? 'sendVideo' : 'sendPhoto', {
    business_connection_id: connId,
    chat_id: chatId,
    [isVideo ? 'video' : 'photo']: item.file_id,
    caption: item.caption || '',
  });
}

async function bumpSold(ctx: Ctx, item: any) {
  await ctx.supabase.from('pm_items').update({ sold: (item.sold || 0) + 1 }).eq('id', item.id);
}

// ====================== COMMANDS ======================
// where.connId / where.chatId are set when the command was typed inside a friend's chat.
type Where = { connId?: string; chatId?: number; cmdMessageId?: number };

async function runCommand(ctx: Ctx, text: string, where: Where) {
  const inFriendChat = !!where.connId;
  const [rawCmd, ...args] = text.slice(1).trim().split(/\s+/);
  const cmd = (rawCmd || '').split('@')[0].toLowerCase();
  const rest = text.slice(1).trim().slice(rawCmd.length).trim();

  // Inside a friend's chat, only /send and /sendfree are listened to.
  if (inFriendChat && cmd !== 'send' && cmd !== 'sendfree') return;

  // ---- /send <id> [@user|id]   and   /sendfree <id> [@user|id]
  if (cmd === 'send' || cmd === 'sendfree') {
    const itemId = parseInt(args[0], 10);
    if (!itemId) return notifyOwner(ctx, `Usage: <code>/${cmd} &lt;item id&gt; [@username]</code>`);
    const item = await getItem(ctx, itemId);
    if (!item) return notifyOwner(ctx, `No item #${itemId}.`);

    const chatId = await resolveTarget(ctx, args[1], where.chatId);
    if (!chatId) {
      return notifyOwner(
        ctx,
        `I don't know ${esc(args[1] || 'that chat')} yet. Easiest fix: open that chat and type <code>/${cmd} ${itemId}</code> there. Or use their numeric ID.`
      );
    }
    const connId = await getConnectionId(ctx, where.connId);
    if (!connId) {
      return notifyOwner(ctx, 'The bot is not connected to your account yet. Settings → Business → Chatbots.');
    }

    const r = cmd === 'send' ? await sendPaid(ctx, connId, chatId, item) : await sendFree(ctx, connId, chatId, item);
    if (!r.ok) {
      return notifyOwner(ctx, `❌ Failed: <code>${esc(r.description || 'unknown error')}</code>`);
    }
    if (cmd === 'send') await bumpSold(ctx, item);

    // Remove the "/send 3" text you typed in the friend's chat.
    if (where.cmdMessageId) {
      await tg(ctx.token, 'deleteBusinessMessages', {
        business_connection_id: connId,
        message_ids: [where.cmdMessageId],
      });
    }
    return notifyOwner(ctx, `✅ Item #${itemId} sent${cmd === 'send' ? ` (${item.price} ⭐ locked)` : ' (free)'}.`);
  }

  // ---- /list
  if (cmd === 'list') {
    const { data } = await ctx.supabase.from('pm_items').select('*').order('id', { ascending: false }).limit(25);
    if (!data?.length) return notifyOwner(ctx, 'No items yet.');
    return notifyOwner(
      ctx,
      '<b>Items</b>\n' +
        data.map((i: any) => `#${i.id} ${i.kind} · ${i.price} ⭐ · sent ${i.sold} · ${esc((i.caption || '').slice(0, 40))}`).join('\n')
    );
  }

  // ---- /price <id> <stars> [| caption]
  if (cmd === 'price') {
    const id = parseInt(args[0], 10);
    const tail = rest.slice(args[0]?.length || 0).trim();
    const pc = parsePriceCaption(tail);
    const price = pc ? pc.price : parseInt(tail, 10);
    if (!id || !price) return notifyOwner(ctx, 'Usage: <code>/price &lt;id&gt; &lt;stars&gt; [| caption]</code>');
    if (!validPrice(price)) return notifyOwner(ctx, 'Price must be between 1 and 25000 Stars.');
    const item = await getItem(ctx, id);
    if (!item) return notifyOwner(ctx, `No item #${id}.`);
    const patch: any = { price };
    if (pc) patch.caption = pc.caption;
    await ctx.supabase.from('pm_items').update(patch).eq('id', id);
    return notifyOwner(ctx, `Item #${id} is now ${price} ⭐.`);
  }

  // ---- /delete <id>
  if (cmd === 'delete') {
    const id = parseInt(args[0], 10);
    if (!id) return notifyOwner(ctx, 'Usage: <code>/delete &lt;id&gt;</code>');
    await ctx.supabase.from('pm_items').delete().eq('id', id);
    return notifyOwner(ctx, `Item #${id} deleted.`);
  }

  // ---- /contacts
  if (cmd === 'contacts') {
    const { data } = await ctx.supabase.from('pm_contacts').select('*').order('updated_at', { ascending: false }).limit(40);
    if (!data?.length) return notifyOwner(ctx, 'No contacts yet. They appear once someone messages you (or you message them) after the bot is connected.');
    return notifyOwner(
      ctx,
      '<b>Contacts</b>\n' +
        data.map((c: any) => `${esc(c.name || '-')} · ${c.username ? '@' + esc(c.username) : '(no username)'} · <code>${c.chat_id}</code>${c.is_buyer ? ' · buyer' : ''}`).join('\n')
    );
  }

  // ---- /addbuyer @user|id
  if (cmd === 'addbuyer') {
    if (!args[0]) return notifyOwner(ctx, 'Usage: <code>/addbuyer @username</code>');
    const chatId = await resolveTarget(ctx, args[0]);
    if (!chatId) return notifyOwner(ctx, `I haven't seen ${esc(args[0])} yet. Use their numeric ID, or chat with them once first.`);
    await ctx.supabase
      .from('pm_contacts')
      .upsert({ chat_id: chatId, is_buyer: true, updated_at: new Date().toISOString() }, { onConflict: 'chat_id' });
    return notifyOwner(ctx, `Buyer added: ${esc(args[0])}`);
  }

  // ---- /buyers
  if (cmd === 'buyers') {
    const { data } = await ctx.supabase.from('pm_contacts').select('*').eq('is_buyer', true);
    if (!data?.length) return notifyOwner(ctx, 'No buyers yet.');
    return notifyOwner(
      ctx,
      '<b>Buyers</b>\n' + data.map((c: any) => `${esc(c.name || '-')} · ${c.username ? '@' + esc(c.username) : ''} · <code>${c.chat_id}</code>`).join('\n')
    );
  }

  // ---- /broadcast <id>
  if (cmd === 'broadcast') {
    const id = parseInt(args[0], 10);
    if (!id) return notifyOwner(ctx, 'Usage: <code>/broadcast &lt;id&gt;</code>');
    const item = await getItem(ctx, id);
    if (!item) return notifyOwner(ctx, `No item #${id}.`);
    const connId = await getConnectionId(ctx);
    if (!connId) return notifyOwner(ctx, 'The bot is not connected to your account yet.');
    const { data: buyers } = await ctx.supabase.from('pm_contacts').select('chat_id').eq('is_buyer', true).limit(30);
    if (!buyers?.length) return notifyOwner(ctx, 'No buyers yet.');
    let ok = 0;
    for (const b of buyers) {
      const r = await sendPaid(ctx, connId, b.chat_id, item);
      if (r.ok) ok++;
      await sleep(1200);
    }
    if (ok) await ctx.supabase.from('pm_items').update({ sold: (item.sold || 0) + ok }).eq('id', id);
    return notifyOwner(ctx, `Broadcast of #${id}: ${ok}/${buyers.length} sent. (Max 30 buyers per broadcast.)`);
  }

  // ---- /balance
  if (cmd === 'balance') {
    const r = await tg(ctx.token, 'getMyStarBalance', {});
    const amount = r?.result?.amount;
    return notifyOwner(
      ctx,
      `Stars on this bot: <b>${amount ?? 'n/a'}</b>\nWithdraw: open @BotFather → your bot → Balance, or https://fragment.com/stars`
    );
  }

  // ---- /help, /start
  if (cmd === 'help' || cmd === 'start') return notifyOwner(ctx, HELP);
}

// ====================== UPDATE HANDLERS ======================
async function saveContact(ctx: Ctx, chat: any) {
  if (!chat || chat.type !== 'private' || chat.id === ctx.owner) return;
  await ctx.supabase.from('pm_contacts').upsert(
    {
      chat_id: chat.id,
      username: chat.username ? String(chat.username).toLowerCase() : null,
      name: [chat.first_name, chat.last_name].filter(Boolean).join(' ') || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chat_id' }
  );
}

// Your account connected / disconnected the bot
async function onBusinessConnection(ctx: Ctx, conn: any) {
  if (Number(conn.user?.id) !== ctx.owner) return;
  const canReply = conn.rights?.can_reply ?? conn.can_reply ?? true;
  await ctx.supabase.from('pm_business_connections').upsert(
    {
      id: conn.id,
      user_id: ctx.owner,
      user_chat_id: conn.user_chat_id ?? null,
      can_reply: !!canReply,
      is_enabled: !!conn.is_enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (!conn.is_enabled) return notifyOwner(ctx, '⚠️ The bot was disconnected from your account.');
  if (!canReply) return notifyOwner(ctx, '⚠️ Connected, but "Reply to messages" is off. Turn it on in Settings → Business → Chatbots.');
  return notifyOwner(ctx, '✅ Bot connected to your account. Send me a photo/video with caption <code>50 | caption</code> to begin.');
}

// A message in one of YOUR chats (from you or from your friend)
async function onBusinessMessage(ctx: Ctx, bm: any) {
  await saveContact(ctx, bm.chat);
  if (Number(bm.from?.id) !== ctx.owner) return; // friends can never trigger commands
  const text = (bm.text || '').trim();
  if (!text.startsWith('/')) return;
  await runCommand(ctx, text, {
    connId: bm.business_connection_id,
    chatId: bm.chat.id,
    cmdMessageId: bm.message_id,
  });
}

// A message sent to the bot's own chat
async function onDirectMessage(ctx: Ctx, m: any) {
  if (Number(m.from?.id) !== ctx.owner) {
    return tg(ctx.token, 'sendMessage', { chat_id: m.chat.id, text: 'This bot is private.' });
  }

  const text = (m.text || '').trim();
  if (text.startsWith('/')) return runCommand(ctx, text, {});

  // Photo or video with "50 | caption"  ->  new item
  const isPhoto = !!m.photo?.length;
  const isVideo = !!m.video;
  if (!isPhoto && !isVideo) return;

  const pc = parsePriceCaption(m.caption || '');
  if (!pc) {
    return notifyOwner(ctx, 'Add a caption like <code>50 | your caption</code> (price in Stars, then a bar, then the caption).');
  }
  if (!validPrice(pc.price)) return notifyOwner(ctx, 'Price must be between 1 and 25000 Stars.');

  const row = isVideo
    ? {
        kind: 'video',
        file_id: m.video.file_id,
        width: m.video.width || 0,
        height: m.video.height || 0,
        duration: m.video.duration || 0,
      }
    : { kind: 'photo', file_id: m.photo[m.photo.length - 1].file_id };

  const { data, error } = await ctx.supabase
    .from('pm_items')
    .insert({ ...row, price: pc.price, caption: pc.caption })
    .select('id')
    .single();
  if (error) {
    console.error('insert item error', error);
    return notifyOwner(ctx, 'Could not save the item. Check the logs.');
  }
  return notifyOwner(
    ctx,
    `Queued item <b>#${data.id}</b> · ${pc.price} ⭐ · ${row.kind}\nOpen a friend's chat and type <code>/send ${data.id}</code>`
  );
}

async function processUpdate(env: any, update: any) {
  const supabase = createClient(
    env.SHARED_SUPABASE_URL || env.VITE_SUPABASE_URL,
    env.SHARED_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
  );
  const ctx: Ctx = { token: env.PAIDMEDIA_BOT_TOKEN, owner: Number(env.OWNER_ID), supabase };

  try {
    if (update.business_connection) return await onBusinessConnection(ctx, update.business_connection);
    if (update.business_message) return await onBusinessMessage(ctx, update.business_message);
    if (update.message?.chat?.type === 'private') return await onDirectMessage(ctx, update.message);
  } catch (err: any) {
    console.error('processUpdate error:', err?.message || err);
    try {
      await notifyOwner(ctx, `Error: <code>${esc(err?.message || err)}</code>`);
    } catch {}
  }
}

// ====================== MAIN HANDLER ======================
export const onRequestPost = async (context: any) => {
  const env = context.env;
  const secretHeader = context.request.headers.get('X-Telegram-Bot-Api-Secret-Token');

  if (!env.PAIDMEDIA_BOT_SECRET || secretHeader !== env.PAIDMEDIA_BOT_SECRET) {
    console.error('Unauthorized - secret mismatch');
    return new Response('Unauthorized', { status: 401 });
  }
  if (!env.PAIDMEDIA_BOT_TOKEN || !env.OWNER_ID) {
    console.error('PAIDMEDIA_BOT_TOKEN or OWNER_ID missing');
    return new Response('Config missing', { status: 500 });
  }

  let update: any;
  try {
    update = await context.request.json();
  } catch (e) {
    return new Response('Bad Request', { status: 400 });
  }

  // Answer Telegram right away (so it never retries and double-sends),
  // and finish the real work in the background.
  context.waitUntil(processUpdate(env, update));
  return new Response('OK');
};
