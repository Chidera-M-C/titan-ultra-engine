// ── functions/api/send-push.js ────────────────────────────────────────────
// Cloudflare Pages Function (place in /functions/api/send-push.js)
//
// Install: npm install @pushforge/builder
//
// Set these as Cloudflare environment variables (Pages > Settings > Environment Variables):
//   VAPID_PUBLIC_KEY   = your public VAPID key
//   VAPID_PRIVATE_KEY  = your private VAPID key (as JSON Web Key string — see below)
//   VAPID_MAILTO       = mailto:you@yourdomain.com
//   SUPABASE_URL       = your supabase project URL
//   SUPABASE_SERVICE_KEY = your supabase service role key (NOT the anon key)
//
// HOW TO GET YOUR VAPID_PRIVATE_KEY AS JWK:
//   Run this in Node.js once to convert your raw private key to JWK format:
//
//   const { privateKey } = require('web-push').generateVAPIDKeys(); // or use existing
//   // Then use the raw private key bytes to create a JWK — or just use:
//   npx @pushforge/builder generate-keys
//   // This outputs both keys in the correct format for PushForge

import { buildPushHTTPRequest } from '@pushforge/builder';

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { userId, title, body, icon, image, url, tag } = await request.json();

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: 'userId and title required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Fetch subscriptions from Supabase using REST API directly
    // (no npm supabase client needed — Cloudflare Workers support fetch natively)
    const subRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey':        env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type':  'application/json',
        },
      }
    );

    if (!subRes.ok) {
      throw new Error(`Supabase fetch failed: ${subRes.status}`);
    }

    const subs = await subRes.json();

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const payload = {
      title,
      body:   body   || '',
      icon:   icon   || '/icons/icon-192.png',
      badge:          '/icons/badge-72.png',
      image:  image  || undefined,
      url:    url    || '/',
      tag:    tag    || 'nudely-notif',
    };

    // Send to all subscriptions for this user
    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth:   sub.auth,
          },
        };

        const { endpoint, headers, body: pushBody } = await buildPushHTTPRequest({
          privateJWK:    env.VAPID_PRIVATE_KEY,
          subscription,
          message: {
            payload:      JSON.stringify(payload),
            adminContact: env.VAPID_MAILTO,
          },
        });

        const pushRes = await fetch(endpoint, {
          method:  'POST',
          headers,
          body:    pushBody,
        });

        // 410 Gone = subscription expired, delete it
        if (pushRes.status === 410) {
          await fetch(
            `${env.SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
            {
              method:  'DELETE',
              headers: {
                'apikey':        env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
              },
            }
          );
        }

        if (!pushRes.ok && pushRes.status !== 201) {
          throw new Error(`Push failed with status ${pushRes.status}`);
        }

        return pushRes.status;
      })
    );

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({ sent, failed }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (err) {
    console.error('Push send error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
