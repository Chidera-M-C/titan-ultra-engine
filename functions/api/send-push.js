// ── send-push.js — place in your /api folder (Vercel serverless function) ─
// npm install web-push  (add to your package.json)
// Set these env vars in your Vercel dashboard:
//   VAPID_PUBLIC_KEY=your_public_key
//   VAPID_PRIVATE_KEY=your_private_key
//   VAPID_MAILTO=mailto:you@yourdomain.com
//   SUPABASE_URL=your_supabase_url
//   SUPABASE_SERVICE_KEY=your_supabase_service_role_key  (NOT the anon key)

const webpush    = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  process.env.VAPID_MAILTO,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, title, body, icon, image, url, tag } = req.body;

  if (!userId || !title) {
    return res.status(400).json({ error: 'userId and title required' });
  }

  try {
    // Fetch all push subscriptions for this user
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return res.status(200).json({ message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({
      title,
      body:    body    || '',
      icon:    icon    || '/icons/icon-192.png',
      badge:         '/icons/badge-72.png',
      image:   image   || undefined,
      url:     url     || '/',
      tag:     tag     || 'nudely-notif',
    });

    // Send to all devices this user is subscribed on
    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        ).catch(async (err) => {
          // 410 Gone = subscription expired, clean it up
          if (err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
          throw err;
        })
      )
    );

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return res.status(200).json({ sent, failed });
  } catch (err) {
    console.error('Push send error:', err);
    return res.status(500).json({ error: err.message });
  }
};
